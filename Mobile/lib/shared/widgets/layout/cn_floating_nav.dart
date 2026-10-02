import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';

/// One tab in [CnFloatingNav].
class CnNavTab {
  final String label;
  final IconData icon;
  final IconData activeIcon;
  final String path;

  /// Optional count rendered as a Pepper badge on the icon (e.g. cart items,
  /// pending orders). Null or 0 hides it.
  final int? badgeCount;

  const CnNavTab({
    required this.label,
    required this.icon,
    required this.activeIcon,
    required this.path,
    this.badgeCount,
  });
}

/// The glassmorphic floating pill used by every role shell.
///
/// Shared so the consumer and business sides cannot drift apart — change it
/// here and both move together. Callers are responsible for padding their
/// content by [reservedHeight] so the bar doesn't cover it.
class CnFloatingNav extends StatelessWidget {
  final List<CnNavTab> tabs;
  final int current;

  const CnFloatingNav({super.key, required this.tabs, required this.current});

  /// Vertical space a screen should leave free at the bottom.
  static const double reservedHeight = 90;

  @override
  Widget build(BuildContext context) {
    return Positioned(
      left: 16,
      right: 16,
      bottom: MediaQuery.of(context).padding.bottom + 12,
      child: Container(
        height: 68,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(34),
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withValues(alpha: 0.12),
              blurRadius: 24,
              offset: const Offset(0, 8),
            ),
            BoxShadow(
              color: AppColors.char.withValues(alpha: 0.1),
              blurRadius: 16,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(34),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
            child: Container(
              decoration: BoxDecoration(
                color: AppColors.surface.withValues(alpha: 0.92),
                borderRadius: BorderRadius.circular(34),
                border: Border.all(
                    color: AppColors.border.withValues(alpha: 0.8), width: 1),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 6),
              child: Row(
                children: List.generate(tabs.length, (i) {
                  final tab = tabs[i];
                  final isActive = i == current;
                  final badge = tab.badgeCount ?? 0;
                  return Expanded(
                    child: Semantics(
                      label: tab.label,
                      selected: isActive,
                      button: true,
                      child: GestureDetector(
                        onTap: () {
                          HapticFeedback.selectionClick();
                          context.go(tab.path);
                        },
                        behavior: HitTestBehavior.opaque,
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 250),
                          curve: Curves.easeInOut,
                          margin: const EdgeInsets.symmetric(
                              horizontal: 3, vertical: 8),
                          padding: const EdgeInsets.symmetric(vertical: 6),
                          decoration: BoxDecoration(
                            color: isActive
                                ? AppColors.primary
                                : Colors.transparent,
                            borderRadius: BorderRadius.circular(26),
                          ),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Stack(
                                clipBehavior: Clip.none,
                                children: [
                                  AnimatedSwitcher(
                                    duration: const Duration(milliseconds: 200),
                                    transitionBuilder: (child, anim) =>
                                        ScaleTransition(
                                            scale: anim, child: child),
                                    child: Icon(
                                      isActive ? tab.activeIcon : tab.icon,
                                      key: ValueKey('${tab.path}_$isActive'),
                                      color: isActive
                                          ? Colors.white
                                          : AppColors.textSecondary,
                                      size: 21,
                                    ),
                                  ),
                                  if (badge > 0)
                                    Positioned(
                                      top: -4,
                                      right: -6,
                                      child: Container(
                                        width: 16,
                                        height: 16,
                                        decoration: BoxDecoration(
                                          color: AppColors.pepper,
                                          shape: BoxShape.circle,
                                          border: Border.all(
                                              color: AppColors.surface,
                                              width: 1.5),
                                        ),
                                        child: Center(
                                          child: Text(
                                            badge > 9 ? '9+' : '$badge',
                                            style: const TextStyle(
                                                fontSize: 8,
                                                fontWeight: FontWeight.w800,
                                                color: Colors.white),
                                          ),
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                              const SizedBox(height: 2),
                              AnimatedDefaultTextStyle(
                                duration: const Duration(milliseconds: 200),
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: isActive
                                      ? FontWeight.w700
                                      : FontWeight.w500,
                                  color: isActive
                                      ? Colors.white
                                      : AppColors.textSecondary,
                                ),
                                child: Text(tab.label),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  );
                }),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
