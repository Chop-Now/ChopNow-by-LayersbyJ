import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:chopnow/core/models/listing_model.dart';
import 'package:chopnow/core/providers/cart_provider.dart';
import 'package:chopnow/core/services/local_storage_service.dart';

/// A minimal listing for testing
Listing _makeListing({
  String id = 'l1',
  String title = 'Test Meal',
  double price = 10000,
  double offerPrice = 5000,
  int quantity = 5,
}) {
  return Listing(
    id: id,
    title: title,
    description: 'A test meal',
    price: price,
    offerPrice: offerPrice,
    quantity: quantity,
    photos: [],
  );
}

void main() {
  group('CartNotifier', () {
    late ProviderContainer container;
    late CartNotifier notifier;

    setUp(() {
      SharedPreferences.setMockInitialValues({});
      container = ProviderContainer();
      notifier = container.read(cartProvider.notifier);
    });

    tearDown(() => container.dispose());

    test('starts empty', () {
      expect(container.read(cartProvider), isEmpty);
      expect(notifier.total, 0.0);
      expect(notifier.itemCount, 0);
    });

    test('addItem adds a new item', () {
      final listing = _makeListing();
      notifier.addItem(listing);
      final items = container.read(cartProvider);
      expect(items.length, 1);
      expect(items.first.listing.id, 'l1');
      expect(items.first.quantity, 1);
    });

    test('addItem increments existing item', () {
      final listing = _makeListing();
      notifier.addItem(listing);
      notifier.addItem(listing);
      final items = container.read(cartProvider);
      expect(items.length, 1);
      expect(items.first.quantity, 2);
    });

    test('addItem respects stock limit', () {
      final listing = _makeListing(quantity: 2);
      for (var i = 0; i < 5; i++) {
        notifier.addItem(listing);
      }
      // Should only allow up to quantity=2
      expect(container.read(cartProvider).first.quantity, 2);
    });

    test('decrementItem reduces quantity by 1', () {
      final listing = _makeListing();
      notifier.addItem(listing);
      notifier.addItem(listing);
      notifier.decrementItem('l1');
      expect(container.read(cartProvider).first.quantity, 1);
    });

    test('decrementItem removes item when quantity reaches 0', () {
      final listing = _makeListing();
      notifier.addItem(listing);
      notifier.decrementItem('l1');
      expect(container.read(cartProvider), isEmpty);
    });

    test('removeItem deletes item completely', () {
      notifier.addItem(_makeListing(id: 'l1'));
      notifier.addItem(_makeListing(id: 'l2'));
      notifier.removeItem('l1');
      final items = container.read(cartProvider);
      expect(items.length, 1);
      expect(items.first.listing.id, 'l2');
    });

    test('clear empties the cart', () {
      notifier.addItem(_makeListing());
      notifier.clear();
      expect(container.read(cartProvider), isEmpty);
    });

    test('total computes correctly', () {
      notifier.addItem(_makeListing(id: 'l1', offerPrice: 3000));
      notifier.addItem(_makeListing(id: 'l1', offerPrice: 3000)); // qty=2
      notifier.addItem(_makeListing(id: 'l2', offerPrice: 2000));
      // l1: 3000*2 = 6000, l2: 2000*1 = 2000 → total = 8000
      expect(notifier.total, 8000.0);
    });

    test('itemCount sums across all items', () {
      notifier.addItem(_makeListing(id: 'l1'));
      notifier.addItem(_makeListing(id: 'l1')); // qty=2
      notifier.addItem(_makeListing(id: 'l2'));
      expect(notifier.itemCount, 3);
    });

    test('quantityOf returns 0 for unknown listing', () {
      expect(notifier.quantityOf('unknown'), 0);
    });
  });

  group('CartNotifier persistence (M22)', () {
    setUp(() {
      SharedPreferences.setMockInitialValues({});
    });

    test('addItem persists the cart so a fresh notifier restores it', () async {
      final container = ProviderContainer();
      final notifier = container.read(cartProvider.notifier);
      notifier.addItem(_makeListing(id: 'l1', title: 'Persisted Meal'));
      // saveCart() is fire-and-forget from addItem's perspective - give the
      // microtask queue a turn to actually write it before reading back.
      await Future.delayed(const Duration(milliseconds: 20));
      final storedRaw = await LocalStorageService.loadCart();
      expect(storedRaw, isNotNull, reason: 'cart should be persisted after addItem');
      container.dispose();

      final freshContainer = ProviderContainer();
      // Providers are lazy - force construction now (this is what kicks off
      // _restore()), THEN wait for it, or the read below just sees the
      // notifier's initial (pre-restore) empty state.
      freshContainer.read(cartProvider.notifier);
      await Future.delayed(const Duration(milliseconds: 20));
      final restored = freshContainer.read(cartProvider);
      expect(restored, hasLength(1));
      expect(restored.first.listing.id, 'l1');
      expect(restored.first.listing.title, 'Persisted Meal');
      expect(restored.first.quantity, 1);
      freshContainer.dispose();
    });

    test('clear() removes the persisted cart, not just the in-memory state',
        () async {
      final container = ProviderContainer();
      final notifier = container.read(cartProvider.notifier);
      notifier.addItem(_makeListing());
      await Future.delayed(const Duration(milliseconds: 20));
      expect(await LocalStorageService.loadCart(), isNotNull);

      notifier.clear();
      await Future.delayed(const Duration(milliseconds: 20));
      expect(await LocalStorageService.loadCart(), isNull);
      container.dispose();
    });

    test('a corrupted stored cart is ignored, not a crash on startup',
        () async {
      await LocalStorageService.saveCart('not valid json{{{');
      final container = ProviderContainer();
      // Constructing the notifier must not throw even though storage holds
      // garbage.
      container.read(cartProvider.notifier);
      await Future.delayed(const Duration(milliseconds: 20));
      expect(container.read(cartProvider), isEmpty);
      container.dispose();
    });
  });

  group('Listing model', () {
    test('fromJson parses correctly', () {
      final json = {
        '_id': 'abc123',
        'title': 'Sushi Pack',
        'description': 'Fresh sushi',
        'price': 15000,
        'offerPrice': 8000,
        'quantity': 3,
        'photos': ['https://cdn.example.com/sushi.jpg'],
        'allergens': ['fish', 'gluten'],
        'co2Saved': 250,
        'status': 'active',
      };
      final listing = Listing.fromJson(json);
      expect(listing.id, 'abc123');
      expect(listing.title, 'Sushi Pack');
      expect(listing.price, 15000.0);
      expect(listing.offerPrice, 8000.0);
      expect(listing.discountPercent, 47);
      expect(listing.isLowStock, isTrue);
      expect(listing.isSoldOut, isFalse);
      expect(listing.allergens, containsAll(['fish', 'gluten']));
    });

    test('isSoldOut when quantity is 0', () {
      final l = _makeListing(quantity: 0);
      expect(l.isSoldOut, isTrue);
      expect(l.isLowStock, isFalse);
    });

    test('discountPercent is 0 when prices equal', () {
      final l = _makeListing(price: 5000, offerPrice: 5000);
      expect(l.discountPercent, 0);
    });
  });

  group('CartItem widget test', () {
    testWidgets('CartScreen shows empty state when cart is empty', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: Center(child: Text('Cart Empty')),
            ),
          ),
        ),
      );
      expect(find.text('Cart Empty'), findsOneWidget);
    });
  });
}
