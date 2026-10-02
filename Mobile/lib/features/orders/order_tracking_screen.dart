import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'dart:async';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../core/services/socket_service.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/widgets/feedback/cn_states.dart';
import '../../shared/widgets/buttons/cn_buttons.dart';
import '../../shared/animations/scale_tap.dart';

final _trackingOrderProvider =
    FutureProvider.family<Map<String, dynamic>, String>((ref, id) async {
  final res = await ApiClient.instance.get(AppEndpoints.orderById(id));
  final data = res.data;
  if (data is Map<String, dynamic>) {
    return (data['order'] ?? data['data'] ?? data) as Map<String, dynamic>;
  }
  return {} as Map<String, dynamic>;
});

class OrderTrackingScreen extends ConsumerStatefulWidget {
  final String orderId;
  const OrderTrackingScreen({super.key, required this.orderId});
  @override
  ConsumerState<OrderTrackingScreen> createState() =>
      _OrderTrackingScreenState();
}

class _OrderTrackingScreenState extends ConsumerState<OrderTrackingScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseCtrl;
  StreamSubscription<Map<String, dynamic>>? _locationSubscription;
  LatLng? _riderPosition;
  bool _socketInitialized = false;

  // M28: a "staleness" indicator for the customer - the live marker on the
  // map otherwise just sits wherever it last was with no sign anything's
  // wrong if the rider's location stream (or their connectivity) drops.
  DateTime? _lastLocationUpdateAt;
  Timer? _stalenessTimer;
  static const _staleAfter = Duration(seconds: 45);

  bool get _isLocationStale {
    final last = _lastLocationUpdateAt;
    if (last == null) return false;
    return DateTime.now().difference(last) > _staleAfter;
  }

  @override
  void initState() {
    super.initState();
    _pulseCtrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 1200))
      ..repeat(reverse: true);
    // Nothing to compute against a clock changes on its own in Flutter -
    // this just forces a rebuild every few seconds so _isLocationStale (a
    // getter based on DateTime.now()) gets re-evaluated and the banner can
    // appear without needing a NEW location update to trigger it.
    _stalenessTimer = Timer.periodic(const Duration(seconds: 10), (_) {
      if (mounted && _lastLocationUpdateAt != null) setState(() {});
    });
  }

  @override
  void dispose() {
    _locationSubscription?.cancel();
    _stalenessTimer?.cancel();
    _pulseCtrl.dispose();
    super.dispose();
  }

  void _setupSocketTracking() {
    if (_socketInitialized) return;
    final auth = ref.read(authProvider);
    if (auth is AuthAuthenticated) {
      _socketInitialized = true;
      // Start the staleness clock as soon as we start expecting updates -
      // if the rider's tracking is broken from the very start of the
      // delivery (never sends a single update), that must still count as
      // stale, not silently look "not stale yet" forever because nothing
      // ever arrived to compare against.
      _lastLocationUpdateAt = DateTime.now();
      final socketService = SocketService();
      socketService.connect(auth.token);
      socketService.trackOrder(widget.orderId);

      _locationSubscription = socketService.locationStream.listen((data) {
        if (!mounted) return;
        if (kDebugMode) {
          debugPrint(
              "Live tracking coordinate received in consumer screen: $data");
        }
        if (data['orderId'] == widget.orderId || data['riderId'] != null) {
          setState(() {
            _riderPosition = LatLng(
              (data['lat'] as num).toDouble(),
              (data['lng'] as num).toDouble(),
            );
            _lastLocationUpdateAt = DateTime.now();
          });
        }
      });
    }
  }

  LatLng? _parseCoords(dynamic locationData) {
    if (locationData == null) return null;
    if (locationData is Map && locationData['location'] is Map) {
      // Sometimes it is nested inside location object
      return _parseCoords(locationData['location']);
    }
    if (locationData is Map && locationData['coordinates'] is List) {
      final list = locationData['coordinates'] as List;
      if (list.length >= 2) {
        return LatLng(
          (list[1] as num).toDouble(),
          (list[0] as num).toDouble(),
        );
      }
    }
    return null;
  }

  Widget _buildMapCard(
      Map<String, dynamic> order, Map<String, dynamic> delivery) {
    final pickup = delivery['pickupLocation'] as Map<String, dynamic>?;
    final dropoff = delivery['dropoffLocation'] as Map<String, dynamic>?;

    final pickupCoords = _parseCoords(pickup);
    final dropoffCoords = _parseCoords(dropoff);
    final currentCoords = _riderPosition ?? _parseCoords(delivery);

    final markers = <Marker>[];

    if (pickupCoords != null) {
      markers.add(Marker(
        point: pickupCoords,
        width: 40,
        height: 40,
        child: Container(
          decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              boxShadow: [BoxShadow(color: AppColors.char.withValues(alpha: 0.26), blurRadius: 4)]),
          child: const Center(
            child: Icon(Icons.storefront_rounded, size: 18, color: AppColors.primary),
          ),
        ),
      ));
    }

    if (dropoffCoords != null) {
      markers.add(Marker(
        point: dropoffCoords,
        width: 40,
        height: 40,
        child: Container(
          decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              boxShadow: [BoxShadow(color: AppColors.char.withValues(alpha: 0.26), blurRadius: 4)]),
          child: const Center(
            child: Icon(Icons.home_rounded, size: 18, color: AppColors.primary),
          ),
        ),
      ));
    }

    if (currentCoords != null) {
      markers.add(Marker(
        point: currentCoords,
        width: 40,
        height: 40,
        child: Container(
          decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              boxShadow: [BoxShadow(color: AppColors.char.withValues(alpha: 0.38), blurRadius: 6)]),
          child: const Center(
            child: Icon(Icons.delivery_dining_rounded, size: 20, color: AppColors.primary),
          ),
        ),
      ));
    }

    if (pickupCoords == null && dropoffCoords == null) {
      return const SizedBox.shrink();
    }

    final initialCenter = currentCoords ?? pickupCoords ?? dropoffCoords!;

    return Container(
      height: 220,
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          FlutterMap(
            options: MapOptions(
              initialCenter: initialCenter,
              initialZoom: 14.0,
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
          // M28: tells the customer the marker they're looking at might not
          // reflect the rider's real position right now, instead of letting
          // a frozen dot quietly look like a live one.
          if (_isLocationStale)
            Positioned(
              top: 10,
              left: 10,
              right: 10,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: AppColors.warningSurface,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                      color: AppColors.warning.withValues(alpha: 0.4)),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.warning_amber_rounded,
                        size: 15, color: AppColors.warning),
                    SizedBox(width: 6),
                    Flexible(
                      child: Text(
                        "Live location may be delayed",
                        style: TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w700,
                            color: AppColors.warning),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final asyncOrder = ref.watch(_trackingOrderProvider(widget.orderId));

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Track Order',
            style: TextStyle(
                fontWeight: FontWeight.w900,
                color: AppColors.textPrimary,
                fontSize: 18)),
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        actions: [
          ScaleTap(
            onTap: () {
              HapticFeedback.lightImpact();
              ref.invalidate(_trackingOrderProvider(widget.orderId));
            },
            child: Container(
              margin: const EdgeInsets.only(right: 12),
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.primarySurface,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.refresh_rounded,
                  color: AppColors.primary, size: 20),
            ),
          ),
        ],
      ),
      body: asyncOrder.when(
        loading: () => const Center(
            child: CircularProgressIndicator(color: AppColors.primary)),
        error: (e, _) => CnErrorState(
            message: e.toString(),
            onRetry: () =>
                ref.invalidate(_trackingOrderProvider(widget.orderId))),
        data: (order) {
          var status = order['status']?.toString() ?? 'pending';
          final isDelivery =
              order['fulfillmentType']?.toString().toLowerCase() == 'delivery';
          final steps = isDelivery
              ? const [
                  _Step('Order Placed', 'pending', Icons.shopping_bag_outlined),
                  _Step('Confirmed', 'confirmed', Icons.check_circle_outline),
                  _Step('Preparing', 'preparing', Icons.restaurant_outlined),
                  _Step('Out for Delivery', 'out_for_delivery', Icons.delivery_dining_outlined),
                  _Step('Completed', 'completed', Icons.celebration_outlined),
                ]
              : const [
                  _Step('Order Placed', 'pending', Icons.shopping_bag_outlined),
                  _Step('Confirmed', 'confirmed', Icons.check_circle_outline),
                  _Step('Preparing', 'preparing', Icons.restaurant_outlined),
                  _Step('Ready for Pickup', 'ready_for_pickup', Icons.inventory_2_outlined),
                  _Step('Completed', 'completed', Icons.celebration_outlined),
                ];

          if (isDelivery &&
              (status == 'picked_up' ||
                  status == 'in_transit' ||
                  status == 'delivering')) {
            status = 'out_for_delivery';
          }

          final currentStep = steps.indexWhere((s) => s.key == status);
          final isActive = status != 'completed' && status != 'cancelled';
          final delivery = order['delivery'] as Map<String, dynamic>?;

          // Enable live location socket tracking for active delivery statuses
          if (isDelivery &&
              delivery != null &&
              (status == 'out_for_delivery' ||
                  status == 'delivering' ||
                  status == 'picked_up' ||
                  status == 'in_transit')) {
            _setupSocketTracking();
          }

          return SingleChildScrollView(
            physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ── Status Hero Card ──
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    gradient: status == 'cancelled'
                        ? LinearGradient(colors: [
                            AppColors.error,
                            AppColors.error.withValues(alpha: 0.8)
                          ])
                        : AppColors.primaryGradient,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: (status == 'cancelled'
                                ? AppColors.error
                                : AppColors.primary)
                            .withValues(alpha: 0.3),
                        blurRadius: 20,
                        offset: const Offset(0, 8),
                      )
                    ],
                  ),
                  child: Column(
                    children: [
                      // Pulsing status icon for active orders
                      AnimatedBuilder(
                        animation: _pulseCtrl,
                        builder: (_, child) => Transform.scale(
                          scale:
                              isActive ? (1.0 + _pulseCtrl.value * 0.08) : 1.0,
                          child: child,
                        ),
                        child: Icon(
                          _statusIcon(status),
                          size: 56,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        _statusLabel(status),
                        style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w900,
                            color: Colors.white),
                      ),
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 5),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(100),
                        ),
                        child: Text(
                          'Order #${order['_id']?.toString().substring(0, 8).toUpperCase() ?? '...'}',
                          style: const TextStyle(
                              color: Colors.white,
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 1),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // ── Live Rider Map Tracking ──
                if (isDelivery &&
                    delivery != null &&
                    (status == 'out_for_delivery' ||
                        status == 'delivering' ||
                        status == 'picked_up' ||
                        status == 'in_transit'))
                  _buildMapCard(order, delivery),
                const SizedBox(height: 20),

                // ── Pickup Code ──
                if ((order['pickupDetails']?['pickupCode'] ?? order['pickupCode']) != null &&
                    (status == 'confirmed' ||
                        status == 'preparing' ||
                        status == 'ready_for_pickup'))
                  _PickupCodeCard(
                    code: (order['pickupDetails']?['pickupCode'] ?? order['pickupCode']).toString(),
                    isReady: status == 'ready_for_pickup',
                    pulseAnimation: _pulseCtrl,
                  ),

                // ── Store Info (Pickup Only) ──
                if (order['fulfillmentType']?.toString().toLowerCase() ==
                        'pickup' &&
                    order['business'] != null &&
                    (status == 'confirmed' ||
                        status == 'preparing' ||
                        status == 'ready_for_pickup'))
                  _StoreInfoCard(business: order['business']),

                // ── Order Progress Timeline ──
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.border),
                    boxShadow: [
                      BoxShadow(
                          color: AppColors.char.withValues(alpha: 0.04),
                          blurRadius: 8,
                          offset: const Offset(0, 2))
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Order Progress',
                          style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                              color: AppColors.textPrimary)),
                      const SizedBox(height: 16),
                      ...steps.asMap().entries.map((entry) {
                        final i = entry.key;
                        final step = entry.value;
                        final isDone = i <= currentStep;
                        final isCurrent = i == currentStep;
                        return _TimelineStep(
                          step: step,
                          isDone: isDone,
                          isCurrent: isCurrent,
                          isLast: i == steps.length - 1,
                          pulseAnim: isCurrent ? _pulseCtrl : null,
                        );
                      }),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // ── Order Items ──
                if (order['items'] != null &&
                    (order['items'] as List).isNotEmpty)
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Order Items',
                            style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: AppColors.textPrimary)),
                        const SizedBox(height: 12),
                        ...((order['items'] as List)
                            .map((item) => _OrderItem(item: item))),
                        const SizedBox(height: 10),
                        // Total
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 12),
                          decoration: BoxDecoration(
                            color: AppColors.primarySurface,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('Total Paid',
                                  style: TextStyle(
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.primary)),
                              Text(
                                  'RWF ${order['total'] ?? order['totalAmount'] ?? 0}',
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w900,
                                      fontSize: 18,
                                      color: AppColors.primary)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                if (status == 'completed') ...[
                  const SizedBox(height: 16),
                  CnPrimaryButton(
                    label: 'Write a Review',
                    onTap: () =>
                        context.go('/orders/${widget.orderId}/review'),
                  ),
                ],
                const SizedBox(height: 24),
              ],
            ),
          );
        },
      ),
    );
  }

  IconData _statusIcon(String s) => switch (s) {
        'confirmed' => Icons.verified_rounded,
        'preparing' => Icons.restaurant_rounded,
        'ready_for_pickup' => Icons.shopping_bag_rounded,
        'out_for_delivery' || 'picked_up' || 'in_transit' || 'delivering' => Icons.delivery_dining_rounded,
        'completed' => Icons.stars_rounded,
        'cancelled' => Icons.cancel_rounded,
        _ => Icons.hourglass_empty_rounded,
      };

  String _statusLabel(String s) => switch (s) {
        'confirmed' => 'Order Confirmed',
        'preparing' => 'Being Prepared',
        'ready_for_pickup' => 'Ready for Pickup',
        'out_for_delivery' || 'picked_up' || 'in_transit' || 'delivering' => 'Out for Delivery',
        'completed' => 'Order Completed',
        'cancelled' => 'Order Cancelled',
        _ => 'Order Placed',
      };
}

class _Step {
  final String label;
  final String key;
  final IconData icon;
  const _Step(this.label, this.key, this.icon);
}

class _TimelineStep extends StatelessWidget {
  final _Step step;
  final bool isDone;
  final bool isCurrent;
  final bool isLast;
  final Animation<double>? pulseAnim;
  const _TimelineStep({
    required this.step,
    required this.isDone,
    required this.isCurrent,
    required this.isLast,
    this.pulseAnim,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            // Icon node
            AnimatedBuilder(
              animation: pulseAnim ?? const AlwaysStoppedAnimation(0),
              builder: (_, child) => Transform.scale(
                scale: isCurrent && pulseAnim != null
                    ? (1.0 + pulseAnim!.value * 0.12)
                    : 1.0,
                child: child,
              ),
              child: Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  gradient: isDone ? AppColors.primaryGradient : null,
                  color: isDone ? null : AppColors.surfaceVariant,
                  shape: BoxShape.circle,
                  border: isCurrent
                      ? Border.all(color: AppColors.primary, width: 2.5)
                      : null,
                  boxShadow: isCurrent
                      ? [
                          BoxShadow(
                              color: AppColors.primary.withValues(alpha: 0.3),
                              blurRadius: 10,
                              spreadRadius: 2)
                        ]
                      : null,
                ),
                child: Center(
                  child: Icon(
                    isDone ? (isCurrent ? step.icon : Icons.check_rounded) : step.icon,
                    size: 18,
                    color: isDone ? Colors.white : AppColors.textSecondary,
                  ),
                ),
              ),
            ),
            // Connector line
            if (!isLast)
              Container(
                width: 2,
                height: 36,
                decoration: BoxDecoration(
                  gradient: isDone
                      ? LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                              AppColors.primary,
                              AppColors.primary.withValues(alpha: 0.3)
                            ])
                      : null,
                  color: isDone ? null : AppColors.border,
                  borderRadius: BorderRadius.circular(1),
                ),
              ),
          ],
        ),
        const SizedBox(width: 14),
        Padding(
          padding: const EdgeInsets.only(top: 9),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(step.label,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: isCurrent ? FontWeight.w800 : FontWeight.w500,
                    color: isDone
                        ? AppColors.textPrimary
                        : AppColors.textSecondary,
                  )),
              if (isCurrent)
                const Text('In progress...',
                    style: TextStyle(
                        fontSize: 11,
                        color: AppColors.primary,
                        fontWeight: FontWeight.w600)),
            ],
          ),
        ),
      ],
    );
  }
}

class _OrderItem extends StatelessWidget {
  final dynamic item;
  const _OrderItem({required this.item});

  @override
  Widget build(BuildContext context) {
    final listing = item['listing'] is Map ? item['listing'] : {};
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: Container(
              width: 56,
              height: 56,
              color: AppColors.surfaceVariant,
              child: listing['photos'] != null &&
                      (listing['photos'] as List).isNotEmpty &&
                      (listing['photos'][0].toString().startsWith('http://') ||
                          listing['photos'][0]
                              .toString()
                              .startsWith('https://'))
                  ? Image.network(listing['photos'][0].toString(),
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => const Icon(
                          Icons.fastfood_outlined,
                          color: AppColors.textSecondary))
                  : const Icon(Icons.fastfood_outlined,
                      color: AppColors.textSecondary),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(listing['title'] ?? item['title'] ?? item['name'] ?? 'Item',
                    style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                        color: AppColors.textPrimary)),
                const SizedBox(height: 2),
                Text('× ${item['quantity']}',
                    style: const TextStyle(
                        fontSize: 12, color: AppColors.textSecondary)),
              ],
            ),
          ),
          Text('RWF ${item['price'] ?? 0}',
              style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 14,
                  color: AppColors.primary)),
        ],
      ),
    );
  }
}

class _PickupCodeCard extends StatelessWidget {
  final String code;
  final bool isReady;
  final Animation<double> pulseAnimation;
  const _PickupCodeCard({
    required this.code,
    required this.isReady,
    required this.pulseAnimation,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        AnimatedBuilder(
          animation: pulseAnimation,
          builder: (_, child) => Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: AppColors.successSurface,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: isReady
                    ? AppColors.success
                    : AppColors.success.withValues(alpha: 0.4),
                width: isReady ? 2.5 : 1.5,
              ),
              boxShadow: isReady
                  ? [
                      BoxShadow(
                        color: AppColors.success.withValues(
                            alpha: 0.15 + pulseAnimation.value * 0.15),
                        blurRadius: 16 + pulseAnimation.value * 8,
                        spreadRadius: pulseAnimation.value * 4,
                      ),
                    ]
                  : null,
            ),
            child: child,
          ),
          child: Column(
            children: [
              Text(
                isReady ? 'Your Order is Ready' : 'Pickup Verification Code',
                style: TextStyle(
                  fontSize: isReady ? 15 : 13,
                  fontWeight: FontWeight.w700,
                  color: AppColors.success,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                code,
                style: TextStyle(
                  fontSize: isReady ? 48 : 40,
                  fontWeight: FontWeight.w900,
                  color: AppColors.success,
                  letterSpacing: 10,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Show this code at the counter',
                style: TextStyle(fontSize: 12, color: AppColors.success),
              ),
              const SizedBox(height: 14),
              ScaleTap(
                onTap: () {
                  HapticFeedback.lightImpact();
                  Clipboard.setData(ClipboardData(text: code));
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: const Text('Pickup code copied!'),
                      backgroundColor: AppColors.success,
                      behavior: SnackBarBehavior.floating,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                      duration: const Duration(seconds: 2),
                    ),
                  );
                },
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  decoration: BoxDecoration(
                    color: AppColors.success.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                        color: AppColors.success.withValues(alpha: 0.3)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.copy_rounded,
                          size: 16, color: AppColors.success),
                      SizedBox(width: 8),
                      Text(
                        'Copy Code',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: AppColors.success,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
      ],
    );
  }
}

class _StoreInfoCard extends StatelessWidget {
  final Map<String, dynamic> business;
  const _StoreInfoCard({required this.business});

  String? get _storeName =>
      business['name']?.toString() ??
      business['businessName']?.toString();

  String? get _storeAddress =>
      business['address']?.toString() ??
      (business['location'] is Map
          ? (business['location'] as Map)['address']?.toString()
          : null);

  String? get _storePhone => business['phone']?.toString();

  List<double>? get _coordinates {
    final location = business['location'];
    if (location is Map && location['coordinates'] is List) {
      final coords = location['coordinates'] as List;
      if (coords.length >= 2) {
        return [
          (coords[1] as num).toDouble(), // lat
          (coords[0] as num).toDouble(), // lng
        ];
      }
    }
    return null;
  }

  Future<void> _callStore() async {
    final phone = _storePhone;
    if (phone == null) return;
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  Future<void> _getDirections() async {
    final coords = _coordinates;
    if (coords == null) return;
    final lat = coords[0];
    final lng = coords[1];
    final uri = Uri.parse(
        'https://www.google.com/maps/dir/?api=1&destination=$lat,$lng');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _getWazeDirections() async {
    final coords = _coordinates;
    if (coords == null) return;
    final lat = coords[0];
    final lng = coords[1];
    final uri = Uri.parse(
        'https://waze.com/ul?ll=$lat,$lng&navigate=yes');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final name = _storeName;
    final address = _storeAddress;
    final phone = _storePhone;
    final coords = _coordinates;

    if (name == null && address == null) return const SizedBox.shrink();

    return Column(
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.border),
            boxShadow: [
              BoxShadow(
                color: AppColors.char.withValues(alpha: 0.04),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.store_rounded,
                      size: 20, color: AppColors.primary),
                  SizedBox(width: 8),
                  Text(
                    'Pickup Location',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              if (name != null)
                Text(
                  name,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
              if (address != null) ...[
                const SizedBox(height: 4),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.location_on_outlined,
                        size: 16, color: AppColors.textSecondary),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        address,
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.textSecondary,
                          height: 1.4,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
              if (phone != null) ...[
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(Icons.phone_outlined,
                        size: 16, color: AppColors.textSecondary),
                    const SizedBox(width: 4),
                    Text(
                      phone,
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 16),
              Row(
                children: [
                  if (phone != null)
                    Expanded(
                      child: ScaleTap(
                        onTap: () {
                          HapticFeedback.lightImpact();
                          _callStore();
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          decoration: BoxDecoration(
                            color: AppColors.primarySurface,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                                color: AppColors.primary
                                    .withValues(alpha: 0.2)),
                          ),
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.phone_rounded,
                                  size: 16, color: AppColors.primary),
                              SizedBox(width: 6),
                              Text(
                                'Call Store',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.primary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  if (phone != null && coords != null)
                    const SizedBox(width: 10),
                  if (coords != null) ...[
                    Expanded(
                      child: ScaleTap(
                        onTap: () {
                          HapticFeedback.lightImpact();
                          _getDirections();
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          decoration: BoxDecoration(
                            gradient: AppColors.primaryGradient,
                            borderRadius: BorderRadius.circular(14),
                            boxShadow: [
                              BoxShadow(
                                color:
                                    AppColors.primary.withValues(alpha: 0.3),
                                blurRadius: 8,
                                offset: const Offset(0, 3),
                              ),
                            ],
                          ),
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.directions_rounded,
                                  size: 16, color: Colors.white),
                              SizedBox(width: 6),
                              Text(
                                'Google Maps',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: ScaleTap(
                        onTap: () {
                          HapticFeedback.lightImpact();
                          _getWazeDirections();
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          decoration: BoxDecoration(
                            color: AppColors.surface,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                                color: AppColors.primary
                                    .withValues(alpha: 0.2)),
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.char.withValues(alpha: 0.04),
                                blurRadius: 8,
                                offset: const Offset(0, 3),
                              ),
                            ],
                          ),
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.navigation_rounded,
                                  size: 16, color: AppColors.primary),
                              SizedBox(width: 6),
                              Text(
                                'Waze',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.primary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
      ],
    );
  }
}