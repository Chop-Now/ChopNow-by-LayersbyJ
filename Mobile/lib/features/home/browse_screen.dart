import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/widgets/cards/listing_card.dart';
import '../../shared/widgets/feedback/cn_states.dart';
import '../../shared/animations/scale_tap.dart';
import '../../core/providers/cart_provider.dart';
import '../../core/models/listing_model.dart';

final _browseCategoryProvider = StateProvider<String>((ref) => 'All');
final _browseSearchProvider = StateProvider<String>((ref) => '');

final _browseListingsProvider =
    FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final category = ref.watch(_browseCategoryProvider);
  final search = ref.watch(_browseSearchProvider);
  final params = <String, dynamic>{'status': 'active', 'limit': 40};
  if (category != 'All') {
    params['category'] = category.replaceAll(RegExp(r'[^\w\s]'), '').trim();
  }
  if (search.isNotEmpty) params['search'] = search;
  final res = await ApiClient.instance
      .get(AppEndpoints.listings, queryParameters: params);
  final data = res.data;
  if (data is Map && data['listings'] != null) {
    return List.from(data['listings'] as List);
  }
  if (data is List) return List.from(data);
  return [];
});

class BrowseScreen extends ConsumerStatefulWidget {
  const BrowseScreen({super.key});
  @override
  ConsumerState<BrowseScreen> createState() => _BrowseScreenState();
}

class _BrowseScreenState extends ConsumerState<BrowseScreen> {
  final _searchCtrl = TextEditingController();
  final _searchFocusNode = FocusNode();

  static const _categories = [
    'All',
    'Food',
    'Salads',
    'Bakery',
    'Café',
    'Asian',
    'Grocery',
    'Meat',
    'Pizza',
    'Noodles'
  ];

  @override
  void dispose() {
    _searchCtrl.dispose();
    _searchFocusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final asyncListings = ref.watch(_browseListingsProvider);
    final selectedCat = ref.watch(_browseCategoryProvider);
    final cartCount = ref.watch(cartCountProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // Search Header. Ground is the scaffold tint, not white, so the
            // white search pill and cart button read against it.
            Container(
              color: AppColors.background,
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Text('Browse',
                          style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w800,
                              color: AppColors.textPrimary)),
                      const Spacer(),
                      ScaleTap(
                        onTap: () => context.go('/cart'),
                        child: Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: AppColors.surface,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color:
                                    AppColors.moringa.withValues(alpha: 0.13),
                                blurRadius: 14,
                                offset: const Offset(0, 4),
                              ),
                              BoxShadow(
                                color:
                                    AppColors.moringa.withValues(alpha: 0.05),
                                blurRadius: 3,
                                offset: const Offset(0, 1),
                              ),
                            ],
                          ),
                          child: Stack(
                            alignment: Alignment.center,
                            children: [
                              const Icon(Icons.shopping_cart_outlined,
                                  size: 20, color: AppColors.textPrimary),
                              if (cartCount > 0)
                                Positioned(
                                  top: 6,
                                  right: 6,
                                  child: Container(
                                    width: 12,
                                    height: 12,
                                    decoration: const BoxDecoration(
                                        color: AppColors.accent,
                                        shape: BoxShape.circle),
                                    child: Center(
                                      child: Text(
                                        '$cartCount',
                                        style: const TextStyle(
                                            fontSize: 7,
                                            color: Colors.white,
                                            fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  // Search field
                  GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: () => _searchFocusNode.requestFocus(),
                    child: Container(
                      height: 54,
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        // Full pill, like the reference
                        borderRadius: BorderRadius.circular(27),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.moringa.withValues(alpha: 0.14),
                            blurRadius: 20,
                            offset: const Offset(0, 6),
                          ),
                          BoxShadow(
                            color: AppColors.moringa.withValues(alpha: 0.05),
                            blurRadius: 4,
                            offset: const Offset(0, 1),
                          ),
                        ],
                      ),
                      child: ValueListenableBuilder<TextEditingValue>(
                        valueListenable: _searchCtrl,
                        builder: (context, value, _) => Row(children: [
                          // Clears the pill's 27px curve
                          const SizedBox(width: 20),
                          AnimatedSize(
                            duration: const Duration(milliseconds: 180),
                            curve: Curves.easeOut,
                            child: value.text.isEmpty
                                ? const Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(Icons.search_rounded,
                                          color: AppColors.textSecondary,
                                          size: 20),
                                      SizedBox(width: 8),
                                    ],
                                  )
                                : const SizedBox.shrink(),
                          ),
                          Expanded(
                              child: TextField(
                            controller: _searchCtrl,
                            focusNode: _searchFocusNode,
                            onChanged: (v) {
                              ref.read(_browseSearchProvider.notifier).state =
                                  v;
                            },
                            decoration: const InputDecoration(
                              hintText: 'Search food, cafés, grocery...',
                              hintStyle: TextStyle(
                                  fontSize: 14, color: AppColors.textSecondary),
                              border: InputBorder.none,
                              enabledBorder: InputBorder.none,
                              focusedBorder: InputBorder.none,
                              disabledBorder: InputBorder.none,
                              errorBorder: InputBorder.none,
                              focusedErrorBorder: InputBorder.none,
                              filled: false,
                              isDense: true,
                              contentPadding: EdgeInsets.zero,
                            ),
                          )),
                          if (value.text.isNotEmpty)
                            IconButton(
                              icon: const Icon(Icons.close,
                                  size: 18, color: AppColors.textSecondary),
                              onPressed: () {
                                _searchCtrl.clear();
                                ref.read(_browseSearchProvider.notifier).state =
                                    '';
                              },
                            ),
                        ]),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Category chips
            SizedBox(
              height: 52,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                itemCount: _categories.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (_, i) {
                  final cat = _categories[i];
                  final active = selectedCat == cat;
                  return ScaleTap(
                    onTap: () {
                      HapticFeedback.selectionClick();
                      ref.read(_browseCategoryProvider.notifier).state = cat;
                    },
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        color: active ? AppColors.primary : AppColors.surface,
                        borderRadius: BorderRadius.circular(100),
                        border: Border.all(
                            color:
                                active ? AppColors.primary : AppColors.border),
                        boxShadow: active
                            ? [
                                BoxShadow(
                                    color: AppColors.primary
                                        .withValues(alpha: 0.2),
                                    blurRadius: 6)
                              ]
                            : null,
                      ),
                      child: Text(cat,
                          style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: active
                                  ? Colors.white
                                  : AppColors.textSecondary)),
                    ),
                  );
                },
              ),
            ),

            // Results
            Expanded(
              child: RefreshIndicator(
                color: AppColors.primary,
                onRefresh: () async => ref.invalidate(_browseListingsProvider),
                child: asyncListings.when(
                  loading: () => GridView.builder(
                    physics: const BouncingScrollPhysics(
                        parent: AlwaysScrollableScrollPhysics()),
                    padding: const EdgeInsets.all(16),
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            crossAxisSpacing: 12,
                            mainAxisSpacing: 12,
                            childAspectRatio: 0.70),
                    itemCount: 6,
                    itemBuilder: (_, __) => const ListingCardSkeleton(),
                  ),
                  error: (e, _) => CnErrorState(
                      message: e.toString(),
                      onRetry: () => ref.invalidate(_browseListingsProvider)),
                  data: (listings) => listings.isEmpty
                      ? const CnEmptyState(
                          title: 'No deals found',
                          subtitle: 'Try a different category or search term',
                          imagePath: 'assets/images/empty_orders.png')
                      : GridView.builder(
                          physics: const BouncingScrollPhysics(
                              parent: AlwaysScrollableScrollPhysics()),
                          padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
                          gridDelegate:
                              const SliverGridDelegateWithFixedCrossAxisCount(
                                  crossAxisCount: 2,
                                  crossAxisSpacing: 12,
                                  mainAxisSpacing: 12,
                                  childAspectRatio: 0.70),
                          itemCount: listings.length,
                          itemBuilder: (_, i) => ListingCard(
                            listing: listings[i],
                            onTap: () =>
                                context.push('/listings/${listings[i]['_id']}'),
                            onAddToCart: () {
                              final listingModel = Listing.fromJson(
                                  listings[i] as Map<String, dynamic>);
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
                          ),
                        ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
