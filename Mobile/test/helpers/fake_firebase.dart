import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_core_platform_interface/firebase_core_platform_interface.dart';

class _FakeFirebasePlatform extends FirebasePlatform {
  _FakeFirebasePlatform() : super();

  final FirebaseAppPlatform _app = FirebaseAppPlatform(
    defaultFirebaseAppName,
    const FirebaseOptions(
      apiKey: 'test-key',
      appId: 'test-app-id',
      messagingSenderId: 'test-sender',
      projectId: 'test-project',
    ),
  );

  @override
  FirebaseAppPlatform app([String name = defaultFirebaseAppName]) => _app;

  @override
  List<FirebaseAppPlatform> get apps => [_app];

  @override
  Future<FirebaseAppPlatform> initializeApp({
    String? name,
    FirebaseOptions? options,
  }) async =>
      _app;
}

/// Makes `Firebase.app()` resolve to a fake app instead of throwing
/// `[core/no-app] No Firebase App '[DEFAULT]' has been created`, using
/// firebase_core's own `@visibleForTesting` seam
/// (`Firebase.delegatePackingProperty`) rather than method-channel mocking.
///
/// Needed because `FirebaseMessaging.instance` calls `Firebase.app()`
/// *synchronously*, and `NotificationService.instance.registerToken()` is
/// called fire-and-forget from `AuthNotifier._saveAndSetState` on every
/// successful login/register - see the flagged finding in the auth test
/// file for why that synchronous throw was corrupting an already-successful
/// login into `AuthError` before this helper existed.
void installFakeFirebase() {
  Firebase.delegatePackingProperty = _FakeFirebasePlatform();
}
