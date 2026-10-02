import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/animations/scale_tap.dart';

class OrderConfirmationScreen extends StatefulWidget {
  final String orderId;
  const OrderConfirmationScreen({super.key, required this.orderId});

  @override
  State<OrderConfirmationScreen> createState() =>
      _OrderConfirmationScreenState();
}

class _OrderConfirmationScreenState extends State<OrderConfirmationScreen>
    with TickerProviderStateMixin {
  late AnimationController _scaleCtrl;
  late AnimationController _fadeCtrl;
  late AnimationController _particleCtrl;
  late Animation<double> _scaleAnim;
  late Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();
    HapticFeedback.heavyImpact();

    _scaleCtrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 700));
    _fadeCtrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 600));
    _particleCtrl =
        AnimationController(vsync: this, duration: const Duration(seconds: 2))
          ..repeat();

    _scaleAnim = CurvedAnimation(parent: _scaleCtrl, curve: Curves.elasticOut);
    _fadeAnim = CurvedAnimation(parent: _fadeCtrl, curve: Curves.easeOut);

    _scaleCtrl.forward();
    Future.delayed(const Duration(milliseconds: 300), () {
      if (mounted) _fadeCtrl.forward();
    });
  }

  @override
  void dispose() {
    _scaleCtrl.dispose();
    _fadeCtrl.dispose();
    _particleCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          // Animated particle background
          AnimatedBuilder(
            animation: _particleCtrl,
            builder: (_, __) => CustomPaint(
              painter: _ConfettiPainter(_particleCtrl.value),
              size: MediaQuery.of(context).size,
            ),
          ),

          SafeArea(
            child: FadeTransition(
              opacity: _fadeAnim,
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    const SizedBox(height: 40),

                    // Animated success icon
                    ScaleTransition(
                      scale: _scaleAnim,
                      child: Container(
                        width: 120,
                        height: 120,
                        decoration: BoxDecoration(
                          gradient: AppColors.primaryGradient,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.primary.withValues(alpha: 0.4),
                              blurRadius: 30,
                              spreadRadius: 10,
                              offset: const Offset(0, 8),
                            ),
                          ],
                        ),
                        child: const Icon(Icons.check_rounded,
                            size: 64, color: Colors.white),
                      ),
                    ),
                    const SizedBox(height: 32),

                    // Title
                    const Text(
                      'Order Confirmed',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w900,
                        color: AppColors.textPrimary,
                        letterSpacing: -0.5,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 10),
                    const Text(
                      'Your meal rescue is on the way.\nGet ready to enjoy great food!',
                      style: TextStyle(
                          fontSize: 15,
                          color: AppColors.textSecondary,
                          height: 1.4),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 36),

                    // Order ID card
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppColors.border),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.05),
                            blurRadius: 16,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: AppColors.primarySurface,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: const Icon(Icons.receipt_long_rounded,
                                    color: AppColors.primary, size: 20),
                              ),
                              const SizedBox(width: 10),
                              const Text('Order Reference',
                                  style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.textSecondary)),
                            ],
                          ),
                          const SizedBox(height: 10),
                          Text(
                            '#${widget.orderId.length > 10 ? widget.orderId.substring(widget.orderId.length - 10).toUpperCase() : widget.orderId.toUpperCase()}',
                            style: const TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w900,
                              color: AppColors.primary,
                              letterSpacing: 3,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Steps section
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text("What's next?",
                              style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w800,
                                  color: AppColors.textPrimary)),
                          SizedBox(height: 16),
                          _NextStep(
                            step: '1',
                            icon: Icons.storefront_outlined,
                            title: 'Vendor prepares your order',
                            subtitle: 'You\'ll be notified when it\'s ready',
                          ),
                          SizedBox(height: 12),
                          _NextStep(
                            step: '2',
                            icon: Icons.qr_code_rounded,
                            title: 'Get your pickup code',
                            subtitle: 'Show it at the restaurant counter',
                          ),
                          SizedBox(height: 12),
                          _NextStep(
                            step: '3',
                            icon: Icons.celebration_rounded,
                            title: 'Enjoy your rescued meal! 🌍',
                            subtitle: 'Rate and help others find great deals',
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 32),

                    // Impact line
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 20, vertical: 14),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            AppColors.success.withValues(alpha: 0.12),
                            AppColors.primary.withValues(alpha: 0.08)
                          ],
                        ),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                            color: AppColors.success.withValues(alpha: 0.3)),
                      ),
                      child: const Row(
                        children: [
                          Text('🌱', style: TextStyle(fontSize: 24)),
                          SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'You\'ve rescued food and saved CO₂ emissions!',
                              style: TextStyle(
                                  fontSize: 13,
                                  color: AppColors.success,
                                  fontWeight: FontWeight.w600),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 32),

                    // Primary CTA
                    ScaleTap(
                      onTap: () {
                        HapticFeedback.lightImpact();
                        context.push('/orders/${widget.orderId}/tracking');
                      },
                      child: Container(
                        width: double.infinity,
                        height: 56,
                        decoration: BoxDecoration(
                          gradient: AppColors.primaryGradient,
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [
                            BoxShadow(
                                color:
                                    AppColors.primary.withValues(alpha: 0.35),
                                blurRadius: 12,
                                offset: const Offset(0, 4)),
                          ],
                        ),
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.location_on_rounded,
                                color: Colors.white, size: 20),
                            SizedBox(width: 10),
                            Text('Track My Order',
                                style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 16,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 0.3)),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Secondary CTA
                    ScaleTap(
                      onTap: () {
                        HapticFeedback.lightImpact();
                        context.go('/home');
                      },
                      child: Container(
                        width: double.infinity,
                        height: 52,
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: const Center(
                          child: Text('Back to Home',
                              style: TextStyle(
                                  color: AppColors.textPrimary,
                                  fontSize: 15,
                                  fontWeight: FontWeight.w600)),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _NextStep extends StatelessWidget {
  final String step;
  final IconData icon;
  final String title;
  final String subtitle;
  const _NextStep(
      {required this.step,
      required this.icon,
      required this.title,
      required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: const BoxDecoration(
            gradient: AppColors.primaryGradient,
            shape: BoxShape.circle,
          ),
          child: Center(
            child: Text(step,
                style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                    fontSize: 13)),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title,
                  style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary)),
              const SizedBox(height: 2),
              Text(subtitle,
                  style: const TextStyle(
                      fontSize: 12, color: AppColors.textSecondary)),
            ],
          ),
        ),
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: AppColors.primarySurface,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, size: 18, color: AppColors.primary),
        ),
      ],
    );
  }
}

class _ConfettiPainter extends CustomPainter {
  final double progress;
  static final _random = Random(42);
  static final _particles = List.generate(
      30,
      (i) => _Particle(
            x: _random.nextDouble(),
            y: _random.nextDouble(),
            size: 4 + _random.nextDouble() * 8,
            speed: 0.3 + _random.nextDouble() * 0.7,
            color: [
              AppColors.primary,
              AppColors.accent,
              const Color(0xFFFFC107),
              AppColors.success,
              const Color(0xFF9C27B0),
            ][i % 5]
                .withValues(alpha: 0.6 + _random.nextDouble() * 0.4),
            angle: _random.nextDouble() * 2 * pi,
          ));

  const _ConfettiPainter(this.progress);

  @override
  void paint(Canvas canvas, Size size) {
    for (final p in _particles) {
      final t = (p.y + progress * p.speed) % 1.0;
      final x = p.x * size.width + sin(progress * 2 * pi + p.angle) * 20;
      final y = t * size.height;
      final paint = Paint()..color = p.color;
      canvas.save();
      canvas.translate(x, y);
      canvas.rotate(progress * 4 * pi * p.speed + p.angle);
      canvas.drawRRect(
        RRect.fromRectAndRadius(
            Rect.fromCenter(
                center: Offset.zero, width: p.size, height: p.size / 2),
            const Radius.circular(2)),
        paint,
      );
      canvas.restore();
    }
  }

  @override
  bool shouldRepaint(_ConfettiPainter old) => old.progress != progress;
}

class _Particle {
  final double x, y, size, speed, angle;
  final Color color;
  const _Particle(
      {required this.x,
      required this.y,
      required this.size,
      required this.speed,
      required this.color,
      required this.angle});
}
