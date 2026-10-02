import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../core/theme/app_colors.dart';
import '../../animations/scale_tap.dart';

/// Centers [child] within the available space, but degrades to scrolling
/// instead of overflowing when that space is shorter than the child's
/// natural height — e.g. inside a SliverFillRemaining whose remaining
/// extent briefly shrinks during pull-to-refresh overscroll. Without this,
/// fixed-height empty/error states show a RenderFlex overflow in debug and
/// silently clip content in release.
Widget _fillAvailable(Widget child) {
  return LayoutBuilder(
    builder: (context, constraints) {
      if (!constraints.hasBoundedHeight) return Center(child: child);
      return SingleChildScrollView(
        physics: const ClampingScrollPhysics(),
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: constraints.maxHeight),
          child: Center(child: child),
        ),
      );
    },
  );
}

/// CnEmptyState — illustrated empty list state
class CnEmptyState extends StatelessWidget {
  final String title;
  final String? subtitle;
  final IconData icon;
  final String? imagePath;
  final String? actionLabel;
  final VoidCallback? onAction;

  const CnEmptyState({
    super.key,
    required this.title,
    this.subtitle,
    this.icon = Icons.inbox_outlined,
    this.imagePath,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return _fillAvailable(
      Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (imagePath != null)
              Image.asset(
                imagePath!,
                height: 160,
              )
                  .animate(onPlay: (controller) => controller.repeat(reverse: true))
                  .slideY(
                    begin: 0,
                    end: -0.05,
                    duration: const Duration(milliseconds: 1500),
                    curve: Curves.easeInOutSine,
                  )
            else
              Container(
                width: 80,
                height: 80,
                decoration: const BoxDecoration(
                  color: AppColors.primarySurface,
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, size: 36, color: AppColors.primary),
              ),
            const SizedBox(height: 16),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
            if (subtitle != null) ...[
              const SizedBox(height: 6),
              Text(
                subtitle!,
                textAlign: TextAlign.center,
                style: const TextStyle(
                    fontSize: 13, color: AppColors.textSecondary, height: 1.5),
              ),
            ],
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: 20),
              ScaleTap(
                onTap: onAction,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  decoration: BoxDecoration(
                    gradient: AppColors.primaryGradient,
                    borderRadius: BorderRadius.circular(100),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withValues(alpha: 0.25),
                        blurRadius: 8,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Text(
                    actionLabel!,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// CnErrorState — retry-able error state
class CnErrorState extends StatelessWidget {
  final String message;
  final VoidCallback? onRetry;

  const CnErrorState({super.key, required this.message, this.onRetry});

  @override
  Widget build(BuildContext context) {
    return _fillAvailable(
      Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: const BoxDecoration(
                color: AppColors.errorSurface,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.wifi_off_rounded,
                  size: 32, color: AppColors.error),
            ),
            const SizedBox(height: 16),
            const Text(
              'Oops, something went wrong',
              style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary),
            ),
            const SizedBox(height: 6),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(
                  fontSize: 13, color: AppColors.textSecondary, height: 1.5),
            ),
            if (onRetry != null) ...[
              const SizedBox(height: 20),
              ScaleTap(
                onTap: onRetry,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(100),
                    border: Border.all(color: AppColors.primary),
                  ),
                  child: const Text(
                    'Try again',
                    style: TextStyle(
                        color: AppColors.primary,
                        fontSize: 14,
                        fontWeight: FontWeight.w600),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// CnStatusPill — colored status pill matching web UI patterns
class CnStatusPill extends StatelessWidget {
  final String label;
  final Color color;
  final Color? bgColor;

  const CnStatusPill(
      {super.key, required this.label, required this.color, this.bgColor});

  factory CnStatusPill.fromStatus(String status) {
    Color color;
    Color bg;
    switch (status) {
      case 'pending_payment':
      case 'pending':
        color = AppColors.warning;
        bg = AppColors.warningSurface;
        break;
      case 'paid':
      case 'confirmed':
        color = AppColors.info;
        bg = const Color(0xFFE8EEF8);
        break;
      case 'ready_for_pickup':
      case 'out_for_delivery':
        color = AppColors.accent;
        bg = AppColors.accentSurface;
        break;
      case 'completed':
        color = AppColors.primary;
        bg = AppColors.primarySurface;
        break;
      case 'cancelled':
        color = AppColors.error;
        bg = AppColors.errorSurface;
        break;
      default:
        color = AppColors.textSecondary;
        bg = AppColors.surfaceVariant;
    }
    String label;
    switch (status) {
      case 'pending_payment':
        label = 'Pending';
        break;
      case 'paid':
        label = 'Paid';
        break;
      case 'confirmed':
        label = 'Confirmed';
        break;
      case 'ready_for_pickup':
        label = 'Ready';
        break;
      case 'out_for_delivery':
        label = 'On the way';
        break;
      case 'completed':
        label = 'Completed';
        break;
      case 'cancelled':
        label = 'Cancelled';
        break;
      default:
        label = status;
    }
    return CnStatusPill(label: label, color: color, bgColor: bg);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor ?? color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(100),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }
}
