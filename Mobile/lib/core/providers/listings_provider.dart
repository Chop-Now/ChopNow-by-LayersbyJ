import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import '../api/api_endpoints.dart';
import '../models/listing_model.dart';

// ── Listings Provider ─────────────────────────────────────────────────────────
// Fetch all active listings with optional filters
final listingsProvider =
    FutureProvider.family<List<Listing>, Map<String, dynamic>>(
  (ref, params) async {
    final response = await ApiClient.instance.get(
      AppEndpoints.listings,
      queryParameters: {
        'status': 'active',
        ...params,
      },
    );
    final data = response.data;
    final List items;
    if (data is List) {
      items = data;
    } else if (data is Map && data['listings'] != null) {
      items = data['listings'] as List;
    } else if (data is Map && data['data'] != null) {
      items = data['data'] as List;
    } else {
      items = [];
    }
    return items
        .map((e) => Listing.fromJson(e as Map<String, dynamic>))
        .toList();
  },
);

// ── Single Listing Provider ───────────────────────────────────────────────────
final listingDetailProvider = FutureProvider.family<Listing, String>(
  (ref, id) async {
    final response = await ApiClient.instance.get(AppEndpoints.listingById(id));
    final data = response.data;
    final json = data is Map<String, dynamic>
        ? (data['listing'] ?? data['data'] ?? data) as Map<String, dynamic>
        : data as Map<String, dynamic>;
    return Listing.fromJson(json);
  },
);
