import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/business_provider.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/models/business_model.dart';
import '../../core/models/order_model.dart';
import '../../core/services/socket_service.dart';
import '../../core/theme/app_colors.dart';
import 'widgets/biz_ui.dart';
import '../../shared/widgets/feedback/cn_states.dart';

class BusinessDashboardScreen extends ConsumerStatefulWidget {
  const BusinessDashboardScreen({super.key});

  @override
  ConsumerState<BusinessDashboardScreen> createState() =>
      _BusinessDashboardScreenState();
}

class _BusinessDashboardScreenState
    extends ConsumerState<BusinessDashboardScreen> {
  StreamSubscription<Map<String, dynamic>>? _newOrderSub;
  String? _joinedBusinessId;

  @override
  void initState() {
    super.initState();
    // M25: surface new orders the moment they arrive, not only after a
    // manual pull-to-refresh.
    _newOrderSub = SocketService().newOrderStream.listen(_onNewOrder);
  }

  @override
  void dispose() {
    _newOrderSub?.cancel();
    super.dispose();
  }

  void _onNewOrder(Map<String, dynamic> data) {
    if (!mounted) return;
    // Stats (revenue/order count) come from myBusinessesProvider - refresh
    // it so the numbers on screen reflect this order too.
    ref.invalidate(myBusinessesProvider);
    Order? order;
    try {
      order = Order.fromJson(data);
    } catch (_) {
      order = null;
    }
    final amount =
        order != null ? 'RWF ${order.total.toStringAsFixed(0)}' : '';
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          order != null
              ? 'New order received - $amount'
              : 'New order received',
        ),
        backgroundColor: AppColors.moringa,
        behavior: SnackBarBehavior.floating,
        action: SnackBarAction(
          label: 'View',
          textColor: AppColors.fufu,
          onPressed: () => context.push('/business/orders'),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final asyncBusinesses = ref.watch(myBusinessesProvider);
    final user = ref.watch(currentUserProvider);

    // Join this business's socket room as soon as we know its id - the
    // backend only broadcasts new_order to sockets that have joined
    // business_<id> (see socket_service.dart's joinBusinessRoom).
    asyncBusinesses.whenData((businesses) {
      if (businesses.isNotEmpty && _joinedBusinessId != businesses.first.id) {
        _joinedBusinessId = businesses.first.id;
        SocketService().joinBusinessRoom(_joinedBusinessId!);
      }
    });

    return Scaffold(
      backgroundColor: AppColors.background,
      extendBodyBehindAppBar: true,
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: () async => ref.invalidate(myBusinessesProvider),
        child: asyncBusinesses.when(
          loading: () => const Center(
              child: CircularProgressIndicator(color: AppColors.primary)),
          error: (e, _) => CnErrorState(
              message: e.toString(),
              onRetry: () => ref.invalidate(myBusinessesProvider)),
          data: (businesses) {
            if (businesses.isEmpty) {
              return CnEmptyState(
                title: 'No businesses yet',
                subtitle:
                    'Create your first business to start selling rescued food',
                icon: Icons.storefront_outlined,
                actionLabel: 'Create Business',
                onAction: () => context.push('/business/create'),
              );
            }
            final business = businesses.first;
            if (!business.isApproved) {
              WidgetsBinding.instance.addPostFrameCallback((_) {
                if (business.isPending) {
                  context.go('/business/pending-review');
                } else {
                  context.go('/business/verify');
                }
              });
              return const Center(
                  child: CircularProgressIndicator(color: AppColors.primary));
            }
            return ListView(
              padding: EdgeInsets.zero,
              children: [
                _DashboardHeader(
                  name: user?.firstName ?? 'Owner',
                  businessName: business.name,
                  logo: business.logo,
                  onNotifications: () => context.push('/notifications'),
                  onAddBusiness: () => context.push('/business/create'),
                  onBuyerMode: () async {
                    await ref
                        .read(authProvider.notifier)
                        .switchRole('consumer');
                    if (context.mounted) context.go('/home');
                  },
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 0),
                  child: Column(
                    children: [
                      ...businesses.map((b) => _BusinessCard(business: b)),
                      const SizedBox(height: 90), // FAB + nav space
                    ],
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _BusinessCard extends StatelessWidget {
  final Business business;
  const _BusinessCard({required this.business});

  @override
  Widget build(BuildContext context) {
    if (business.isPending) {
      return Container(
        margin: const EdgeInsets.only(bottom: 14),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.warningSurface,
          borderRadius: BorderRadius.circular(16),
        ),
        child: const Row(children: [
          Icon(Icons.hourglass_top_rounded, size: 24, color: AppColors.warning),
          SizedBox(width: 12),
          Expanded(
              child: Text('Awaiting admin approval (24-48 hrs)',
                  style: TextStyle(
                      fontSize: 14,
                      color: AppColors.warning,
                      fontWeight: FontWeight.w600))),
        ]),
      );
    }

    final totalRevenue =
        (business.stats?['totalRevenue'] as num?)?.toDouble() ?? 0.0;
    final totalOrders = (business.stats?['totalOrders'] as num?)?.toInt() ?? 0;
    final activeListings =
        (business.stats?['activeListings'] as num?)?.toInt() ?? 0;
    final rating = (business.stats?['rating'] as num?)?.toDouble() ?? 0.0;
    final statusLabel = business.isApproved ? 'Active' : 'Pending';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 18),

        // Headline metric
        BizHeroCard(
          label: 'TOTAL REVENUE',
          value: 'RWF ${totalRevenue.toStringAsFixed(0)}',
          caption: '${business.name} · ${business.type}',
          stats: [
            (
              icon: Icons.receipt_long_rounded,
              label: 'Orders',
              value: '$totalOrders'
            ),
            (
              icon: Icons.inventory_2_rounded,
              label: 'Listings',
              value: '$activeListings'
            ),
            (
              icon: Icons.star_rounded,
              label: 'Rating',
              value: rating > 0 ? rating.toStringAsFixed(1) : '—'
            ),
          ],
        ),

        const SizedBox(height: 24),
        const BizSectionHeader(
          title: 'Today',
          subtitle: 'How your store is doing right now',
        ),
        Row(
          children: [
            Expanded(
              child: BizStatTile(
                icon: Icons.account_balance_wallet_rounded,
                color: AppColors.moringa,
                value: 'RWF ${totalRevenue.toStringAsFixed(0)}',
                label: 'Revenue',
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: BizStatTile(
                icon: Icons.shopping_bag_rounded,
                color: AppColors.pepper,
                value: '$totalOrders',
                label: 'Orders',
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: BizStatTile(
                icon: Icons.inventory_2_rounded,
                color: AppColors.accentDark,
                value: '$activeListings',
                label: 'Active listings',
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: BizStatTile(
                icon: Icons.verified_rounded,
                color: AppColors.success,
                value: statusLabel,
                label: 'Store status',
              ),
            ),
          ],
        ),

        const SizedBox(height: 24),
        const BizSectionHeader(
          title: 'Manage',
          subtitle: 'Jump straight into the day-to-day',
        ),
        Row(
          children: [
            Expanded(
              child: _ManageTile(
                icon: Icons.inventory_2_rounded,
                label: 'Listings',
                color: AppColors.moringa,
                onTap: () => context.push('/business/listings'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _ManageTile(
                icon: Icons.receipt_long_rounded,
                label: 'Orders',
                color: AppColors.pepper,
                onTap: () => context.push('/business/orders'),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _ManageTile(
                icon: Icons.account_balance_wallet_rounded,
                label: 'Payouts',
                color: AppColors.accentDark,
                onTap: () => context.push('/business/payouts'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _ManageTile(
                icon: Icons.insights_rounded,
                label: 'Analytics',
                color: AppColors.info,
                onTap: () => context.push('/business/analytics'),
              ),
            ),
          ],
        ),

        const SizedBox(height: 22),
        SizedBox(
          width: double.infinity,
          height: 56,
          child: ElevatedButton.icon(
            onPressed: () => context.push('/business/listings/create'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.moringa,
              foregroundColor: AppColors.fufu,
              elevation: 0,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(28)),
            ),
            icon: const Icon(Icons.add_rounded, size: 20),
            label: const Text('Add new listing',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
          ),
        ),

        const SizedBox(height: 26),
        BizSectionHeader(
          title: 'Recent activity',
          actionLabel: 'See all',
          onAction: () => context.push('/business/orders'),
        ),
        const BizCard(
          padding: EdgeInsets.symmetric(vertical: 30),
          child: Column(
            children: [
              BizIconChip(
                  icon: Icons.inbox_rounded,
                  color: AppColors.textTertiary,
                  size: 46),
              SizedBox(height: 12),
              Text('No recent activity',
                  style: TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary)),
              SizedBox(height: 3),
              Text('New orders will show up here.',
                  style:
                      TextStyle(fontSize: 12, color: AppColors.textSecondary)),
            ],
          ),
        ),
      ],
    );
  }
}

/// Soft square tile used for the Manage grid.
class _ManageTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _ManageTile({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return BizCard(
      onTap: () {
        HapticFeedback.selectionClick();
        onTap();
      },
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
      child: Row(
        children: [
          BizIconChip(icon: icon, color: color, size: 40),
          const SizedBox(width: 13),
          Expanded(
            child: Text(
              label,
              style: const TextStyle(
                  fontSize: 14.5,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary),
            ),
          ),
          const Icon(Icons.chevron_right_rounded,
              size: 19, color: AppColors.textTertiary),
        ],
      ),
    );
  }
}

/// Premium dashboard header: a Moringa gradient panel carrying the greeting
/// and quick actions, with the page content curving up over it.
class _DashboardHeader extends StatelessWidget {
  final String name;
  final String businessName;
  final String? logo;
  final VoidCallback onNotifications;
  final VoidCallback onAddBusiness;
  final VoidCallback onBuyerMode;

  const _DashboardHeader({
    required this.name,
    required this.businessName,
    required this.logo,
    required this.onNotifications,
    required this.onAddBusiness,
    required this.onBuyerMode,
  });

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.of(context).padding.top;
    // Region covers the status bar strip, so the dark panel gets light icons.
    // iOS reads statusBarBrightness (the backdrop); Android the icon colour.
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.light,
        statusBarBrightness: Brightness.dark,
      ),
      child: Container(
        padding: EdgeInsets.fromLTRB(20, top + 14, 20, 26),
        decoration: const BoxDecoration(
          gradient: AppColors.heroGradient,
          borderRadius: BorderRadius.only(
            bottomLeft: Radius.circular(28),
            bottomRight: Radius.circular(28),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppColors.fufu.withValues(alpha: 0.14),
                    border: Border.all(
                        color: AppColors.fufu.withValues(alpha: 0.25)),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: (logo != null && logo!.isNotEmpty)
                      ? Image.network(logo!,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => const Icon(
                              Icons.storefront_rounded,
                              color: AppColors.nowYellow,
                              size: 22))
                      : const Icon(Icons.storefront_rounded,
                          color: AppColors.nowYellow, size: 22),
                ),
                const SizedBox(width: 13),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Welcome back, $name',
                        style: TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w500,
                          color: AppColors.fufu.withValues(alpha: 0.7),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        businessName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 19,
                          fontWeight: FontWeight.w800,
                          color: AppColors.fufu,
                          letterSpacing: -0.3,
                        ),
                      ),
                    ],
                  ),
                ),
                _HeaderIconButton(
                    icon: Icons.notifications_none_rounded,
                    onTap: onNotifications),
                const SizedBox(width: 8),
                _HeaderIconButton(
                    icon: Icons.shopping_bag_outlined, onTap: onBuyerMode),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _HeaderIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _HeaderIconButton({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 38,
        height: 38,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: AppColors.fufu.withValues(alpha: 0.13),
          border: Border.all(color: AppColors.fufu.withValues(alpha: 0.2)),
        ),
        child: Icon(icon, size: 18, color: AppColors.fufu),
      ),
    );
  }
}
