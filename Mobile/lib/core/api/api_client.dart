import 'package:dio/dio.dart';
import '../utils/constants.dart';
import '../services/auth_service.dart';
import '../services/socket_service.dart';
import 'api_endpoints.dart';
import 'package:pretty_dio_logger/pretty_dio_logger.dart';
import 'package:flutter/foundation.dart';

class ApiClient {
  ApiClient._();
  static Dio? _instance;

  static Dio get instance {
    _instance ??= _createDio();
    return _instance!;
  }

  static Dio _createDio() {
    final dio = Dio(
      BaseOptions(
        baseUrl: AppConstants.apiBaseUrl,
        connectTimeout: AppConstants.connectTimeout,
        receiveTimeout: AppConstants.receiveTimeout,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    // JWT interceptor
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await AuthService.getAccessToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (error, handler) async {
          // 401 → try refresh token → retry
          if (error.response?.statusCode == 401) {
            try {
              final refreshToken = await AuthService.getRefreshToken();
              if (refreshToken != null) {
                final refreshDio = Dio(
                  BaseOptions(baseUrl: AppConstants.apiBaseUrl),
                );
                final response = await refreshDio.post(
                  AppEndpoints.refreshToken,
                  data: {'refreshToken': refreshToken},
                );
                final newToken = response.data['token'] as String?;
                if (newToken != null) {
                  await AuthService.saveAccessToken(newToken);
                  // M27: the socket authenticates once, at connect time
                  // (see Backend/socket.js's io.use() middleware) - without
                  // this, it keeps running under the token that was just
                  // refreshed (i.e. one we already know is stale/expiring),
                  // until it happens to drop and reconnect for some
                  // unrelated reason. reconnectWithToken (not a plain
                  // disconnect+connect) preserves room memberships across
                  // the reconnect - see socket_service.dart.
                  if (SocketService().isConnected) {
                    SocketService().reconnectWithToken(newToken);
                  }
                  // Retry original request with new token
                  error.requestOptions.headers['Authorization'] =
                      'Bearer $newToken';
                  final retryResponse = await dio.fetch(error.requestOptions);
                  return handler.resolve(retryResponse);
                }
              }
            } catch (_) {
              // Refresh failed → clear auth and let error propagate
              await AuthService.clearAll();
            }
          }
          return handler.next(error);
        },
      ),
    );

    if (kDebugMode) {
      dio.interceptors.add(PrettyDioLogger(
        requestHeader: true,
        requestBody: true,
        responseBody: true,
        responseHeader: false,
        error: true,
        compact: true,
        maxWidth: 90,
      ));
    }

    return dio;
  }
}

// Convenience typed wrapper for API calls
class ApiResponse<T> {
  final T? data;
  final String? error;
  final bool success;

  const ApiResponse.success(this.data)
      : error = null,
        success = true;
  const ApiResponse.failure(this.error)
      : data = null,
        success = false;
}
