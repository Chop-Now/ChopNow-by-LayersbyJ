import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/listing_model.dart';
import '../services/local_storage_service.dart';

// ── Cart Item ─────────────────────────────────────────────────────────────────
class CartItem {
  final Listing listing;
  final int quantity;

  const CartItem({required this.listing, required this.quantity});

  CartItem copyWith({int? quantity}) =>
      CartItem(listing: listing, quantity: quantity ?? this.quantity);

  double get subtotal => listing.offerPrice * quantity;

  Map<String, dynamic> toJson() => {
        'listing': listing.toJson(),
        'quantity': quantity,
      };

  factory CartItem.fromJson(Map<String, dynamic> json) => CartItem(
        listing: Listing.fromJson(json['listing'] as Map<String, dynamic>),
        quantity: (json['quantity'] as num?)?.toInt() ?? 1,
      );
}

// ── Cart State ────────────────────────────────────────────────────────────────
// M22: persisted to disk (LocalStorageService) so the cart survives the app
// being killed - previously it was pure in-memory Riverpod state, wiped on
// every cold start.
class CartNotifier extends StateNotifier<List<CartItem>> {
  CartNotifier() : super([]) {
    _restore();
  }

  Future<void> _restore() async {
    try {
      final raw = await LocalStorageService.loadCart();
      if (raw == null || raw.isEmpty) return;
      final decoded = jsonDecode(raw) as List;
      state = decoded
          .map((e) => CartItem.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (e) {
      // Corrupted/old-shape cart data shouldn't crash startup - just start empty.
      if (kDebugMode) debugPrint('Failed to restore cart from storage: $e');
    }
  }

  Future<void> _persist() async {
    if (state.isEmpty) {
      await LocalStorageService.clearCart();
    } else {
      await LocalStorageService.saveCart(
        jsonEncode(state.map((i) => i.toJson()).toList()),
      );
    }
  }

  void addItem(Listing listing) {
    final idx = state.indexWhere((i) => i.listing.id == listing.id);
    if (idx >= 0) {
      // increment
      final items = [...state];
      final current = items[idx];
      if (current.quantity < listing.quantity) {
        items[idx] = current.copyWith(quantity: current.quantity + 1);
        state = items;
        _persist();
      }
    } else {
      state = [...state, CartItem(listing: listing, quantity: 1)];
      _persist();
    }
  }

  void removeItem(String listingId) {
    state = state.where((i) => i.listing.id != listingId).toList();
    _persist();
  }

  void decrementItem(String listingId) {
    final idx = state.indexWhere((i) => i.listing.id == listingId);
    if (idx < 0) return;
    final items = [...state];
    if (items[idx].quantity <= 1) {
      items.removeAt(idx);
    } else {
      items[idx] = items[idx].copyWith(quantity: items[idx].quantity - 1);
    }
    state = items;
    _persist();
  }

  void clear() {
    state = [];
    _persist();
  }

  double get total => state.fold(0, (sum, item) => sum + item.subtotal);

  int get itemCount => state.fold(0, (sum, item) => sum + item.quantity);

  int quantityOf(String listingId) => state
      .firstWhere((i) => i.listing.id == listingId,
          orElse: () => const CartItem(listing: _dummyListing, quantity: 0))
      .quantity;
}

// placeholder to satisfy orElse
const _dummyListing = Listing(
  id: '',
  title: '',
  description: '',
  price: 0,
  offerPrice: 0,
  quantity: 0,
  photos: [],
);

final cartProvider = StateNotifierProvider<CartNotifier, List<CartItem>>((ref) {
  return CartNotifier();
});

// Convenience selectors
final cartTotalProvider = Provider<double>((ref) {
  final items = ref.watch(cartProvider);
  return items.fold(0, (sum, item) => sum + item.subtotal);
});

final cartCountProvider = Provider<int>((ref) {
  final items = ref.watch(cartProvider);
  return items.fold(0, (sum, item) => sum + item.quantity);
});
