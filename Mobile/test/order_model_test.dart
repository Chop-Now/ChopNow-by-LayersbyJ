import 'package:flutter_test/flutter_test.dart';
import 'package:chopnow/core/models/order_model.dart';

void main() {
  group('Order.fromJson', () {
    test('reads the nested payment method and checkout group', () {
      final order = Order.fromJson({
        '_id': 'o1',
        'status': 'pending_payment',
        'items': [],
        'pricing': {'total': 5500},
        'payment': {'paymentMethod': 'mobile_money', 'paymentStatus': 'pending'},
        'checkoutGroup': 'g1',
      });
      expect(order.paymentMethod, 'mobile_money');
      expect(order.checkoutGroup, 'g1');
      expect(order.total, 5500);
      expect(order.awaitingPayment, isTrue);
    });

    test('is not awaiting payment once paid, or for cash', () {
      final paid = Order.fromJson({
        '_id': 'o2',
        'status': 'paid',
        'items': [],
        'payment': {'paymentMethod': 'mobile_money'},
      });
      final cash = Order.fromJson({
        '_id': 'o3',
        'status': 'pending_payment',
        'items': [],
        'payment': {'paymentMethod': 'cash'},
      });
      expect(paid.awaitingPayment, isFalse);
      expect(cash.awaitingPayment, isFalse);
      expect(paid.checkoutGroup, isNull);
    });
  });
}
