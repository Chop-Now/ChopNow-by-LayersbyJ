import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';
import 'package:smooth_page_indicator/smooth_page_indicator.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../shared/animations/scale_tap.dart';
import '../../shared/widgets/layout/auth_shell.dart';

class _OnboardingSlide {
  final String image;
  final IconData icon;
  final String title;
  final String subtitle;
  final Color accentColor;
  final IconData badgeIcon;
  final String badgeLabel;

  const _OnboardingSlide({
    required this.image,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.accentColor,
    required this.badgeIcon,
    required this.badgeLabel,
  });
}

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> with TickerProviderStateMixin {
  final _ctrl = PageController();
  int _page = 0;
  late AnimationController _animController;
  late Animation<double> _fadeAnim;
  late Animation<Offset> _slideAnim;

  static const _slides = [
    _OnboardingSlide(
      image: 'assets/images/food.png',
      icon: Icons.restaurant_menu_rounded,
      title: 'Surplus meals,\nright near you',
      subtitle: 'Fresh food from restaurants, bakeries and grocers — up to 70% off, before it goes to waste.',
      accentColor: AppColors.nowYellow,
      badgeIcon: Icons.local_fire_department_rounded,
      badgeLabel: 'Up to 70% off',
    ),
    _OnboardingSlide(
      image: 'assets/images/grocery.png',
      icon: Icons.smartphone_rounded,
      title: 'Built for how\nAfrica pays',
      subtitle: 'MTN MoMo, Airtel Money, card or cash. Pick up your order with a code — no card details ever stored.',
      accentColor: AppColors.pepper,
      badgeIcon: Icons.verified_rounded,
      badgeLabel: '100% secure',
    ),
    _OnboardingSlide(
      image: 'assets/images/salads.png',
      icon: Icons.eco_rounded,
      title: 'Watch the\nwaste drop',
      subtitle: 'Every rescue is counted. See the meals saved, CO2 avoided and money kept in your pocket.',
      accentColor: AppColors.nowYellow,
      badgeIcon: Icons.eco_rounded,
      badgeLabel: 'Track your impact',
    ),
  ];

  bool get _isLast => _page == _slides.length - 1;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
    _fadeAnim = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _animController, curve: Curves.easeOut),
    );
    _slideAnim = Tween<Offset>(begin: const Offset(0, 0.06), end: Offset.zero).animate(
      CurvedAnimation(parent: _animController, curve: Curves.easeOutCubic),
    );
    _animController.forward();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    _animController.dispose();
    super.dispose();
  }

  void _onPageChanged(int i) {
    setState(() => _page = i);
    _animController.reset();
    _animController.forward();
  }

  Future<void> _complete() async {
    // await AuthService.setOnboardingCompleted();
    if (mounted) context.go('/login');
  }

  void _next() {
    if (_isLast) {
      _complete();
    } else {
      _ctrl.nextPage(
        duration: const Duration(milliseconds: 420),
        curve: Curves.easeOutCubic,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.light,
        statusBarBrightness: Brightness.dark,
      ),
      child: Scaffold(
        backgroundColor: AppColors.background,
        body: Stack(
          children: [
            PageView.builder(
              controller: _ctrl,
              onPageChanged: _onPageChanged,
              itemCount: _slides.length,
              itemBuilder: (_, i) => _HeroPanel(
                slide: _slides[i],
                isActive: i == _page,
              ),
            ),
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: _BottomSheet(
                slide: _slides[_page],
                page: _page,
                isLast: _isLast,
                ctrl: _ctrl,
                onNext: _next,
                onSkip: _complete,
                fadeAnim: _fadeAnim,
                slideAnim: _slideAnim,
                totalSlides: _slides.length,
              ),
            ),
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(24, 10, 16, 0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    SvgPicture.asset(
                      'assets/images/wordmarkwithlogomark.svg',
                      height: 28,
                      semanticsLabel: 'ChopNow',
                      colorFilter: const ColorFilter.mode(
                        Colors.white,
                        BlendMode.srcIn,
                      ),
                    ),
                    if (!_isLast)
                      ScaleTap(
                        onTap: _complete,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 7),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.18),
                            borderRadius: BorderRadius.circular(100),
                            border: Border.all(
                              color: Colors.white.withValues(alpha: 0.3),
                              width: 1,
                            ),
                          ),
                          child: const Text(
                            'Skip',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _HeroPanel extends StatelessWidget {
  final _OnboardingSlide slide;
  final bool isActive;
  
  const _HeroPanel({required this.slide, required this.isActive});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColors.primaryDark, AppColors.moringa, AppColors.primaryLight],
          stops: [0.0, 0.55, 1.0],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Stack(
        children: [
          Positioned(
            top: -80,
            right: -60,
            child: Container(
              width: 280,
              height: 280,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: slide.accentColor.withValues(alpha: 0.12),
              ),
            ),
          ),
          Positioned(
            bottom: 120,
            left: -40,
            child: Container(
              width: 180,
              height: 180,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.06),
              ),
            ),
          ),
          Positioned.fill(child: CustomPaint(painter: _GridPainter())),
          SafeArea(
            bottom: false,
            child: SizedBox(
              width: double.infinity,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  const SizedBox(height: 80),
                  // Accent pill
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: slide.accentColor,
                      borderRadius: BorderRadius.circular(100),
                      boxShadow: [
                        BoxShadow(
                          color: slide.accentColor.withValues(alpha: 0.45),
                          blurRadius: 14,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(slide.badgeIcon, size: 12, color: AppColors.char),
                        const SizedBox(width: 6),
                        Text(
                          slide.badgeLabel,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.5,
                            color: AppColors.char,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 36),
                  
                  // Floating bouncy image
                  TweenAnimationBuilder<double>(
                    key: ValueKey('${slide.title}_scale'),
                    tween: Tween<double>(begin: isActive ? 0.85 : 0.95, end: isActive ? 1.0 : 0.95),
                    duration: const Duration(milliseconds: 800),
                    curve: Curves.elasticOut,
                    builder: (context, scale, child) {
                      return Transform.scale(
                        scale: scale,
                        child: child,
                      );
                    },
                    child: TweenAnimationBuilder<double>(
                      key: ValueKey('${slide.title}_fade'),
                      tween: Tween<double>(begin: isActive ? 0.0 : 0.0, end: isActive ? 1.0 : 0.0),
                      duration: const Duration(milliseconds: 400),
                      curve: Curves.easeOut,
                      builder: (context, opacity, child) {
                        return Opacity(
                          opacity: opacity,
                          child: child,
                        );
                      },
                      child: Container(
                        height: 280, 
                        width: double.infinity,
                        decoration: BoxDecoration(
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.primaryDark.withValues(alpha: 0.4),
                              blurRadius: 40,
                              offset: const Offset(0, 20),
                              spreadRadius: -10,
                            ),
                          ],
                        ),
                        child: Image.asset(
                          slide.image,
                          fit: BoxFit.contain,
                          errorBuilder: (_, __, ___) => Icon(
                            slide.icon,
                            size: 90,
                            color: Colors.white.withValues(alpha: 0.7),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _BottomSheet extends StatelessWidget {
  final _OnboardingSlide slide;
  final int page;
  final int totalSlides;
  final bool isLast;
  final PageController ctrl;
  final VoidCallback onNext;
  final VoidCallback onSkip;
  final Animation<double> fadeAnim;
  final Animation<Offset> slideAnim;

  const _BottomSheet({
    required this.slide,
    required this.page,
    required this.totalSlides,
    required this.isLast,
    required this.ctrl,
    required this.onNext,
    required this.onSkip,
    required this.fadeAnim,
    required this.slideAnim,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(32),
          topRight: Radius.circular(32),
        ),
        boxShadow: [
          BoxShadow(color: Color(0x22000000), blurRadius: 24, offset: Offset(0, -4)),
        ],
      ),
      padding: const EdgeInsets.fromLTRB(28, 24, 28, 0),
      child: SafeArea(
        top: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Center(
              child: Container(
                width: 36,
                height: 4,
                margin: const EdgeInsets.only(bottom: 24),
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(100),
                ),
              ),
            ),
            SmoothPageIndicator(
              controller: ctrl,
              count: totalSlides,
              effect: const ExpandingDotsEffect(
                activeDotColor: AppColors.moringa,
                dotColor: AppColors.border,
                dotHeight: 6,
                dotWidth: 6,
                expansionFactor: 4,
                spacing: 5,
              ),
            ),
            const SizedBox(height: 24),
            FadeTransition(
              opacity: fadeAnim,
              child: SlideTransition(
                position: slideAnim,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      slide.title,
                      style: AppTypography.textTheme.displayMedium?.copyWith(
                        color: AppColors.textPrimary,
                        height: 1.15,
                        letterSpacing: -0.6,
                      ) ?? const TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                        height: 1.15,
                        letterSpacing: -0.6,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      slide.subtitle,
                      style: AppTypography.textTheme.bodyLarge?.copyWith(
                        color: AppColors.textSecondary,
                        height: 1.5,
                      ) ?? const TextStyle(
                        fontSize: 14.5,
                        color: AppColors.textSecondary,
                        height: 1.5,
                        letterSpacing: 0.1,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 32),
            Row(
              children: [
                AnimatedOpacity(
                  duration: const Duration(milliseconds: 200),
                  opacity: page == 0 ? 0 : 1,
                  child: IgnorePointer(
                    ignoring: page == 0,
                    child: ScaleTap(
                      onTap: () => ctrl.previousPage(
                        duration: const Duration(milliseconds: 380),
                        curve: Curves.easeOutCubic,
                      ),
                      child: Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.primarySurface,
                          border: Border.all(
                            color: AppColors.moringa.withValues(alpha: 0.25),
                            width: 1.5,
                          ),
                        ),
                        child: const Icon(Icons.arrow_back_rounded, color: AppColors.moringa, size: 20),
                      ),
                    ),
                  ),
                ),
                if (page > 0) const SizedBox(width: 14),
                Expanded(
                  child: AuthPrimaryButton(
                    label: isLast ? 'Get Started' : 'Next',
                    onTap: onNext,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            if (isLast)
              Center(
                child: ScaleTap(
                  onTap: onSkip,
                  child: RichText(
                    text: const TextSpan(
                      text: 'Already have an account?  ',
                      style: TextStyle(fontSize: 13.5, color: AppColors.textSecondary),
                      children: [
                        TextSpan(
                          text: 'Sign in',
                          style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.moringa),
                        ),
                      ],
                    ),
                  ),
                ),
              )
            else
              const SizedBox(height: 36),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}

class _GridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withValues(alpha: 0.04)
      ..strokeWidth = 0.8;
    const spacing = 36.0;
    for (double x = 0; x < size.width; x += spacing) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    for (double y = 0; y < size.height; y += spacing) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
