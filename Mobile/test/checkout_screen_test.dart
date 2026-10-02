import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:chopnow/core/api/api_client.dart';
import 'package:chopnow/core/api/api_endpoints.dart';
import 'package:chopnow/core/models/listing_model.dart';
import 'package:chopnow/core/models/user_model.dart';
import 'package:chopnow/core/providers/auth_provider.dart';
import 'package:chopnow/core/providers/cart_provider.dart';
import 'package:chopnow/features/cart/checkout_screen.dart';
import 'package:chopnow/shared/animations/scale_tap.dart';
import 'package:chopnow/shared/widgets/buttons/cn_buttons.dart';

import 'helpers/fake_dio_adapter.dart';
import 'helpers/fake_firebase.dart';
import 'helpers/fake_secure_storage.dart';
import 'helpers/test_app.dart';

Listing _listing({
  String id = 'l1',
  String title = 'Test Meal',
  double offerPrice = 5000,
}) {
  return Listing(
    id: id,
    title: title,
    description: 'A test meal',
    price: 10000,
    offerPrice: offerPrice,
    quantity: 5,
    photos: const [],
  );
}

Map<String, dynamic> _quoteJson({
  bool cashEnabled = true,
  double deliveryFeePerVendor = 1000,
  double itemsSubtotal = 5000,
  double deliveryFee = 0,
}) {
  return {
    'totals': {
      'subtotal': itemsSubtotal,
      'deliveryFee': deliveryFee,
      'tax': 0,
      'total': itemsSubtotal + deliveryFee,
    },
    'vendors': [
      {
        'business': {'name': 'Chop Test'},
        'pricing': {'deliveryFee': deliveryFee},
        'items': [
          {'title': 'Test Meal', 'quantity': 1, 'subtotal': itemsSubtotal},
        ],
      },
    ],
    'options': {
      'cashPaymentsEnabled': cashEnabled,
      'deliveryFeePerVendor': deliveryFeePerVendor,
      'taxPercent': 0,
      'taxLabel': 'Tax',
    },
  };
}

Map<String, dynamic> _checkoutSuccessJson({
  String orderId = 'o1',
  String paymentMethod = 'cash',
  double total = 5000,
}) {
  return {
    'orders': [
      {
        '_id': orderId,
        'status': 'pending_payment',
        'items': [],
        'pricing': {'total': total},
        'payment': {'paymentMethod': paymentMethod, 'paymentStatus': 'pending'},
      },
    ],
    'checkoutId': null,
    'totals': {'total': total},
  };
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late FakeHandler handler;

  setUp(() async {
    installFakeFirebase();
    FakeSecureStorage.install();
    SharedPreferences.setMockInitialValues({});
    ApiClient.instance.httpClientAdapter =
        FakeHttpClientAdapter((options) => handler(options));
    handler = (options) => throw StateError(
        'Unstubbed request: ${options.method} ${options.path}');
  });

  tearDown(() async {
    FakeSecureStorage.uninstall();
    // A guarded try: if a prior pump genuinely timed out, the binding can
    // already be outside its test zone by the time tearDown runs, and this
    // call would throw and mask the real failure for the next test.
    try {
      await TestWidgetsFlutterBinding.instance.setSurfaceSize(null);
    } catch (_) {}
  });

  /// Seeds a signed-in user (so `currentUserProvider` and the delivery
  /// address list resolve without a real `_checkExistingAuth()` network
  /// call) and a one-item cart, then pumps CheckoutScreen inside a real
  /// GoRouter so the screen's `context.pushReplacement` calls resolve.
  Future<ProviderContainer> pumpCheckout(
    WidgetTester tester, {
    List<UserAddress> addresses = const [],
  }) async {
    // Checkout's body is a SingleChildScrollView taller than the default
    // 800x600 test surface - without this the "Place Order" button sits
    // below the visible viewport and `tester.tap()` misses it entirely.
    await tester.binding.setSurfaceSize(const Size(800, 1400));
    final container = ProviderContainer();
    // Same lazy-provider-construction gotcha as cart_test.dart/
    // auth_provider_test.dart: force both notifiers to exist and let auth's
    // fire-and-forget `_checkExistingAuth()` settle before seeding real
    // state, so it doesn't clobber what we set afterwards.
    container.read(cartProvider.notifier);
    container.read(authProvider.notifier);

    await tester.pumpWidget(UncontrolledProviderScope(
      container: container,
      child: MaterialApp.router(
        routerConfig: _testRouter(),
      ),
    ));
    // Under testWidgets the binding uses a fake clock - a bare
    // `Future.delayed` (as `_checkExistingAuth` awaits internally via
    // AuthService) never resolves on its own; `tester.pump(duration)` is
    // what actually moves time forward here and drains it.
    await tester.pump(const Duration(milliseconds: 10));

    container.read(cartProvider.notifier).addItem(_listing());
    // ignore: invalid_use_of_protected_member
    container.read(authProvider.notifier).state = AuthAuthenticated(
      token: 'test-token',
      user: AppUser(
        id: 'u1',
        firstName: 'Ama',
        lastName: 'K',
        email: 'buyer@chopnow.rw',
        phone: '0788000000',
        roles: const ['consumer'],
        activeRole: 'consumer',
        addresses: addresses,
      ),
    );
    await tester.pump();
    return container;
  }

  group('quote (order summary) state', () {
    testWidgets('shows a loading indicator while the quote is in flight',
        (tester) async {
      // A manually-resolved Completer, not Future.delayed/Timer: under
      // testWidgets the binding runs a fake clock, so a real Timer-backed
      // delay here would never fire on its own.
      final quoteGate = Completer<FakeResponse>();
      handler = (options) {
        expect(options.path, AppEndpoints.ordersQuote);
        return quoteGate.future;
      };

      await pumpCheckout(tester);
      await tester.pump(); // let the post-frame callback fire _refreshQuote()

      expect(find.text('Calculating your total…'), findsOneWidget);

      quoteGate.complete(FakeResponse(200, _quoteJson()));
      await tester.pumpAndSettle();
      expect(find.text('Calculating your total…'), findsNothing);
    });

    testWidgets('renders vendor breakdown and total on success', (tester) async {
      handler = (_) => FakeResponse(200, _quoteJson(itemsSubtotal: 5000));

      await pumpCheckout(tester);
      await tester.pumpAndSettle();

      expect(find.text('Chop Test'), findsOneWidget);
      expect(find.text('Place Order · RWF 5000'), findsOneWidget);
    });

    testWidgets('shows the error and disables Place Order when the quote fails',
        (tester) async {
      handler = (_) => const FakeResponse(500, {'message': 'Pricing unavailable'});

      await pumpCheckout(tester);
      await tester.pumpAndSettle();

      // _refreshQuote's catch renders `e.toString()` verbatim (not run
      // through ApiException.fromDioError like the rest of the app does),
      // so the visible text is DioException's raw toString, not the
      // backend's "message" field - flagged separately, not asserted on
      // literally here since it's an implementation detail of Dio's
      // formatting.
      expect(find.text('Calculating your total…'), findsNothing);
      expect(find.text('Chop Test'), findsNothing);
      final button =
          tester.widget<CnPrimaryButton>(find.byType(CnPrimaryButton).last);
      expect(button.onTap, isNull);
    });
  });

  group('place order state machine', () {
    testWidgets('cash: loading -> success clears the cart and navigates to confirmation',
        (tester) async {
      // Gate the checkout call so the loading state is observed
      // deterministically instead of racing a same-tick fake response.
      final checkoutGate = Completer<FakeResponse>();
      handler = (options) {
        if (options.path == AppEndpoints.ordersQuote) {
          return FakeResponse(200, _quoteJson(cashEnabled: true));
        }
        if (options.path == AppEndpoints.ordersCheckout) {
          expect(
            (options.data as Map)['payment'],
            {'paymentMethod': 'cash'},
          );
          return checkoutGate.future;
        }
        throw StateError('Unexpected path ${options.path}');
      };

      final container = await pumpCheckout(tester);
      await tester.pumpAndSettle();

      // Select "Cash on Pickup" - the third payment tile once cash is enabled.
      await tester.tap(find.text('Cash on Pickup'));
      await tester.pump();

      await tester.tap(find.byType(CnPrimaryButton).last);
      await tester.pump(); // enters the loading state
      // CnPrimaryButton swaps its label for a bare spinner while
      // isLoading - the "Placing Order..." label is passed through but
      // never actually painted, so assert on the button's own state/the
      // spinner rather than that text.
      final loadingButton =
          tester.widget<CnPrimaryButton>(find.byType(CnPrimaryButton).last);
      expect(loadingButton.isLoading, isTrue);
      expect(loadingButton.label, 'Placing Order...');

      checkoutGate.complete(
          FakeResponse(200, _checkoutSuccessJson(paymentMethod: 'cash')));
      await tester.pumpAndSettle();

      // pushReplacement landed on the confirmation marker route.
      expect(find.text('confirmation:o1'), findsOneWidget);
      expect(container.read(cartProvider), isEmpty);
    });

    testWidgets('a failed checkout surfaces the error and re-enables the button',
        (tester) async {
      handler = (options) {
        if (options.path == AppEndpoints.ordersQuote) {
          return FakeResponse(200, _quoteJson());
        }
        if (options.path == AppEndpoints.ordersCheckout) {
          return const FakeResponse(400, {'message': 'Listing no longer available'});
        }
        throw StateError('Unexpected path ${options.path}');
      };

      await pumpCheckout(tester);
      await tester.pumpAndSettle();

      await tester.tap(find.byType(CnPrimaryButton).last);
      await tester.pumpAndSettle();

      // Same as the quote-failure case: _placeOrder's catch also renders
      // `e.toString()` verbatim rather than ApiException.fromDioError(e)
      // .message, so it's Dio's raw exception text on screen, not the
      // backend's "message" field - flagged separately.
      expect(find.text('Placing Order...'), findsNothing);
      final button =
          tester.widget<CnPrimaryButton>(find.byType(CnPrimaryButton).last);
      expect(button.isLoading, isFalse);
      expect(button.onTap, isNotNull);
      // The error banner (a Container with an error icon + message) is
      // showing - the icon alone is a stable enough anchor given the
      // message text itself isn't asserted on.
      expect(find.byIcon(Icons.error_outline_rounded), findsOneWidget);
    });

    testWidgets('mobile money: success opens the payment confirmation sheet',
        (tester) async {
      handler = (options) {
        if (options.path == AppEndpoints.ordersQuote) {
          return FakeResponse(200, _quoteJson());
        }
        if (options.path == AppEndpoints.ordersCheckout) {
          return FakeResponse(200, _checkoutSuccessJson(paymentMethod: 'mobile_money'));
        }
        throw StateError('Unexpected path ${options.path}');
      };

      await pumpCheckout(tester);
      await tester.pumpAndSettle();

      // Default payment method is already "momo".
      await tester.tap(find.byType(CnPrimaryButton).last);
      // Not pumpAndSettle: the sheet's phone-number CnTextField has a
      // blinking cursor timer that never settles on its own. A handful of
      // bounded pumps drains the checkout POST's async chain (interceptor,
      // fake adapter, response transform each cost a microtask hop) and
      // then the sheet's own open transition.
      for (var i = 0; i < 6; i++) {
        await tester.pump(const Duration(milliseconds: 50));
      }

      // The sheet's initial (not-yet-submitted) state: title + phone entry
      // form. statusText's default value ("Confirm your number below to
      // pay.") is only ever rendered once `isPaymentLoading` is true, i.e.
      // after tapping "Confirm & Pay" - not on first open.
      expect(find.text('MTN MoMo Checkout'), findsOneWidget);
      expect(find.text('Confirm & Pay'), findsOneWidget);
      // Still on the checkout screen underneath the sheet - no navigation yet.
      expect(find.text('confirmation:o1'), findsNothing);
    });

    testWidgets('delivery without a saved address surfaces a clear error',
        (tester) async {
      handler = (options) {
        expect(options.path, AppEndpoints.ordersQuote);
        return FakeResponse(200, _quoteJson());
      };

      await pumpCheckout(tester, addresses: const []);
      await tester.pumpAndSettle();

      // Second ScaleTap is the "Delivery" option (first is "Self-Pickup").
      await tester.tap(find.byType(ScaleTap).at(1));
      await tester.pumpAndSettle();

      await tester.tap(find.byType(CnPrimaryButton).last);
      await tester.pumpAndSettle();

      expect(find.text('Please add or select a delivery address.'),
          findsOneWidget);
    });
  });
}

GoRouter _testRouter() => GoRouter(
      initialLocation: '/checkout',
      routes: [
        GoRoute(path: '/checkout', builder: (_, __) => const CheckoutScreen()),
        GoRoute(
          path: '/orders/:id/confirmation',
          builder: (_, state) =>
              TestRouteScreen('confirmation:${state.pathParameters['id']}'),
        ),
        GoRoute(path: '/orders', builder: (_, __) => const TestRouteScreen('orders')),
      ],
    );
