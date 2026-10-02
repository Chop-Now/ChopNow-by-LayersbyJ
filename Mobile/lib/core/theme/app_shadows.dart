import 'package:flutter/material.dart';
import 'app_colors.dart';

/// A premium, unified shadow system to replace harsh drop-shadows with buttery smooth,
/// wide-spread elevations.
class AppShadows {
  AppShadows._();

  /// Very subtle shadow for inputs and small cards
  static List<BoxShadow> get sm => [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.03),
          offset: const Offset(0, 2),
          blurRadius: 8,
        ),
      ];

  /// Standard card elevation
  static List<BoxShadow> get md => [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.04),
          offset: const Offset(0, 4),
          blurRadius: 16,
          spreadRadius: -2,
        ),
      ];

  /// High elevation for floating elements (nav bars, bottom sheets)
  static List<BoxShadow> get lg => [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.06),
          offset: const Offset(0, 10),
          blurRadius: 24,
          spreadRadius: -4,
        ),
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.02),
          offset: const Offset(0, 4),
          blurRadius: 8,
        ),
      ];

  /// The beautiful colored glow used under primary buttons!
  static List<BoxShadow> get primaryGlow => [
        BoxShadow(
          color: AppColors.primary.withValues(alpha: 0.35),
          offset: const Offset(0, 8),
          blurRadius: 20,
          spreadRadius: -4,
        ),
      ];
}
