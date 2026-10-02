import 'package:dio/dio.dart';

/// Unified exception for all API errors.
/// Parses the backend's { message, statusCode } response shape.
class ApiException implements Exception {
  final String message;
  final int? statusCode;

  const ApiException(this.message, {this.statusCode});

  @override
  String toString() => message;

  static ApiException fromDioError(dynamic error) {
    if (error is! DioException) {
      try {
        final dynamic dynamicError = error;
        final data = dynamicError.response?.data;
        if (data is Map && data['message'] is String) {
          return ApiException(data['message']);
        }
      } catch (_) {}
      return ApiException(error.toString().replaceAll('Exception: ', ''));
    }

    final DioException dioError = error;

    try {
      final data = dioError.response?.data;
      if (data is Map) {
        var msg = data['message'] ?? data['error'];

        // Append specific validation error if present
        if (data['errors'] is List && (data['errors'] as List).isNotEmpty) {
          final firstError = data['errors'][0];
          if (firstError is Map && firstError['msg'] != null) {
            msg =
                msg != null ? '$msg: ${firstError['msg']}' : firstError['msg'];
          }
        }

        if (msg is String && msg.isNotEmpty) {
          return ApiException(msg, statusCode: dioError.response?.statusCode);
        }
      }
    } catch (_) {}

    final statusCode = dioError.response?.statusCode;
    final message = switch (statusCode) {
      400 => 'Invalid request. Please check your input.',
      401 => 'Session expired. Please log in again.',
      403 => 'You don\'t have permission to do that.',
      404 => 'Not found.',
      409 => 'This already exists.',
      422 => 'Validation failed. Please check your input.',
      429 => 'Too many requests. Please wait a moment.',
      500 || 502 || 503 => 'Server error. Please try again shortly.',
      _ => _messageFromType(dioError),
    };
    return ApiException(message, statusCode: statusCode);
  }

  static String _messageFromType(DioException error) {
    final type = error.type;
    if (type == DioExceptionType.connectionTimeout ||
        type == DioExceptionType.sendTimeout) {
      return 'Connection timed out. Check your internet.';
    }
    if (type == DioExceptionType.receiveTimeout) {
      return 'Server took too long to respond.';
    }
    if (type == DioExceptionType.connectionError ||
        type == DioExceptionType.cancel) {
      return 'No internet connection. Please try again.';
    }
    return 'Something went wrong. Please try again.';
  }
}
