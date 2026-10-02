import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/services/notification_service.dart';
import '../../../core/models/notification_payload.dart';
import '../../../core/theme/app_colors.dart';

/// Global in-app notification overlay.
/// Wrap the root MaterialApp.router's builder with this widget so it renders
/// on top of every screen, including during navigation transitions.
class NotificationOverlayWrapper extends ConsumerStatefulWidget {
  final Widget child;
  const NotificationOverlayWrapper({super.key, required this.child});

  @override
  ConsumerState<NotificationOverlayWrapper> createState() =>
      _NotificationOverlayWrapperState();
}

class _NotificationOverlayWrapperState
    extends ConsumerState<NotificationOverlayWrapper> {
  StreamSubscription<NotificationPayload>? _sub;
  final List<_NotifEntry> _queue = [];

  @override
  void initState() {
    super.initState();
    _sub = NotificationService.instance.notificationStream.listen(_onNotif);
  }

  void _onNotif(NotificationPayload payload) {
    final entry = _NotifEntry(payload: payload, key: UniqueKey());
    setState(() => _queue.insert(0, entry));
    Future.delayed(const Duration(seconds: 5), () {
      if (mounted) setState(() => _queue.remove(entry));
    });
  }

  void _dismiss(_NotifEntry entry) {
    setState(() => _queue.remove(entry));
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        widget.child,
        Positioned(
          top: MediaQuery.of(context).padding.top + 8,
          left: 12,
          right: 12,
          child: Column(
            children: _queue
                .take(3)
                .map((e) => _InAppBanner(
                      key: e.key,
                      entry: e,
                      onDismiss: () => _dismiss(e),
                    ))
                .toList(),
          ),
        ),
      ],
    );
  }
}

class _NotifEntry {
  final NotificationPayload payload;
  final Key key;
  const _NotifEntry({required this.payload, required this.key});
}

// ── The premium animated notification banner ──────────────────────────────────

class _InAppBanner extends StatefulWidget {
  final _NotifEntry entry;
  final VoidCallback onDismiss;

  const _InAppBanner({super.key, required this.entry, required this.onDismiss});

  @override
  State<_InAppBanner> createState() => _InAppBannerState();
}

class _InAppBannerState extends State<_InAppBanner>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _slide;
  late Animation<double> _fade;
  late Animation<double> _scale;
  double _dragOffset = 0;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      duration: const Duration(milliseconds: 500),
      vsync: this,
    );

    _slide = Tween<double>(begin: -1.0, end: 0.0).animate(
      CurvedAnimation(parent: _ctrl, curve: Curves.elasticOut),
    );
    _fade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _ctrl, curve: const Interval(0.0, 0.4)),
    );
    _scale = Tween<double>(begin: 0.85, end: 1.0).animate(
      CurvedAnimation(parent: _ctrl, curve: Curves.easeOutBack),
    );

    _ctrl.forward();
  }

  Future<void> _dismissAnimated() async {
    await _ctrl.reverse(from: 1.0);
    widget.onDismiss();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Color get _accentColor => switch (widget.entry.payload.type) {
        NotificationType.newOrder => AppColors.primary,
        NotificationType.orderReady => AppColors.success,
        NotificationType.riderAssigned => AppColors.accent,
        NotificationType.delivery => AppColors.info,
        NotificationType.promo => const Color(0xFF9B59B6),
        _ => AppColors.primary,
      };

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (context, child) {
        return Transform.translate(
          offset: Offset(0, _slide.value * 120 + _dragOffset),
          child: FadeTransition(
            opacity: _fade,
            child: ScaleTransition(
              scale: _scale,
              child: child,
            ),
          ),
        );
      },
      child: GestureDetector(
        onVerticalDragUpdate: (d) {
          if (d.primaryDelta! < 0) {
            setState(() => _dragOffset += d.primaryDelta!);
          }
        },
        onVerticalDragEnd: (d) {
          if (_dragOffset < -30) {
            _dismissAnimated();
          } else {
            setState(() => _dragOffset = 0);
          }
        },
        onTap: _dismissAnimated,
        child: Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              gradient: LinearGradient(
                colors: [
                  AppColors.darkSurface.withValues(alpha: 0.97),
                  AppColors.darkBackground.withValues(alpha: 0.97),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              border: Border.all(
                color: _accentColor.withValues(alpha: 0.35),
                width: 1.2,
              ),
              boxShadow: [
                BoxShadow(
                  color: _accentColor.withValues(alpha: 0.18),
                  blurRadius: 24,
                  offset: const Offset(0, 8),
                ),
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.4),
                  blurRadius: 16,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: Stack(
                children: [
                  // Subtle glowing orb behind the icon
                  Positioned(
                    left: -12,
                    top: -12,
                    child: Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: _accentColor.withValues(alpha: 0.08),
                      ),
                    ),
                  ),
                  // Animated progress bar at the bottom
                  Positioned(
                    left: 0,
                    bottom: 0,
                    right: 0,
                    child: _ProgressBar(accentColor: _accentColor),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(14, 14, 14, 18),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Icon container
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(12),
                            gradient: LinearGradient(
                              colors: [
                                _accentColor.withValues(alpha: 0.25),
                                _accentColor.withValues(alpha: 0.12),
                              ],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            border: Border.all(
                              color: _accentColor.withValues(alpha: 0.3),
                            ),
                          ),
                          child: Center(
                            child: Icon(
                              widget.entry.payload.type.iconData,
                              color: _accentColor,
                              size: 20,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      widget.entry.payload.title,
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.w700,
                                        fontSize: 14,
                                        letterSpacing: 0.1,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  // ChopNow badge
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 7, vertical: 2),
                                    decoration: BoxDecoration(
                                      color:
                                          _accentColor.withValues(alpha: 0.2),
                                      borderRadius: BorderRadius.circular(100),
                                      border: Border.all(
                                        color:
                                            _accentColor.withValues(alpha: 0.4),
                                      ),
                                    ),
                                    child: Text(
                                      'ChopNow',
                                      style: TextStyle(
                                        color: _accentColor,
                                        fontSize: 9,
                                        fontWeight: FontWeight.w800,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                widget.entry.payload.body,
                                style: TextStyle(
                                  color: Colors.white.withValues(alpha: 0.72),
                                  fontSize: 12.5,
                                  height: 1.4,
                                ),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        GestureDetector(
                          onTap: _dismissAnimated,
                          child: Icon(
                            Icons.close_rounded,
                            color: Colors.white.withValues(alpha: 0.4),
                            size: 18,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ProgressBar extends StatefulWidget {
  final Color accentColor;
  const _ProgressBar({required this.accentColor});

  @override
  State<_ProgressBar> createState() => _ProgressBarState();
}

class _ProgressBarState extends State<_ProgressBar>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _progress;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      duration: const Duration(seconds: 5),
      vsync: this,
    )..forward();
    _progress = Tween<double>(begin: 1.0, end: 0.0).animate(_ctrl);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _progress,
      builder: (context, _) {
        return LayoutBuilder(
          builder: (context, constraints) {
            return Container(
              height: 2,
              width: constraints.maxWidth * _progress.value,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    widget.accentColor.withValues(alpha: 0.0),
                    widget.accentColor,
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }
}
