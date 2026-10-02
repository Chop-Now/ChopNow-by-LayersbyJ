import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';

/// A canned response for [FakeHttpClientAdapter] to return.
class FakeResponse {
  final int statusCode;
  final dynamic data;
  const FakeResponse(this.statusCode, [this.data]);
}

typedef FakeHandler = FutureOr<FakeResponse> Function(RequestOptions options);

/// Drop-in [HttpClientAdapter] that never touches the network.
///
/// `ApiClient.instance` is a lazily-created singleton Dio - assigning a
/// [FakeHttpClientAdapter] to `ApiClient.instance.httpClientAdapter` in a
/// test's setUp intercepts every request that instance makes for the rest of
/// that test, and status codes outside 200-299 still come back through Dio
/// as a real `DioException` (matching production's `on DioException catch`
/// handling), since only the transport is faked.
class FakeHttpClientAdapter implements HttpClientAdapter {
  FakeHttpClientAdapter(this.handler);

  final FakeHandler handler;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    final response = await handler(options);
    final bytes = utf8.encode(jsonEncode(response.data));
    return ResponseBody.fromBytes(
      bytes,
      response.statusCode,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}
