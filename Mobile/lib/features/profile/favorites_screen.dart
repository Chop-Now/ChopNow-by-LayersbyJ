import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/widgets/feedback/cn_states.dart';
import '../../shared/widgets/cards/listing_card.dart';
import '../../core/models/listing_model.dart';
import '../../core/providers/cart_provider.dart';
import '../../core/providers/favorites_provider.dart';

class FavoritesScreen extends ConsumerWidget {
  const FavoritesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncFavorites = ref.watch(favoritesProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Favourites ❤️',
            style: TextStyle(
                fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
      ),
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: () async => ref.invalidate(favoritesProvider),
        child: asyncFavorites.when(
          loading: () => GridView.builder(
            padding: const EdgeInsets.all(16),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 0.70),
            itemCount: 4,
            itemBuilder: (_, __) => const ListingCardSkeleton(),
          ),
          error: (e, _) => CnErrorState(
              message: e.toString(),
              onRetry: () => ref.invalidate(favoritesProvider)),
          data: (favs) => favs.isEmpty
              ? const CnEmptyState(
                  title: 'No favourites yet',
                  subtitle:
                      'Tap the ❤️ on any listing to save it here for quick access',
                  imagePath: 'assets/images/empty_favorites.png',
                )
              : GridView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                      childAspectRatio: 0.70),
                  itemCount: favs.length,
                  itemBuilder: (_, i) {
                    final raw = favs[i];
                    final listing = raw is Map
                        ? (raw['listing'] ?? raw) as Map<String, dynamic>
                        : <String, dynamic>{};
                    final listingId = listing['_id'] ?? '';

                    return Dismissible(
                      key: ValueKey(listingId),
                      direction: DismissDirection.endToStart,
                      background: Container(
                        alignment: Alignment.centerRight,
                        padding: const EdgeInsets.only(right: 20),
                        decoration: BoxDecoration(
                          color: AppColors.error.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: const Icon(Icons.delete_outline_rounded,
                            color: AppColors.error, size: 28),
                      ),
                      confirmDismiss: (_) async {
                        HapticFeedback.mediumImpact();
                        await ref
                            .read(favoritesProvider.notifier)
                            .toggle(listingId);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Removed from favourites'),
                              behavior: SnackBarBehavior.floating,
                              backgroundColor: AppColors.textSecondary,
                              duration: Duration(seconds: 2),
                            ),
                          );
                        }
                        return false; // Provider already removed it
                      },
                      child: ListingCard(
                        listing: listing,
                        onTap: () => context.push('/listings/$listingId'),
                        onAddToCart: () {
                          final listingModel = Listing.fromJson(listing);
                          ref
                              .read(cartProvider.notifier)
                              .addItem(listingModel);
                          HapticFeedback.lightImpact();
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content:
                                  Text('${listingModel.title} added to cart'),
                              behavior: SnackBarBehavior.floating,
                              backgroundColor: AppColors.primary,
                              duration: const Duration(seconds: 2),
                            ),
                          );
                        },
                      ),
                    );
                  },
                ),
        ),
      ),
    );
  }
}
