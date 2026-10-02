import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../../../core/theme/app_colors.dart';

/// Shared chrome for every auth screen: a Moringa hero panel carrying the
/// wordmark and page title, with a white sheet curving up over it.
///
/// The sheet scrolls independently, so tall forms stay reachable when the
/// keyboard is up while the hero copy stays put.
class AuthShell extends StatelessWidget {
  final String title;
  final String subtitle;

  /// Omit to hide the back affordance entirely.
  final VoidCallback? onBack;

  /// Small pill shown above the title (e.g. the selected role).
  final Widget? badge;

  final Widget child;

  /// When true the sheet stretches [child] to at least the available height,
  /// so a short screen can push content apart with Spacer/Expanded instead of
  /// leaving a dead gap at the bottom. Still scrolls if content overflows.
  final bool fillHeight;

  const AuthShell({
    super.key,
    required this.title,
    required this.subtitle,
    required this.child,
    this.onBack,
    this.badge,
    this.fillHeight = false,
  });

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.light, // Android
        statusBarBrightness: Brightness.dark, // iOS
      ),
      child: Scaffold(
        backgroundColor: AppColors.moringa,
        body: Column(
          children: [
            // ── Moringa hero ──
            // Painted by its own Container rather than relying on the
            // Scaffold, so the panel extends behind the status bar.
            Container(
              color: AppColors.moringa,
              child: Stack(
                children: [
                  Positioned(
                    top: -90,
                    right: -50,
                    child: Container(
                      width: 230,
                      height: 230,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: RadialGradient(
                          colors: [
                            AppColors.nowYellow.withValues(alpha: 0.18),
                            AppColors.nowYellow.withValues(alpha: 0),
                          ],
                        ),
                      ),
                    ),
                  ),
                  SafeArea(
                    bottom: false,
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(24, 8, 24, 26),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              if (onBack != null) ...[
                                _CircleButton(
                                  icon: Icons.arrow_back_rounded,
                                  onTap: onBack!,
                                ),
                                const SizedBox(width: 14),
                              ],
                              SvgPicture.asset(
                                'assets/images/wordmarkwithlogomark.svg',
                                height: 24,
                                semanticsLabel: 'ChopNow',
                              ),
                            ],
                          ),
                          const SizedBox(height: 22),
                          if (badge != null) ...[
                            badge!,
                            const SizedBox(height: 10),
                          ],
                          Text(
                            title,
                            style: const TextStyle(
                              fontSize: 27,
                              fontWeight: FontWeight.w800,
                              color: AppColors.fufu,
                              letterSpacing: -0.5,
                            ),
                          ),
                          const SizedBox(height: 5),
                          Text(
                            subtitle,
                            style: TextStyle(
                              fontSize: 14,
                              height: 1.45,
                              color: AppColors.fufu.withValues(alpha: 0.68),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // ── White sheet ──
            Expanded(
              child: Container(
                width: double.infinity,
                decoration: const BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
                ),
                child: LayoutBuilder(
                  builder: (context, constraints) => SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(24, 28, 24, 28),
                    child: fillHeight
                        ? ConstrainedBox(
                            constraints: BoxConstraints(
                              // minus the vertical padding above
                              minHeight: constraints.maxHeight - 56,
                            ),
                            child: IntrinsicHeight(child: child),
                          )
                        : child,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CircleButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _CircleButton({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 38,
        height: 38,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: AppColors.fufu.withValues(alpha: 0.12),
          border: Border.all(color: AppColors.fufu.withValues(alpha: 0.22)),
        ),
        child: Icon(icon, size: 19, color: AppColors.fufu),
      ),
    );
  }
}

/// Pill used as the [AuthShell.badge] — Now Yellow ground with Char text,
/// never white (white on Now Yellow is 1.58:1).
class AuthBadge extends StatelessWidget {
  final IconData icon;
  final String label;
  const AuthBadge({super.key, required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.nowYellow,
        borderRadius: BorderRadius.circular(100),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: AppColors.textOnAccent),
          const SizedBox(width: 6),
          Text(
            label,
            style: const TextStyle(
              fontSize: 11.5,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.6,
              color: AppColors.textOnAccent,
            ),
          ),
        ],
      ),
    );
  }
}

/// Full-width Now Yellow CTA. Label is Char by contract.
class AuthPrimaryButton extends StatelessWidget {
  final String label;
  final VoidCallback? onTap;
  final bool isLoading;
  final IconData? icon;

  const AuthPrimaryButton({
    super.key,
    required this.label,
    required this.onTap,
    this.isLoading = false,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final disabled = onTap == null || isLoading;
    return GestureDetector(
      onTap: disabled ? null : onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        height: 54,
        decoration: BoxDecoration(
          color: disabled ? AppColors.border : AppColors.moringa,
          borderRadius: BorderRadius.circular(27),
          boxShadow: disabled
              ? null
              : [
                  BoxShadow(
                    color: AppColors.moringa.withValues(alpha: 0.38),
                    blurRadius: 18,
                    offset: const Offset(0, 7),
                  ),
                ],
        ),
        child: Center(
          child: isLoading
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.2,
                    valueColor:
                        AlwaysStoppedAnimation<Color>(AppColors.textOnPrimary),
                  ),
                )
              : Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      label,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: disabled
                            ? AppColors.textTertiary
                            : AppColors.textOnPrimary,
                      ),
                    ),
                    if (icon != null) ...[
                      const SizedBox(width: 8),
                      Icon(icon, size: 18, color: AppColors.textOnPrimary),
                    ],
                  ],
                ),
        ),
      ),
    );
  }
}
