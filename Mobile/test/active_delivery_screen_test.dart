import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geolocator_platform_interface/geolocator_platform_interface.dart';
import 'package:go_router/go_router.dart';
import 'package:chopnow/core/api/api_client.dart';
import 'package:chopnow/core/api/api_endpoints.dart';
import 'package:chopnow/features/rider/active_delivery_screen.dart';

import 'helpers/fake_dio_adapter.dart';
import 'helpers/fake_firebase.dart';
import 'helpers/fake_geolocator.dart';
import 'helpers/fake_secure_storage.dart';
import 'helpers/test_app.dart';

Map<String, dynamic> _orderJson({
  String id = 'o1',
  String orderStatus = 'accepted',
  String? deliveryStatus = 'assigned',
  String deliveryId = 'd1',
}) {
  return {
    '_id': id,
    'status': orderStatus,
    if (deliveryStatus != null) 'delivery': {'status': deliveryStatus, '_id': deliveryId},
    'business': {
      'name': 'Chop Test',
      'location': {
        'coordinates': [30.06, -1.94],
      },
    },
    'deliveryAddress': {
      'location': {'lat': -1.95, 'lng': 30.09},
      'label': 'Home',
    },
    'customer': {'firstName': 'Ama', 'lastName': 'K', 'phone': '0788000000'},
  };
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late FakeHandler handler;
  late FakeGeolocatorPlatform geolocator;

  setUp(() {
    installFakeFirebase();
    FakeSecureStorage.install();
    geolocator = FakeGeolocatorPlatform();
    GeolocatorPlatform.instance = geolocator;
    ApiClient.instance.httpClientAdapter =
        FakeHttpClientAdapter((options) => handler(options));
    handler = (options) => throw StateError(
        'Unstubbed request: ${options.method} ${options.path}');
  });

  tearDown(() {
    FakeSecureStorage.uninstall();
    geolocator.dispose();
  });

  Future<void> pumpDelivery(WidgetTester tester, {String orderId = 'o1'}) async {
    final router = GoRouter(initialLocation: '/delivery', routes: [
      GoRoute(
        path: '/delivery',
        builder: (_, __) => ActiveDeliveryScreen(orderId: orderId),
      ),
      GoRoute(
        path: '/rider/dashboard',
        builder: (_, __) => const TestRouteScreen('dashboard'),
      ),
    ]);
    await tester.pumpWidget(ProviderScope(
      child: MaterialApp.router(routerConfig: router),
    ));
    await tester.pumpAndSettle();
  }

  group('DeliveryPhase display fields', () {
    test('each phase has its own title, button label and subtitle', () {
      expect(DeliveryPhase.headingToRestaurant.title, 'Head to Restaurant');
      expect(DeliveryPhase.headingToRestaurant.buttonLabel,
          "I've Arrived at Restaurant");
      expect(DeliveryPhase.pickingUp.title, 'Pick Up Order');
      expect(DeliveryPhase.pickingUp.buttonLabel,
          'I Have the Food — Start Delivery');
      expect(DeliveryPhase.delivering.title, 'Deliver to Customer');
      expect(DeliveryPhase.delivering.buttonLabel, 'Mark as Delivered');
      expect(DeliveryPhase.completed.title, 'Delivery Complete');
      expect(DeliveryPhase.completed.buttonLabel, 'Back to Dashboard');
    });
  });

  group('phase derived from fetched order', () {
    testWidgets('delivery.status "assigned" -> headingToRestaurant', (tester) async {
      handler = (_) => FakeResponse(200, _orderJson(deliveryStatus: 'assigned'));
      await pumpDelivery(tester);
      expect(find.text('Head to Restaurant'), findsOneWidget);
    });

    testWidgets('delivery.status "picked_up" -> pickingUp', (tester) async {
      handler = (_) => FakeResponse(200, _orderJson(deliveryStatus: 'picked_up'));
      await pumpDelivery(tester);
      expect(find.text('Pick Up Order'), findsOneWidget);
    });

    testWidgets('delivery.status "in_transit" -> delivering', (tester) async {
      handler = (_) => FakeResponse(200, _orderJson(deliveryStatus: 'in_transit'));
      await pumpDelivery(tester);
      expect(find.text('Deliver to Customer'), findsOneWidget);
    });

    testWidgets('delivery.status "delivered" -> completed', (tester) async {
      handler = (_) => FakeResponse(200, _orderJson(deliveryStatus: 'delivered'));
      await pumpDelivery(tester);
      expect(find.text('Delivery Complete'), findsOneWidget);
      expect(find.text('Your earnings have been credited.'), findsOneWidget);
    });

    testWidgets(
        'falls back to order.status when there is no delivery sub-document',
        (tester) async {
      handler = (_) => FakeResponse(
          200, _orderJson(orderStatus: 'out_for_delivery', deliveryStatus: null));
      await pumpDelivery(tester);
      expect(find.text('Deliver to Customer'), findsOneWidget);
    });

    testWidgets('a fetch failure shows the retry state, and retry re-fetches',
        (tester) async {
      var calls = 0;
      handler = (_) {
        calls++;
        if (calls == 1) {
          return const FakeResponse(404, {'message': 'Order not found'});
        }
        return FakeResponse(200, _orderJson());
      };

      await pumpDelivery(tester);

      expect(find.text('Oops, something went wrong'), findsOneWidget);
      expect(find.text('Order not found'), findsOneWidget);

      await tester.tap(find.text('Try again'));
      await tester.pumpAndSettle();

      expect(find.text('Head to Restaurant'), findsOneWidget);
      expect(calls, 2);
    });
  });

  group('advancing the phase', () {
    testWidgets(
        'heading-to-restaurant -> arrived: PATCHes delivery status and advances to pickingUp',
        (tester) async {
      final patchGate = Completer<FakeResponse>();
      handler = (options) {
        if (options.method == 'GET') {
          return FakeResponse(200, _orderJson(deliveryStatus: 'assigned'));
        }
        if (options.path == AppEndpoints.deliveryStatus('d1')) {
          expect(options.data, {'status': 'picked_up'});
          return patchGate.future;
        }
        throw StateError('Unexpected ${options.method} ${options.path}');
      };

      await pumpDelivery(tester);
      expect(find.text("I've Arrived at Restaurant"), findsOneWidget);

      await tester.tap(find.text("I've Arrived at Restaurant"));
      await tester.pump();
      // isProcessing disables the button and shows a spinner in its place.
      expect(find.byType(CircularProgressIndicator), findsWidgets);

      patchGate.complete(const FakeResponse(200, {}));
      await tester.pumpAndSettle();

      expect(find.text('Pick Up Order'), findsOneWidget);
    });

    testWidgets('picking-up -> start delivery: advances to delivering', (tester) async {
      handler = (options) {
        if (options.method == 'GET') {
          return FakeResponse(200, _orderJson(deliveryStatus: 'picked_up'));
        }
        if (options.path == AppEndpoints.deliveryStatus('d1')) {
          expect(options.data, {'status': 'in_transit'});
          return const FakeResponse(200, {});
        }
        throw StateError('Unexpected ${options.method} ${options.path}');
      };

      await pumpDelivery(tester);
      await tester.tap(find.text('I Have the Food — Start Delivery'));
      await tester.pumpAndSettle();

      expect(find.text('Deliver to Customer'), findsOneWidget);
    });

    testWidgets(
        'delivering -> mark as delivered requires confirmation before it PATCHes',
        (tester) async {
      handler = (options) {
        if (options.method == 'GET') {
          return FakeResponse(200, _orderJson(deliveryStatus: 'in_transit'));
        }
        if (options.path == AppEndpoints.deliveryStatus('d1')) {
          expect(options.data, {'status': 'delivered'});
          return const FakeResponse(200, {});
        }
        throw StateError('Unexpected ${options.method} ${options.path}');
      };

      await pumpDelivery(tester);
      await tester.tap(find.text('Mark as Delivered'));
      await tester.pumpAndSettle();

      expect(find.text('Confirm Delivery'), findsOneWidget);

      // Cancelling leaves the phase untouched and makes no request.
      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();
      expect(find.text('Deliver to Customer'), findsOneWidget);

      await tester.tap(find.text('Mark as Delivered'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Yes, Delivered'));
      await tester.pumpAndSettle();

      expect(find.text('Delivery Complete'), findsOneWidget);
    });

    testWidgets('completed -> Back to Dashboard navigates away', (tester) async {
      handler = (_) => FakeResponse(200, _orderJson(deliveryStatus: 'delivered'));

      await pumpDelivery(tester);
      await tester.tap(find.text('Back to Dashboard'));
      await tester.pumpAndSettle();

      expect(find.text('dashboard'), findsOneWidget);
    });

    testWidgets('a failed PATCH shows a snackbar and leaves the phase unchanged',
        (tester) async {
      handler = (options) {
        if (options.method == 'GET') {
          return FakeResponse(200, _orderJson(deliveryStatus: 'assigned'));
        }
        if (options.path == AppEndpoints.deliveryStatus('d1')) {
          return const FakeResponse(409, {'message': 'Delivery already updated'});
        }
        throw StateError('Unexpected ${options.method} ${options.path}');
      };

      await pumpDelivery(tester);
      await tester.tap(find.text("I've Arrived at Restaurant"));
      await tester.pumpAndSettle();

      expect(find.text('Delivery already updated'), findsOneWidget);
      // Still on the same phase - the failed PATCH didn't advance anything.
      expect(find.text('Head to Restaurant'), findsOneWidget);
      expect(find.text("I've Arrived at Restaurant"), findsOneWidget);
    });
  });

  group('M28: location tracking failure banner', () {
    testWidgets('a position-stream error shows the banner; tapping it retries',
        (tester) async {
      handler = (_) => FakeResponse(200, _orderJson(deliveryStatus: 'assigned'));

      await pumpDelivery(tester);
      expect(
          find.textContaining("Location tracking stopped"), findsNothing);

      geolocator.emitError(Exception('position stream lost'));
      // A broadcast StreamController's error delivery takes a couple of
      // event-loop turns to reach the listener's onError and rebuild - one
      // pump isn't always enough.
      await tester.pump();
      await tester.pump();
      await tester.pump();

      expect(find.textContaining("Location tracking stopped"), findsOneWidget);

      await tester.tap(find.textContaining("Location tracking stopped"));
      await tester.pump();
      await tester.pump();

      expect(find.textContaining("Location tracking stopped"), findsNothing);
    });

    testWidgets('completed deliveries never start location tracking',
        (tester) async {
      handler = (_) => FakeResponse(200, _orderJson(deliveryStatus: 'delivered'));

      await pumpDelivery(tester);
      // Nothing is subscribed, so an emitted error has nowhere to land and
      // the banner (which only a live subscription's onError can raise)
      // stays hidden.
      geolocator.emitError(Exception('should be ignored'));
      await tester.pump();

      expect(
          find.textContaining("Location tracking stopped"), findsNothing);
    });
  });
}
