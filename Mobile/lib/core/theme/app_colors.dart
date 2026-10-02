import 'package:flutter/material.dart';

/// ChopNow brand palette.
///
/// Source of truth is the root `CLAUDE.md`. Five brand colours:
/// Moringa `#0F3D2E`, Now Yellow `#FFC531`, Pepper `#E8552F`,
/// Fufu `#FAF3E4`, Char `#17150F`.
///
/// Two contrast rules are load-bearing — breaking them fails WCAG badly:
///   • **Never white on Now Yellow** (1.58:1). Yellow carries Char or Moringa.
///   • **On Pepper, only Char passes** (5.02:1); white is 3.64:1, so white on
///     Pepper is for large display text only, never small labels or badges.
class AppColors {
  AppColors._();

  // ── Brand ──
  static const Color moringa = Color(0xFF0F3D2E);
  static const Color nowYellow = Color(0xFFFFC531);
  static const Color pepper = Color(0xFFE8552F);
  static const Color fufu = Color(0xFFFAF3E4);
  static const Color char = Color(0xFF17150F);

  // ── Brand Primary: Moringa ──
  static const Color primary = moringa;
  static const Color primaryDark = Color(0xFF0A2A20);
  static const Color primaryLight = Color(0xFF1B5A45);
  static const Color primarySurface = Color(0xFFE7EFEB); // subtle green tint

  // ── Brand Accent: Now Yellow ──
  static const Color accent = nowYellow;
  static const Color accentDark = Color(0xFFEFB522);
  static const Color accentLight = Color(0xFFFFD668);
  static const Color accentSurface = Color(0xFFFFF7E4);

  // ── Secondary Accent: Pepper (discounts, prices, urgency) ──
  static const Color secondaryAccent = pepper;
  static const Color secondaryAccentDark = Color(0xFFCE4522);
  static const Color secondaryAccentSurface = Color(0xFFFDEDE8);

  // ── Backgrounds (layered, matches web) ──
  /// Main scaffold ground — faint off-white green.
  static const Color background = Color(0xFFF6FFF9);

  /// Standard surface: cards, sheets, panels.
  static const Color surface = Color(0xFFFFFFFF);

  /// Secondary band, used to separate a section from the ground.
  static const Color surfaceVariant = fufu;

  // ── Dark Theme (deep Moringa greens) ──
  static const Color darkBackground = Color(0xFF071A13);
  static const Color darkSurface = Color(0xFF0C2419);
  static const Color darkSurfaceVariant = Color(0xFF143327);
  static const Color darkBorder = Color(0xFF1E4735);

  // ── Borders ──
  static const Color border = Color(0xFFE3EBE6);
  static const Color borderFocus = moringa;

  // ── Text ──
  static const Color textPrimary = char; // 18.25:1 on surface
  static const Color textSecondary = Color(0xFF4F625A); // 6.51:1, WCAG AA
  static const Color textTertiary = Color(0xFF9AA8A1);

  /// White on Moringa is 12.9:1 — safe.
  static const Color textOnPrimary = Color(0xFFFFFFFF);

  /// **Char, not white.** White on Now Yellow is 1.58:1 and fails outright.
  static const Color textOnAccent = char;

  /// **Char, not white.** White on Pepper is 3.64:1 — fails at body size.
  static const Color textOnSecondaryAccent = char;

  // ── Semantic ──
  // Deliberately kept distinct from the brand colours: Moringa is a green and
  // Now Yellow / Pepper are warm, so success/warning/error use hues far enough
  // away that state still reads as state rather than as branding.
  static const Color success = Color(0xFF16A34A); // brighter than Moringa
  static const Color successSurface = Color(0xFFE7F7EE);
  static const Color warning = Color(0xFFB45309); // darker than Now Yellow
  static const Color warningSurface = Color(0xFFFDF3E3);
  static const Color error = Color(0xFFC81E36); // cooler/deeper than Pepper
  static const Color errorSurface = Color(0xFFFCEBEE);
  static const Color info = Color(0xFF2563EB);
  static const Color infoSurface = Color(0xFFE8F0FE);

  // ── Impact Colors ──
  static const Color co2Green = success;
  static const Color mealOrange = pepper;
  static const Color savingsGold = accentDark;

  // ── Status Pills ──
  static const Color statusPending = warning;
  static const Color statusActive = success;
  static const Color statusCancelled = error;
  static const Color statusCompleted = info;

  // ── Gradient Definitions ──
  /// Signature Moringa gradient for main CTAs and dark hero panels.
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [primaryLight, moringa, primaryDark],
    stops: [0.0, 0.5, 1.0],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  /// Horizontal Moringa gradient for badges and highlights.
  static const LinearGradient primaryGradientHorz = LinearGradient(
    colors: [primaryLight, moringa],
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
  );

  /// Now Yellow gradient — always pair with Char/Moringa text.
  static const LinearGradient accentGradient = LinearGradient(
    colors: [accentLight, nowYellow, accentDark],
    stops: [0.0, 0.5, 1.0],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  /// Pepper gradient for discount and urgency treatments.
  static const LinearGradient pepperGradient = LinearGradient(
    colors: [Color(0xFFF2703F), pepper, secondaryAccentDark],
    stops: [0.0, 0.5, 1.0],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient heroGradient = LinearGradient(
    colors: [Color(0xFF15503B), moringa, Color(0xFF06170F)],
    stops: [0.0, 0.55, 1.0],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient impactGradient = LinearGradient(
    colors: [moringa, primaryLight],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // ── Overlay ──
  static const Color overlayLight = Color(0x330F3D2E); // 20% Moringa
  static const Color overlayDark = Color(0x99071A13); // 60% deep Moringa
  static const Color shimmerBase = Color(0xFFEDF3EF);
  static const Color shimmerHighlight = Color(0xFFFFFFFF);
}
