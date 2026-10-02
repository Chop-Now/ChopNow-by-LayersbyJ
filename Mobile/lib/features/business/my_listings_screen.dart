import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/theme/app_colors.dart';
import 'widgets/biz_ui.dart';
import '../../shared/widgets/feedback/cn_states.dart';
import '../../shared/animations/scale_tap.dart';
import '../../shared/widgets/inputs/animated_segmented_control.dart';

import '../../core/providers/business_provider.dart';

final myListingsProvider = FutureProvider<List<dynamic>>((ref) async {
  final businesses = await ref.watch(myBusinessesProvider.future);
  if (businesses.isEmpty) return [];
  final businessId = businesses.first.id;
  final res =
      await ApiClient.instance.get(AppEndpoints.listingsByBusiness(businessId));
  final data = res.data;
  if (data is List) return data;
  if (data is Map) return (data['listings'] ?? data['data'] ?? []) as List;
  return [];
});

class MyListingsScreen extends ConsumerStatefulWidget {
  const MyListingsScreen({super.key});
  @override
  ConsumerState<MyListingsScreen> createState() => _MyListingsScreenState();
}

class _MyListingsScreenState extends ConsumerState<MyListingsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
    _tabs.addListener(() {
      if (!_tabs.indexIsChanging) {
        setState(() {});
      }
    });
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final asyncListings = ref.watch(myListingsProvider);

    List<int>? badgeCounts;
    asyncListings.whenData((all) {
      final active = all.where((l) => l['status'] == 'active').length;
      final expired = all
          .where((l) => l['status'] == 'expired' || l['status'] == 'sold_out')
          .length;
      final draft = all
          .where((l) => l['status'] == 'draft' || l['status'] == 'inactive')
          .length;
      badgeCounts = [active, expired, draft];
    });

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('My Listings',
            style: TextStyle(
                fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
        backgroundColor: AppColors.surface,
        automaticallyImplyLeading: false,
        elevation: 0,
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: ScaleTap(
              onTap: () => context.push('/business/listings/create'),
              child: Container(
                width: 36,
                height: 36,
                decoration: const BoxDecoration(
                    color: AppColors.primary, shape: BoxShape.circle),
                child: const Icon(Icons.add_rounded,
                    color: AppColors.surface, size: 22),
              ),
            ),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(56),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
            child: AnimatedSegmentedControl(
              segments: const ['Active', 'Expired', 'Draft'],
              selectedIndex: _tabs.index,
              badgeCounts: badgeCounts,
              onValueChanged: (index) {
                _tabs.animateTo(index);
                setState(() {});
              },
            ),
          ),
        ),
      ),
      body: asyncListings.when(
        loading: () => const Center(
            child: CircularProgressIndicator(color: AppColors.primary)),
        error: (e, _) => CnErrorState(
            message: e.toString(),
            onRetry: () => ref.invalidate(myListingsProvider)),
        data: (all) {
          final active = all.where((l) => l['status'] == 'active').toList();
          final expired = all
              .where(
                  (l) => l['status'] == 'expired' || l['status'] == 'sold_out')
              .toList();
          final draft = all
              .where((l) => l['status'] == 'draft' || l['status'] == 'inactive')
              .toList();

          return RefreshIndicator(
            color: AppColors.primary,
            onRefresh: () async => ref.invalidate(myListingsProvider),
            child: TabBarView(
              controller: _tabs,
              children: [
                _ListingTabView(
                    listings: active,
                    emptyLabel: 'No active listings',
                    onEdit: _editListing,
                    onDelete: _deleteListing),
                _ListingTabView(
                    listings: expired,
                    emptyLabel: 'No expired listings',
                    onEdit: _editListing,
                    onDelete: _deleteListing),
                _ListingTabView(
                    listings: draft,
                    emptyLabel: 'No draft listings',
                    onEdit: _editListing,
                    onDelete: _deleteListing),
              ],
            ),
          );
        },
      ),
    );
  }

  void _editListing(dynamic listing) =>
      context.push('/business/listings/${listing['_id']}/edit');

  Future<void> _deleteListing(String id) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delete Listing?',
            style: TextStyle(fontWeight: FontWeight.w700)),
        content: const Text('This action cannot be undone.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel')),
          TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Delete',
                  style: TextStyle(color: AppColors.error))),
        ],
      ),
    );
    if (confirmed == true) {
      try {
        await ApiClient.instance.delete(AppEndpoints.listingById(id));
        ref.invalidate(myListingsProvider);
        HapticFeedback.heavyImpact();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
                content: Text('Listing deleted'),
                backgroundColor: AppColors.error),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
                content: Text(
                    'Failed to delete: ${e.toString().replaceAll('Exception: ', '')}'),
                backgroundColor: AppColors.error),
          );
        }
      }
    }
  }
}

class _ListingTabView extends StatelessWidget {
  final List<dynamic> listings;
  final String emptyLabel;
  final void Function(dynamic) onEdit;
  final void Function(String) onDelete;

  const _ListingTabView(
      {required this.listings,
      required this.emptyLabel,
      required this.onEdit,
      required this.onDelete});

  @override
  Widget build(BuildContext context) {
    if (listings.isEmpty) {
      return CnEmptyState(
          title: emptyLabel, imagePath: 'assets/images/empty_orders.png');
    }
    return ListView.separated(
      physics:
          const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
      padding: const EdgeInsets.all(12),
      itemCount: listings.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (_, i) => _ListingCard(
          listing: listings[i], onEdit: onEdit, onDelete: onDelete),
    );
  }
}

class _ListingCard extends StatelessWidget {
  final dynamic listing;
  final void Function(dynamic) onEdit;
  final void Function(String) onDelete;
  const _ListingCard(
      {required this.listing, required this.onEdit, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    final photos = listing['photos'] as List? ?? [];
    final status = listing['status']?.toString() ?? 'active';
    final stock = listing['quantity'] ?? listing['stock'] ?? 0;

    final (color, label) = switch (status) {
      'active' => (AppColors.success, 'ACTIVE'),
      'expired' => (AppColors.error, 'EXPIRED'),
      'sold_out' => (AppColors.warning, 'SOLD OUT'),
      _ => (AppColors.textSecondary, 'DRAFT'),
    };

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        boxShadow: BizStyle.shadow(),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Thumbnail
          ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: Container(
              width: 76,
              height: 76,
              color: AppColors.surfaceVariant,
              child: photos.isNotEmpty &&
                      (photos[0].toString().startsWith('http://') ||
                          photos[0].toString().startsWith('https://'))
                  ? Image.network(photos[0].toString(), fit: BoxFit.cover)
                  : const Center(
                      child: Icon(Icons.fastfood_rounded,
                          color: AppColors.textSecondary, size: 28)),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Row(
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: BoxDecoration(
                        color: color,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      label,
                      style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.5,
                          color: color),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(listing['title'] ?? 'Untitled',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 15,
                        color: AppColors.textPrimary)),
                const SizedBox(height: 4),
                Text('$stock left',
                    style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.textSecondary,
                        fontWeight: FontWeight.w500)),
                const SizedBox(height: 8),
                Text('RWF ${listing['offerPrice'] ?? listing['price'] ?? 0}',
                    style: const TextStyle(
                        fontWeight: FontWeight.w900,
                        color: AppColors.textPrimary,
                        fontSize: 18)),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _ActionCircleButton(
                icon: Icons.refresh_rounded,
                onTap: () => onEdit(listing),
              ),
              const SizedBox(height: 12),
              _ActionCircleButton(
                icon: Icons.delete_outline_rounded,
                iconColor: AppColors.error,
                onTap: () => onDelete(listing['_id']?.toString() ?? ''),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ActionCircleButton extends StatelessWidget {
  final IconData icon;
  final Color? iconColor;
  final VoidCallback onTap;

  const _ActionCircleButton({
    required this.icon,
    this.iconColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        onTap();
      },
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: AppColors.surfaceVariant.withValues(alpha: 0.5),
          shape: BoxShape.circle,
        ),
        child: Icon(
          icon,
          size: 18,
          color: iconColor ?? AppColors.textSecondary,
        ),
      ),
    );
  }
}
