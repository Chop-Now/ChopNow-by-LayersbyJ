import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../core/models/listing_model.dart';
import '../../core/providers/listings_provider.dart';
import '../../core/providers/cart_provider.dart';
import '../../core/providers/favorites_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/widgets/feedback/cn_states.dart';

class ListingDetailScreen extends ConsumerWidget {
  final String listingId;
  const ListingDetailScreen({super.key, required this.listingId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncListing = ref.watch(listingDetailProvider(listingId));

    return asyncListing.when(
      loading: () => const Scaffold(
        backgroundColor: AppColors.background,
        body: Center(
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
      ),
      error: (e, _) => Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          foregroundColor: AppColors.textPrimary,
          backgroundColor: AppColors.surface,
          elevation: 0,
        ),
        body: CnErrorState(
          message: e.toString(),
          onRetry: () => ref.invalidate(listingDetailProvider(listingId)),
        ),
      ),
      data: (listing) => _ListingDetailView(listing: listing),
    );
  }
}

class _ListingDetailView extends ConsumerStatefulWidget {
  final Listing listing;
  const _ListingDetailView({required this.listing});

  @override
  ConsumerState<_ListingDetailView> createState() => _ListingDetailViewState();
}

class _ListingDetailViewState extends ConsumerState<_ListingDetailView>
    with SingleTickerProviderStateMixin {
  int _qty = 1;
  int _imageIndex = 0;
  bool _isDescriptionExpanded = false;
  late AnimationController _favAnimCtrl;
  late Animation<double> _favScale;

  @override
  void initState() {
    super.initState();
    _favAnimCtrl = AnimationController(
      duration: const Duration(milliseconds: 200),
      vsync: this,
    );
    _favScale = TweenSequence<double>([
      TweenSequenceItem(tween: Tween<double>(begin: 1.0, end: 1.3), weight: 50),
      TweenSequenceItem(tween: Tween<double>(begin: 1.3, end: 1.0), weight: 50),
    ]).animate(CurvedAnimation(parent: _favAnimCtrl, curve: Curves.easeInOut));
  }

  @override
  void dispose() {
    _favAnimCtrl.dispose();
    super.dispose();
  }

  void _triggerFavoriteAnim() {
    _favAnimCtrl.forward(from: 0.0);
  }

  @override
  Widget build(BuildContext context) {
    final listing = widget.listing;
    final cart = ref.watch(cartProvider.notifier);
    final cartQty = cart.quantityOf(listing.id);
    final maxQty = listing.quantity - cartQty;

    final isFav = ref.watch(favoritesProvider).valueOrNull?.any((f) {
          final fav = f is Map ? f : {};
          final id = fav['listing']?['_id'] ?? fav['listingId'] ?? fav['_id'] ?? '';
          return id == listing.id;
        }) ?? false;

    // Parse location details
    final street = listing.business?['address']?['street']?.toString() ?? '';
    final city = listing.business?['address']?['city']?.toString() ?? '';
    final locationText = [street, city].where((s) => s.isNotEmpty).join(', ');
    final displayLocation =
        locationText.isEmpty ? 'Kigali, Rwanda' : locationText;

    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.background,
      body: Stack(
        children: [
          // ── Scrollable Body ──
          Positioned.fill(
            child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Hero Image Section
                  _buildHeroImageSection(listing),

                  // Detail Info Section
                  Transform.translate(
                    offset: const Offset(0, -28),
                    child: Container(
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.darkSurface : AppColors.surface,
                        borderRadius: const BorderRadius.vertical(
                          top: Radius.circular(28),
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.char.withValues(alpha: isDark ? 0.2 : 0.04),
                            blurRadius: 16,
                            offset: const Offset(0, -6),
                          ),
                        ],
                      ),
                      padding: const EdgeInsets.fromLTRB(24, 32, 24, 140),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Category Tag & Stock Status
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 6,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.primary.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(100),
                                ),
                                child: Text(
                                  (listing.category ?? 'Food').toUpperCase(),
                                  style: const TextStyle(
                                    color: AppColors.primary,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 0.8,
                                  ),
                                ),
                              ),
                              if (listing.isSoldOut)
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 6,
                                  ),
                                  decoration: BoxDecoration(
                                    color: AppColors.error.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(100),
                                  ),
                                  child: const Text(
                                    'SOLD OUT',
                                    style: TextStyle(
                                      color: AppColors.error,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: 0.8,
                                    ),
                                  ),
                                )
                              else if (listing.quantity <= 3)
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 6,
                                  ),
                                  decoration: BoxDecoration(
                                    color: AppColors.accent.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(100),
                                  ),
                                  child: Text(
                                    'ONLY ${listing.quantity} LEFT',
                                    style: const TextStyle(
                                      color: AppColors.accent,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: 0.8,
                                    ),
                                  ),
                                ),
                            ],
                          ).animate().fadeIn(duration: 300.ms),
                          const SizedBox(height: 16),

                          // Title Block
                          Text(
                            listing.title,
                            style: TextStyle(
                              fontSize: 26,
                              fontWeight: FontWeight.w900,
                              color: isDark ? Colors.white : AppColors.textPrimary,
                              letterSpacing: -0.5,
                            ),
                          ).animate().fadeIn(delay: 50.ms, duration: 300.ms),
                          const SizedBox(height: 8),

                          // Vendor and distance info
                          Row(
                            children: [
                              Icon(
                                Icons.storefront_rounded,
                                color: isDark ? AppColors.textTertiary : AppColors.textSecondary,
                                size: 18,
                              ),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  listing.businessName.isNotEmpty
                                      ? listing.businessName
                                      : 'ChopNow Partner',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700,
                                    color: isDark ? Colors.white : AppColors.textPrimary,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ).animate().fadeIn(delay: 100.ms, duration: 300.ms),
                          const SizedBox(height: 6),

                          // Location Block
                          Row(
                            children: [
                              const Icon(
                                Icons.location_on_rounded,
                                color: AppColors.textTertiary,
                                size: 16,
                              ),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  displayLocation,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.textSecondary,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ).animate().fadeIn(delay: 120.ms, duration: 300.ms),
                          const SizedBox(height: 24),

                          // Nutritional Info Section
                          _buildMacrosSection(listing, isDark)
                              .animate()
                              .fadeIn(delay: 150.ms, duration: 300.ms),
                          const SizedBox(height: 28),

                          // Description
                          Text(
                            'Description',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                              color: isDark ? Colors.white : AppColors.textPrimary,
                            ),
                          ).animate().fadeIn(delay: 200.ms, duration: 300.ms),
                          const SizedBox(height: 8),
                          GestureDetector(
                            onTap: () => setState(
                              () => _isDescriptionExpanded = !_isDescriptionExpanded,
                            ),
                            child: RichText(
                              text: TextSpan(
                                style: const TextStyle(
                                  fontSize: 14.5,
                                  color: AppColors.textSecondary,
                                  height: 1.5,
                                ),
                                children: [
                                  TextSpan(
                                    text: _isDescriptionExpanded
                                        ? listing.description
                                        : (listing.description.length > 120
                                            ? '${listing.description.substring(0, 120)}... '
                                            : listing.description),
                                  ),
                                  if (listing.description.length > 120)
                                    TextSpan(
                                      text: _isDescriptionExpanded
                                          ? 'Show less'
                                          : 'Show more',
                                      style: const TextStyle(
                                        color: AppColors.primary,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          ).animate().fadeIn(delay: 220.ms, duration: 300.ms),
                          const SizedBox(height: 28),

                          // Price and Stepper section
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    crossAxisAlignment: CrossAxisAlignment.baseline,
                                    textBaseline: TextBaseline.alphabetic,
                                    children: [
                                      Text(
                                        'RWF ${listing.offerPrice.toStringAsFixed(0)}',
                                        style: const TextStyle(
                                          fontSize: 28,
                                          fontWeight: FontWeight.w900,
                                          color: AppColors.primary,
                                        ),
                                      ),
                                      if (listing.price > listing.offerPrice) ...[
                                        const SizedBox(width: 8),
                                        Text(
                                          'RWF ${listing.price.toStringAsFixed(0)}',
                                          style: const TextStyle(
                                            fontSize: 15,
                                            color: AppColors.textTertiary,
                                            decoration: TextDecoration.lineThrough,
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                  if (listing.discountPercent > 0) ...[
                                    const SizedBox(height: 4),
                                    Text(
                                      '${listing.discountPercent}% OFF Saved Deal',
                                      style: const TextStyle(
                                        color: AppColors.accent,
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ],
                                ],
                              ),

                              // Quantity selector widget
                              if (!listing.isSoldOut)
                                Container(
                                  decoration: BoxDecoration(
                                    color: isDark ? AppColors.darkSurfaceVariant : Colors.grey[100],
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(
                                      color: isDark ? AppColors.darkBorder : AppColors.border,
                                      width: 1,
                                    ),
                                  ),
                                  padding: const EdgeInsets.all(4),
                                  child: Row(
                                    children: [
                                      _buildStepperButton(
                                        icon: Icons.remove_rounded,
                                        onTap: _qty > 1
                                            ? () {
                                                HapticFeedback.lightImpact();
                                                setState(() => _qty--);
                                              }
                                            : null,
                                        isDark: isDark,
                                      ),
                                      SizedBox(
                                        width: 28,
                                        child: Text(
                                          '$_qty',
                                          textAlign: TextAlign.center,
                                          style: TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.w800,
                                            color: isDark ? Colors.white : AppColors.textPrimary,
                                          ),
                                        ),
                                      ),
                                      _buildStepperButton(
                                        icon: Icons.add_rounded,
                                        onTap: _qty < maxQty
                                            ? () {
                                                HapticFeedback.lightImpact();
                                                setState(() => _qty++);
                                              }
                                            : null,
                                        isDark: isDark,
                                      ),
                                    ],
                                  ),
                                ),
                            ],
                          ).animate().fadeIn(delay: 250.ms, duration: 300.ms),
                          const SizedBox(height: 28),

                          // Allergens warning (if any)
                          if ((listing.allergens ?? []).isNotEmpty) ...[
                            const Text(
                              '⚠ Allergens Warning',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w800,
                                color: AppColors.warning,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: listing.allergens!
                                  .map((a) => Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 12,
                                          vertical: 6,
                                        ),
                                        decoration: BoxDecoration(
                                          color: AppColors.warningSurface,
                                          borderRadius: BorderRadius.circular(100),
                                          border: Border.all(
                                            color: AppColors.warning.withValues(alpha: 0.15),
                                          ),
                                        ),
                                        child: Text(
                                          a,
                                          style: const TextStyle(
                                            fontSize: 12,
                                            color: AppColors.warning,
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                      ))
                                  .toList(),
                            ),
                            const SizedBox(height: 24),
                          ],

                          // CO2 Pill (if any)
                          if ((listing.co2Saved ?? 0) > 0) ...[
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 10,
                              ),
                              decoration: BoxDecoration(
                                gradient: AppColors.impactGradient,
                                borderRadius: BorderRadius.circular(16),
                                boxShadow: [
                                  BoxShadow(
                                    color: AppColors.primary.withValues(alpha: 0.15),
                                    blurRadius: 10,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.eco_rounded, size: 16, color: Colors.white),
                                  const SizedBox(width: 8),
                                  Text(
                                    'Saves ${listing.co2Saved}g CO₂ from landfill',
                                    style: const TextStyle(
                                      fontSize: 13,
                                      color: Colors.white,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // ── Glassmorphic Sticky Top Navigation Bar ──
          Positioned(
            top: MediaQuery.of(context).padding.top + 8,
            left: 16,
            right: 16,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Back Button
                _buildGlassCircularButton(
                  icon: Icons.arrow_back_ios_new_rounded,
                  onTap: () {
                    HapticFeedback.lightImpact();
                    if (context.canPop()) {
                      context.pop();
                    } else {
                      context.go('/home');
                    }
                  },
                  isDark: isDark,
                ),

                // Favorite Button
                ScaleTransition(
                  scale: _favScale,
                  child: _buildGlassCircularButton(
                    icon: isFav ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                    iconColor: isFav ? Colors.red : (isDark ? Colors.white : AppColors.textPrimary),
                    onTap: () async {
                      HapticFeedback.lightImpact();
                      _triggerFavoriteAnim();
                      try {
                        final added = await ref.read(favoritesProvider.notifier).toggle(listing.id);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(added ? 'Added to favorites! ❤️' : 'Removed from favorites! 💔'),
                              duration: const Duration(seconds: 2),
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        }
                      } catch (e) {
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Failed to update favorites: $e'),
                              backgroundColor: AppColors.error,
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        }
                      }
                    },
                    isDark: isDark,
                  ),
                ),
              ],
            ),
          ),

          // ── Frosted Glass Floating Bottom Action Bar ──
          Positioned(
            left: 16,
            right: 16,
            bottom: MediaQuery.of(context).padding.bottom + 12,
            child: _buildBottomActionBar(listing, isDark, context),
          ).animate().slideY(begin: 0.5, end: 0, delay: 200.ms, duration: 400.ms, curve: Curves.easeOutCubic),
        ],
      ),
    );
  }

  // Helper to build glassmorphic circular buttons
  Widget _buildGlassCircularButton({
    required IconData icon,
    required VoidCallback onTap,
    required bool isDark,
    Color? iconColor,
  }) {
    return ClipOval(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: isDark ? AppColors.char.withValues(alpha: 0.4) : Colors.white.withValues(alpha: 0.85),
            shape: BoxShape.circle,
            border: Border.all(
              color: isDark ? Colors.white.withValues(alpha: 0.1) : AppColors.char.withValues(alpha: 0.08),
              width: 1,
            ),
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: onTap,
              child: Center(
                child: Icon(
                  icon,
                  color: iconColor ?? (isDark ? Colors.white : AppColors.textPrimary),
                  size: 20,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  // Stepper Button
  Widget _buildStepperButton({
    required IconData icon,
    required VoidCallback? onTap,
    required bool isDark,
  }) {
    final disabled = onTap == null;
    return Container(
      width: 32,
      height: 32,
      decoration: BoxDecoration(
        color: disabled
            ? Colors.transparent
            : (isDark ? Colors.white.withValues(alpha: 0.06) : AppColors.surface),
        shape: BoxShape.circle,
        boxShadow: disabled || isDark
            ? null
            : [
                BoxShadow(
                  color: AppColors.char.withValues(alpha: 0.04),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          customBorder: const CircleBorder(),
          child: Icon(
            icon,
            size: 18,
            color: disabled
                ? (isDark ? Colors.white.withValues(alpha: 0.2) : Colors.grey[350])
                : AppColors.primary,
          ),
        ),
      ),
    );
  }

  // Hero image gallery with indicators
  Widget _buildHeroImageSection(Listing listing) {
    final photos = listing.photos
        .where((p) => p.startsWith('http://') || p.startsWith('https://'))
        .toList();

    return Stack(
      children: [
        // Gallery PageView
        SizedBox(
          height: 380,
          width: double.infinity,
          child: photos.isEmpty
              ? Container(
                  color: AppColors.surfaceVariant,
                  child: const Center(
                    child: Icon(
                      Icons.fastfood_rounded,
                      size: 80,
                      color: AppColors.border,
                    ),
                  ),
                )
              : PageView.builder(
                  itemCount: photos.length,
                  onPageChanged: (i) => setState(() => _imageIndex = i),
                  itemBuilder: (context, i) => CachedNetworkImage(
                    imageUrl: photos[i],
                    fit: BoxFit.cover,
                    placeholder: (_, __) => Container(
                      color: Theme.of(context).brightness == Brightness.dark
                          ? AppColors.darkSurfaceVariant
                          : AppColors.surfaceVariant,
                    ),
                    errorWidget: (_, __, ___) => Container(
                      color: AppColors.surfaceVariant,
                      child: const Icon(
                        Icons.broken_image_rounded,
                        color: AppColors.border,
                        size: 60,
                      ),
                    ),
                  ),
                ),
        ),

        // Gradient overlay at the bottom of the image
        Positioned(
          bottom: 0,
          left: 0,
          right: 0,
          height: 80,
          child: Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  Colors.transparent,
                  (Theme.of(context).brightness == Brightness.dark
                          ? AppColors.darkBackground
                          : AppColors.background)
                      .withValues(alpha: 0.5),
                  Theme.of(context).brightness == Brightness.dark
                      ? AppColors.darkBackground
                      : AppColors.background,
                ],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
            ),
          ),
        ),

        // Image Dots Indicators
        if (photos.length > 1)
          Positioned(
            bottom: 40,
            left: 0,
            right: 0,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(
                photos.length,
                (i) => AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  width: i == _imageIndex ? 22 : 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: i == _imageIndex ? AppColors.primary : Colors.white.withValues(alpha: 0.5),
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }

  // Redesigned Macros dashboard
  Widget _buildMacrosSection(Listing listing, bool isDark) {
    final cal = listing.calories ?? 245;
    final prot = listing.protein ?? 8.4;
    final carb = listing.carbs ?? 32.1;
    final fat = listing.fats ?? 6.8;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurfaceVariant : AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark ? AppColors.darkBorder : AppColors.border,
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.char.withValues(alpha: isDark ? 0.05 : 0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _buildMacroElement('$cal', 'kcal', Icons.local_fire_department_rounded, AppColors.accent, isDark),
          _buildVerticalDivider(isDark),
          _buildMacroElement('${prot.toStringAsFixed(1)}g', 'proteins', Icons.fitness_center_rounded, AppColors.primary, isDark),
          _buildVerticalDivider(isDark),
          _buildMacroElement('${fat.toStringAsFixed(1)}g', 'fats', Icons.opacity_rounded, Colors.red, isDark),
          _buildVerticalDivider(isDark),
          _buildMacroElement('${carb.toStringAsFixed(1)}g', 'carbohydrates', Icons.grain_rounded, Colors.orange, isDark),
        ],
      ),
    );
  }

  Widget _buildMacroElement(String value, String label, IconData icon, Color color, bool isDark) {
    return Expanded(
      child: Column(
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w800,
              color: isDark ? Colors.white : AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(
              fontSize: 9,
              fontWeight: FontWeight.w600,
              color: AppColors.textSecondary,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildVerticalDivider(bool isDark) {
    return Container(
      width: 1,
      height: 36,
      color: isDark ? AppColors.darkBorder : AppColors.border,
    );
  }

  // Frosted Bottom Action Bar
  Widget _buildBottomActionBar(Listing listing, bool isDark, BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(28),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: isDark ? AppColors.darkSurface.withValues(alpha: 0.85) : Colors.white.withValues(alpha: 0.85),
            borderRadius: BorderRadius.circular(28),
            border: Border.all(
              color: isDark ? AppColors.darkBorder.withValues(alpha: 0.5) : AppColors.border.withValues(alpha: 0.5),
              width: 1,
            ),
            boxShadow: [
              BoxShadow(
                color: AppColors.char.withValues(alpha: isDark ? 0.3 : 0.06),
                blurRadius: 20,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: listing.isSoldOut
              ? Container(
                  width: double.infinity,
                  height: 52,
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.darkSurfaceVariant : Colors.grey[200],
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Center(
                    child: Text(
                      'SOLD OUT',
                      style: TextStyle(
                        color: Colors.grey,
                        fontWeight: FontWeight.w800,
                        fontSize: 16,
                      ),
                    ),
                  ),
                )
              : Row(
                  children: [
                    // Circular Shopping Bag / Cart Action
                    Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: () {
                          HapticFeedback.lightImpact();
                          for (var i = 0; i < _qty; i++) {
                            ref.read(cartProvider.notifier).addItem(listing);
                          }
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('$_qty × ${listing.title} added to cart'),
                              behavior: SnackBarBehavior.floating,
                              backgroundColor: AppColors.primary,
                              action: SnackBarAction(
                                label: 'View Cart',
                                textColor: AppColors.surface,
                                onPressed: () => context.go('/cart'),
                              ),
                              duration: const Duration(seconds: 3),
                            ),
                          );
                        },
                        borderRadius: BorderRadius.circular(20),
                        child: Container(
                          width: 52,
                          height: 52,
                          decoration: BoxDecoration(
                            border: Border.all(
                              color: isDark ? AppColors.darkBorder : AppColors.border,
                              width: 1.5,
                            ),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            Icons.shopping_bag_outlined,
                            color: isDark ? Colors.white : AppColors.textPrimary,
                            size: 22,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),

                    // "Buy Now" Primary Action
                    Expanded(
                      child: Container(
                        height: 52,
                        decoration: BoxDecoration(
                          gradient: AppColors.primaryGradient,
                          borderRadius: BorderRadius.circular(26),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.primary.withValues(alpha: 0.35),
                              blurRadius: 16,
                              spreadRadius: -4,
                              offset: const Offset(0, 8),
                            ),
                          ],
                        ),
                        child: Material(
                          color: Colors.transparent,
                          child: InkWell(
                            onTap: () {
                              HapticFeedback.mediumImpact();
                              for (var i = 0; i < _qty; i++) {
                                ref.read(cartProvider.notifier).addItem(listing);
                              }
                              context.push('/checkout');
                            },
                            borderRadius: BorderRadius.circular(26),
                            child: const Center(
                              child: Text(
                                'Buy Now',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 16,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 0.2,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}
