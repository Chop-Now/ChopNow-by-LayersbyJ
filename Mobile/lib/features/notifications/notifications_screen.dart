import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/notifications_provider.dart';
import '../../core/models/notification_model.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/widgets/feedback/cn_states.dart';

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() =>
      _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  @override
  void initState() {
    super.initState();
    // Load notifications into the notifier when screen opens
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      try {
        final data = await ref.read(notificationsProvider.future);
        ref
            .read(notificationsNotifierProvider.notifier)
            .loadNotifications(data);
      } catch (_) {}
    });
  }

  @override
  Widget build(BuildContext context) {
    final notifications = ref.watch(notificationsNotifierProvider);
    final notifier = ref.read(notificationsNotifierProvider.notifier);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Notifications',
            style: TextStyle(
                fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        actions: [
          if (notifications.isNotEmpty)
            TextButton(
              onPressed: () {
                notifier.markAllRead();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                      content: Text('All marked as read'),
                      duration: Duration(seconds: 1)),
                );
              },
              child: const Text('Mark all read',
                  style: TextStyle(
                      color: AppColors.primary,
                      fontSize: 13,
                      fontWeight: FontWeight.w600)),
            ),
        ],
      ),
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: () async {
          try {
            final fresh = await ref.refresh(notificationsProvider.future);
            ref
                .read(notificationsNotifierProvider.notifier)
                .loadNotifications(fresh);
          } catch (_) {}
        },
        child: notifications.isEmpty
            ? const CnEmptyState(
                title: 'No notifications',
                subtitle: 'You\'re all caught up!',
                imagePath: 'assets/images/empty_inbox.png')
            : ListView.separated(
                padding: const EdgeInsets.all(12),
                itemCount: notifications.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (_, i) {
                  final n = notifications[i];
                  return _NotifCard(
                    notification: n,
                    onTap: () {
                      HapticFeedback.selectionClick();
                      notifier.markRead(n.id);
                    },
                    onDismiss: () {
                      HapticFeedback.lightImpact();
                      notifier.delete(n.id);
                    },
                  );
                },
              ),
      ),
    );
  }
}

class _NotifCard extends StatelessWidget {
  final AppNotification notification;
  final VoidCallback onTap;
  final VoidCallback onDismiss;
  const _NotifCard(
      {required this.notification,
      required this.onTap,
      required this.onDismiss});

  @override
  Widget build(BuildContext context) {
    return Dismissible(
      key: Key(notification.id),
      direction: DismissDirection.endToStart,
      onDismissed: (_) => onDismiss(),
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 16),
        decoration: BoxDecoration(
            color: AppColors.error, borderRadius: BorderRadius.circular(12)),
        child: const Icon(Icons.delete_outline_rounded, color: Colors.white),
      ),
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: notification.isRead
                ? AppColors.surface
                : AppColors.primarySurface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
                color: notification.isRead
                    ? AppColors.border
                    : AppColors.primary.withValues(alpha: 0.3)),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: notification.isRead
                      ? AppColors.surfaceVariant
                      : AppColors.surface,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Center(
                  child: Icon(
                    notification.iconData,
                    size: 20,
                    color: notification.isRead
                        ? AppColors.textSecondary
                        : AppColors.primary,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      Expanded(
                        child: Text(notification.title,
                            style: TextStyle(
                                fontSize: 14,
                                fontWeight: notification.isRead
                                    ? FontWeight.w500
                                    : FontWeight.w700,
                                color: AppColors.textPrimary)),
                      ),
                      if (!notification.isRead)
                        Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                                color: AppColors.primary,
                                shape: BoxShape.circle)),
                    ]),
                    const SizedBox(height: 3),
                    Text(notification.body,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 13,
                            color: AppColors.textSecondary,
                            height: 1.4)),
                    if (notification.createdAt != null) ...[
                      const SizedBox(height: 4),
                      Text(_timeAgo(notification.createdAt!),
                          style: const TextStyle(
                              fontSize: 11, color: AppColors.textTertiary)),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _timeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }
}
