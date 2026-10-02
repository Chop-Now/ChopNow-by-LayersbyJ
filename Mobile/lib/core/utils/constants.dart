class AppConstants {
  AppConstants._();

  // API base URL — points at the deployed Render backend by default, so
  // `flutter run` works out of the box with no local backend needed.
  // The custom domain api.chopnow.app is currently misconfigured (points at
  // a dead Vercel deployment) — use the Render URL directly until that's
  // fixed. Shares the same MongoDB Atlas DB as the web app, so data added by
  // anyone (any device, any teammate) shows up for everyone automatically.
  // To point at a local backend instead (e.g. for testing backend changes),
  // override at run time:
  //   flutter run --dart-define=API_BASE_URL=http://<your-lan-ip>:5001/api/v1 \
  //               --dart-define=SOCKET_URL=http://<your-lan-ip>:5001
  static const String apiBaseUrl = String.fromEnvironment('API_BASE_URL',
      defaultValue: 'https://chopnow-backend.onrender.com/api/v1');

  static const String socketUrl = String.fromEnvironment('SOCKET_URL',
      defaultValue: 'https://chopnow-backend.onrender.com');

  // Token keys for secure storage
  static const String accessTokenKey = 'chopnow_access_token';
  static const String refreshTokenKey = 'chopnow_refresh_token';
  static const String userIdKey = 'chopnow_user_id';
  static const String activeRoleKey = 'chopnow_active_role';

  // Timeouts
  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);

  // Pagination
  static const int pageSize = 20;

  // Map defaults (Kigali, Rwanda)
  static const double defaultLat = -1.9441;
  static const double defaultLng = 30.0619;
  static const double defaultSearchRadius = 5.0; // km

  // OTP
  static const int otpResendSeconds = 60;
  static const int otpLength = 6;

  // Upload limits
  static const int maxImageSizeBytes = 5 * 1024 * 1024; // 5MB

  // Currency
  static const String currency = 'RWF';

  // Onboarding
  static const String onboardingCompletedKey = 'chopnow_onboarding_done';
}
