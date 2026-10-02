import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/theme/app_colors.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/api/api_exception.dart';
import '../../core/services/socket_service.dart';
import '../../shared/widgets/feedback/cn_states.dart';
import '../../shared/widgets/layout/glass_box.dart';

// ── Delivery Phases ───────────────────────────────────────────────────────────

enum DeliveryPhase {
  headingToRestaurant,
  pickingUp,
  delivering,
  completed;

  String get title => switch (this) {
        DeliveryPhase.headingToRestaurant => 'Head to Restaurant',
        DeliveryPhase.pickingUp => 'Pick Up Order',
        DeliveryPhase.delivering => 'Deliver to Customer',
        DeliveryPhase.completed => 'Delivery Complete',
      };

  String get subtitle => switch (this) {
        DeliveryPhase.headingToRestaurant =>
          'Navigate to the restaurant and collect the order',
        DeliveryPhase.pickingUp =>
          'Confirm you have the food and are ready to go',
        DeliveryPhase.delivering =>
          'Navigate to the customer\'s delivery address',
        DeliveryPhase.completed =>
          'Great work! Earnings have been credited to your wallet.',
      };

  String get buttonLabel => switch (this) {
        DeliveryPhase.headingToRestaurant => 'I\'ve Arrived at Restaurant',
        DeliveryPhase.pickingUp => 'I Have the Food — Start Delivery',
        DeliveryPhase.delivering => 'Mark as Delivered',
        DeliveryPhase.completed => 'Back to Dashboard',
      };

  IconData get icon => switch (this) {
        DeliveryPhase.headingToRestaurant => Icons.storefront_rounded,
        DeliveryPhase.pickingUp => Icons.inventory_2_rounded,
        DeliveryPhase.delivering => Icons.home_rounded,
        DeliveryPhase.completed => Icons.check_circle_rounded,
      };

  Color get color => switch (this) {
        DeliveryPhase.headingToRestaurant => AppColors.accent,
        DeliveryPhase.pickingUp => AppColors.warning,
        DeliveryPhase.delivering => AppColors.primary,
        DeliveryPhase.completed => AppColors.success,
      };
}

// ── Screen ────────────────────────────────────────────────────────────────────

class ActiveDeliveryScreen extends ConsumerStatefulWidget {
  final String orderId;
  const ActiveDeliveryScreen({super.key, required this.orderId});

  @override
  ConsumerState<ActiveDeliveryScreen> createState() =>
      _ActiveDeliveryScreenState();
}

class _ActiveDeliveryScreenState extends ConsumerState<ActiveDeliveryScreen>
    with SingleTickerProviderStateMixin {
  final MapController _mapController = MapController();
  LatLng? _currentPosition;
  bool _isLoadingLocation = true;
  bool _isProcessing = false;
  DeliveryPhase _phase = DeliveryPhase.headingToRestaurant;
  Map<String, dynamic> _orderData = {};
  StreamSubscription<Position>? _locationSubscription;
  String? _fetchError;
  // M28: the customer's tracking map goes stale silently if this isn't
  // surfaced - the rider is the only one in a position to notice and fix it
  // (move somewhere with signal, toggle location permission back on, etc.).
  bool _locationTrackingFailed = false;

  // Kigali city center — only used as last-resort fallback
  static const _kigaliCenter = LatLng(-1.9441, 30.0619);

  /// Restaurant coordinates parsed from order data
  LatLng get _restaurantPin {
    final biz = _orderData['business'] as Map? ?? {};
    final loc = biz['location'] as Map? ?? {};
    final coords = loc['coordinates'] as List?;
    if (coords != null && coords.length >= 2) {
      return LatLng(
        (coords[1] as num).toDouble(),
        (coords[0] as num).toDouble(),
      );
    }
    return _kigaliCenter;
  }

  /// Customer delivery coordinates parsed from order data
  LatLng get _customerPin {
    final delivery = _orderData['deliveryAddress'] as Map? ?? {};
    final loc = delivery['location'] as Map? ?? {};
    // Try GeoJSON coordinates array first
    final coords = loc['coordinates'] as List?;
    if (coords != null && coords.length >= 2) {
      return LatLng(
        (coords[1] as num).toDouble(),
        (coords[0] as num).toDouble(),
      );
    }
    // Try flat lat/lng fields
    final lat = (loc['lat'] ?? loc['latitude']) as num?;
    final lng = (loc['lng'] ?? loc['longitude']) as num?;
    if (lat != null && lng != null) {
      return LatLng(lat.toDouble(), lng.toDouble());
    }
    return const LatLng(-1.9578, 30.0925); // Default south Kigali
  }

  late AnimationController _phaseAnim;
  late Animation<double> _phaseFade;

  @override
  void initState() {
    super.initState();
    _phaseAnim = AnimationController(
        duration: const Duration(milliseconds: 400), vsync: this);
    _phaseFade = CurvedAnimation(parent: _phaseAnim, curve: Curves.easeInOut);
    _phaseAnim.value = 1.0;
    _determinePosition();
    _fetchOrder();
  }

  @override
  void dispose() {
    _stopLocationTracking();
    _phaseAnim.dispose();
    super.dispose();
  }

  void _startLocationTracking() {
    if (_locationSubscription != null) return;

    const locationSettings = LocationSettings(
      accuracy: LocationAccuracy.bestForNavigation,
      distanceFilter: 10, // Update location every 10 meters
    );

    _locationSubscription =
        Geolocator.getPositionStream(locationSettings: locationSettings).listen(
      (Position position) {
        if (!mounted) return;
        setState(() {
          _currentPosition = LatLng(position.latitude, position.longitude);
          _locationTrackingFailed = false;
        });

        // Emit location via Socket
        SocketService().updateRiderLocation(
            widget.orderId, position.latitude, position.longitude);
      },
      onError: (e) {
        if (kDebugMode) debugPrint('Error in location tracking stream: $e');
        if (!mounted) return;
        setState(() => _locationTrackingFailed = true);
      },
    );
  }

  /// Stop and restart the position stream - the usual fix for a stream that
  /// errored out (permission got revoked then re-granted, GPS was toggled
  /// off then on, etc.).
  void _retryLocationTracking() {
    setState(() => _locationTrackingFailed = false);
    _stopLocationTracking();
    _startLocationTracking();
  }

  void _stopLocationTracking() {
    _locationSubscription?.cancel();
    _locationSubscription = null;
  }

  Future<void> _fetchOrder() async {
    try {
      final res =
          await ApiClient.instance.get(AppEndpoints.orderById(widget.orderId));
      final data = res.data;
      if (mounted) {
        setState(() {
          _orderData =
              data is Map<String, dynamic> ? data : (data['order'] ?? {});
          
          final deliveryStatus = _orderData['delivery'] is Map
              ? _orderData['delivery']['status']?.toString()
              : null;
          
          if (deliveryStatus != null) {
            _phase = switch (deliveryStatus) {
              'assigned' => DeliveryPhase.headingToRestaurant,
              'picked_up' => DeliveryPhase.pickingUp,
              'in_transit' => DeliveryPhase.delivering,
              'delivered' => DeliveryPhase.completed,
              _ => DeliveryPhase.headingToRestaurant,
            };
          } else {
            // Fallback to order status
            final status = _orderData['status']?.toString() ?? '';
            _phase = switch (status) {
              'accepted' || 'heading_to_restaurant' => DeliveryPhase.headingToRestaurant,
              'at_restaurant' || 'picked_up'         => DeliveryPhase.pickingUp,
              'delivering' || 'out_for_delivery'     => DeliveryPhase.delivering,
              'delivered' || 'completed'             => DeliveryPhase.completed,
              _                                      => DeliveryPhase.headingToRestaurant,
            };
          }
          _fetchError = null;
        });

        if (_phase != DeliveryPhase.completed) {
          _startLocationTracking();
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _fetchError = ApiException.fromDioError(e).message;
        });
      }
    }
  }

  Future<void> _determinePosition() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        if (mounted) setState(() => _isLoadingLocation = false);
        return;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          if (mounted) setState(() => _isLoadingLocation = false);
          return;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        if (mounted) setState(() => _isLoadingLocation = false);
        return;
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.bestForNavigation),
      );

      if (mounted) {
        setState(() {
          _currentPosition = LatLng(position.latitude, position.longitude);
          _isLoadingLocation = false;
        });
        _mapController.move(_currentPosition!, 15.5);
      }
    } catch (_) {
      if (mounted) setState(() => _isLoadingLocation = false);
    }
  }

  Future<void> _advancePhase() async {
    HapticFeedback.heavyImpact();

    if (_phase == DeliveryPhase.completed) {
      context.go('/rider/dashboard');
      return;
    }

    // Show confirmation dialog for marking as delivered
    if (_phase == DeliveryPhase.delivering) {
      final confirmed = await _showDeliveryConfirmDialog();
      if (confirmed != true) return;
    }

    setState(() => _isProcessing = true);

    try {
      // Map phase to API status
      final newStatus = switch (_phase) {
        DeliveryPhase.headingToRestaurant => 'picked_up',
        DeliveryPhase.pickingUp => 'in_transit',
        DeliveryPhase.delivering => 'delivered',
        DeliveryPhase.completed => 'delivered',
      };

      final deliveryId = _orderData['delivery'] is Map
          ? _orderData['delivery']['_id']?.toString()
          : _orderData['delivery']?.toString();

      if (deliveryId != null && deliveryId.isNotEmpty) {
        await ApiClient.instance.patch(
          AppEndpoints.deliveryStatus(deliveryId),
          data: {'status': newStatus},
        );
      } else {
        // Fallback to order status PUT
        final fallbackOrderStatus = switch (_phase) {
          DeliveryPhase.headingToRestaurant => 'picked_up',
          DeliveryPhase.pickingUp => 'out_for_delivery',
          DeliveryPhase.delivering => 'completed',
          DeliveryPhase.completed => 'completed',
        };
        await ApiClient.instance.put(
          AppEndpoints.orderStatus(widget.orderId),
          data: {'status': fallbackOrderStatus},
        );
      }

      // Animate phase transition
      await _phaseAnim.reverse();
      if (mounted) {
        setState(() {
          _phase = switch (_phase) {
            DeliveryPhase.headingToRestaurant => DeliveryPhase.pickingUp,
            DeliveryPhase.pickingUp => DeliveryPhase.delivering,
            DeliveryPhase.delivering => DeliveryPhase.completed,
            DeliveryPhase.completed => DeliveryPhase.completed,
          };
        });

        if (_phase == DeliveryPhase.completed) {
          _stopLocationTracking();
        }

        // Move map to relevant pin
        if (_phase == DeliveryPhase.delivering) {
          _mapController.move(_customerPin, 15.5);
        }
      }
      await _phaseAnim.forward();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(ApiException.fromDioError(e).message),
            backgroundColor: AppColors.error,
            behavior: SnackBarBehavior.floating,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  Future<bool?> _showDeliveryConfirmDialog() {
    return showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Confirm Delivery',
            style: TextStyle(
                fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
        content: const Text(
          'Please confirm the customer has received the order before marking it as delivered.',
          style: TextStyle(color: AppColors.textSecondary, height: 1.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel',
                style: TextStyle(color: AppColors.textSecondary)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('Yes, Delivered'),
          ),
        ],
      ),
    );
  }

  void _openNavigation() async {
    final pin =
        _phase == DeliveryPhase.delivering ? _customerPin : _restaurantPin;
    final uri = Uri.parse(
        'https://www.google.com/maps/dir/?api=1&destination=${pin.latitude},${pin.longitude}&travelmode=bicycling');
    if (await canLaunchUrl(uri)) launchUrl(uri);
  }

  @override
  Widget build(BuildContext context) {
    if (_fetchError != null) {
      return Scaffold(
        backgroundColor: AppColors.background,
        body: CnErrorState(
          message: _fetchError!,
          onRetry: () {
            setState(() => _fetchError = null);
            _fetchOrder();
          },
        ),
      );
    }

    final markers = _buildMarkers();
    final biz =
        _orderData['business'] is Map ? _orderData['business'] as Map : {};
    final customer = _orderData['customer'] is Map
        ? _orderData['customer'] as Map
        : _orderData['user'] is Map
            ? _orderData['user'] as Map
            : {};

    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: Padding(
          padding: const EdgeInsets.only(left: 12),
          child: GestureDetector(
            onTap: () => context.canPop() ? context.pop() : context.go('/rider/dashboard'),
            child: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: AppColors.surface,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                      color: AppColors.char.withValues(alpha: 0.12),
                      blurRadius: 8,
                      offset: const Offset(0, 2))
                ],
              ),
              child: const Icon(Icons.arrow_back,
                  color: AppColors.textPrimary, size: 20),
            ),
          ),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: GestureDetector(
              onTap: _openNavigation,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(100),
                  boxShadow: [
                    BoxShadow(
                        color: AppColors.char.withValues(alpha: 0.1),
                        blurRadius: 8)
                  ],
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.navigation_rounded,
                        color: AppColors.primary, size: 16),
                    SizedBox(width: 4),
                    Text('Navigate',
                        style: TextStyle(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w700,
                            fontSize: 12)),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
      body: Stack(
        children: [
          // ── Map ─────────────────────────────────────────────────────────────
          _isLoadingLocation
              ? Container(
                  color: AppColors.background,
                  child: const Center(
                    child: CircularProgressIndicator(color: AppColors.primary),
                  ),
                )
              : FlutterMap(
                  mapController: _mapController,
                  options: MapOptions(
                    initialCenter: _currentPosition ?? _restaurantPin,
                    initialZoom: 15.0,
                    interactionOptions: const InteractionOptions(
                      flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
                    ),
                  ),
                  children: [
                    TileLayer(
                      urlTemplate:
                          'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
                      subdomains: const ['a', 'b', 'c', 'd'],
                      userAgentPackageName: 'com.chopnow.app',
                    ),
                    MarkerLayer(markers: markers),
                  ],
                ),

          // ── Phase Progress Strip (floating top bar) ──────────────────────
          Positioned(
            top: MediaQuery.of(context).padding.top + 56,
            left: 16,
            right: 16,
            child: _PhaseProgressBar(current: _phase),
          ),

          // ── Location tracking failure banner (M28) ───────────────────────
          if (_locationTrackingFailed)
            Positioned(
              top: MediaQuery.of(context).padding.top + 110,
              left: 16,
              right: 16,
              child: GestureDetector(
                onTap: _retryLocationTracking,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: AppColors.error,
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(
                          color: AppColors.char.withValues(alpha: 0.2),
                          blurRadius: 10)
                    ],
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.location_off_rounded,
                          color: Colors.white, size: 18),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          "Location tracking stopped - the customer can't see your live position. Tap to retry.",
                          style: TextStyle(
                              color: Colors.white,
                              fontSize: 12.5,
                              fontWeight: FontWeight.w600),
                        ),
                      ),
                      Icon(Icons.refresh_rounded,
                          color: Colors.white, size: 18),
                    ],
                  ),
                ),
              ),
            ),

          // ── Recenter FAB ─────────────────────────────────────────────────
          Positioned(
            right: 16,
            bottom: 320,
            child: Container(
              decoration: BoxDecoration(
                color: AppColors.surface,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                      color: AppColors.char.withValues(alpha: 0.12),
                      blurRadius: 12)
                ],
              ),
              child: IconButton(
                icon: const Icon(Icons.my_location, color: AppColors.primary),
                onPressed: _determinePosition,
              ),
            ),
          ),

          // ── Floating Bottom Card ─────────────────────────────────────────
          Positioned(
            left: 16,
            right: 16,
            bottom: MediaQuery.of(context).padding.bottom + 16,
            child: FadeTransition(
              opacity: _phaseFade,
              child: GlassBox(
                blur: 20,
                opacity: 0.95,
                borderRadius: BorderRadius.circular(24),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 20),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Phase header
                      Row(children: [
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: _phase.color.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Center(
                            child: Icon(_phase.icon,
                                size: 20, color: _phase.color),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _phase.title,
                                style: TextStyle(
                                    fontWeight: FontWeight.w800,
                                    fontSize: 16,
                                    color: _phase.color),
                              ),
                              Text(
                                _phase.subtitle,
                                style: const TextStyle(
                                    fontSize: 12,
                                    color: AppColors.textSecondary,
                                    height: 1.4),
                              ),
                            ],
                          ),
                        ),
                      ]),

                      const SizedBox(height: 16),
                      const Divider(height: 1, color: AppColors.border),
                      const SizedBox(height: 16),

                      // Location info row
                      if (_phase != DeliveryPhase.completed) ...[
                        _LocationRow(
                          icon: _phase == DeliveryPhase.delivering
                              ? Icons.home_rounded
                              : Icons.storefront_rounded,
                          iconColor: _phase.color,
                          label: _phase == DeliveryPhase.delivering
                              ? '${customer['firstName'] ?? 'Customer'} ${customer['lastName'] ?? ''}'
                              : biz['name'] ?? 'Restaurant',
                          sublabel: _phase == DeliveryPhase.delivering
                              ? (_orderData['deliveryAddress']?['label'] ??
                                  'Delivery address')
                              : (biz['address'] ?? 'Restaurant address'),
                          onPhone: customer['phone'] != null
                              ? () => _callNumber(customer['phone'] as String)
                              : null,
                        ),
                        const SizedBox(height: 16),
                      ] else ...[
                        // Completed state
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppColors.successSurface,
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: const Row(children: [
                            Icon(
                              Icons.check_circle_rounded,
                              size: 28,
                              color: AppColors.success,
                            ),
                            SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('Delivery Complete!',
                                      style: TextStyle(
                                          fontWeight: FontWeight.w800,
                                          color: AppColors.primary,
                                          fontSize: 15)),
                                  Text('Your earnings have been credited.',
                                      style: TextStyle(
                                          color: AppColors.textSecondary,
                                          fontSize: 12)),
                                ],
                              ),
                            ),
                          ]),
                        ),
                        const SizedBox(height: 16),
                      ],

                      // CTA Button
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _isProcessing ? null : _advancePhase,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: _phase.color,
                            foregroundColor: Colors.white,
                            disabledBackgroundColor:
                                _phase.color.withValues(alpha: 0.5),
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14)),
                          ),
                          child: _isProcessing
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    color: Colors.white,
                                    strokeWidth: 2.5,
                                  ),
                                )
                              : Text(
                                  _phase.buttonLabel,
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w800,
                                      fontSize: 15),
                                ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  List<Marker> _buildMarkers() {
    final markers = <Marker>[];

    // Rider position
    if (_currentPosition != null) {
      markers.add(Marker(
        point: _currentPosition!,
        width: 50,
        height: 50,
        child: Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: AppColors.surface,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                  color: AppColors.char.withValues(alpha: 0.2),
                  blurRadius: 8,
                  offset: const Offset(0, 3))
            ],
          ),
          child: Container(
            decoration: const BoxDecoration(
                color: AppColors.primary, shape: BoxShape.circle),
            child: const Center(
              child:
                  Icon(Icons.navigation_rounded, color: Colors.white, size: 16),
            ),
          ),
        ),
      ));
    }

    // Restaurant pin
    markers.add(Marker(
      point: _restaurantPin,
      width: 50,
      height: 56,
      child: Column(children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: AppColors.accent,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                  color: AppColors.accent.withValues(alpha: 0.4),
                  blurRadius: 12)
            ],
          ),
          child:
              const Center(child: Text('🏪', style: TextStyle(fontSize: 20))),
        ),
        Container(
          width: 2,
          height: 10,
          color: AppColors.accent,
        ),
        Container(
          width: 6,
          height: 6,
          decoration: const BoxDecoration(
              color: AppColors.accent, shape: BoxShape.circle),
        ),
      ]),
    ));

    // Customer pin
    if (_phase == DeliveryPhase.delivering ||
        _phase == DeliveryPhase.completed) {
      markers.add(Marker(
        point: _customerPin,
        width: 50,
        height: 56,
        child: Column(children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppColors.primary,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                    color: AppColors.primary.withValues(alpha: 0.4),
                    blurRadius: 12)
              ],
            ),
            child:
                const Center(child: Text('🏠', style: TextStyle(fontSize: 20))),
          ),
          Container(width: 2, height: 10, color: AppColors.primary),
          Container(
            width: 6,
            height: 6,
            decoration: const BoxDecoration(
                color: AppColors.primary, shape: BoxShape.circle),
          ),
        ]),
      ));
    }

    return markers;
  }

  void _callNumber(String phone) async {
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) launchUrl(uri);
  }
}

// ── Phase Progress Bar ────────────────────────────────────────────────────────

class _PhaseProgressBar extends StatelessWidget {
  final DeliveryPhase current;
  const _PhaseProgressBar({required this.current});

  @override
  Widget build(BuildContext context) {
    final phases = [
      DeliveryPhase.headingToRestaurant,
      DeliveryPhase.pickingUp,
      DeliveryPhase.delivering,
    ];
    final currentIdx = current.index.clamp(0, phases.length - 1);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
              color: AppColors.char.withValues(alpha: 0.1),
              blurRadius: 12,
              offset: const Offset(0, 4))
        ],
      ),
      child: Row(
        children: List.generate(phases.length * 2 - 1, (i) {
          if (i.isOdd) {
            // Connector line
            final phaseIdx = i ~/ 2;
            final done = phaseIdx < currentIdx;
            return Expanded(
              child: Container(
                height: 2,
                margin: const EdgeInsets.symmetric(horizontal: 4),
                decoration: BoxDecoration(
                  color: done ? AppColors.primary : AppColors.border,
                  borderRadius: BorderRadius.circular(1),
                ),
              ),
            );
          }

          final phaseIdx = i ~/ 2;
          final phase = phases[phaseIdx];
          final isDone = phaseIdx < currentIdx;
          final isActive = phaseIdx == currentIdx;

          return Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isDone
                      ? AppColors.primary
                      : isActive
                          ? phase.color
                          : AppColors.border,
                ),
                child: Center(
                  child: isDone
                      ? const Icon(Icons.check, color: Colors.white, size: 16)
                      : Icon(
                          phase.icon,
                          color: isActive ? Colors.white : AppColors.textTertiary,
                          size: 16,
                        ),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                switch (phaseIdx) {
                  0 => 'Pickup',
                  1 => 'Collect',
                  _ => 'Deliver',
                },
                style: TextStyle(
                  fontSize: 9,
                  fontWeight: FontWeight.w600,
                  color: isActive
                      ? phase.color
                      : isDone
                          ? AppColors.primary
                          : AppColors.textTertiary,
                ),
              ),
            ],
          );
        }),
      ),
    );
  }
}

// ── Location Row ──────────────────────────────────────────────────────────────

class _LocationRow extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String label;
  final String sublabel;
  final VoidCallback? onPhone;

  const _LocationRow({
    required this.icon,
    required this.iconColor,
    required this.label,
    required this.sublabel,
    this.onPhone,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: iconColor.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: iconColor, size: 20),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label,
                  style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 14,
                      color: AppColors.textPrimary)),
              Text(sublabel,
                  style: const TextStyle(
                      fontSize: 12, color: AppColors.textSecondary),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis),
            ],
          ),
        ),
        if (onPhone != null)
          GestureDetector(
            onTap: onPhone,
            child: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: AppColors.primarySurface,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.phone_rounded,
                  color: AppColors.primary, size: 20),
            ),
          ),
      ],
    );
  }
}