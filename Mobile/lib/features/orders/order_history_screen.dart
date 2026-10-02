import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/models/order_model.dart';
import '../../core/providers/orders_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/widgets/feedback/cn_states.dart';
import '../../shared/animations/scale_tap.dart';
import '../../shared/widgets/inputs/animated_segmented_control.dart';

class OrderHistoryScreen extends ConsumerStatefulWidget {
  const OrderHistoryScreen({super.key});

  @override
  ConsumerState<OrderHistoryScreen> createState() => _OrderHistoryScreenState();
}

class _OrderHistoryScreenState extends ConsumerState<OrderHistoryScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) {
        setState(() {});
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final asyncOrders = ref.watch(ordersProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('My Orders',
            style: TextStyle(
                fontWeight: FontWeight.w900,
                color: AppColors.textPrimary,
                fontSize: 20)),
        backgroundColor: AppColors.surface,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(56),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
            child: AnimatedSegmentedControl(
              segments: const ['Active', 'Completed', 'Cancelled'],
              selectedIndex: _tabController.index,
              onValueChanged: (index) {
                _tabController.animateTo(index);
                setState(() {});
              },
            ),
          ),
        ),
      ),
      body: asyncOrders.when(
        loading: () => const Center(
            child: CircularProgressIndicator(color: AppColors.primary)),
        error: (e, _) => CnErrorState(
          message: e.toString(),
          onRetry: () => ref.invalidate(ordersProvider),
        ),
        data: (orders) {
          final active = orders.where((o) => o.isActive).toList();
          final completed = orders.where((o) => o.isCompleted).toList();
          final cancelled = orders.where((o) => o.isCancelled).toList();
          return TabBarView(
            controller: _tabController,
            children: [
              _OrderList(
                  orders: active,
                  emptyTitle: 'No active orders',
                  emptySubtitle: 'Your active orders will appear here'),
              _OrderList(
                  orders: completed,
                  emptyTitle: 'No completed orders',
                  emptySubtitle: 'Your order history will appear here'),
              _OrderList(
                  orders: cancelled,
                  emptyTitle: 'No cancelled orders',
                  emptySubtitle: 'Cancelled orders will appear here'),
            ],
          );
        },
      ),
    );
  }
}

class _OrderList extends ConsumerWidget {
  final List<Order> orders;
  final String emptyTitle;
  final String emptySubtitle;
  const _OrderList(
      {required this.orders,
      required this.emptyTitle,
      required this.emptySubtitle});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (orders.isEmpty) {
      return CnEmptyState(
        title: emptyTitle,
        subtitle: emptySubtitle,
        imagePath: 'assets/images/empty_orders.png',
      );
    }
    return RefreshIndicator(
      color: AppColors.primary,
      // M23: actually refetch (and let the RefreshIndicator's spinner track
      // the real fetch, via .future) instead of just delaying and doing
      // nothing - a pull-to-refresh that shows a spinner but never updates
      // the list is worse than no pull-to-refresh at all.
      onRefresh: () => ref.refresh(ordersProvider.future),
      child: ListView.separated(
        physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
        itemCount: orders.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (_, i) => _OrderCard(order: orders[i]),
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  final Order order;
  const _OrderCard({required this.order});

  @override
  Widget build(BuildContext context) {
    return ScaleTap(
      onTap: () {
        HapticFeedback.selectionClick();
        context.push('/orders/${order.id}');
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.border),
          boxShadow: [
            BoxShadow(
                color: AppColors.char.withValues(alpha: 0.04),
                blurRadius: 10,
                offset: const Offset(0, 3))
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.primarySurface,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.receipt_long_rounded,
                          size: 18, color: AppColors.primary),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      'Order #${order.id.substring(order.id.length > 8 ? order.id.length - 8 : 0).toUpperCase()}',
                      style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary),
                    ),
                  ],
                ),
                CnStatusPill.fromStatus(order.status),
              ],
            ),

            if (order.business != null) ...[
              const SizedBox(height: 10),
              Row(
                children: [
                  const Icon(Icons.storefront_outlined,
                      size: 14, color: AppColors.textSecondary),
                  const SizedBox(width: 5),
                  Text('${order.business!['name'] ?? ''}',
                      style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.textSecondary,
                          fontWeight: FontWeight.w500)),
                ],
              ),
            ],

            const SizedBox(height: 10),
            const Divider(color: AppColors.border, height: 1),
            const SizedBox(height: 10),

            // Items count and total
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.shopping_bag_outlined,
                        size: 14, color: AppColors.textSecondary),
                    const SizedBox(width: 5),
                    Text(
                      '${order.items.length} item${order.items.length == 1 ? '' : 's'}',
                      style: const TextStyle(
                          fontSize: 13, color: AppColors.textSecondary),
                    ),
                  ],
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.primarySurface,
                    borderRadius: BorderRadius.circular(100),
                  ),
                  child: Text(
                    'RWF ${order.total.toStringAsFixed(0)}',
                    style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: AppColors.primary),
                  ),
                ),
              ],
            ),

            if (order.isActive) ...[
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () {
                    HapticFeedback.selectionClick();
                    context.push('/orders/${order.id}/tracking');
                  },
                  icon: const Icon(Icons.my_location_rounded, size: 15),
                  label: const Text('Track Order',
                      style: TextStyle(fontWeight: FontWeight.w700)),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    side:
                        const BorderSide(color: AppColors.primary, width: 1.5),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
