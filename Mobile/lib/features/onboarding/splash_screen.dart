import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';
import '../../core/services/auth_service.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/theme/app_colors.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _scale;
  late final Animation<double> _fade;
  late final Animation<double> _taglineFade;

  bool _animationDone = false;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      duration: const Duration(milliseconds: 1400),
      vsync: this,
    );
    _scale = Tween<double>(begin: 0.72, end: 1.0).animate(
      CurvedAnimation(
        parent: _ctrl,
        curve: const Interval(0, 0.7, curve: Curves.easeOutBack),
      ),
    );
    _fade = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(
          parent: _ctrl, curve: const Interval(0, 0.45, curve: Curves.easeIn)),
    );
    _taglineFade = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(
          parent: _ctrl, curve: const Interval(0.45, 1, curve: Curves.easeIn)),
    );
    _ctrl.forward();

    // Wait for minimum splash duration
    Future.delayed(const Duration(milliseconds: 1800), () {
      if (mounted) {
        _animationDone = true;
        _tryNavigate();
      }
    });
  }

  Future<void> _tryNavigate() async {
    if (!mounted || !_animationDone) return;

    final auth = ref.read(authProvider);
    // If auth is still loading (e.g. backend offline or slow), we must wait!
    // The ref.listen in build() will call this again once auth resolves.
    if (auth is AuthInitial || auth is AuthLoading) return;

    // Check if onboarding has been seen
    final onboardingDone = await AuthService.hasCompletedOnboarding();

    if (!mounted) return; // Guard after await

    if (auth is AuthAuthenticated) {
      final role = auth.activeRole;
      if (role == 'business_owner') {
        context.go('/business/dashboard');
      } else if (role == 'rider') {
        context.go('/rider/dashboard');
      } else {
        context.go('/home');
      }
    } else if (!onboardingDone) {
      context.go('/onboarding');
    } else {
      context.go('/auth/login');
    }
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Listen to auth state changes so we navigate as soon as it resolves
    ref.listen<AuthState>(authProvider, (previous, next) {
      if (next is! AuthInitial && next is! AuthLoading) {
        _tryNavigate();
      }
    });

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.light, // Android
        statusBarBrightness: Brightness.dark, // iOS
        systemNavigationBarColor: AppColors.primaryDark,
        systemNavigationBarIconBrightness: Brightness.light,
      ),
      child: Scaffold(
        backgroundColor: AppColors.moringa,
        body: Container(
          decoration: const BoxDecoration(gradient: AppColors.heroGradient),
          child: Stack(
            children: [
              // Soft Now Yellow glow behind the mark
              const Positioned(
                top: -80,
                right: -60,
                child:
                    _Glow(color: AppColors.nowYellow, size: 260, alpha: 0.16),
              ),
              const Positioned(
                bottom: -100,
                left: -70,
                child: _Glow(color: AppColors.pepper, size: 240, alpha: 0.12),
              ),

              Center(
                child: AnimatedBuilder(
                  animation: _ctrl,
                  builder: (_, __) => Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Opacity(
                        opacity: _fade.value,
                        child: Transform.scale(
                          scale: _scale.value,
                          // Yellow mark + Fufu wordmark: the brand's
                          // dark-ground lockup.
                          child: SvgPicture.asset(
                            'assets/images/wordmarkwithlogomark.svg',
                            width: 248,
                            semanticsLabel: 'ChopNow',
                          ),
                        ),
                      ),
                      const SizedBox(height: 28),
                      Opacity(
                        opacity: _taglineFade.value,
                        child: Column(
                          children: [
                            Text(
                              'Good food. Less waste.',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: AppColors.fufu.withValues(alpha: 0.92),
                                letterSpacing: 0.2,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              'Chop now, before it goes.',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w400,
                                color: AppColors.fufu.withValues(alpha: 0.6),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Quiet progress hint at the bottom
              Align(
                alignment: Alignment.bottomCenter,
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 56),
                  child: AnimatedBuilder(
                    animation: _ctrl,
                    builder: (_, child) =>
                        Opacity(opacity: _taglineFade.value, child: child),
                    child: SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(
                          AppColors.nowYellow.withValues(alpha: 0.85),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Soft blurred colour wash used to lift the flat gradient.
class _Glow extends StatelessWidget {
  final Color color;
  final double size;
  final double alpha;
  const _Glow({required this.color, required this.size, required this.alpha});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: RadialGradient(
          colors: [color.withValues(alpha: alpha), color.withValues(alpha: 0)],
        ),
      ),
    );
  }
}
