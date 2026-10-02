import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
import '../api/api_client.dart';
import '../api/api_endpoints.dart';
import '../api/api_exception.dart';
import '../services/auth_service.dart';
import '../services/socket_service.dart';
import '../services/notification_service.dart';
import '../services/biometric_service.dart';
import '../models/user_model.dart';
import '../utils/constants.dart';

// ── Auth States ───────────────────────────────────────────────────────────────
sealed class AuthState {
  const AuthState();
}

class AuthInitial extends AuthState {
  const AuthInitial();
}

class AuthLoading extends AuthState {
  const AuthLoading();
}

class AuthAuthenticated extends AuthState {
  final AppUser user;
  final String token;
  const AuthAuthenticated({required this.user, required this.token});
  String get activeRole => user.activeRole;
}

class AuthUnauthenticated extends AuthState {
  const AuthUnauthenticated();
}

class AuthError extends AuthState {
  final String message;
  const AuthError(this.message);
}

// ── Auth Notifier ─────────────────────────────────────────────────────────────
class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(const AuthInitial()) {
    _checkExistingAuth();
  }

  /// Clear error state (e.g., when user starts retyping)
  void clearError() {
    if (state is AuthError) {
      state = const AuthUnauthenticated();
    }
  }

  Future<void> _checkExistingAuth() async {
    if (!await AuthService.hasToken()) {
      state = const AuthUnauthenticated();
      return;
    }
    try {
      final response = await ApiClient.instance.get(AppEndpoints.profile);
      final user = AppUser.fromJson(_extractUser(response.data));
      final token = await AuthService.getAccessToken();
      state = AuthAuthenticated(user: user, token: token!);
      SocketService().connect(token);
    } catch (_) {
      await AuthService.clearAll();
      SocketService().disconnect();
      state = const AuthUnauthenticated();
    }
  }

  Future<void> login({
    required String email,
    required String password,
    String? preferredRole,
  }) async {
    state = const AuthLoading();
    try {
      final res = await ApiClient.instance.post(AppEndpoints.login,
          data: {'email': email, 'password': password});
      await _saveAndSetState(res.data, preferredRole: preferredRole);
      // Stash the refresh token behind the biometric gate for quick sign-in
      final refreshToken = res.data['refreshToken'] as String?;
      if (refreshToken != null && refreshToken.isNotEmpty) {
        await BiometricService.saveRefreshToken(refreshToken);
      }
    } on DioException catch (e) {
      state = AuthError(ApiException.fromDioError(e).message);
    } catch (e) {
      state = AuthError(e.toString());
    }
  }

  /// Signs in using the refresh token stashed behind the biometric gate
  /// (see BiometricService), after the caller has already confirmed a
  /// successful Face ID/fingerprint check. Returns false if there is no
  /// stored refresh token or it's no longer valid, in which case the caller
  /// should fall back to a normal email/password login.
  Future<bool> loginWithBiometrics({String? preferredRole}) async {
    final storedRefreshToken = await BiometricService.getRefreshToken();
    if (storedRefreshToken == null) return false;

    state = const AuthLoading();
    try {
      final refreshDio = Dio(BaseOptions(baseUrl: AppConstants.apiBaseUrl));
      final response = await refreshDio.post(
        AppEndpoints.refreshToken,
        data: {'refreshToken': storedRefreshToken},
      );
      final accessToken = response.data['token'] as String?;
      final rotatedRefreshToken = response.data['refreshToken'] as String?;
      if (accessToken == null) {
        state = const AuthUnauthenticated();
        return false;
      }

      // Persist tokens so ApiClient's auth interceptor can use them for the
      // profile call below, and refresh the biometric copy since the backend
      // rotates the refresh token on every use.
      await AuthService.saveAccessToken(accessToken);
      if (rotatedRefreshToken != null) {
        await AuthService.saveRefreshToken(rotatedRefreshToken);
        await BiometricService.saveRefreshToken(rotatedRefreshToken);
      }

      final profileRes = await ApiClient.instance.get(AppEndpoints.profile);
      var user = AppUser.fromJson(_extractUser(profileRes.data));
      await AuthService.saveUserId(user.id);
      await AuthService.saveActiveRole(user.activeRole);

      if (preferredRole != null &&
          preferredRole.isNotEmpty &&
          user.activeRole != preferredRole &&
          user.roles.contains(preferredRole)) {
        try {
          final switchRes = await ApiClient.instance
              .post(AppEndpoints.switchRole, data: {'role': preferredRole});
          user = AppUser.fromJson(_extractUser(switchRes.data));
          await AuthService.saveActiveRole(preferredRole);
        } catch (_) {
          // If switch fails silently, continue with original role
        }
      }

      state = AuthAuthenticated(user: user, token: accessToken);
      SocketService().connect(accessToken);
      NotificationService.instance.registerToken();
      return true;
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        // Stored refresh token is expired/revoked - it will never work
        // again, so drop it and stop offering biometric sign-in.
        await BiometricService.setEnabled(false);
      }
      state = AuthError(ApiException.fromDioError(e).message);
      return false;
    } catch (e) {
      state = AuthError(e.toString());
      return false;
    }
  }

  Future<void> register({
    required String firstName,
    required String lastName,
    required String email,
    required String password,
    String? phone,
  }) async {
    state = const AuthLoading();
    try {
      final res = await ApiClient.instance.post(AppEndpoints.register, data: {
        'firstName': firstName,
        'lastName': lastName,
        'email': email,
        'password': password,
        if (phone != null && phone.isNotEmpty) 'phone': phone,
      });
      await _saveAndSetState(res.data);
    } on DioException catch (e) {
      state = AuthError(ApiException.fromDioError(e).message);
    } catch (e) {
      state = AuthError(e.toString());
    }
  }

  Future<void> registerAsBusinessOwner({
    required String firstName,
    required String lastName,
    required String email,
    required String password,
    String? phone,
  }) async {
    // 1. Register as consumer
    await register(
        firstName: firstName,
        lastName: lastName,
        email: email,
        password: password,
        phone: phone);
    if (state is! AuthAuthenticated) return;
    // 2. Add business_owner role
    try {
      final res = await ApiClient.instance
          .post(AppEndpoints.addRole, data: {'role': 'business_owner'});
      final user = AppUser.fromJson(_extractUser(res.data));
      final current = state as AuthAuthenticated;
      state = AuthAuthenticated(user: user, token: current.token);
      await AuthService.saveActiveRole('business_owner');
    } catch (e) {
      if (kDebugMode) debugPrint('Failed to add business_owner role: $e');
    }
  }

  Future<void> loginWithOtp({
    required String phone,
    required String otp,
    String? preferredRole,
  }) async {
    state = const AuthLoading();
    try {
      final res = await ApiClient.instance
          .post(AppEndpoints.verifyOtp, data: {'phone': phone, 'otp': otp});
      await _saveAndSetState(res.data, preferredRole: preferredRole);
    } on DioException catch (e) {
      state = AuthError(ApiException.fromDioError(e).message);
    } catch (e) {
      state = AuthError(e.toString());
    }
  }

  /// Signs in (or registers, per the backend's googleLogin - see
  /// Backend/controllers/userController.js) with a Google ID token obtained
  /// from google_sign_in. Mirrors the web app's Login.jsx/SignUp.jsx flow,
  /// which uses the same audience-bound ID-token credential (H5 fix) rather
  /// than a bare access token.
  Future<void> loginWithGoogle(String idToken, {String? preferredRole}) async {
    state = const AuthLoading();
    try {
      final res = await ApiClient.instance
          .post(AppEndpoints.googleLogin, data: {'idToken': idToken});
      await _saveAndSetState(res.data, preferredRole: preferredRole);
    } on DioException catch (e) {
      state = AuthError(ApiException.fromDioError(e).message);
    } catch (e) {
      state = AuthError(e.toString());
    }
  }

  Future<void> switchRole(String newRole) async {
    if (state is! AuthAuthenticated) return;
    try {
      await ApiClient.instance
          .post(AppEndpoints.switchRole, data: {'role': newRole});
      await AuthService.saveActiveRole(newRole);
      final current = state as AuthAuthenticated;
      final updatedUser = AppUser.fromJson({
        ...current.user.toJson(),
        '_id': current.user.id,
        'firstName': current.user.firstName,
        'lastName': current.user.lastName,
        'email': current.user.email,
        'phone': current.user.phone,
        'avatar': current.user.avatar,
        'roles': current.user.roles,
        'activeRole': newRole,
        'addresses': current.user.addresses.map((a) => a.toJson()).toList(),
        'isEmailVerified': current.user.isEmailVerified,
      });
      state = AuthAuthenticated(user: updatedUser, token: current.token);
    } catch (e) {
      if (kDebugMode) debugPrint('Failed to switch role: $e');
      rethrow;
    }
  }

  Future<void> addBusinessOwnerRole() async {
    if (state is! AuthAuthenticated) return;
    try {
      final res = await ApiClient.instance
          .post(AppEndpoints.addRole, data: {'role': 'business_owner'});
      final user = AppUser.fromJson(_extractUser(res.data));
      final current = state as AuthAuthenticated;
      state = AuthAuthenticated(user: user, token: current.token);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> addRiderRole() async {
    if (state is! AuthAuthenticated) return;
    try {
      final res = await ApiClient.instance.post(AppEndpoints.addRole,
          data: {'role': 'rider', 'switchToNew': true});
      final user = AppUser.fromJson(_extractUser(res.data));
      final current = state as AuthAuthenticated;

      // Update local storage active role
      await AuthService.saveActiveRole('rider');

      state = AuthAuthenticated(user: user, token: current.token);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> updateProfile({
    required String firstName,
    required String lastName,
    String? phone,
  }) async {
    if (state is! AuthAuthenticated) return;
    try {
      final res = await ApiClient.instance.put(AppEndpoints.profile, data: {
        'firstName': firstName,
        'lastName': lastName,
        if (phone != null) 'phone': phone,
      });
      final user = AppUser.fromJson(_extractUser(res.data));
      final current = state as AuthAuthenticated;
      state = AuthAuthenticated(user: user, token: current.token);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<String> uploadAvatar(String filePath) async {
    try {
      final formData = FormData.fromMap({
        'avatar':
            await MultipartFile.fromFile(filePath, filename: 'avatar.jpg'),
      });
      final res =
          await ApiClient.instance.post(AppEndpoints.avatar, data: formData);
      final url = res.data['avatar'] ?? res.data['url'] ?? '';
      // Refresh profile
      await _refreshProfile();
      return url.toString();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> addAddress(Map<String, dynamic> addressData) async {
    try {
      final res = await ApiClient.instance
          .post(AppEndpoints.addresses, data: addressData);
      final user = AppUser.fromJson(_extractUser(res.data));
      final current = state as AuthAuthenticated;
      state = AuthAuthenticated(user: user, token: current.token);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> updateAddress(
      String addressId, Map<String, dynamic> data) async {
    try {
      final res = await ApiClient.instance
          .put(AppEndpoints.address(addressId), data: data);
      final user = AppUser.fromJson(_extractUser(res.data));
      final current = state as AuthAuthenticated;
      state = AuthAuthenticated(user: user, token: current.token);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> deleteAddress(String addressId) async {
    try {
      final res =
          await ApiClient.instance.delete(AppEndpoints.address(addressId));
      final user = AppUser.fromJson(_extractUser(res.data));
      final current = state as AuthAuthenticated;
      state = AuthAuthenticated(user: user, token: current.token);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> logout() async {
    await NotificationService.instance.unregisterToken();
    await AuthService.clearAll();
    // H17: biometric sign-in stashes a refresh token behind the biometric
    // gate - without this, it survives logout, so the next person to unlock
    // this device could tap "Sign in with Face ID/Fingerprint" and be logged
    // in as the previous user with no password prompt at all.
    await BiometricService.setEnabled(false);
    SocketService().disconnect();
    state = const AuthUnauthenticated();
  }

  Future<void> refreshProfile() => _refreshProfile();

  Future<void> _refreshProfile() async {
    try {
      final res = await ApiClient.instance.get(AppEndpoints.profile);
      final user = AppUser.fromJson(_extractUser(res.data));
      if (state is! AuthAuthenticated) return;
      final current = state as AuthAuthenticated;
      state = AuthAuthenticated(user: user, token: current.token);
    } catch (e) {
      if (kDebugMode) debugPrint('Failed to refresh profile: $e');
    }
  }

  Future<void> _saveAndSetState(
    dynamic responseData, {
    String? preferredRole,
  }) async {
    final token = responseData['token'] as String?;
    final refreshToken = responseData['refreshToken'] as String?;
    AppUser user = AppUser.fromJson(_extractUser(responseData));

    if (token != null) {
      await AuthService.saveAuthData(
        accessToken: token,
        refreshToken: refreshToken ?? '',
        userId: user.id,
        activeRole: user.activeRole,
      );
    }

    // If caller requested a specific role, switch to it when the user holds that
    // role but it isn't already the active role.
    if (preferredRole != null &&
        preferredRole.isNotEmpty &&
        user.activeRole != preferredRole &&
        user.roles.contains(preferredRole)) {
      try {
        final switchRes = await ApiClient.instance
            .post(AppEndpoints.switchRole, data: {'role': preferredRole});
        // Backend returns updated user on switch-role
        final switchedUser = AppUser.fromJson(_extractUser(switchRes.data));
        await AuthService.saveActiveRole(preferredRole);
        user = switchedUser;
      } catch (_) {
        // If switch fails silently, continue with original role
      }
    }

    state = AuthAuthenticated(user: user, token: token ?? '');
    if (token != null && token.isNotEmpty) {
      SocketService().connect(token);
      // Register FCM token with backend so server can push to this device
      NotificationService.instance.registerToken();
    }
  }

  Map<String, dynamic> _extractUser(dynamic data) {
    if (data is Map<String, dynamic>) {
      return (data['user'] ?? data['data'] ?? data) as Map<String, dynamic>;
    }
    return {};
  }
}

// ── Providers ─────────────────────────────────────────────────────────────────
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});

final isAuthenticatedProvider =
    Provider<bool>((ref) => ref.watch(authProvider) is AuthAuthenticated);

final currentUserProvider = Provider<AppUser?>((ref) {
  final auth = ref.watch(authProvider);
  return auth is AuthAuthenticated ? auth.user : null;
});

final activeRoleProvider = Provider<String>((ref) {
  final auth = ref.watch(authProvider);
  return auth is AuthAuthenticated ? auth.activeRole : 'consumer';
});