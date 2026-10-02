import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../utils/constants.dart';

class AuthService {
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );

  // ── Access Token ──
  static Future<void> saveAccessToken(String token) async {
    await _storage.write(key: AppConstants.accessTokenKey, value: token);
  }

  static Future<String?> getAccessToken() async {
    return _storage.read(key: AppConstants.accessTokenKey);
  }

  // ── Refresh Token ──
  static Future<void> saveRefreshToken(String token) async {
    await _storage.write(key: AppConstants.refreshTokenKey, value: token);
  }

  static Future<String?> getRefreshToken() async {
    return _storage.read(key: AppConstants.refreshTokenKey);
  }

  // ── User ID ──
  static Future<void> saveUserId(String userId) async {
    await _storage.write(key: AppConstants.userIdKey, value: userId);
  }

  static Future<String?> getUserId() async {
    return _storage.read(key: AppConstants.userIdKey);
  }

  // ── Active Role ──
  static Future<void> saveActiveRole(String role) async {
    await _storage.write(key: AppConstants.activeRoleKey, value: role);
  }

  static Future<String?> getActiveRole() async {
    return _storage.read(key: AppConstants.activeRoleKey);
  }

  // ── Save all auth data at once ──
  static Future<void> saveAuthData({
    required String accessToken,
    String? refreshToken,
    required String userId,
    required String activeRole,
  }) async {
    await Future.wait([
      saveAccessToken(accessToken),
      if (refreshToken != null) saveRefreshToken(refreshToken),
      saveUserId(userId),
      saveActiveRole(activeRole),
    ]);
  }

  // ── Clear everything on logout ──
  static Future<void> clearAll() async {
    await Future.wait([
      _storage.delete(key: AppConstants.accessTokenKey),
      _storage.delete(key: AppConstants.refreshTokenKey),
      _storage.delete(key: AppConstants.userIdKey),
      _storage.delete(key: AppConstants.activeRoleKey),
    ]);
  }

  // ── Onboarding Status ──
  static Future<bool> hasCompletedOnboarding() async {
    final status = await _storage.read(key: AppConstants.onboardingCompletedKey);
    return status == 'true';
  }

  static Future<void> setOnboardingCompleted() async {
    await _storage.write(
        key: AppConstants.onboardingCompletedKey, value: 'true');
  }

  // ── Is there a stored token? ──
  static Future<bool> hasToken() async {
    final token = await getAccessToken();
    return token != null && token.isNotEmpty;
  }
}
