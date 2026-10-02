import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:shimmer/shimmer.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../animations/scale_tap.dart';
import '../listings/expiry_countdown.dart';

enum CardVariant { grid, list }

/// ListingCard — core card matching the web's ProductCard
/// Shows: livephoto, business name, discount badge, selling-fast badge,
/// price, countdown timer, distance, and add-to-cart button.
class ListingCard extends StatelessWidget {
  final Map<String, dynamic> listing;
  final CardVariant variant;
  final VoidCallback? onTap;
  final VoidCallback? onAddToCart;

  const ListingCard({
    super.key,
    required this.listing,
    this.variant = CardVariant.grid,
    this.onTap,
    this.onAddToCart,
  });

  @override
  Widget build(BuildContext context) {
    // 1. Parse pricing info (support nested "pricing" map or flat fields)
    double price = 0;
    double offerPrice = 0;
    final rawPricing = listing['pricing'];
    if (rawPricing is Map) {
      price = (rawPricing['originalPrice'] as num?)?.toDouble() ??
          (rawPricing['price'] as num?)?.toDouble() ??
          0;
      offerPrice = (rawPricing['price'] as num?)?.toDouble() ?? price;
    } else {
      price = (listing['price'] as num?)?.toDouble() ?? 0;
      offerPrice = (listing['offerPrice'] as num?)?.toDouble() ?? price;
    }

    final discount =
        price > 0 ? ((price - offerPrice) / price * 100).round() : 0;

    // 2. Parse inventory quantity (support nested "inventory" map or flat fields)
    int qty = 0;
    final rawInventory = listing['inventory'];
    if (rawInventory is Map) {
      qty = (rawInventory['quantity'] as num?)?.toInt() ?? 0;
    } else {
      qty = (listing['quantity'] as num?)?.toInt() ?? 0;
    }

    final isLowStock = qty > 0 && qty <= 3;
    final name = listing['title'] ?? listing['name'] ?? '';

    // 3. Parse business safely
    String business = '';
    final rawBusiness = listing['business'];
    if (rawBusiness is Map) {
      business = rawBusiness['name']?.toString() ?? '';
    } else if (rawBusiness is String) {
      business = '';
    } else {
      business = (listing['vendor'] ?? '').toString();
    }

    final distance = listing['distance'];

    // 4. Parse images / photos list
    final rawPhotos = listing['photos'];
    final rawImages = listing['images'];
    final rawImage = listing['image'];
    final String? img = (rawPhotos is List && rawPhotos.isNotEmpty)
        ? rawPhotos.firstOrNull?.toString()
        : ((rawImages is List && rawImages.isNotEmpty)
            ? rawImages.firstOrNull?.toString()
            : ((rawImage is List && rawImage.isNotEmpty)
                ? rawImage.firstOrNull?.toString()
                : rawImage?.toString()));

    return ScaleTap(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: AppColors.char.withValues(alpha: 0.04),
              blurRadius: 24,
              offset: const Offset(0, 8),
            ),
            BoxShadow(
              color: AppColors.char.withValues(alpha: 0.02),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: variant == CardVariant.grid
            ? _buildGrid(img, name, business, price, offerPrice, discount, qty,
                isLowStock, distance)
            : _buildList(img, name, business, price, offerPrice, discount, qty,
                isLowStock, distance),
      ),
    )
        .animate()
        .fadeIn(
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeOutQuad)
        .slideY(
            begin: 0.06,
            end: 0,
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeOutQuad);
  }

  Widget _buildGrid(img, name, business, price, offerPrice, discount, qty,
      isLowStock, distance) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Image with badges
        ClipRRect(
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          child: Stack(
            children: [
              AspectRatio(
                aspectRatio: 1.5,
                child: img != null &&
                        (img.startsWith('http://') ||
                            img.startsWith('https://'))
                    ? CachedNetworkImage(
                        imageUrl: img,
                        fit: BoxFit.cover,
                        placeholder: (_, __) => _shimmerBox(),
                        errorWidget: (_, __, ___) => _placeholder(),
                      )
                    : _placeholder(),
              ),
              if (discount > 0)
                Positioned(
                  top: 8,
                  right: 8,
                  child: _DiscountBadge(discount: discount),
                ),
            ],
          ),
        ),
        // Body
        Padding(
          padding: const EdgeInsets.fromLTRB(8, 6, 8, 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 2),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      business,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 11, color: AppColors.textSecondary),
                    ),
                  ),
                  if (distance != null) ...[
                    const Text(' • ',
                        style: TextStyle(
                            color: AppColors.textSecondary, fontSize: 11)),
                    Text(
                      '${distance}km',
                      style: const TextStyle(
                          fontSize: 11,
                          color: AppColors.primary,
                          fontWeight: FontWeight.w500),
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 4),
              ExpiryCountdown(
                  availableUntil: listing['availableUntil']?.toString() ??
                      (listing['timeWindow'] is Map
                          ? (listing['timeWindow'] as Map)['availableUntil']
                              ?.toString()
                          : null),
                  compact: true),
              if (isLowStock) ...[
                const SizedBox(height: 4),
                Text(
                  '⚠ Only $qty left',
                  style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: AppColors.accent),
                ),
              ],
              const SizedBox(height: 6),
              Row(
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'RWF ${offerPrice.toStringAsFixed(0)}',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: AppColors.primary,
                        ),
                      ),
                      if (price > offerPrice)
                        Text(
                          'RWF ${price.toStringAsFixed(0)}',
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.textSecondary,
                            decoration: TextDecoration.lineThrough,
                          ),
                        ),
                    ],
                  ),
                  const Spacer(),
                  ScaleTap(
                    onTap: onAddToCart,
                    child: Container(
                      constraints:
                          const BoxConstraints(minWidth: 56, minHeight: 34),
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        gradient: AppColors.primaryGradient,
                        borderRadius:
                            BorderRadius.circular(20), // Premium pill shape
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primary.withValues(alpha: 0.2),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: const Text(
                        'Add',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildList(img, name, business, price, offerPrice, discount, qty,
      isLowStock, distance) {
    return Row(
      children: [
        ClipRRect(
          borderRadius:
              const BorderRadius.horizontal(left: Radius.circular(20)),
          child: SizedBox(
            width: 90,
            height: 90,
            child: img != null &&
                    (img.startsWith('http://') || img.startsWith('https://'))
                ? CachedNetworkImage(
                    imageUrl: img,
                    fit: BoxFit.cover,
                    placeholder: (_, __) => _shimmerBox(),
                    errorWidget: (_, __, ___) => _placeholder(),
                  )
                : _placeholder(),
          ),
        ),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: [
                  Expanded(
                      child: Text(name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textPrimary))),
                  if (discount > 0) _DiscountBadge(discount: discount),
                ]),
                const SizedBox(height: 2),
                Text(business,
                    style: const TextStyle(
                        fontSize: 11, color: AppColors.textSecondary)),
                const SizedBox(height: 4),
                ExpiryCountdown(
                    availableUntil: listing['availableUntil']?.toString(),
                    compact: true),
                const SizedBox(height: 4),
                Row(children: [
                  Text('RWF ${offerPrice.toStringAsFixed(0)}',
                      style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: AppColors.primary)),
                  if (price > offerPrice) ...[
                    const SizedBox(width: 6),
                    Text('RWF ${price.toStringAsFixed(0)}',
                        style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.textSecondary,
                            decoration: TextDecoration.lineThrough)),
                  ],
                ]),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _shimmerBox() {
    return Shimmer.fromColors(
      baseColor: AppColors.shimmerBase,
      highlightColor: AppColors.shimmerHighlight,
      child: Container(color: AppColors.shimmerBase),
    );
  }

  Widget _placeholder() {
    return Container(
      color: AppColors.surfaceVariant,
      child: const Center(
        child: Icon(Icons.fastfood_rounded, color: AppColors.border, size: 32),
      ),
    );
  }
}

class _DiscountBadge extends StatelessWidget {
  final int discount;
  const _DiscountBadge({required this.discount});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: BoxDecoration(
        color: AppColors.accent,
        borderRadius: BorderRadius.circular(AppRadius.pill),
      ),
      child: Text(
        '-$discount%',
        style: const TextStyle(
            fontSize: 10, fontWeight: FontWeight.w700, color: Colors.white),
      ),
    );
  }
}

/// ListingCardSkeleton — shimmer placeholder while loading
class ListingCardSkeleton extends StatelessWidget {
  const ListingCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: AppColors.shimmerBase,
      highlightColor: AppColors.shimmerHighlight,
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.02),
              blurRadius: 10,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              height: 120,
              decoration: const BoxDecoration(
                color: AppColors.shimmerBase,
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                      height: 12,
                      width: double.infinity,
                      color: AppColors.shimmerBase),
                  const SizedBox(height: 6),
                  Container(
                      height: 10, width: 100, color: AppColors.shimmerBase),
                  const SizedBox(height: 10),
                  Container(
                      height: 12, width: 80, color: AppColors.shimmerBase),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
