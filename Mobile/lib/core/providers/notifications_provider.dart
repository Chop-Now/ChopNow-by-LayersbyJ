import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import '../api/api_endpoints.dart';
import '../models/notification_model.dart';

// ── Notifications list ────────────────────────────────────────────────────────
final notificationsProvider =
    FutureProvider<List<AppNotification>>((ref) async {
  final res = await ApiClient.instance.get(AppEndpoints.notifications);
  final data = res.data;
  final List items;
  if (data is List) {
    items = data;
  } else if (data is Map) {
    items = data['notifications'] ?? data['data'] ?? [];
  } else {
    items = [];
  }
  return items
      .map((e) => AppNotification.fromJson(e as Map<String, dynamic>))
      .toList();
});

// ── Unread count ──────────────────────────────────────────────────────────────
final unreadCountProvider = FutureProvider<int>((ref) async {
  try {
    final res =
        await ApiClient.instance.get(AppEndpoints.notificationsUnreadCount);
    final data = res.data;
    if (data is Map) return (data['count'] ?? data['unread'] ?? 0) as int;
    if (data is int) return data;
    return 0;
  } catch (_) {
    return 0;
  }
});

// ── Notifications Notifier ─────────────────────────────────────────────────────
class NotificationsNotifier extends StateNotifier<List<AppNotification>> {
  final Ref _ref;
  NotificationsNotifier(this._ref, super.notifications);

  /// Load / replace the entire notifications list (safe public setter)
  void loadNotifications(List<AppNotification> notifications) {
    state = notifications;
    _ref.invalidate(unreadCountProvider);
  }

  void markRead(String id) {
    state = state
        .map((n) => n.id == id
            ? AppNotification(
                id: n.id,
                title: n.title,
                body: n.body,
                type: n.type,
                isRead: true,
                createdAt: n.createdAt,
                metadata: n.metadata)
            : n)
        .toList();
    _ref.invalidate(unreadCountProvider);
    _fireAndForget(
        ApiClient.instance.put(AppEndpoints.markNotificationRead(id)));
  }

  void markAllRead() {
    state = state
        .map((n) => AppNotification(
            id: n.id,
            title: n.title,
            body: n.body,
            type: n.type,
            isRead: true,
            createdAt: n.createdAt,
            metadata: n.metadata))
        .toList();
    _ref.invalidate(unreadCountProvider);
    _fireAndForget(
        ApiClient.instance.put(AppEndpoints.notificationsMarkAllRead));
  }

  void delete(String id) {
    state = state.where((n) => n.id != id).toList();
    _ref.invalidate(unreadCountProvider);
    _fireAndForget(
        ApiClient.instance.delete(AppEndpoints.deleteNotification(id)));
  }

  static void _fireAndForget(Future<dynamic> future) {
    future.then((_) {}).catchError((_) {}); // intentionally ignored
  }

  int get unreadCount => state.where((n) => !n.isRead).length;
}

final notificationsNotifierProvider =
    StateNotifierProvider<NotificationsNotifier, List<AppNotification>>(
  (ref) => NotificationsNotifier(ref, []),
);
