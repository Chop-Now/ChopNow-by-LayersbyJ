import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

const _secureStorageChannel =
    MethodChannel('plugins.it_nomads.com/flutter_secure_storage');

/// In-memory fake for the flutter_secure_storage platform channel.
///
/// AuthService and BiometricService both construct a real
/// `FlutterSecureStorage()` at the top of their file, which talks to this
/// channel - with no platform registered (as under `flutter test`), every
/// read/write throws MissingPluginException. Installing this handler makes
/// those static services work against a plain in-memory map instead, so
/// AuthNotifier (which calls AuthService.hasToken()/saveAuthData() etc. on
/// every login) can be exercised without touching a real device.
class FakeSecureStorage {
  static final Map<String, String> _store = {};

  static void install() {
    _store.clear();
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(_secureStorageChannel, _handle);
  }

  static void uninstall() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(_secureStorageChannel, null);
  }

  static Future<dynamic> _handle(MethodCall call) async {
    final args = (call.arguments as Map?)?.cast<String, dynamic>() ?? {};
    switch (call.method) {
      case 'read':
        return _store[args['key'] as String];
      case 'write':
        _store[args['key'] as String] = args['value'] as String;
        return null;
      case 'delete':
        _store.remove(args['key']);
        return null;
      case 'containsKey':
        return _store.containsKey(args['key']);
      case 'readAll':
        return _store;
      case 'deleteAll':
        _store.clear();
        return null;
      default:
        return null;
    }
  }
}
