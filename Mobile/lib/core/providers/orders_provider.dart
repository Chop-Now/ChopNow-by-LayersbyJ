import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import '../api/api_endpoints.dart';
import '../models/order_model.dart';

// ── Orders list provider ──────────────────────────────────────────────────────
final ordersProvider = FutureProvider<List<Order>>((ref) async {
  final response = await ApiClient.instance.get('${AppEndpoints.orders}?role=consumer');
  final data = response.data;
  final List items;
  if (data is List) {
    items = data;
  } else if (data is Map && data['orders'] != null) {
    items = data['orders'] as List;
  } else if (data is Map && data['data'] != null) {
    items = data['data'] as List;
  } else {
    items = [];
  }
  return items.map((e) => Order.fromJson(e as Map<String, dynamic>)).toList();
});

// ── Single order detail ───────────────────────────────────────────────────────
final orderDetailProvider =
    FutureProvider.family<Order, String>((ref, id) async {
  final response = await ApiClient.instance.get(AppEndpoints.orderById(id));
  final data = response.data;
  final json = data is Map<String, dynamic>
      ? (data['order'] ?? data['data'] ?? data) as Map<String, dynamic>
      : data as Map<String, dynamic>;
  return Order.fromJson(json);
});

// ── Place order ───────────────────────────────────────────────────────────────
// Returns the new Order on success
Future<Order> placeOrder({
  required String listingId,
  required List<Map<String, dynamic>> items,
  required String fulfillmentType,
  Map<String, dynamic>? deliveryDetails,
  Map<String, dynamic>? pickupDetails,
  required Map<String, dynamic> payment,
}) async {
  final response = await ApiClient.instance.post(
    AppEndpoints.orders,
    data: {
      'listing': listingId,
      'items': items,
      'fulfillmentType': fulfillmentType,
      if (deliveryDetails != null) 'deliveryDetails': deliveryDetails,
      if (pickupDetails != null) 'pickupDetails': pickupDetails,
      'payment': payment,
    },
  );
  final data = response.data;
  final json = data is Map<String, dynamic>
      ? (data['order'] ?? data['data'] ?? data) as Map<String, dynamic>
      : data as Map<String, dynamic>;
  return Order.fromJson(json);
}
