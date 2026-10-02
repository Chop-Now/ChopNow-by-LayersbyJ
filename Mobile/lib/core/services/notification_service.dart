import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../api/api_client.dart';
import '../api/api_endpoints.dart';
import '../models/notification_payload.dart';

/// Top-level handler for background/terminated FCM messages.
/// Must be a top-level function (not a method) per Firebase requirements.
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Firebase is already initialized in main.dart before this fires.
  if (kDebugMode) debugPrint('FCM Background message: ${message.messageId}');
  await LocalNotificationService.instance.showFromRemoteMessage(message);
}

/// Orchestrates all FCM and local notification logic for ChopNow.
class NotificationService {
  NotificationService._();
  static final NotificationService instance = NotificationService._();

  final _messaging = FirebaseMessaging.instance;
  final _streamController = StreamController<NotificationPayload>.broadcast();

  /// Stream of in-app notification payloads for the overlay widget.
  Stream<NotificationPayload> get notificationStream =>
      _streamController.stream;

  String? _fcmToken;
  String? get fcmToken => _fcmToken;

  // iOS push requires the Push Notifications entitlement, which in turn
  // requires a paid Apple Developer Program membership. Until that's set up,
  // FCM is skipped entirely on iOS rather than failing on every call.
  bool get _fcmSupported => defaultTargetPlatform != TargetPlatform.iOS;

  /// Call once after Firebase.initializeApp() in main().
  Future<void> initialize() async {
    if (_fcmSupported) {
      // ── 1. Background handler ───────────────────────────────────────────────
      FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

      // ── 2. Request permissions (iOS requires explicit ask) ──────────────────
      await _messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );

      // ── 3. Android foreground presentation options ──────────────────────────
      await _messaging.setForegroundNotificationPresentationOptions(
        alert: false, // We handle foreground display ourselves (premium overlay)
        badge: true,
        sound: false,
      );

      // ── 4. Get & cache the FCM token ─────────────────────────────────────────
      try {
        _fcmToken = await _messaging.getToken();
        if (kDebugMode) debugPrint('FCM Token: $_fcmToken');
      } catch (e) {
        if (kDebugMode) debugPrint('Failed to get FCM token: $e');
      }

      // ── 5. Listen for token refresh ──────────────────────────────────────────
      _messaging.onTokenRefresh.listen((newToken) {
        _fcmToken = newToken;
        _registerTokenWithBackend(newToken);
      });

      // ── 6. Foreground message handler ────────────────────────────────────────
      FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

      // ── 7. Background notification tap handler ──────────────────────────────
      FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationTap);

      // ── 8. Terminated state: app was opened FROM a notification ─────────────
      final initialMessage = await _messaging.getInitialMessage();
      if (initialMessage != null) {
        // Slight delay to let the router initialize before navigating
        Future.delayed(const Duration(milliseconds: 800), () {
          _handleNotificationTap(initialMessage);
        });
      }
    } else if (kDebugMode) {
      debugPrint('Skipping FCM setup on iOS (no Push Notifications entitlement).');
    }

    // ── 9. Initialize local notifications ────────────────────────────────────
    await LocalNotificationService.instance.initialize();

    // ── 10. Listen for local notification taps ────────────────────────────────
    LocalNotificationService.instance.tapStream
        .listen(_handleLocalNotificationTap);
  }

  /// Registers the FCM token with the ChopNow backend so the server can push
  /// targeted notifications to this device.
  Future<void> registerToken() async {
    if (!_fcmSupported) return;
    try {
      final token = _fcmToken ?? await _messaging.getToken();
      if (token == null) return;
      _fcmToken = token;
      await _registerTokenWithBackend(token);
    } catch (e) {
      if (kDebugMode) debugPrint('Failed to register FCM token: $e');
    }
  }

  /// Removes the FCM token from the backend on logout.
  Future<void> unregisterToken() async {
    if (!_fcmSupported) return;
    // Run unregistration in the background with a timeout to prevent emulator hangs
    try {
      await ApiClient.instance.delete(AppEndpoints.fcmToken).timeout(
        const Duration(milliseconds: 500),
      );
    } catch (_) {}
    try {
      await _messaging.deleteToken().timeout(
        const Duration(milliseconds: 500),
      );
    } catch (_) {}
    _fcmToken = null;
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  Future<void> _registerTokenWithBackend(String token) async {
    try {
      await ApiClient.instance.post(
        AppEndpoints.fcmToken,
        data: {'fcmToken': token},
      );
      if (kDebugMode) debugPrint('FCM token registered with backend.');
    } catch (e) {
      if (kDebugMode) debugPrint('Failed to register FCM token: $e');
    }
  }

  void _handleForegroundMessage(RemoteMessage message) {
    if (kDebugMode) debugPrint('FCM Foreground: ${message.notification?.title}');
    final payload = _buildPayload(message);
    _streamController.add(payload);
    // Also show local notification for system sound/badge
    LocalNotificationService.instance.showFromRemoteMessage(message);
  }

  void _handleNotificationTap(RemoteMessage message) {
    final payload = _buildPayload(message);
    if (payload.targetRoute != null) {
      NotificationNavigation.pendingRoute = payload.targetRoute;
    }
  }

  void _handleLocalNotificationTap(String? payload) {
    if (payload != null && payload.isNotEmpty) {
      NotificationNavigation.pendingRoute = payload;
    }
  }

  NotificationPayload _buildPayload(RemoteMessage message) {
    final data = Map<String, String>.from(
      message.data.map((k, v) => MapEntry(k, v.toString())),
    );
    return NotificationPayload(
      title: message.notification?.title ?? data['title'] ?? 'ChopNow',
      body: message.notification?.body ?? data['body'] ?? '',
      type: NotificationType.fromString(data['type'] ?? ''),
      targetRoute: data['route'],
      data: data,
    );
  }

  void dispose() {
    _streamController.close();
  }
}

/// Simple static store for pending deep-link navigation.
/// The router reads this on startup to handle terminated-state taps.
class NotificationNavigation {
  static String? pendingRoute;

  static String? consumePendingRoute() {
    final route = pendingRoute;
    pendingRoute = null;
    return route;
  }
}

/// Handles flutter_local_notifications configuration and display.
class LocalNotificationService {
  LocalNotificationService._();
  static final LocalNotificationService instance = LocalNotificationService._();

  final _plugin = FlutterLocalNotificationsPlugin();
  final _tapController = StreamController<String?>.broadcast();

  Stream<String?> get tapStream => _tapController.stream;

  static const _channelId = 'chopnow_high_importance';
  static const _channelName = 'ChopNow Alerts';
  static const _channelDesc = 'Order updates, delivery alerts, and promotions';

  Future<void> initialize() async {
    const androidSettings =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: false,
      requestBadgePermission: false,
      requestSoundPermission: false,
    );

    await _plugin.initialize(
      const InitializationSettings(android: androidSettings, iOS: iosSettings),
      onDidReceiveNotificationResponse: (details) {
        _tapController.add(details.payload);
      },
    );

    // Create the high-importance Android channel
    const channel = AndroidNotificationChannel(
      _channelId,
      _channelName,
      description: _channelDesc,
      importance: Importance.high,
      playSound: true,
      enableVibration: true,
    );

    await _plugin
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(channel);
  }

  Future<void> showFromRemoteMessage(RemoteMessage message) async {
    final notification = message.notification;
    if (notification == null) return;

    final route = message.data['route'] as String?;

    await _plugin.show(
      notification.hashCode,
      notification.title,
      notification.body,
      NotificationDetails(
        android: AndroidNotificationDetails(
          _channelId,
          _channelName,
          channelDescription: _channelDesc,
          importance: Importance.high,
          priority: Priority.high,
          icon: '@mipmap/ic_launcher',
          styleInformation: BigTextStyleInformation(notification.body ?? ''),
        ),
        iOS: const DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
      payload: route,
    );
  }
}