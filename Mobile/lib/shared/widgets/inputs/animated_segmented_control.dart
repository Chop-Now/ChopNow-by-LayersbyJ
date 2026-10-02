import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../core/theme/app_colors.dart';

class AnimatedSegmentedControl extends StatelessWidget {
  final List<String> segments;
  final int selectedIndex;
  final ValueChanged<int> onValueChanged;
  final List<int>? badgeCounts;

  const AnimatedSegmentedControl({
    super.key,
    required this.segments,
    required this.selectedIndex,
    required this.onValueChanged,
    this.badgeCounts,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppColors.surfaceVariant.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(100),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final width = constraints.maxWidth / segments.length;
          return Stack(
            children: [
              // Sliding background pill
              AnimatedPositioned(
                duration: const Duration(milliseconds: 250),
                curve: Curves.easeOutCubic,
                left: selectedIndex * width,
                top: 0,
                bottom: 0,
                child: Container(
                  width: width,
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(100),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.char.withValues(alpha: 0.06),
                        blurRadius: 8,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                ),
              ),
              Row(
                children: List.generate(
                  segments.length,
                  (index) => Expanded(
                    child: GestureDetector(
                      onTap: () {
                        HapticFeedback.selectionClick();
                        onValueChanged(index);
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        color: Colors.transparent,
                        child: Center(
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                segments[index],
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: selectedIndex == index
                                      ? FontWeight.w800
                                      : FontWeight.w600,
                                  color: selectedIndex == index
                                      ? AppColors.primary
                                      : AppColors.textSecondary,
                                ),
                              ),
                              if (badgeCounts != null && badgeCounts![index] > 0) ...[
                                const SizedBox(width: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: selectedIndex == index
                                        ? AppColors.primary.withValues(alpha: 0.1)
                                        : AppColors.surface,
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(
                                        color: selectedIndex == index
                                            ? AppColors.primary.withValues(alpha: 0.2)
                                            : AppColors.border),
                                  ),
                                  child: Text(
                                    '${badgeCounts![index]}',
                                    style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w700,
                                        color: selectedIndex == index
                                            ? AppColors.primary
                                            : AppColors.textSecondary),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
