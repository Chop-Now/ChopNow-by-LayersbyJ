class AppEndpoints {
  AppEndpoints._();

  // ── Auth ──────────────────────────────────────────────────────────────────
  static const String register = '/users/register';
  static const String login = '/users/login';
  static const String googleLogin = '/users/google-login';
  static const String sendOtp = '/users/send-otp';
  static const String verifyOtp = '/users/verify-otp';
  static const String forgotPassword = '/users/forgot-password';
  static const String resetPassword = '/users/reset-password';
  static const String refreshToken = '/users/refresh-token';
  static const String verifyEmail = '/users/verify-email';
  static const String resendVerification = '/users/resend-verification';

  // ── Profile ───────────────────────────────────────────────────────────────
  static const String profile = '/users/profile';
  static const String avatar = '/users/avatar';
  static const String addresses = '/users/addresses';
  static String address(String id) => '/users/addresses/$id';
  static const String switchRole = '/users/switch-role';
  static const String addRole = '/users/add-role';
  static const String sessions = '/users/sessions';
  static const String logoutAll = '/users/logout-all';
  static const String passwordRequestOtp =
      '/users/profile/password/request-otp';
  static const String changePassword = '/users/profile/password';

  // ── Listings ──────────────────────────────────────────────────────────────
  static const String listings = '/listings';
  static const String nearbyListings = '/listings/nearby';
  static String listingById(String id) => '/listings/$id';
  static String listingPhotos(String id) => '/listings/$id/photos';
  static String listingsByBusiness(String bId) => '/listings/business/$bId';

  // ── Businesses ────────────────────────────────────────────────────────────
  static const String businesses = '/businesses';
  static const String myBusinesses = '/businesses/my/list';
  static String businessById(String id) => '/businesses/$id';
  static String businessListings(String id) => '/listings/business/$id';
  static String businessLogo(String id) => '/businesses/$id/logo';
  static String businessCover(String id) => '/businesses/$id/cover';
  static String businessPhotos(String id) => '/businesses/$id/photos';
  static String businessKyc(String id) => '/businesses/$id/kyc';
  static String businessStats(String id) => '/businesses/$id/stats';

  // ── Orders ────────────────────────────────────────────────────────────────
  static const String orders = '/orders';
  // Multi-vendor checkout: price a cart, then place it (one order per vendor).
  static const String ordersQuote = '/orders/quote';
  static const String ordersCheckout = '/orders/checkout';
  static const String myOrders = '/orders/my';
  static String orderById(String id) => '/orders/$id';
  static String orderStatus(String id) => '/orders/$id/status';
  static String cancelOrder(String id) => '/orders/$id/cancel';
  static String verifyPickup(String id) => '/orders/$id/verify-pickup';
  static const String verifyPickupDirect = '/orders/verify-pickup-code';

  // ── Cart ──────────────────────────────────────────────────────────────────
  static const String cart = '/cart';
  static const String cartAdd = '/cart/add';
  static const String cartUpdate = '/cart/update';
  static const String cartSync = '/cart/sync';
  static const String cartClear = '/cart/clear';
  static String cartRemove(String listingId) => '/cart/remove/$listingId';

  // ── Reviews ───────────────────────────────────────────────────────────────
  static const String reviews = '/reviews';
  static String reviewByOrder(String id) => '/reviews/order/$id';

  // ── Favorites ─────────────────────────────────────────────────────────────
  static const String favorites = '/favorites';
  static const String toggleFavorite = '/favorites/toggle';
  static String favoriteBusiness(String id) => '/favorites/$id';

  // ── Notifications ─────────────────────────────────────────────────────────
  static const String notifications = '/notifications';
  static const String notificationsMarkAllRead = '/notifications/read-all';
  static const String notificationsUnreadCount = '/notifications/unread/count';
  static String markNotificationRead(String id) => '/notifications/$id/read';
  static String deleteNotification(String id) => '/notifications/$id';

  // ── Disputes ─────────────────────────────────────────────────────────────
  static const String disputes = '/disputes';
  static String disputeById(String id) => '/disputes/$id';

  // ── Analytics ────────────────────────────────────────────────────────────
  static const String analytics = '/analytics';
  static const String userImpact = '/analytics/impact/my';
  static const String businessAnalytics = '/analytics/business/overview';

  // ── Payouts ──────────────────────────────────────────────────────────────
  static const String payouts = '/payouts';
  static const String payoutsMe = '/payouts/me';
  static const String payoutsRequest = '/payouts/request';

  // ── Settings ─────────────────────────────────────────────────────────────
  static const String settings = '/settings';

  // ── FCM / Device Tokens ───────────────────────────────────────────────────
  static const String fcmToken = '/users/fcm-token';

  // ── Rider ─────────────────────────────────────────────────────────────────
  static const String riderStats = '/rider/stats';
  static const String riderStatsFull = '/deliveries/rider-stats';
  static const String riderEarnings = '/rider/earnings';
  static const String applyRider = '/users/apply-rider';
  static const String riderAvailability = '/rider/availability';

  // ── Deliveries ────────────────────────────────────────────────────────────
  static const String availableDeliveries = '/deliveries/available';
  static const String myDeliveries = '/deliveries/my';
  static String assignDelivery(String id) => '/deliveries/$id/assign';
  static String deliveryStatus(String id) => '/deliveries/$id/status';
  static String deliveryLocation(String id) => '/deliveries/$id/location';
  static String deliveryProof(String id) => '/deliveries/$id/proof';
  static String deliveryByOrderId(String orderId) => '/deliveries/order/$orderId';

  // ── Payments ──────────────────────────────────────────────────────────────
  static const String paymentDeposit = '/payments/deposit';
  static String paymentStatus(String orderId) => '/payments/status/$orderId';
}
