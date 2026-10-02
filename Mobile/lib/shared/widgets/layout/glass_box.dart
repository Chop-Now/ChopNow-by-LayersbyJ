import 'dart:ui';
import 'package:flutter/material.dart';

/// A reusable glassmorphic overlay widget that blurs its background
/// and applies a very subtle white/dark tint on top of it.
class GlassBox extends StatelessWidget {
  final Widget child;
  final double blur;
  final double opacity;
  final Color tintColor;
  final BorderRadiusGeometry? borderRadius;
  final BoxBorder? border;

  const GlassBox({
    super.key,
    required this.child,
    this.blur = 24.0,
    this.opacity = 0.5,
    this.tintColor = Colors.white,
    this.borderRadius,
    this.border,
  });

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: borderRadius ?? BorderRadius.zero,
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
        child: Container(
          decoration: BoxDecoration(
            color: tintColor.withValues(alpha: opacity),
            borderRadius: borderRadius,
            border: border,
          ),
          child: child,
        ),
      ),
    );
  }
}
