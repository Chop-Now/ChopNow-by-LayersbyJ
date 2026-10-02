import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/cart_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/widgets/buttons/cn_buttons.dart';
import '../../shared/widgets/feedback/cn_states.dart';
import '../../shared/animations/scale_tap.dart';

class CartScreen extends ConsumerWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final items = ref.watch(cartProvider);
    final total = ref.watch(cartTotalProvider);
    // Real savings versus each listing's original price.
    final savings = items.fold<double>(
        0,
        (sum, i) =>
            sum +
            (i.listing.price - i.listing.offerPrice).clamp(0, double.infinity) *
                i.quantity);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('My Cart',
                style: TextStyle(
                    fontWeight: FontWeight.w900,
                    color: AppColors.textPrimary,
                    fontSize: 20)),
            if (items.isNotEmpty)
              Text('${items.length} item${items.length == 1 ? '' : 's'}',
                  style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.textSecondary,
                      fontWeight: FontWeight.w500)),
          ],
        ),
        backgroundColor: AppColors.surface,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        actions: [
          if (items.isNotEmpty)
            TextButton.icon(
              onPressed: () {
                HapticFeedback.mediumImpact();
                showDialog(
                  context: context,
                  useRootNavigator: false,
                  builder: (_) => AlertDialog(
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20)),
                    title: const Text('Clear Cart',
                        style: TextStyle(fontWeight: FontWeight.w800)),
                    content: const Text('Remove all items from your cart?'),
                    actions: [
                      TextButton(
                          onPressed: () => Navigator.pop(context),
                          child: const Text('Cancel')),
                      TextButton(
                        onPressed: () {
                          ref.read(cartProvider.notifier).clear();
                          Navigator.pop(context);
                        },
                        child: const Text('Clear',
                            style: TextStyle(color: AppColors.error)),
                      ),
                    ],
                  ),
                );
              },
              icon: const Icon(Icons.delete_sweep_outlined,
                  size: 17, color: AppColors.error),
              label: const Text('Clear',
                  style: TextStyle(
                      color: AppColors.error,
                      fontSize: 13,
                      fontWeight: FontWeight.w600)),
            ),
        ],
        bottom: items.isNotEmpty
            ? PreferredSize(
                preferredSize: const Size.fromHeight(1),
                child: Container(height: 1, color: AppColors.border),
              )
            : null,
      ),
      body: items.isEmpty
          ? CnEmptyState(
              title: 'Your cart is empty',
              subtitle:
                  'Find discounted meals near you\nand rescue them from waste!',
              imagePath: 'assets/images/empty_cart.png',
              actionLabel: 'Browse Deals',
              onAction: () => context.go('/home'),
            )
          : Column(
              children: [
                // Impact callout
                Container(
                  margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        AppColors.success.withValues(alpha: 0.1),
                        AppColors.primary.withValues(alpha: 0.06)
                      ],
                    ),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                        color: AppColors.success.withValues(alpha: 0.25)),
                  ),
                  child: const Row(
                    children: [
                      Text('🌱', style: TextStyle(fontSize: 18)),
                      SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'These items are rescued from food waste — thank you!',
                          style: TextStyle(
                              fontSize: 12,
                              color: AppColors.success,
                              fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                ),

                // Items list
                Expanded(
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                    itemCount: items.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (_, i) => _CartItemCard(item: items[i]),
                  ),
                ),

                // Order Summary footer
                Container(
                  padding: EdgeInsets.fromLTRB(
                      20, 16, 20, MediaQuery.of(context).padding.bottom + 12),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    boxShadow: [
                      BoxShadow(
                          color: AppColors.char.withValues(alpha: 0.08),
                          blurRadius: 20,
                          offset: const Offset(0, -4)),
                    ],
                    borderRadius:
                        const BorderRadius.vertical(top: Radius.circular(24)),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Drag handle
                      Container(
                        width: 36,
                        height: 4,
                        margin: const EdgeInsets.only(bottom: 16),
                        decoration: BoxDecoration(
                            color: AppColors.border,
                            borderRadius: BorderRadius.circular(2)),
                      ),

                      // Price breakdown
                      _PriceLine(
                          label: 'Subtotal',
                          value: 'RWF ${total.toStringAsFixed(0)}'),
                      const SizedBox(height: 8),
                      const _PriceLine(
                        label: 'Delivery & taxes',
                        value: 'Calculated at checkout',
                      ),
                      if (savings > 0) ...[
                        const SizedBox(height: 8),
                        _PriceLine(
                            label: 'You save',
                            value: 'RWF ${savings.toStringAsFixed(0)}',
                            valueColor: AppColors.primary),
                      ],
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 12),
                        child: Divider(color: AppColors.border),
                      ),

                      // Total
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Total',
                              style: TextStyle(
                                  fontSize: 17,
                                  fontWeight: FontWeight.w800,
                                  color: AppColors.textPrimary)),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 6),
                            decoration: BoxDecoration(
                              gradient: AppColors.primaryGradient,
                              borderRadius: BorderRadius.circular(100),
                            ),
                            child: Text(
                              'RWF ${total.toStringAsFixed(0)}',
                              style: const TextStyle(
                                  fontSize: 17,
                                  fontWeight: FontWeight.w900,
                                  color: Colors.white),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Checkout button
                      CnPrimaryButton(
                        label: 'Proceed to Checkout',
                        onTap: () {
                          HapticFeedback.lightImpact();
                          context.push('/checkout');
                        },
                      ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }
}

class _PriceLine extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;
  const _PriceLine(
      {required this.label, required this.value, this.valueColor});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label,
            style:
                const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
        Text(value,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: valueColor ?? AppColors.textPrimary,
            )),
      ],
    );
  }
}

class _CartItemCard extends ConsumerWidget {
  final CartItem item;
  const _CartItemCard({required this.item});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cartNotifier = ref.read(cartProvider.notifier);
    final listing = item.listing;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
              color: AppColors.char.withValues(alpha: 0.04),
              blurRadius: 8,
              offset: const Offset(0, 2))
        ],
      ),
      child: Row(
        children: [
          // Image
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: SizedBox(
              width: 80,
              height: 80,
              child: listing.firstPhoto != null &&
                      (listing.firstPhoto!.startsWith('http://') ||
                          listing.firstPhoto!.startsWith('https://'))
                  ? CachedNetworkImage(
                      imageUrl: listing.firstPhoto!,
                      fit: BoxFit.cover,
                      placeholder: (_, __) =>
                          Container(color: AppColors.surfaceVariant),
                      errorWidget: (_, __, ___) => Container(
                          color: AppColors.surfaceVariant,
                          child: const Icon(Icons.fastfood_rounded,
                              color: AppColors.border, size: 30)))
                  : Container(
                      color: AppColors.surfaceVariant,
                      child: const Icon(Icons.fastfood_rounded,
                          color: AppColors.border, size: 30)),
            ),
          ),
          const SizedBox(width: 12),

          // Details
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(listing.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                        height: 1.3)),
                const SizedBox(height: 4),
                Text('RWF ${listing.offerPrice.toStringAsFixed(0)} each',
                    style: const TextStyle(
                        fontSize: 12, color: AppColors.textSecondary)),
                const SizedBox(height: 10),
                Row(
                  children: [
                    // Qty stepper
                    _SmallStepper(
                      qty: item.quantity,
                      onDecrement: () => cartNotifier.decrementItem(listing.id),
                      onIncrement: item.quantity < listing.quantity
                          ? () => cartNotifier.addItem(listing)
                          : null,
                    ),
                    const Spacer(),
                    Text('RWF ${item.subtotal.toStringAsFixed(0)}',
                        style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: AppColors.primary)),
                  ],
                ),
              ],
            ),
          ),

          // Remove
          const SizedBox(width: 4),
          ScaleTap(
            onTap: () {
              HapticFeedback.lightImpact();
              cartNotifier.removeItem(listing.id);
            },
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.errorSurface,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.delete_outline_rounded,
                  color: AppColors.error, size: 18),
            ),
          ),
        ],
      ),
    );
  }
}

class _SmallStepper extends StatelessWidget {
  final int qty;
  final VoidCallback onDecrement;
  final VoidCallback? onIncrement;
  const _SmallStepper(
      {required this.qty, required this.onDecrement, this.onIncrement});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          GestureDetector(
            onTap: () {
              HapticFeedback.selectionClick();
              onDecrement();
            },
            child: Container(
              width: 32,
              height: 32,
              decoration: const BoxDecoration(
                color: AppColors.primarySurface,
                borderRadius:
                    BorderRadius.horizontal(left: Radius.circular(9)),
              ),
              child: const Icon(Icons.remove_rounded,
                  size: 15, color: AppColors.primary),
            ),
          ),
          Container(
            width: 36,
            alignment: Alignment.center,
            child: Text('$qty',
                style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary)),
          ),
          GestureDetector(
            onTap: onIncrement == null
                ? null
                : () {
                    HapticFeedback.selectionClick();
                    onIncrement!();
                  },
            child: Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: onIncrement == null
                    ? AppColors.surfaceVariant
                    : AppColors.primarySurface,
                borderRadius:
                    const BorderRadius.horizontal(right: Radius.circular(9)),
              ),
              child: Icon(Icons.add_rounded,
                  size: 15,
                  color: onIncrement == null
                      ? AppColors.border
                      : AppColors.primary),
            ),
          ),
        ],
      ),
    );
  }
}
