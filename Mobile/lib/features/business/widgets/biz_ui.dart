import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';

/// Shared building blocks for the business dashboard.
///
/// The whole section is built from these so it reads as one designed product:
/// soft high-radius surfaces held by shadow rather than hard borders, tinted
/// icon chips, value-first stats, and soft status pills.
class BizStyle {
  BizStyle._();

  static const double radius = 22;

  /// Soft elevation used by every surface. Tinted with Moringa rather than
  /// black so shadows stay warm against the scaffold.
  static List<BoxShadow> shadow({double opacity = 0.07, double blur = 18}) => [
        BoxShadow(
          color: AppColors.moringa.withValues(alpha: opacity),
          blurRadius: blur,
          offset: const Offset(0, 6),
        ),
      ];
}

/// Soft surface card — the default container for everything in this section.
class BizCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final Color? color;
  final VoidCallback? onTap;
  final double? radius;

  const BizCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(18),
    this.color,
    this.onTap,
    this.radius,
  });

  @override
  Widget build(BuildContext context) {
    final card = Container(
      padding: padding,
      decoration: BoxDecoration(
        color: color ?? AppColors.surface,
        borderRadius: BorderRadius.circular(radius ?? BizStyle.radius),
        boxShadow: BizStyle.shadow(),
      ),
      child: child,
    );
    if (onTap == null) return card;
    return GestureDetector(onTap: onTap, child: card);
  }
}

/// Rounded-square icon chip on a tint of its own colour.
class BizIconChip extends StatelessWidget {
  final IconData icon;
  final Color color;
  final double size;

  const BizIconChip({
    super.key,
    required this.icon,
    required this.color,
    this.size = 38,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(size * 0.32),
      ),
      child: Icon(icon, color: color, size: size * 0.5),
    );
  }
}

/// Section title with an optional trailing action.
class BizSectionHeader extends StatelessWidget {
  final String title;
  final String? subtitle;
  final String? actionLabel;
  final VoidCallback? onAction;

  const BizSectionHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 13),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.3,
                    color: AppColors.textPrimary,
                  ),
                ),
                if (subtitle != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    subtitle!,
                    style: const TextStyle(
                        fontSize: 12.5, color: AppColors.textSecondary),
                  ),
                ],
              ],
            ),
          ),
          if (actionLabel != null)
            GestureDetector(
              onTap: onAction,
              child: Row(
                children: [
                  Text(
                    actionLabel!,
                    style: const TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
                      color: AppColors.moringa,
                    ),
                  ),
                  const Icon(Icons.chevron_right_rounded,
                      size: 17, color: AppColors.moringa),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

/// Value-first stat tile: icon chip, big number, muted label.
class BizStatTile extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String value;
  final String label;

  const BizStatTile({
    super.key,
    required this.icon,
    required this.color,
    required this.value,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return BizCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          BizIconChip(icon: icon, color: color, size: 36),
          const SizedBox(height: 14),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.6,
                color: AppColors.textPrimary,
              ),
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style:
                const TextStyle(fontSize: 12, color: AppColors.textSecondary),
          ),
        ],
      ),
    );
  }
}

/// Soft status pill — tinted ground, strong label.
class BizStatusPill extends StatelessWidget {
  final String label;
  final Color color;
  final IconData? icon;

  const BizStatusPill({
    super.key,
    required this.label,
    required this.color,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.13),
        borderRadius: BorderRadius.circular(100),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 12, color: color),
            const SizedBox(width: 5),
          ],
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.2,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

/// Gradient hero card for the headline metric, with optional sub-metrics.
class BizHeroCard extends StatelessWidget {
  final String label;
  final String value;
  final String? caption;
  final List<({IconData icon, String label, String value})> stats;

  const BizHeroCard({
    super.key,
    required this.label,
    required this.value,
    this.caption,
    this.stats = const [],
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: AppColors.primaryGradient,
        borderRadius: BorderRadius.circular(26),
        boxShadow: [
          BoxShadow(
            color: AppColors.moringa.withValues(alpha: 0.28),
            blurRadius: 24,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.3,
                  color: AppColors.fufu.withValues(alpha: 0.72),
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.nowYellow,
                  borderRadius: BorderRadius.circular(100),
                ),
                child: const Text(
                  'LIVE',
                  style: TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.6,
                    color: AppColors.textOnAccent,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 34,
                fontWeight: FontWeight.w800,
                letterSpacing: -1.2,
                color: AppColors.fufu,
              ),
            ),
          ),
          if (caption != null) ...[
            const SizedBox(height: 4),
            Text(
              caption!,
              style: TextStyle(
                fontSize: 12,
                color: AppColors.fufu.withValues(alpha: 0.6),
              ),
            ),
          ],
          if (stats.isNotEmpty) ...[
            const SizedBox(height: 18),
            Container(
              padding: const EdgeInsets.symmetric(vertical: 13),
              decoration: BoxDecoration(
                color: AppColors.fufu.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(18),
              ),
              child: Row(
                children: [
                  for (var i = 0; i < stats.length; i++) ...[
                    if (i > 0)
                      Container(
                        width: 1,
                        height: 26,
                        color: AppColors.fufu.withValues(alpha: 0.15),
                      ),
                    Expanded(
                      child: Column(
                        children: [
                          Icon(stats[i].icon,
                              size: 15, color: AppColors.nowYellow),
                          const SizedBox(height: 5),
                          Text(
                            stats[i].value,
                            style: const TextStyle(
                              fontSize: 14.5,
                              fontWeight: FontWeight.w800,
                              color: AppColors.fufu,
                            ),
                          ),
                          const SizedBox(height: 1),
                          Text(
                            stats[i].label,
                            style: TextStyle(
                              fontSize: 10.5,
                              color: AppColors.fufu.withValues(alpha: 0.6),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Pill filter chip — filled Moringa when active.
class BizFilterChip extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;

  const BizFilterChip({
    super.key,
    required this.label,
    required this.active,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 17, vertical: 9),
        decoration: BoxDecoration(
          color: active ? AppColors.moringa : AppColors.surface,
          borderRadius: BorderRadius.circular(100),
          boxShadow: active ? BizStyle.shadow(opacity: 0.18) : null,
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: active ? FontWeight.w700 : FontWeight.w600,
            color: active ? AppColors.fufu : AppColors.textSecondary,
          ),
        ),
      ),
    );
  }
}
