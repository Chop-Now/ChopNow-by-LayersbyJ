import 'package:shared_preferences/shared_preferences.dart';

/// LocalStorageService — handles non-sensitive local data persistence.
/// Uses SharedPreferences for lightweight key/value storage (cart, settings, etc.)
/// and FlutterSecureStorage for sensitive data (tokens are in AuthService).
class LocalStorageService {
  static const _prefsCartKey = 'chopnow_cart_items';
  static const _prefsThemeKey = 'chopnow_theme_mode';
  static const _prefsFcmTokenKey = 'chopnow_fcm_token';
  static const _prefsNotifPrefsKey = 'chopnow_notif_prefs';
  static const _prefsLastLocationKey = 'chopnow_last_location';

  // ── Cart Persistence ────────────────────────────────────────────────────────
  static Future<void> saveCart(String jsonString) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefsCartKey, jsonString);
  }

  static Future<String?> loadCart() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_prefsCartKey);
  }

  static Future<void> clearCart() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_prefsCartKey);
  }

  // ── Theme ───────────────────────────────────────────────────────────────────
  static Future<void> saveThemeMode(String mode) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefsThemeKey, mode);
  }

  static Future<String> loadThemeMode() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_prefsThemeKey) ?? 'light';
  }

  // ── FCM Token ────────────────────────────────────────────────────────────────
  static Future<void> saveFcmToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefsFcmTokenKey, token);
  }

  static Future<String?> loadFcmToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_prefsFcmTokenKey);
  }

  // ── Notification preferences ─────────────────────────────────────────────────
  static Future<void> saveNotifPref(String key, bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('${_prefsNotifPrefsKey}_$key', value);
  }

  static Future<bool> loadNotifPref(String key,
      {bool defaultValue = true}) async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool('${_prefsNotifPrefsKey}_$key') ?? defaultValue;
  }

  // ── Last known location ───────────────────────────────────────────────────────
  static Future<void> saveLastLocation(double lat, double lng) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble('${_prefsLastLocationKey}_lat', lat);
    await prefs.setDouble('${_prefsLastLocationKey}_lng', lng);
  }

  static Future<({double lat, double lng})?> loadLastLocation() async {
    final prefs = await SharedPreferences.getInstance();
    final lat = prefs.getDouble('${_prefsLastLocationKey}_lat');
    final lng = prefs.getDouble('${_prefsLastLocationKey}_lng');
    if (lat == null || lng == null) return null;
    return (lat: lat, lng: lng);
  }
}
