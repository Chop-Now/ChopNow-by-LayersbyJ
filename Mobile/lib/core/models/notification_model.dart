import 'package:flutter/material.dart';

class AppNotification {
  final String id;
  final String title;
  final String body;
  final String type;
  final bool isRead;
  final DateTime? createdAt;
  final Map<String, dynamic>? metadata;

  const AppNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.type,
    required this.isRead,
    this.createdAt,
    this.metadata,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: json['_id'] ?? json['id'] ?? '',
      title: json['title'] ?? '',
      body: json['body'] ?? json['message'] ?? '',
      type: json['type'] ?? 'general',
      isRead: json['isRead'] == true || json['read'] == true,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString())
          : null,
      metadata: json['metadata'] as Map<String, dynamic>?,
    );
  }

  IconData get iconData => switch (type) {
        'order_placed' => Icons.shopping_bag_outlined,
        'order_confirmed' => Icons.verified_rounded,
        'order_ready' => Icons.stars_rounded,
        'order_cancelled' => Icons.cancel_rounded,
        'payment' => Icons.payments_rounded,
        'business' => Icons.storefront_rounded,
        'impact' => Icons.eco_rounded,
        _ => Icons.notifications_rounded,
      };
}
