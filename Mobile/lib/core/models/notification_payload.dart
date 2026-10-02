import 'package:flutter/material.dart';

/// Typed model for all push notification payloads received via FCM.
class NotificationPayload {
  final String title;
  final String body;
  final NotificationType type;
  final String? targetRoute;
  final Map<String, String> data;

  const NotificationPayload({
    required this.title,
    required this.body,
    required this.type,
    this.targetRoute,
    this.data = const {},
  });

  factory NotificationPayload.fromMap(Map<String, dynamic> map) {
    final type = NotificationType.fromString(map['type'] as String? ?? '');
    return NotificationPayload(
      title: map['title'] as String? ?? 'ChopNow',
      body: map['body'] as String? ?? '',
      type: type,
      targetRoute: map['route'] as String?,
      data: Map<String, String>.from(
        (map['data'] as Map?)
                ?.map((k, v) => MapEntry(k.toString(), v.toString())) ??
            {},
      ),
    );
  }
}

enum NotificationType {
  newOrder,
  orderUpdate,
  orderReady,
  riderAssigned,
  delivery,
  promo,
  general;

  static NotificationType fromString(String value) => switch (value) {
        'new_order' => NotificationType.newOrder,
        'order_update' => NotificationType.orderUpdate,
        'order_ready' => NotificationType.orderReady,
        'rider_assigned' => NotificationType.riderAssigned,
        'delivery' => NotificationType.delivery,
        'promo' => NotificationType.promo,
        _ => NotificationType.general,
      };

  IconData get iconData => switch (this) {
        NotificationType.newOrder => Icons.restaurant_menu_rounded,
        NotificationType.orderUpdate => Icons.inventory_2_outlined,
        NotificationType.orderReady => Icons.verified_rounded,
        NotificationType.riderAssigned => Icons.delivery_dining_rounded,
        NotificationType.delivery => Icons.home_rounded,
        NotificationType.promo => Icons.local_offer_rounded,
        NotificationType.general => Icons.notifications_rounded,
      };
}
