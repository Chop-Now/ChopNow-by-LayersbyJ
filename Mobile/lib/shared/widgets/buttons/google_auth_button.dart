import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../core/theme/app_colors.dart';
import '../../animations/scale_tap.dart';

/// Outlined "Continue with Google" button, matching the outlined style
/// Google's own branding guidelines recommend and mirroring the web app's
/// GoogleLogin button (Frontend/src/Pages/Login.jsx, SignUp.jsx).
class GoogleAuthButton extends StatelessWidget {
  final String label;
  final VoidCallback? onTap;
  final bool isLoading;

  const GoogleAuthButton({
    super.key,
    this.label = 'Continue with Google',
    this.onTap,
    this.isLoading = false,
  });

  @override
  Widget build(BuildContext context) {
    final disabled = onTap == null || isLoading;
    return ScaleTap(
      onTap: disabled
          ? null
          : () {
              HapticFeedback.lightImpact();
              onTap?.call();
            },
      child: Opacity(
        opacity: disabled && !isLoading ? 0.6 : 1,
        child: Container(
          width: double.infinity,
          height: 52,
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.border, width: 1.5),
          ),
          child: Center(
            child: isLoading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      color: AppColors.textSecondary,
                      strokeWidth: 2.5,
                    ),
                  )
                : Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const _GoogleG(),
                      const SizedBox(width: 10),
                      Text(
                        label,
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 14.5,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
          ),
        ),
      ),
    );
  }
}

/// Minimal four-colour "G" badge - avoids bundling Google's actual logo
/// asset while still reading unambiguously as the Google sign-in option.
class _GoogleG extends StatelessWidget {
  const _GoogleG();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 20,
      height: 20,
      child: CustomPaint(painter: _GoogleGPainter()),
    );
  }
}

class _GoogleGPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2;
    final strokeWidth = radius * 0.55;
    final rect = Rect.fromCircle(radius: radius - strokeWidth / 2, center: center);

    void arc(double startDeg, double sweepDeg, Color color) {
      final paint = Paint()
        ..color = color
        ..style = PaintingStyle.stroke
        ..strokeWidth = strokeWidth
        ..strokeCap = StrokeCap.butt;
      canvas.drawArc(
        rect,
        startDeg * 3.1415926535 / 180,
        sweepDeg * 3.1415926535 / 180,
        false,
        paint,
      );
    }

    arc(-90, 90, const Color(0xFF4285F4)); // blue
    arc(0, 90, const Color(0xFF34A853)); // green
    arc(90, 90, const Color(0xFFFBBC05)); // yellow
    arc(180, 90, const Color(0xFFEA4335)); // red

    // Crossbar of the "G"
    final barPaint = Paint()..color = const Color(0xFF4285F4);
    canvas.drawRect(
      Rect.fromLTWH(center.dx, center.dy - strokeWidth / 2,
          radius - strokeWidth * 0.15, strokeWidth),
      barPaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
