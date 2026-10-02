import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/models/listing_model.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/impact_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/widgets/cards/listing_card.dart';
import '../../shared/widgets/inputs/cn_text_field.dart';
import '../../shared/widgets/buttons/cn_buttons.dart';
import '../../shared/widgets/feedback/cn_states.dart';
import '../../shared/animations/scale_tap.dart';
import '../../core/providers/cart_provider.dart';
import '../../core/providers/notifications_provider.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:geolocator/geolocator.dart';

// ── Providers & Filters ────────────────────────────────────────────────────────
/// Largest value on the distance slider (km); also the radius fetched.
const double kMaxDistanceKm = 15.0;

class UserPosition {
  final double lat;
  final double lng;
  const UserPosition(this.lat, this.lng);
}

/// The device's current position, or null when location services are off or
/// permission was refused. Listings then have no distance, which the UI
/// surfaces instead of pretending every deal is 0 km away.
final currentPositionProvider =
    FutureProvider.autoDispose<UserPosition?>((ref) async {
  try {
    if (!await Geolocator.isLocationServiceEnabled()) return null;
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      return null;
    }
    final pos = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.medium,
        timeLimit: Duration(seconds: 10),
      ),
    );
    return UserPosition(pos.latitude, pos.longitude);
  } catch (_) {
    return null;
  }
});

final listingsProvider = FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final position = await ref.watch(currentPositionProvider.future);
  // With a location, /listings/nearby returns each listing's real distance
  // (km) so the distance filter and sort actually work.
  final response = position != null
      ? await ApiClient.instance.get(AppEndpoints.nearbyListings, queryParameters: {
          'lat': position.lat,
          'lng': position.lng,
          'radius': (kMaxDistanceKm * 1000).round(),
          'limit': 100,
        })
      : await ApiClient.instance.get(AppEndpoints.listings, queryParameters: {
          'status': 'active',
          'sort': 'offerPrice',
          'limit': 20,
        });
  final data = response.data;
  if (data is Map && data['listings'] != null) {
    return List.from(data['listings']);
  }
  if (data is List) return List.from(data);
  return [];
});

class ListingFilters {
  final String sortBy; // 'price_asc', 'price_desc', 'rating', 'distance'
  final double maxPrice;
  final double maxDistance;
  final List<String> selectedAllergens;

  const ListingFilters({
    this.sortBy = 'price_asc',
    this.maxPrice = 15000.0,
    this.maxDistance = 15.0,
    this.selectedAllergens = const [],
  });

  ListingFilters copyWith({
    String? sortBy,
    double? maxPrice,
    double? maxDistance,
    List<String>? selectedAllergens,
  }) {
    return ListingFilters(
      sortBy: sortBy ?? this.sortBy,
      maxPrice: maxPrice ?? this.maxPrice,
      maxDistance: maxDistance ?? this.maxDistance,
      selectedAllergens: selectedAllergens ?? this.selectedAllergens,
    );
  }
}

final listingFiltersProvider = StateProvider<ListingFilters>((ref) => const ListingFilters());
final selectedCategoryProvider = StateProvider<String>((ref) => 'All');
final searchQueryProvider = StateProvider<String>((ref) => '');

final filteredListingsProvider = Provider.autoDispose<AsyncValue<List<dynamic>>>((ref) {
  final listingsAsync = ref.watch(listingsProvider);
  final selectedCategory = ref.watch(selectedCategoryProvider);
  final searchQuery = ref.watch(searchQueryProvider);
  final filters = ref.watch(listingFiltersProvider);

  return listingsAsync.whenData((rawList) {
    // 1. Parse all to Listing models to check properties easily, keeping the raw maps
    final parsedListingsings = rawList.map((x) {
      final model = Listing.fromJson(x as Map<String, dynamic>);
      return MapEntry(model, x);
    }).toList();

    // 2. Filter by category
    final categoryFiltered = selectedCategory == 'All'
        ? parsedListingsings
        : parsedListingsings.where((entry) {
            final itemCat = entry.key.category?.toLowerCase() ?? '';
            final cleanSelectedCat = selectedCategory
                .replaceAll(RegExp(r'[^\w\s]'), '')
                .trim()
                .toLowerCase();
            return itemCat.contains(cleanSelectedCat);
          }).toList();

    // 3. Filter by search query
    final searchFiltered = searchQuery.trim().isEmpty
        ? categoryFiltered
        : categoryFiltered.where((entry) {
            final title = entry.key.title.toLowerCase();
            final desc = entry.key.description.toLowerCase();
            final bName = entry.key.businessName.toLowerCase();
            final query = searchQuery.toLowerCase();
            return title.contains(query) || desc.contains(query) || bName.contains(query);
          }).toList();

    // 4. Filter by Max Price
    var filtered = searchFiltered.where((entry) => entry.key.offerPrice <= filters.maxPrice).toList();

    // 5. Filter by Max Distance. A listing with an unknown distance (no
    // location permission) can't be claimed to be within the radius, so it is
    // excluded rather than silently treated as 0 km away.
    if (filters.maxDistance < kMaxDistanceKm) {
      filtered = filtered.where((entry) {
        final dist = entry.key.distance;
        return dist != null && dist <= filters.maxDistance;
      }).toList();
    }

    // 6. Filter by Allergens
    if (filters.selectedAllergens.isNotEmpty) {
      filtered = filtered.where((entry) {
        final itemAllergens = entry.key.allergens?.map((a) => a.toLowerCase()).toList() ?? [];
        return !filters.selectedAllergens.any((allergen) =>
            itemAllergens.contains(allergen.toLowerCase()));
      }).toList();
    }

    // 7. Sort
    if (filters.sortBy == 'price_asc') {
      filtered.sort((a, b) => a.key.offerPrice.compareTo(b.key.offerPrice));
    } else if (filters.sortBy == 'price_desc') {
      filtered.sort((a, b) => b.key.offerPrice.compareTo(a.key.offerPrice));
    } else if (filters.sortBy == 'rating') {
      filtered.sort((a, b) => (b.key.rating ?? 0.0).compareTo(a.key.rating ?? 0.0));
    } else if (filters.sortBy == 'distance') {
      // Unknown distances sort last.
      filtered.sort((a, b) {
        final da = a.key.distance;
        final db = b.key.distance;
        if (da == null && db == null) return 0;
        if (da == null) return 1;
        if (db == null) return -1;
        return da.compareTo(db);
      });
    }

    // Return the original raw maps since ListingCard expects them
    return filtered.map((entry) => entry.value).toList();
  });
});

// ── Home Screen ────────────────────────────────────────────────────────────────
class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  final _searchCtrl = TextEditingController();

  static const _categories = [
    'All',
    'Food',
    'Grocery',
    'Salads',
    'Bakery',
    'Asian',
    'Meat'
  ];

  // 'All' has no illustration (it isn't a real category), so it keeps an
  // icon fallback. Every other category uses the illustrated PNGs.
  static const _categoryIcon = Icons.apps_rounded;

  static const Map<String, String> _categoryImages = {
    'Food': 'assets/images/food.png',
    'Grocery': 'assets/images/grocery.png',
    'Salads': 'assets/images/salads.png',
    'Bakery': 'assets/images/bakery.png',
    'Asian': 'assets/images/asian.png',
    'Meat': 'assets/images/meat.png',
  };

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final listingsAsync = ref.watch(filteredListingsProvider);
    final locationUnavailable = ref.watch(currentPositionProvider).maybeWhen(
          data: (position) => position == null,
          orElse: () => false,
        );
    final auth = ref.watch(authProvider);
    final user = auth is AuthAuthenticated ? auth.user : null;
    final selectedCat = ref.watch(selectedCategoryProvider);
    final asyncImpact = ref.watch(userImpactProvider);
    final mealsRescued = asyncImpact.value?['mealsRescued'] ??
        asyncImpact.value?['totalMeals'] ??
        0;
    final co2SavedRaw =
        asyncImpact.value?['co2Saved'] ?? asyncImpact.value?['totalCo2'] ?? 0.0;
    final co2Saved = co2SavedRaw is num ? co2SavedRaw.toDouble() : 0.0;
    final co2String = co2Saved >= 1.0
        ? '${co2Saved.toStringAsFixed(1)} kg'
        : '${(co2Saved * 1000).toStringAsFixed(0)}g';
    final cartCount = ref.watch(cartCountProvider);
    final unreadCount = ref.watch(unreadCountProvider).value ?? 0;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: const SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness: Brightness.dark),
      child: Scaffold(
        backgroundColor: AppColors.background,
        body: CustomScrollView(
          physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
          slivers: [
            // ── Premium Vibe Header (Web Parity) ──
            SliverToBoxAdapter(
              child: SizedBox(
                height: 340, // Taller header to fit blobs
                child: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    // Organic Blob 1: Primary Green
                    Positioned(
                      top: -50,
                      right: -80,
                      child: Container(
                        width: 300,
                        height: 300,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.primary.withValues(alpha: 0.15),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.primary.withValues(alpha: 0.2),
                              blurRadius: 100,
                              spreadRadius: 50,
                            ),
                          ],
                        ),
                      ),
                    ),
                    // Organic Blob 2: Orange Accent
                    Positioned(
                      top: 150,
                      left: -100,
                      child: Container(
                        width: 250,
                        height: 250,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.accent.withValues(alpha: 0.10),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.accent.withValues(alpha: 0.15),
                              blurRadius: 80,
                              spreadRadius: 40,
                            ),
                          ],
                        ),
                      ),
                    ),

                    // Foreground Content
                    SafeArea(
                      bottom: false,
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Top row: greeting + notification bell
                            Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        _greeting(),
                                        style: const TextStyle(
                                            fontSize: 14,
                                            color: AppColors.textSecondary,
                                            fontWeight: FontWeight.w600),
                                      ),
                                      Text(
                                        user != null
                                            ? '${user.firstName} 👋'
                                            : 'Food Rescuer 👋',
                                        style: const TextStyle(
                                          fontSize: 28, // Bigger
                                          fontWeight:
                                              FontWeight.w900, // Heavier
                                          color: AppColors.textPrimary,
                                          letterSpacing: -0.5,
                                        ),
                                      ),
                                    ],
                                  ).animate().fadeIn(duration: const Duration(milliseconds: 400), curve: Curves.easeOutCubic).slideY(begin: -0.1, end: 0, duration: const Duration(milliseconds: 400), curve: Curves.easeOutCubic),
                                ),
                                ScaleTap(
                                  onTap: () => context.go('/cart'),
                                  child: Container(
                                    width: 46,
                                    height: 46,
                                    decoration: BoxDecoration(
                                      color: AppColors.surface,
                                      shape: BoxShape.circle,
                                      border: Border.all(
                                          color: AppColors.border, width: 1.5),
                                      boxShadow: [
                                        BoxShadow(
                                            color: Colors.black
                                                .withValues(alpha: 0.05),
                                            blurRadius: 12,
                                            offset: const Offset(0, 4))
                                      ],
                                    ),
                                    child: Stack(
                                      alignment: Alignment.center,
                                      children: [
                                        const Icon(Icons.shopping_cart_outlined,
                                            size: 22,
                                            color: AppColors.textPrimary),
                                        if (cartCount > 0)
                                          Positioned(
                                            top: 8,
                                            right: 8,
                                            child: Container(
                                              width: 14,
                                              height: 14,
                                              decoration: const BoxDecoration(
                                                  color: AppColors.accent,
                                                  shape: BoxShape.circle),
                                              child: Center(
                                                child: Text(
                                                  '$cartCount',
                                                  style: const TextStyle(
                                                      fontSize: 8,
                                                      color: Colors.white,
                                                      fontWeight:
                                                          FontWeight.bold),
                                                ),
                                              ),
                                            ),
                                          ),
                                      ],
                                    ),
                                  ),
                                ).animate().fadeIn(duration: const Duration(milliseconds: 400), curve: Curves.easeOutCubic).scale(begin: const Offset(0.9, 0.9), end: const Offset(1, 1), duration: const Duration(milliseconds: 400), curve: Curves.easeOutCubic),
                                const SizedBox(width: 10),
                                ScaleTap(
                                  onTap: () => context.push('/notifications'),
                                  child: Container(
                                    width: 46,
                                    height: 46,
                                    decoration: BoxDecoration(
                                      color: AppColors.surface,
                                      shape: BoxShape.circle,
                                      border: Border.all(
                                          color: AppColors.border, width: 1.5),
                                      boxShadow: [
                                        BoxShadow(
                                            color: Colors.black
                                                .withValues(alpha: 0.05),
                                            blurRadius: 12,
                                            offset: const Offset(0, 4))
                                      ],
                                    ),
                                    child: Stack(
                                      alignment: Alignment.center,
                                      children: [
                                        const Icon(Icons.notifications_rounded,
                                            size: 22,
                                            color: AppColors.textPrimary),
                                        if (unreadCount > 0)
                                          Positioned(
                                            top: 10,
                                            right: 10,
                                            child: Container(
                                              width: 10,
                                              height: 10,
                                              decoration: BoxDecoration(
                                                  color: AppColors.accent,
                                                  shape: BoxShape.circle,
                                                  border: Border.all(
                                                      color: AppColors.surface,
                                                      width: 2)),
                                            ),
                                          ),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 24),

                            // Search bar
                            CnSearchBar(
                              hint: 'Search deals near you…',
                              onChanged: (v) => ref
                                  .read(searchQueryProvider.notifier)
                                  .state = v,
                              onFilterTap: () async {
                                final currentFilters = ref.read(listingFiltersProvider);
                                final newFilters = await showModalBottomSheet<ListingFilters>(
                                  context: context,
                                  isScrollControlled: true,
                                  backgroundColor: Colors.transparent,
                                  builder: (context) => _FilterBottomSheet(initialFilters: currentFilters),
                                );
                                if (newFilters != null) {
                                  ref.read(listingFiltersProvider.notifier).state = newFilters;
                                }
                              },
                            ).animate().fadeIn(delay: const Duration(milliseconds: 100), duration: const Duration(milliseconds: 450), curve: Curves.easeOutCubic).slideY(begin: 0.1, end: 0, delay: const Duration(milliseconds: 100), duration: const Duration(milliseconds: 450), curve: Curves.easeOutCubic),
                            const SizedBox(height: 24),

                            // Impact strip
                            ScaleTap(
                              onTap: () => context.push('/impact'),
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 20, vertical: 16),
                                decoration: BoxDecoration(
                                  gradient: AppColors.primaryGradient,
                                  borderRadius: BorderRadius.circular(24),
                                  boxShadow: [
                                    BoxShadow(
                                        color: AppColors.primary
                                            .withValues(alpha: 0.35),
                                        blurRadius: 16,
                                        offset: const Offset(0, 6))
                                  ],
                                ),
                                child: Row(
                                  children: [
                                    const DefaultTextStyle(
                                        style: TextStyle(fontSize: 28),
                                        child: Text('🌍')),
                                    const SizedBox(width: 16),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                              'You\'ve rescued $mealsRescued ${mealsRescued == 1 ? 'meal' : 'meals'}',
                                              style: const TextStyle(
                                                  color: Colors.white,
                                                  fontSize: 15,
                                                  fontWeight: FontWeight.w800)),
                                          const SizedBox(height: 2),
                                          Text(
                                              'Saving $co2String CO₂ — keep going!',
                                              style: const TextStyle(
                                                  color: Colors.white,
                                                  fontSize: 12,
                                                  fontWeight: FontWeight.w500)),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ).animate().fadeIn(delay: const Duration(milliseconds: 200), duration: const Duration(milliseconds: 450), curve: Curves.easeOutCubic).slideY(begin: 0.15, end: 0, delay: const Duration(milliseconds: 200), duration: const Duration(milliseconds: 450), curve: Curves.easeOutCubic),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            SliverToBoxAdapter(
              child: SizedBox(
                height: 112,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  itemCount: _categories.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 14),
                  itemBuilder: (_, i) {
                    final cat = _categories[i];
                    final active = cat == selectedCat;
                    final imagePath = _categoryImages[cat];
                    return ScaleTap(
                      onTap: () => ref
                          .read(selectedCategoryProvider.notifier)
                          .state = cat,
                      child: SizedBox(
                        width: 80,
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              width: 76,
                              height: 76,
                              clipBehavior: Clip.antiAlias,
                              padding: EdgeInsets.all(imagePath != null ? 12 : 0),
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: imagePath != null
                                    ? (active
                                        ? AppColors.primary.withValues(alpha: 0.12)
                                        : AppColors.surface)
                                    : (active
                                        ? AppColors.primary
                                        : AppColors.primary.withValues(alpha: 0.12)),
                                border: Border.all(
                                  color: active
                                      ? AppColors.primary
                                      : AppColors.border,
                                  width: active ? 2 : 1.5,
                                ),
                                boxShadow: active
                                    ? [
                                        BoxShadow(
                                          color: AppColors.primary
                                              .withValues(alpha: 0.3),
                                          blurRadius: 10,
                                          offset: const Offset(0, 4),
                                        ),
                                      ]
                                    : [
                                        BoxShadow(
                                          color:
                                              AppColors.char.withValues(alpha: 0.04),
                                          blurRadius: 6,
                                          offset: const Offset(0, 2),
                                        ),
                                      ],
                              ),
                              child: imagePath != null
                                  ? Image.asset(imagePath, fit: BoxFit.contain)
                                  : Icon(
                                      _categoryIcon,
                                      size: 30,
                                      color: active
                                          ? Colors.white
                                          : AppColors.primary,
                                    ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              cat,
                              textAlign: TextAlign.center,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight:
                                    active ? FontWeight.w800 : FontWeight.w600,
                                color: active
                                    ? AppColors.textPrimary
                                    : AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              )
                  .animate()
                  .fadeIn(delay: const Duration(milliseconds: 300), duration: const Duration(milliseconds: 500), curve: Curves.easeOutCubic)
                  .slideX(begin: 0.08, end: 0, delay: const Duration(milliseconds: 300), duration: const Duration(milliseconds: 500), curve: Curves.easeOutCubic),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: 20)),

            // ── Flash Deals header ──
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  children: [
                    const Text('⚡ Flash Deals',
                        style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: AppColors.textPrimary)),
                    const Spacer(),
                    ScaleTap(
                      onTap: () => context.go('/browse'),
                      child: const Text('See all',
                          style: TextStyle(
                              fontSize: 13,
                              color: AppColors.primary,
                              fontWeight: FontWeight.w500)),
                    ),
                  ],
                ),
              ),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: 12)),

            if (locationUnavailable)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: () => ref.invalidate(currentPositionProvider),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.location_off_outlined,
                              size: 20, color: AppColors.textSecondary),
                          SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'Turn on location to see how far each deal is and '
                              'filter by distance. Tap to retry.',
                              style: TextStyle(
                                  fontSize: 12, color: AppColors.textSecondary),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),

            // ── Listings grid ──
            listingsAsync.when(
              loading: () => SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                sliver: SliverGrid.builder(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: 0.70,
                  ),
                  itemCount: 6,
                  itemBuilder: (_, __) => const ListingCardSkeleton(),
                ),
              ),
              error: (e, _) => SliverFillRemaining(
                child: CnErrorState(
                  message: e.toString(),
                  onRetry: () => ref.refresh(listingsProvider),
                ),
              ),
              data: (listings) => listings.isEmpty
                  ? const SliverFillRemaining(
                      child: CnEmptyState(
                        title: 'No deals near you yet',
                        subtitle:
                            'We\'re expanding across Africa — check back soon!',
                        imagePath: 'assets/images/empty_orders.png',
                      ),
                    )
                  : SliverPadding(
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 100),
                      sliver: SliverGrid.builder(
                        gridDelegate:
                            const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          crossAxisSpacing: 12,
                          mainAxisSpacing: 12,
                          childAspectRatio: 0.70,
                        ),
                        itemCount: listings.length,
                        itemBuilder: (_, i) {
                          final rawListing = listings[i];
                          return ListingCard(
                            listing: rawListing,
                            onTap: () =>
                                context.push('/listings/${rawListing['_id']}'),
                            onAddToCart: () {
                              final listingModel = Listing.fromJson(rawListing);
                              ref
                                  .read(cartProvider.notifier)
                                  .addItem(listingModel);
                              HapticFeedback.lightImpact();
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(
                                      '${listingModel.title} added to cart'),
                                  behavior: SnackBarBehavior.floating,
                                  backgroundColor: AppColors.primary,
                                  duration: const Duration(seconds: 2),
                                ),
                              );
                            },
                          );
                        },
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  String _greeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning,';
    if (hour < 17) return 'Good afternoon,';
    return 'Good evening,';
  }
}

class _FilterBottomSheet extends StatefulWidget {
  final ListingFilters initialFilters;

  const _FilterBottomSheet({required this.initialFilters});

  @override
  State<_FilterBottomSheet> createState() => _FilterBottomSheetState();
}

class _FilterBottomSheetState extends State<_FilterBottomSheet> {
  late String _sortBy;
  late double _maxPrice;
  late double _maxDistance;
  late List<String> _selectedAllergens;

  static const _allergensList = [
    'Gluten',
    'Dairy',
    'Nuts',
    'Soy',
    'Eggs',
    'Fish'
  ];

  @override
  void initState() {
    super.initState();
    _sortBy = widget.initialFilters.sortBy;
    _maxPrice = widget.initialFilters.maxPrice;
    _maxDistance = widget.initialFilters.maxDistance;
    _selectedAllergens = List.from(widget.initialFilters.selectedAllergens);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.fromLTRB(24, 20, 24, 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Filter & Sort',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                ),
              ),
              TextButton(
                onPressed: () {
                  setState(() {
                    _sortBy = 'price_asc';
                    _maxPrice = 15000.0;
                    _maxDistance = 15.0;
                    _selectedAllergens.clear();
                  });
                },
                child: const Text(
                  'Reset All',
                  style: TextStyle(
                    color: AppColors.error,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const Divider(),
          const SizedBox(height: 12),

          // Sort By
          const Text(
            'Sort By',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildSortChip('price_asc', 'Price: Low-High'),
                const SizedBox(width: 8),
                _buildSortChip('price_desc', 'Price: High-Low'),
                const SizedBox(width: 8),
                _buildSortChip('rating', 'Rating'),
                const SizedBox(width: 8),
                _buildSortChip('distance', 'Distance'),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Max Price Slider
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Max Price',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              Text(
                'RWF ${_maxPrice.toStringAsFixed(0)}',
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
          Slider(
            value: _maxPrice,
            min: 500.0,
            max: 20000.0,
            divisions: 39,
            activeColor: AppColors.primary,
            inactiveColor: AppColors.border,
            onChanged: (v) => setState(() => _maxPrice = v),
          ),
          const SizedBox(height: 12),

          // Max Distance Slider
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Max Distance',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              Text(
                '${_maxDistance.toStringAsFixed(1)} km',
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
          Slider(
            value: _maxDistance,
            min: 1.0,
            max: 15.0,
            divisions: 14,
            activeColor: AppColors.primary,
            inactiveColor: AppColors.border,
            onChanged: (v) => setState(() => _maxDistance = v),
          ),
          const SizedBox(height: 20),

          // Exclude Allergens
          const Text(
            'Exclude Allergens',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _allergensList.map((allergen) {
              final active = _selectedAllergens.contains(allergen);
              return ChoiceChip(
                label: Text(allergen),
                selected: active,
                onSelected: (selected) {
                  setState(() {
                    if (selected) {
                      _selectedAllergens.add(allergen);
                    } else {
                      _selectedAllergens.remove(allergen);
                    }
                  });
                },
                selectedColor: AppColors.primary.withValues(alpha: 0.15),
                backgroundColor: AppColors.surface,
                labelStyle: TextStyle(
                  color: active ? AppColors.primary : AppColors.textSecondary,
                  fontWeight: active ? FontWeight.w700 : FontWeight.normal,
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 32),

          // Apply Button
          SizedBox(
            width: double.infinity,
            child: CnPrimaryButton(
              label: 'Apply Filters',
              onTap: () {
                Navigator.of(context).pop(
                  ListingFilters(
                    sortBy: _sortBy,
                    maxPrice: _maxPrice,
                    maxDistance: _maxDistance,
                    selectedAllergens: _selectedAllergens,
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSortChip(String value, String label) {
    final active = _sortBy == value;
    return ChoiceChip(
      label: Text(label),
      selected: active,
      onSelected: (selected) {
        if (selected) {
          setState(() => _sortBy = value);
        }
      },
      selectedColor: AppColors.primary.withValues(alpha: 0.15),
      backgroundColor: AppColors.surface,
      labelStyle: TextStyle(
        color: active ? AppColors.primary : AppColors.textSecondary,
        fontWeight: active ? FontWeight.w700 : FontWeight.normal,
      ),
    );
  }
}
