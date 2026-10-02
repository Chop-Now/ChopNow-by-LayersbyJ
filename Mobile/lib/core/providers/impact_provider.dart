import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import '../api/api_endpoints.dart';

final userImpactProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final response = await ApiClient.instance.get(AppEndpoints.userImpact);
  final data = response.data;
  return data is Map<String, dynamic>
      ? (data['data'] ?? data['impact'] ?? data) as Map<String, dynamic>
      : {};
});
