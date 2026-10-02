import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:chopnow/core/api/api_client.dart';
import 'package:chopnow/core/api/api_endpoints.dart';
import 'package:chopnow/core/providers/auth_provider.dart';
import 'package:chopnow/core/services/auth_service.dart';
import 'package:chopnow/core/services/biometric_service.dart';

import 'helpers/fake_dio_adapter.dart';
import 'helpers/fake_firebase.dart';
import 'helpers/fake_secure_storage.dart';

Map<String, dynamic> _userJson({
  String id = 'u1',
  String email = 'buyer@chopnow.rw',
  String activeRole = 'consumer',
  List<String> roles = const ['consumer'],
}) {
  return {
    '_id': id,
    'firstName': 'Ama',
    'lastName': 'K',
    'email': email,
    'phone': '0788000000',
    'roles': roles,
    'activeRole': activeRole,
    'addresses': [],
  };
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late FakeHandler handler;
  late ProviderContainer container;
  late AuthNotifier notifier;

  setUp(() async {
    installFakeFirebase();
    FakeSecureStorage.install();
    ApiClient.instance.httpClientAdapter =
        FakeHttpClientAdapter((options) => handler(options));
    // Default: nothing is stubbed until a test sets `handler`; anything that
    // doesn't override it fails loudly instead of hanging.
    handler = (options) => throw StateError(
        'Unstubbed request: ${options.method} ${options.path}');

    container = ProviderContainer();
    notifier = container.read(authProvider.notifier);
    // AuthNotifier's constructor kicks off `_checkExistingAuth()`
    // (AuthService.hasToken() -> AuthUnauthenticated, since the fake secure
    // storage starts empty) - it's fire-and-forget, so give it a turn to
    // settle before a test's own state assertions race it. Same gotcha as
    // CartNotifier's `_restore()` in cart_test.dart.
    await Future<void>.delayed(const Duration(milliseconds: 10));
  });

  tearDown(() {
    container.dispose();
    FakeSecureStorage.uninstall();
  });

  group('AuthState transitions', () {
    test('starts unauthenticated once _checkExistingAuth settles with no stored token', () {
      expect(container.read(authProvider), isA<AuthUnauthenticated>());
    });

    test('login() moves AuthLoading -> AuthAuthenticated on success', () async {
      handler = (options) {
        expect(options.path, AppEndpoints.login);
        return FakeResponse(200, {
          'token': 'access-1',
          'refreshToken': 'refresh-1',
          'user': _userJson(),
        });
      };

      final seen = <Type>[];
      container.listen(authProvider, (prev, next) => seen.add(next.runtimeType));

      await notifier.login(email: 'buyer@chopnow.rw', password: 'secret123');

      expect(seen, [AuthLoading, AuthAuthenticated]);
      expect(container.read(authProvider), isA<AuthAuthenticated>());
    });

    test('login() moves AuthLoading -> AuthError on failure', () async {
      handler = (options) => const FakeResponse(401, {'message': 'Invalid credentials'});

      final seen = <Type>[];
      container.listen(authProvider, (prev, next) => seen.add(next.runtimeType));

      await notifier.login(email: 'buyer@chopnow.rw', password: 'wrong');

      expect(seen, [AuthLoading, AuthError]);
      final state = container.read(authProvider) as AuthError;
      expect(state.message, 'Invalid credentials');
    });
  });

  group('login', () {
    test('success saves tokens and stashes the refresh token behind the biometric gate',
        () async {
      handler = (_) => FakeResponse(200, {
            'token': 'access-1',
            'refreshToken': 'refresh-1',
            'user': _userJson(),
          });

      await notifier.login(email: 'buyer@chopnow.rw', password: 'secret123');

      final state = container.read(authProvider) as AuthAuthenticated;
      expect(state.token, 'access-1');
      expect(state.user.email, 'buyer@chopnow.rw');
      expect(state.activeRole, 'consumer');
      expect(await AuthService.getAccessToken(), 'access-1');
      expect(await BiometricService.getRefreshToken(), 'refresh-1');
    });

    test('a malformed 200 response becomes AuthError instead of crashing', () async {
      // Dio wraps anything the adapter itself throws into a DioException
      // (assureDioException), so the only way to reach login()'s bare
      // `catch (e)` branch (as opposed to `on DioException catch`) is a
      // failure *after* a successful HTTP round-trip - e.g. a response
      // shaped nothing like {token, user}, which makes `_saveAndSetState`'s
      // `responseData['token']` throw on a decoded JSON string instead of a
      // map.
      handler = (_) => const FakeResponse(200, 'not-a-map');

      await notifier.login(email: 'buyer@chopnow.rw', password: 'secret123');

      expect(container.read(authProvider), isA<AuthError>());
    });

    test('switches to the preferred role in the same flow when the user holds it',
        () async {
      handler = (options) {
        if (options.path == AppEndpoints.login) {
          return FakeResponse(200, {
            'token': 'access-1',
            'refreshToken': 'refresh-1',
            'user': _userJson(
                activeRole: 'consumer', roles: ['consumer', 'business_owner']),
          });
        }
        if (options.path == AppEndpoints.switchRole) {
          expect(options.data, {'role': 'business_owner'});
          return FakeResponse(200, {
            'user': _userJson(
                activeRole: 'business_owner',
                roles: ['consumer', 'business_owner']),
          });
        }
        throw StateError('Unexpected path ${options.path}');
      };

      await notifier.login(
        email: 'buyer@chopnow.rw',
        password: 'secret123',
        preferredRole: 'business_owner',
      );

      final state = container.read(authProvider) as AuthAuthenticated;
      expect(state.activeRole, 'business_owner');
    });
  });

  group('loginWithOtp', () {
    test('success authenticates the user', () async {
      handler = (options) {
        expect(options.path, AppEndpoints.verifyOtp);
        expect(options.data, {'phone': '0788000000', 'otp': '123456'});
        return FakeResponse(200, {
          'token': 'otp-token',
          'refreshToken': 'otp-refresh',
          'user': _userJson(),
        });
      };

      await notifier.loginWithOtp(phone: '0788000000', otp: '123456');

      final state = container.read(authProvider) as AuthAuthenticated;
      expect(state.token, 'otp-token');
    });

    test('wrong OTP becomes AuthError', () async {
      handler = (_) => const FakeResponse(400, {'message': 'Incorrect OTP'});

      await notifier.loginWithOtp(phone: '0788000000', otp: '000000');

      final state = container.read(authProvider) as AuthError;
      expect(state.message, 'Incorrect OTP');
    });
  });

  group('loginWithGoogle', () {
    test('posts the ID token and authenticates on success', () async {
      handler = (options) {
        expect(options.path, AppEndpoints.googleLogin);
        expect(options.data, {'idToken': 'fake-id-token'});
        return FakeResponse(200, {
          'token': 'google-token',
          'refreshToken': 'google-refresh',
          'user': _userJson(email: 'g@chopnow.rw'),
        });
      };

      await notifier.loginWithGoogle('fake-id-token');

      final state = container.read(authProvider) as AuthAuthenticated;
      expect(state.token, 'google-token');
      expect(state.user.email, 'g@chopnow.rw');
    });

    test('a rejected Google token becomes AuthError', () async {
      handler = (_) => const FakeResponse(401, {'message': 'Invalid Google token'});

      await notifier.loginWithGoogle('bad-token');

      final state = container.read(authProvider) as AuthError;
      expect(state.message, 'Invalid Google token');
    });
  });

  group('loginWithBiometrics', () {
    test('returns false and leaves state untouched when no refresh token is stashed',
        () async {
      // No network call should even be attempted - assigning `handler` here
      // would make an unexpected call fail loudly via the StateError thrown
      // by the default handler installed in setUp.
      final before = container.read(authProvider);

      final result = await notifier.loginWithBiometrics();

      expect(result, isFalse);
      expect(container.read(authProvider), same(before));
    });

    // NOTE: the success/401 paths of loginWithBiometrics build their own
    // `Dio(BaseOptions(baseUrl: AppConstants.apiBaseUrl))` for the refresh
    // call (auth_provider.dart ~line 107) instead of going through
    // `ApiClient.instance` - so FakeHttpClientAdapter can't intercept it (no
    // handle on that local Dio to attach an adapter before it fires). Not
    // covered here to avoid a real network call in a unit test; flagged
    // separately rather than changing production code to make it
    // injectable.
  });

  group('register', () {
    test('success authenticates the new user', () async {
      handler = (options) {
        expect(options.path, AppEndpoints.register);
        return FakeResponse(201, {
          'token': 'reg-token',
          'refreshToken': 'reg-refresh',
          'user': _userJson(email: 'new@chopnow.rw'),
        });
      };

      await notifier.register(
        firstName: 'Ama',
        lastName: 'K',
        email: 'new@chopnow.rw',
        password: 'secret123',
      );

      final state = container.read(authProvider) as AuthAuthenticated;
      expect(state.user.email, 'new@chopnow.rw');
    });

    test('duplicate email becomes AuthError', () async {
      handler = (_) => const FakeResponse(409, {'message': 'Email already in use'});

      await notifier.register(
        firstName: 'Ama',
        lastName: 'K',
        email: 'taken@chopnow.rw',
        password: 'secret123',
      );

      final state = container.read(authProvider) as AuthError;
      expect(state.message, 'Email already in use');
    });
  });

  group('switchRole', () {
    test('is a no-op when not authenticated (no request attempted)', () async {
      expect(container.read(authProvider), isA<AuthUnauthenticated>());

      await notifier.switchRole('business_owner');

      expect(container.read(authProvider), isA<AuthUnauthenticated>());
    });

    test('updates activeRole while preserving the rest of the user on success',
        () async {
      handler = (_) => FakeResponse(200, {
            'token': 'access-1',
            'refreshToken': 'refresh-1',
            'user': _userJson(
                activeRole: 'consumer', roles: ['consumer', 'rider']),
          });
      await notifier.login(email: 'buyer@chopnow.rw', password: 'secret123');

      handler = (options) {
        expect(options.path, AppEndpoints.switchRole);
        expect(options.data, {'role': 'rider'});
        return const FakeResponse(200, {});
      };
      await notifier.switchRole('rider');

      final state = container.read(authProvider) as AuthAuthenticated;
      expect(state.activeRole, 'rider');
      expect(state.user.email, 'buyer@chopnow.rw');
      expect(state.user.roles, ['consumer', 'rider']);
      expect(await AuthService.getActiveRole(), 'rider');
    });

    test('a failed switch throws and leaves the prior state alone', () async {
      handler = (_) => FakeResponse(200, {
            'token': 'access-1',
            'refreshToken': 'refresh-1',
            'user': _userJson(activeRole: 'consumer', roles: ['consumer']),
          });
      await notifier.login(email: 'buyer@chopnow.rw', password: 'secret123');
      final before = container.read(authProvider) as AuthAuthenticated;

      handler = (_) => const FakeResponse(403, {'message': 'Role not permitted'});

      await expectLater(
        () => notifier.switchRole('admin'),
        throwsA(isA<DioException>()),
      );
      final after = container.read(authProvider) as AuthAuthenticated;
      expect(after.activeRole, before.activeRole);
    });
  });
}
