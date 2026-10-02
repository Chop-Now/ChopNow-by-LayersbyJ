import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/widgets/feedback/cn_states.dart';

final _businessProfileProvider =
    FutureProvider.family<Map<String, dynamic>, String>((ref, id) async {
  final res = await ApiClient.instance.get(AppEndpoints.businessById(id));
  final data = res.data;
  if (data is Map<String, dynamic>) {
    return (data['business'] ?? data['data'] ?? data) as Map<String, dynamic>;
  }
  return data as Map<String, dynamic>;
});

final _businessListingsForProfileProvider =
    FutureProvider.family<List<dynamic>, String>((ref, id) async {
  final res = await ApiClient.instance.get(AppEndpoints.listingsByBusiness(id));
  final data = res.data;
  if (data is List) return data;
  if (data is Map) return (data['listings'] ?? data['data'] ?? []) as List;
  return [];
});

class BusinessProfileScreen extends ConsumerWidget {
  final String businessId;
  const BusinessProfileScreen({super.key, required this.businessId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncBiz = ref.watch(_businessProfileProvider(businessId));
    final asyncListings =
        ref.watch(_businessListingsForProfileProvider(businessId));

    return Scaffold(
      backgroundColor: AppColors.background,
      body: asyncBiz.when(
        loading: () => const Center(
            child: CircularProgressIndicator(color: AppColors.primary)),
        error: (e, _) => Scaffold(
          appBar: AppBar(
              foregroundColor: AppColors.textPrimary,
              backgroundColor: AppColors.surface,
              elevation: 0),
          body: CnErrorState(
              message: e.toString(),
              onRetry: () =>
                  ref.invalidate(_businessProfileProvider(businessId))),
        ),
        data: (biz) => CustomScrollView(
          slivers: [
            // Cover / Hero
            SliverAppBar(
              expandedHeight: 220,
              pinned: true,
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              flexibleSpace: FlexibleSpaceBar(
                background: Stack(children: [
                  if (biz['coverImage'] != null &&
                      (biz['coverImage'].toString().startsWith('http://') ||
                          biz['coverImage'].toString().startsWith('https://')))
                    Image.network(biz['coverImage'],
                        width: double.infinity, height: 220, fit: BoxFit.cover)
                  else
                    Container(
                        decoration: const BoxDecoration(
                            gradient: AppColors.heroGradient)),
                  Container(color: AppColors.char.withValues(alpha: 0.3)),
                ]),
              ),
            ),

            SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Business info card
                  Container(
                    margin: const EdgeInsets.all(16),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.border),
                        boxShadow: [
                          BoxShadow(
                              color: AppColors.char.withValues(alpha: 0.05),
                              blurRadius: 8)
                        ]),
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(children: [
                            // Logo
                            ClipRRect(
                              borderRadius: BorderRadius.circular(12),
                              child: Container(
                                  width: 56,
                                  height: 56,
                                  color: AppColors.surfaceVariant,
                                  child: biz['logo'] != null &&
                                          (biz['logo']
                                                  .toString()
                                                  .startsWith('http://') ||
                                              biz['logo']
                                                  .toString()
                                                  .startsWith('https://'))
                                      ? Image.network(biz['logo'],
                                          fit: BoxFit.cover)
                                      : const Center(
                                          child: Text('🏪',
                                              style: TextStyle(fontSize: 28)))),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                                child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                  Text(biz['name'] ?? '',
                                      style: const TextStyle(
                                          fontSize: 18,
                                          fontWeight: FontWeight.w800,
                                          color: AppColors.textPrimary)),
                                  if (biz['type'] != null)
                                    Text(biz['type'],
                                        style: const TextStyle(
                                            fontSize: 13,
                                            color: AppColors.textSecondary)),
                                  if (biz['rating'] != null)
                                    Row(children: [
                                      const Icon(Icons.star_rounded,
                                          color: AppColors.accent, size: 14),
                                      const SizedBox(width: 2),
                                      Text('${biz['rating']}',
                                          style: const TextStyle(
                                              fontSize: 12,
                                              fontWeight: FontWeight.w600,
                                              color: AppColors.textPrimary)),
                                      Text(
                                          ' (${biz['reviewCount'] ?? 0} reviews)',
                                          style: const TextStyle(
                                              fontSize: 12,
                                              color: AppColors.textSecondary)),
                                    ]),
                                ])),
                          ]),
                          if (biz['description'] != null) ...[
                            const SizedBox(height: 12),
                            Text(biz['description'],
                                style: const TextStyle(
                                    fontSize: 13,
                                    color: AppColors.textSecondary,
                                    height: 1.5)),
                          ],
                          if (biz['address'] != null) ...[
                            const SizedBox(height: 8),
                            Row(children: [
                              const Icon(Icons.location_on_outlined,
                                  size: 14, color: AppColors.textSecondary),
                              const SizedBox(width: 4),
                              Expanded(
                                  child: Text(biz['address'],
                                      style: const TextStyle(
                                          fontSize: 12,
                                          color: AppColors.textSecondary))),
                            ]),
                          ],
                        ]),
                  ),

                  // Listings from this business
                  const Padding(
                    padding: EdgeInsets.fromLTRB(16, 0, 16, 8),
                    child: Text('Available Deals',
                        style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: AppColors.textPrimary)),
                  ),
                ],
              ),
            ),

            asyncListings.when(
              loading: () => const SliverToBoxAdapter(
                  child: Center(
                      child:
                          CircularProgressIndicator(color: AppColors.primary))),
              error: (e, _) => SliverToBoxAdapter(
                  child: CnErrorState(message: e.toString())),
              data: (listings) => listings.isEmpty
                  ? const SliverToBoxAdapter(
                      child: CnEmptyState(
                          title: 'No deals available',
                          subtitle: 'Check back soon!',
                          icon: Icons.fastfood_outlined))
                  : SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (ctx, i) {
                          final l = listings[i];
                          // Parse pricing info robustly
                          double price = 0;
                          double offerPrice = 0;
                          final rawPricing = l['pricing'];
                          if (rawPricing is Map) {
                            price = (rawPricing['originalPrice'] as num?)
                                    ?.toDouble() ??
                                (rawPricing['price'] as num?)?.toDouble() ??
                                0;
                            offerPrice =
                                (rawPricing['price'] as num?)?.toDouble() ??
                                    price;
                          } else {
                            price = (l['price'] as num?)?.toDouble() ?? 0;
                            offerPrice =
                                (l['offerPrice'] as num?)?.toDouble() ?? price;
                          }

                          // Parse photos info robustly
                          final rawPhotos = l['photos'];
                          final rawImages = l['images'];
                          final rawImage = l['image'];
                          final String? img = (rawPhotos is List &&
                                  rawPhotos.isNotEmpty)
                              ? rawPhotos.firstOrNull?.toString()
                              : ((rawImages is List && rawImages.isNotEmpty)
                                  ? rawImages.firstOrNull?.toString()
                                  : ((rawImage is List && rawImage.isNotEmpty)
                                      ? rawImage.firstOrNull?.toString()
                                      : rawImage?.toString()));

                          return ListTile(
                            leading: ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: Container(
                                    width: 48,
                                    height: 48,
                                    color: AppColors.surfaceVariant,
                                    child: img != null &&
                                            (img.startsWith('http://') ||
                                                img.startsWith('https://'))
                                        ? Image.network(img, fit: BoxFit.cover)
                                        : const Icon(Icons.fastfood_outlined,
                                            color: AppColors.textSecondary))),
                            title: Text(l['title'] ?? '',
                                style: const TextStyle(
                                    fontWeight: FontWeight.w600)),
                            subtitle: Text(
                                'RWF ${offerPrice.toStringAsFixed(0)}',
                                style: const TextStyle(
                                    color: AppColors.primary,
                                    fontWeight: FontWeight.w700)),
                            trailing: const Icon(Icons.chevron_right_rounded,
                                color: AppColors.textSecondary),
                            onTap: () => context.push('/listings/${l['_id']}'),
                          );
                        },
                        childCount: listings.length,
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
