import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/api/api_exception.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/widgets/feedback/cn_states.dart';

// ── Providers ─────────────────────────────────────────────────────────────────

final _availableOrdersProvider = FutureProvider<List<dynamic>>((ref) async {
  try {
    final res = await ApiClient.instance.get(AppEndpoints.availableDeliveries);
    final data = res.data;
    final List rawList;
    if (data is List) {
      rawList = data;
    } else if (data is Map) {
      rawList = data['deliveries'] ?? data['data'] ?? [];
    } else {
      rawList = [];
    }

    // Map Delivery objects to look like what the widget expects
    return rawList.map((d) {
      final order = d['order'] ?? {};
      return {
        '_id': d['_id']?.toString() ?? '', // deliveryId
        'orderId': order['_id']?.toString() ?? '',
        'business': {
          'name': d['pickupLocation']?['businessName'] ?? 'Restaurant',
          'address': d['pickupLocation']?['address'] ?? '',
        },
        'total': d['deliveryFee'] ?? order['pricing']?['deliveryFee'] ?? 0,
        'items': [], // no items in available deliveries list
      };
    }).toList();
  } catch (e) {
    throw ApiException.fromDioError(e);
  }
});

final _myDeliveriesProvider = FutureProvider<List<dynamic>>((ref) async {
  try {
    final res = await ApiClient.instance.get(AppEndpoints.myDeliveries);
    final data = res.data;
    final List rawList;
    if (data is List) {
      rawList = data;
    } else if (data is Map) {
      rawList = data['deliveries'] ?? data['data'] ?? [];
    } else {
      rawList = [];
    }

    return rawList.map((d) {
      final order = d['order'] ?? {};
      return {
        '_id': order['_id']?.toString() ?? '', // orderId for navigation
        'deliveryId': d['_id']?.toString() ?? '',
        'status': order['status'] ?? d['status'] ?? '',
        'total': d['deliveryFee'] ?? 0,
      };
    }).toList();
  } catch (e) {
    throw ApiException.fromDioError(e);
  }
});

final _riderStatsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  try {
    final res = await ApiClient.instance.get(AppEndpoints.riderStats);
    final data = res.data;
    if (data is Map && data['success'] == true) {
      return data['stats'] is Map
          ? Map<String, dynamic>.from(data['stats'])
          : {};
    }
    return data is Map<String, dynamic> ? data : {};
  } catch (e) {
    throw ApiException.fromDioError(e);
  }
});

// ── Screen ────────────────────────────────────────────────────────────────────

class RiderDashboardScreen extends ConsumerStatefulWidget {
  const RiderDashboardScreen({super.key});

  @override
  ConsumerState<RiderDashboardScreen> createState() =>
      _RiderDashboardScreenState();
}

class _RiderDashboardScreenState extends ConsumerState<RiderDashboardScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabs;
  bool _isOnline = true;
  bool _isTogglingOnline = false;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
    _loadAvailability();
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  String _fmt(int value) {
    final s = value.toString();
    final buf = StringBuffer();
    for (int i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 == 0) buf.write(',');
      buf.write(s[i]);
    }
    return buf.toString();
  }

  Future<void> _loadAvailability() async {
    try {
      final res = await ApiClient.instance.get(AppEndpoints.riderAvailability);
      if (mounted) {
        setState(() => _isOnline = res.data['isOnline'] == true);
      }
    } catch (_) {
      // Default to true if API unavailable
    }
  }

  Future<void> _toggleOnline() async {
    HapticFeedback.mediumImpact();
    setState(() => _isTogglingOnline = true);
    try {
      await ApiClient.instance.put(
        AppEndpoints.riderAvailability,
        data: {'isOnline': !_isOnline},
      );
      setState(() => _isOnline = !_isOnline);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
                'Could not update availability: ${e.toString().replaceAll('Exception: ', '')}'),
            backgroundColor: AppColors.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isTogglingOnline = false);
    }
  }

  Future<void> _acceptDelivery(String deliveryId) async {
    HapticFeedback.mediumImpact();
    try {
      await ApiClient.instance.patch(
        AppEndpoints.assignDelivery(deliveryId),
      );
      ref.invalidate(_availableOrdersProvider);
      ref.invalidate(_myDeliveriesProvider);
      if (mounted) {
        _tabs.animateTo(1);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Order accepted! Head to the restaurant'),
            backgroundColor: AppColors.primary,
            behavior: SnackBarBehavior.floating,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
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
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    final asyncAvailable = ref.watch(_availableOrdersProvider);
    final asyncMyDeliveries = ref.watch(_myDeliveriesProvider);
    final asyncStats = ref.watch(_riderStatsProvider);

    final stats = asyncStats.value ?? {};
    final totalDeliveries = stats['totalDeliveries']?.toString() ?? '-';
    final todayEarningsVal = stats['todayEarnings'];
    final todayEarnings =
        todayEarningsVal is num ? 'RWF ${_fmt(todayEarningsVal.toInt())}' : '-';
    final ratingVal = stats['rating'];
    final rating = ratingVal is num ? ratingVal.toStringAsFixed(1) : '-';

    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        physics: const NeverScrollableScrollPhysics(),
        slivers: [
          // ── Premium Header ──────────────────────────────────────────────────
          SliverAppBar(
            expandedHeight: 210,
            pinned: true,
            automaticallyImplyLeading: false,
            backgroundColor: AppColors.primary,
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: const BoxDecoration(
                  gradient: AppColors.heroGradient,
                ),
                child: SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Top row: greeting + online toggle
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Hello ${user?.firstName ?? 'Rider'} 👋',
                                    style: const TextStyle(
                                      fontSize: 22,
                                      fontWeight: FontWeight.w800,
                                      color: Colors.white,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    _isOnline
                                        ? 'You\'re available for deliveries'
                                        : 'You\'re currently offline',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color:
                                          Colors.white.withValues(alpha: 0.75),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            // Online/Offline pill toggle
                            GestureDetector(
                              onTap: _isTogglingOnline ? null : _toggleOnline,
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 300),
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 14, vertical: 8),
                                decoration: BoxDecoration(
                                  color: _isOnline
                                      ? Colors.white.withValues(alpha: 0.2)
                                      : Colors.black.withValues(alpha: 0.3),
                                  borderRadius: BorderRadius.circular(100),
                                  border: Border.all(
                                    color: Colors.white.withValues(alpha: 0.4),
                                  ),
                                ),
                                child: Row(children: [
                                  AnimatedContainer(
                                    duration: const Duration(milliseconds: 300),
                                    width: 8,
                                    height: 8,
                                    decoration: BoxDecoration(
                                      color: _isOnline
                                          ? AppColors.nowYellow
                                          : Colors.white.withValues(alpha: 0.4),
                                      shape: BoxShape.circle,
                                      boxShadow: _isOnline
                                          ? [
                                              BoxShadow(
                                                color: AppColors.nowYellow
                                                    .withValues(alpha: 0.6),
                                                blurRadius: 6,
                                              )
                                            ]
                                          : null,
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    _isOnline ? 'Online' : 'Offline',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w700,
                                      fontSize: 13,
                                    ),
                                  ),
                                ]),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),
                        // Stats row
                        Row(
                          children: [
                            _StatCard(
                                icon: Icons.check_circle_outline_rounded,
                                label: 'Delivered',
                                value: totalDeliveries),
                            const SizedBox(width: 12),
                            _StatCard(
                                icon: Icons.payments_outlined,
                                label: 'Today',
                                value: todayEarnings),
                            const SizedBox(width: 12),
                            _StatCard(
                                icon: Icons.star_rounded,
                                label: 'Rating',
                                value: rating),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            bottom: PreferredSize(
              preferredSize: const Size.fromHeight(48),
              child: Container(
                color: AppColors.surface,
                child: TabBar(
                  controller: _tabs,
                  labelColor: AppColors.primary,
                  unselectedLabelColor: AppColors.textSecondary,
                  indicatorColor: AppColors.primary,
                  indicatorWeight: 3,
                  labelStyle: const TextStyle(
                      fontWeight: FontWeight.w700, fontSize: 13),
                  unselectedLabelStyle: const TextStyle(
                      fontWeight: FontWeight.w500, fontSize: 13),
                  tabs: [
                    Tab(
                      child: Row(mainAxisSize: MainAxisSize.min, children: [
                        const Icon(Icons.inventory_2_outlined, size: 16),
                        const SizedBox(width: 6),
                        const Text('Available'),
                        if (asyncAvailable.hasValue &&
                            asyncAvailable.value!.isNotEmpty) ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.primary,
                              borderRadius: BorderRadius.circular(100),
                            ),
                            child: Text(
                              '${asyncAvailable.value!.length}',
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800),
                            ),
                          ),
                        ],
                      ]),
                    ),
                    const Tab(
                      child: Row(mainAxisSize: MainAxisSize.min, children: [
                        Icon(Icons.delivery_dining_rounded, size: 16),
                        SizedBox(width: 6),
                        Text('My Deliveries'),
                      ]),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // ── Tab Content ─────────────────────────────────────────────────────
          SliverFillRemaining(
            child: TabBarView(
              controller: _tabs,
              children: [
                // ── Available Orders Tab ──────────────────────────────────────
                _isOnline
                    ? RefreshIndicator(
                        color: AppColors.primary,
                        onRefresh: () async {
                          ref.invalidate(_availableOrdersProvider);
                          ref.invalidate(_riderStatsProvider);
                        },
                        child: asyncAvailable.when(
                          loading: () => const Center(
                            child: CircularProgressIndicator(
                                color: AppColors.primary),
                          ),
                          error: (e, _) => CnErrorState(
                            message: e.toString(),
                            onRetry: () =>
                                ref.invalidate(_availableOrdersProvider),
                          ),
                          data: (orders) => orders.isEmpty
                              ? const CnEmptyState(
                                  title: 'No orders nearby',
                                  subtitle:
                                      'New pickup requests will appear here',
                                  imagePath: 'assets/images/empty_orders.png',
                                )
                              : ListView.separated(
                                  padding: const EdgeInsets.all(16),
                                  itemCount: orders.length,
                                  separatorBuilder: (_, __) =>
                                      const SizedBox(height: 12),
                                  itemBuilder: (_, i) => _AvailableOrderCard(
                                    order: orders[i],
                                    onAccept: () =>
                                        _acceptDelivery(orders[i]['_id']),
                                  ),
                                ),
                        ),
                      )
                    : const CnEmptyState(
                        title: 'You\'re offline',
                        subtitle:
                            'Switch online to start accepting delivery requests',
                        icon: Icons.wifi_off_rounded,
                      ),

                // ── My Deliveries Tab ─────────────────────────────────────────
                RefreshIndicator(
                  color: AppColors.primary,
                  onRefresh: () async {
                    ref.invalidate(_myDeliveriesProvider);
                    ref.invalidate(_riderStatsProvider);
                  },
                  child: asyncMyDeliveries.when(
                    loading: () => const Center(
                      child:
                          CircularProgressIndicator(color: AppColors.primary),
                    ),
                    error: (e, _) => CnErrorState(
                      message: e.toString(),
                      onRetry: () => ref.invalidate(_myDeliveriesProvider),
                    ),
                    data: (orders) => orders.isEmpty
                        ? const CnEmptyState(
                            title: 'No active deliveries',
                            subtitle: 'Accept an order to start delivering!',
                            imagePath: 'assets/images/empty_orders.png',
                          )
                        : ListView.separated(
                            padding: const EdgeInsets.all(16),
                            itemCount: orders.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(height: 12),
                            itemBuilder: (_, i) =>
                                _MyDeliveryCard(order: orders[i]),
                          ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label, value;
  const _StatCard(
      {required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
        ),
        child: Column(children: [
          Icon(icon, size: 18, color: Colors.white),
          const SizedBox(height: 4),
          Text(value,
              style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  color: Colors.white)),
          Text(label,
              style: TextStyle(
                  fontSize: 10, color: Colors.white.withValues(alpha: 0.7))),
        ]),
      ),
    );
  }
}

// ── Available Order Card ──────────────────────────────────────────────────────

class _AvailableOrderCard extends StatefulWidget {
  final dynamic order;
  final VoidCallback onAccept;
  const _AvailableOrderCard({required this.order, required this.onAccept});

  @override
  State<_AvailableOrderCard> createState() => _AvailableOrderCardState();
}

class _AvailableOrderCardState extends State<_AvailableOrderCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
        duration: const Duration(milliseconds: 120), vsync: this);
    _scale = Tween<double>(begin: 1.0, end: 0.97)
        .animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut));
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final biz = widget.order['business'] is Map ? widget.order['business'] : {};
    final items =
        widget.order['items'] is List ? widget.order['items'] as List : [];
    final total = widget.order['total'] ?? 0;

    return ScaleTransition(
      scale: _scale,
      child: GestureDetector(
        onTapDown: (_) => _ctrl.forward(),
        onTapUp: (_) => _ctrl.reverse(),
        onTapCancel: () => _ctrl.reverse(),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border:
                Border.all(color: AppColors.primary.withValues(alpha: 0.15)),
            boxShadow: [
              BoxShadow(
                  color: AppColors.primary.withValues(alpha: 0.06),
                  blurRadius: 16,
                  offset: const Offset(0, 4)),
              BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04), blurRadius: 8),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Business row
              Row(
                children: [
                  Container(
                    width: 46,
                    height: 46,
                    decoration: BoxDecoration(
                      gradient: AppColors.primaryGradient,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Center(
                        child: Icon(Icons.storefront_rounded,
                            color: Colors.white, size: 22)),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          biz['name'] ?? 'Restaurant',
                          style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 15,
                              color: AppColors.textPrimary),
                        ),
                        if (biz['address'] != null)
                          Text(
                            biz['address'] as String,
                            style: const TextStyle(
                                fontSize: 12, color: AppColors.textSecondary),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                      ],
                    ),
                  ),
                  // Earnings badge
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      gradient: AppColors.primaryGradient,
                      borderRadius: BorderRadius.circular(100),
                    ),
                    child: Text(
                      'RWF $total',
                      style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                          fontSize: 12),
                    ),
                  ),
                ],
              ),

              if (items.isNotEmpty) ...[
                const SizedBox(height: 10),
                const Divider(height: 1, color: AppColors.border),
                const SizedBox(height: 10),
                // Items summary
                Text(
                  '${items.length} item${items.length == 1 ? '' : 's'} • ${items.map((i) => i['name'] ?? '').take(2).join(', ')}${items.length > 2 ? '...' : ''}',
                  style: const TextStyle(
                      fontSize: 12, color: AppColors.textSecondary),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],

              const SizedBox(height: 14),

              // Actions
              Row(children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => context
                        .push('/rider/deliveries/${widget.order['orderId']}'),
                    icon: const Icon(Icons.map_outlined, size: 16),
                    label: const Text('View Route'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.textSecondary,
                      side: const BorderSide(color: AppColors.border),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: widget.onAccept,
                    icon: const Icon(Icons.delivery_dining_rounded, size: 16),
                    label: const Text('Accept'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),
              ]),
            ],
          ),
        ),
      ),
    );
  }
}

// ── My Delivery Card ──────────────────────────────────────────────────────────

class _MyDeliveryCard extends StatelessWidget {
  final dynamic order;
  const _MyDeliveryCard({required this.order});

  Color get _statusColor {
    final s = order['status']?.toString() ?? '';
    return switch (s) {
      'delivering' => AppColors.primary,
      'delivered' || 'completed' => AppColors.info,
      'cancelled' => AppColors.error,
      _ => AppColors.warning,
    };
  }

  String get _statusLabel {
    final s = order['status']?.toString() ?? '';
    return switch (s) {
      'delivering' => 'In Transit',
      'delivered' || 'completed' => 'Delivered',
      'cancelled' => 'Cancelled',
      'ready_for_pickup' => 'Ready for Pickup',
      _ => s,
    };
  }

  @override
  Widget build(BuildContext context) {
    final id = (order['_id'] ?? '').toString();
    final shortId = id.length >= 8 ? id.substring(0, 8) : id;
    final total = order['total'] ?? 0;

    return GestureDetector(
      onTap: () => context.push('/rider/deliveries/$id'),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
          boxShadow: [
            BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 8,
                offset: const Offset(0, 2))
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                color: _statusColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Center(
                  child: Icon(Icons.delivery_dining_rounded,
                      size: 22, color: _statusColor)),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Order #$shortId',
                      style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                          color: AppColors.textPrimary)),
                  const SizedBox(height: 4),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: _statusColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(100),
                    ),
                    child: Text(_statusLabel,
                        style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: _statusColor)),
                  ),
                ],
              ),
            ),
            Text('RWF $total',
                style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    color: AppColors.primary,
                    fontSize: 14)),
            const SizedBox(width: 8),
            const Icon(Icons.chevron_right,
                color: AppColors.textSecondary, size: 20),
          ],
        ),
      ),
    );
  }
}
