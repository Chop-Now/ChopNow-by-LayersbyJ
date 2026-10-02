import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/services/biometric_service.dart';
import '../../core/services/google_auth_service.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/widgets/buttons/cn_buttons.dart';
import '../../shared/widgets/buttons/google_auth_button.dart';
import '../../shared/widgets/inputs/cn_text_field.dart';
import '../../shared/animations/scale_tap.dart';
import '../../shared/widgets/layout/auth_shell.dart';

// ── Role selection constants ──────────────────────────────────────────────────
enum _LoginRole { none, customer, business }

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Which role the user chose in step 1
  _LoginRole _selectedRole = _LoginRole.none;

  // Email/password
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _obscurePassword = true;

  // OTP
  final _phoneCtrl = TextEditingController();
  final _otpCtrl = TextEditingController();
  bool _otpSent = false;
  bool _sendingOtp = false;

  // Local validation error (shown instead of / alongside auth error)
  String? _localError;

  bool _biometricAvailable = false;
  bool _biometricEnabled = false;
  IconData _biometricIcon = Icons.vpn_key_rounded;
  bool _googleSigningIn = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() => setState(() {}));

    // Clear errors whenever user types
    _emailCtrl.addListener(_clearErrors);
    _passwordCtrl.addListener(_clearErrors);
    _phoneCtrl.addListener(_clearErrors);
    _otpCtrl.addListener(_clearErrors);

    _checkBiometricStatus();
  }

  Future<void> _checkBiometricStatus() async {
    final available = await BiometricService.isAvailable;
    final enabled = await BiometricService.isEnabled;
    final icon = await BiometricService.biometricIcon;
    if (mounted) {
      setState(() {
        _biometricAvailable = available;
        _biometricEnabled = enabled;
        _biometricIcon = icon;
      });
    }
  }

  Future<void> _loginWithBiometrics() async {
    HapticFeedback.mediumImpact();

    // Clear any previous error
    _clearErrors();

    final authenticated = await BiometricService.authenticate(
        reason: 'Authenticate to sign in to ChopNow');
    if (!authenticated) return;

    // Map role choice to preferred backend role
    final preferredRole =
        _selectedRole == _LoginRole.business ? 'business_owner' : 'consumer';

    final success = await ref
        .read(authProvider.notifier)
        .loginWithBiometrics(preferredRole: preferredRole);

    if (!success && mounted) {
      final currentState = ref.read(authProvider);
      if (currentState is! AuthError) {
        setState(() => _localError =
            'No saved biometric sign-in. Please sign in with your password first.');
      }
    }
  }

  Future<void> _signInWithGoogle() async {
    HapticFeedback.mediumImpact();
    _clearErrors();
    setState(() => _googleSigningIn = true);
    try {
      final idToken = await GoogleAuthService.signIn();
      if (idToken == null) {
        // User cancelled the picker, or Play Services returned no ID token.
        if (mounted) setState(() => _googleSigningIn = false);
        return;
      }
      final preferredRole =
          _selectedRole == _LoginRole.business ? 'business_owner' : 'consumer';
      await ref
          .read(authProvider.notifier)
          .loginWithGoogle(idToken, preferredRole: preferredRole);
    } catch (e) {
      if (mounted) {
        setState(() =>
            _localError = 'Google sign-in failed. Please try again.');
      }
    } finally {
      if (mounted) setState(() => _googleSigningIn = false);
    }
  }

  void _clearErrors() {
    if (_localError != null) {
      setState(() => _localError = null);
    }
    final authState = ref.read(authProvider);
    if (authState is AuthError) {
      ref.read(authProvider.notifier).clearError();
    }
  }

  @override
  void dispose() {
    _emailCtrl.removeListener(_clearErrors);
    _passwordCtrl.removeListener(_clearErrors);
    _phoneCtrl.removeListener(_clearErrors);
    _otpCtrl.removeListener(_clearErrors);
    _tabController.dispose();
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    _phoneCtrl.dispose();
    _otpCtrl.dispose();
    super.dispose();
  }

  bool _isValidEmail(String email) {
    return RegExp(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
        .hasMatch(email);
  }

  // ── Back navigation ─────────────────────────────────────────────────────────
  void _handleBack() {
    if (_selectedRole != _LoginRole.none) {
      // Step 2 → go back to role selection (step 1)
      setState(() {
        _selectedRole = _LoginRole.none;
        _localError = null;
        _emailCtrl.clear();
        _passwordCtrl.clear();
        _phoneCtrl.clear();
        _otpCtrl.clear();
        _otpSent = false;
      });
      ref.read(authProvider.notifier).clearError();
    } else {
      // Step 1 → go to onboarding (safe, no pop needed)
      context.go('/onboarding');
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final isLoading = authState is AuthLoading;
    final authError = authState is AuthError ? authState.message : null;
    final error = _localError ?? authError;

    ref.listen(authProvider, (_, next) async {
      if (next is AuthAuthenticated) {
        HapticFeedback.heavyImpact();
        final user = next.user;
        final role = user.activeRole;

        // If user chose 'business' but their active role is not business_owner yet,
        // we need to switch roles if they have the role
        if (_selectedRole == _LoginRole.business &&
            role != 'business_owner' &&
            user.roles.contains('business_owner')) {
          await ref.read(authProvider.notifier).switchRole('business_owner');
          return; // switchRole will update state → listener fires again
        }

        // Route based on final active role
        if (!mounted) return;
        if (role == 'business_owner') {
          context.go('/business/dashboard');
        } else if (role == 'rider') {
          context.go('/rider/dashboard');
        } else {
          context.go('/home');
        }
      }
    });

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _handleBack();
      },
      // No Scaffold/SafeArea here: AuthShell supplies both, and an outer
      // SafeArea would paint a light inset above its Moringa hero.
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 320),
        transitionBuilder: (child, animation) => FadeTransition(
          opacity: animation,
          child: SlideTransition(
            position: Tween<Offset>(
              begin: const Offset(0.04, 0),
              end: Offset.zero,
            ).animate(animation),
            child: child,
          ),
        ),
        child: _selectedRole == _LoginRole.none
            ? _RoleSelectionStep(
                key: const ValueKey('role_step'),
                onBack: _handleBack,
                onSelectCustomer: () =>
                    setState(() => _selectedRole = _LoginRole.customer),
                onSelectBusiness: () =>
                    setState(() => _selectedRole = _LoginRole.business),
              )
            : _LoginFormStep(
                key: const ValueKey('form_step'),
                selectedRole: _selectedRole,
                tabController: _tabController,
                emailCtrl: _emailCtrl,
                passwordCtrl: _passwordCtrl,
                phoneCtrl: _phoneCtrl,
                otpCtrl: _otpCtrl,
                obscurePassword: _obscurePassword,
                onToggleObscure: () =>
                    setState(() => _obscurePassword = !_obscurePassword),
                otpSent: _otpSent,
                sendingOtp: _sendingOtp,
                onSendOtp: _sendOtp,
                isLoading: isLoading,
                error: error,
                onBack: _handleBack,
                onSubmit: isLoading ? null : _submit,
                biometricAvailable: _biometricAvailable,
                biometricEnabled: _biometricEnabled,
                biometricIcon: _biometricIcon,
                onBiometricTap: _loginWithBiometrics,
                onGoogleTap: _signInWithGoogle,
                googleSigningIn: _googleSigningIn,
              ),
      ),
    );
  }

  Future<void> _sendOtp() async {
    if (_phoneCtrl.text.trim().isEmpty) {
      setState(() => _localError = 'Please enter your phone number.');
      return;
    }
    setState(() => _sendingOtp = true);
    try {
      await ApiClient.instance
          .post(AppEndpoints.sendOtp, data: {'phone': _phoneCtrl.text.trim()});
      if (!mounted) return;
      setState(() {
        _otpSent = true;
        _sendingOtp = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('OTP sent! Check your phone.'),
            backgroundColor: AppColors.primary),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _localError = e.toString().replaceAll('Exception: ', '');
        _sendingOtp = false;
      });
    }
  }

  void _submit() {
    if (kDebugMode) {
      debugPrint(
          '[Login] _submit called. selectedRole=$_selectedRole, tabIndex=${_tabController.index}');
    }
    HapticFeedback.mediumImpact();

    // Map role choice to preferred backend role
    final preferredRole =
        _selectedRole == _LoginRole.business ? 'business_owner' : 'consumer';

    if (_tabController.index == 0) {
      final email = _emailCtrl.text.trim();
      final pass = _passwordCtrl.text;
      if (kDebugMode) debugPrint('[Login] Submit tapped');

      if (email.isEmpty) {
        if (kDebugMode) debugPrint('[Login] Email is empty');
        setState(() => _localError = 'Please enter your email address.');
        return;
      }
      if (!_isValidEmail(email)) {
        if (kDebugMode) debugPrint('[Login] Email is invalid');
        setState(() =>
            _localError = 'Please enter a valid email (e.g. you@example.com).');
        return;
      }
      if (pass.isEmpty) {
        if (kDebugMode) debugPrint('[Login] Password is empty');
        setState(() => _localError = 'Please enter your password.');
        return;
      }

      if (kDebugMode) {
        debugPrint('[Login] Calling authProvider.notifier.login...');
      }
      ref
          .read(authProvider.notifier)
          .login(email: email, password: pass, preferredRole: preferredRole);
    } else {
      if (!_otpSent) {
        _sendOtp();
        return;
      }
      final phone = _phoneCtrl.text.trim();
      final otp = _otpCtrl.text.trim();
      if (phone.isEmpty) {
        setState(() => _localError = 'Please enter your phone number.');
        return;
      }
      if (otp.length < 6) {
        setState(() => _localError = 'Please enter the full 6-digit OTP code.');
        return;
      }
      ref.read(authProvider.notifier).loginWithOtp(phone: phone, otp: otp);
    }
  }
}

// ── Step 1: Role selection ────────────────────────────────────────────────────
class _RoleSelectionStep extends StatelessWidget {
  final VoidCallback onBack;
  final VoidCallback onSelectCustomer;
  final VoidCallback onSelectBusiness;

  const _RoleSelectionStep({
    super.key,
    required this.onBack,
    required this.onSelectCustomer,
    required this.onSelectBusiness,
  });

  @override
  Widget build(BuildContext context) {
    return AuthShell(
      onBack: onBack,
      title: 'Welcome back',
      subtitle: 'Rescue good food before it goes to waste.',
      fillHeight: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          const Spacer(flex: 2),
          const Text(
            "Who's chopping?",
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
              letterSpacing: -0.3,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 32),
            child: Text(
              "Are you here to order delicious surplus meals or sell them as a business?",
              style: TextStyle(
                fontSize: 15,
                color: AppColors.textSecondary,
                height: 1.4,
              ),
              textAlign: TextAlign.center,
            ),
          ),
          const SizedBox(height: 56),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _RoleAvatar(
                icon: Icons.shopping_bag_rounded,
                label: 'Customer',
                tint: AppColors.moringa,
                onTap: onSelectCustomer,
              ),
              const SizedBox(width: 32),
              _RoleAvatar(
                icon: Icons.storefront_rounded,
                label: 'Business',
                tint: AppColors.pepper,
                onTap: onSelectBusiness,
              ),
            ],
          ),
          const Spacer(flex: 3),
          const _SignUpPrompt(),
        ],
      ),
    );
  }
}

// ── Role avatar (profile-picker style) ────────────────────────────────────────
class _RoleAvatar extends StatelessWidget {
  final IconData icon;
  final String label;

  /// Disc colour. Carries a Fufu glyph, so it must be a dark brand colour
  /// (Moringa or Pepper) — never Now Yellow.
  final Color tint;
  final VoidCallback onTap;

  const _RoleAvatar({
    required this.icon,
    required this.label,
    required this.tint,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ScaleTap(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Tinted halo echoes the disc treatment used on the onboarding slides.
          Container(
            padding: const EdgeInsets.all(9),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: tint.withValues(alpha: 0.12),
            ),
            child: Container(
              width: 128,
              height: 128,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: tint,
                boxShadow: [
                  BoxShadow(
                    color: tint.withValues(alpha: 0.30),
                    blurRadius: 24,
                    offset: const Offset(0, 12),
                  ),
                ],
              ),
              child: Icon(icon, size: 54, color: AppColors.fufu),
            ),
          ),
          const SizedBox(height: 14),
          Text(
            label,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}

class _SignUpPrompt extends StatelessWidget {
  const _SignUpPrompt();

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Text(
          "Don't have an account? ",
          style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
        ),
        GestureDetector(
          onTap: () => context.go('/auth/register'),
          child: const Text(
            'Create one',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w800,
              color: AppColors.moringa,
            ),
          ),
        ),
      ],
    );
  }
}

// ── Step 2: Login form ────────────────────────────────────────────────────────
class _LoginFormStep extends StatelessWidget {
  final _LoginRole selectedRole;
  final TabController tabController;
  final TextEditingController emailCtrl;
  final TextEditingController passwordCtrl;
  final TextEditingController phoneCtrl;
  final TextEditingController otpCtrl;
  final bool obscurePassword;
  final VoidCallback onToggleObscure;
  final bool otpSent;
  final bool sendingOtp;
  final VoidCallback onSendOtp;
  final bool isLoading;
  final String? error;
  final VoidCallback onBack;
  final VoidCallback? onSubmit;
  final bool biometricAvailable;
  final bool biometricEnabled;
  final IconData biometricIcon;
  final VoidCallback onBiometricTap;
  final VoidCallback onGoogleTap;
  final bool googleSigningIn;

  const _LoginFormStep({
    super.key,
    required this.selectedRole,
    required this.tabController,
    required this.emailCtrl,
    required this.passwordCtrl,
    required this.phoneCtrl,
    required this.otpCtrl,
    required this.obscurePassword,
    required this.onToggleObscure,
    required this.otpSent,
    required this.sendingOtp,
    required this.onSendOtp,
    required this.isLoading,
    required this.error,
    required this.onBack,
    required this.onSubmit,
    required this.biometricAvailable,
    required this.biometricEnabled,
    required this.biometricIcon,
    required this.onBiometricTap,
    required this.onGoogleTap,
    required this.googleSigningIn,
  });

  @override
  Widget build(BuildContext context) {
    final isBusinessRole = selectedRole == _LoginRole.business;
    final roleLabel = isBusinessRole ? 'BUSINESS' : 'CUSTOMER';
    final roleIconData =
        isBusinessRole ? Icons.storefront_rounded : Icons.shopping_bag_rounded;

    return AuthShell(
      onBack: onBack,
      badge: AuthBadge(icon: roleIconData, label: roleLabel),
      title: 'Sign in',
      subtitle: 'Welcome back — your next rescue is waiting.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Google sign-in - consumer only, mirrors the web app's Login.jsx
          // (business accounts need role-specific onboarding a bare Google
          // credential can't supply).
          if (!isBusinessRole) ...[
            GoogleAuthButton(
              onTap: googleSigningIn ? null : onGoogleTap,
              isLoading: googleSigningIn,
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                Expanded(
                    child: Container(height: 1, color: AppColors.border)),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 12),
                  child: Text('or',
                      style: TextStyle(
                          color: AppColors.textSecondary, fontSize: 12.5)),
                ),
                Expanded(
                    child: Container(height: 1, color: AppColors.border)),
              ],
            ),
            const SizedBox(height: 18),
          ],

          // Email / Phone switch
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
                color: AppColors.surfaceVariant,
                borderRadius: BorderRadius.circular(100)),
            child: TabBar(
              controller: tabController,
              indicator: BoxDecoration(
                  color: AppColors.moringa,
                  borderRadius: BorderRadius.circular(100)),
              indicatorSize: TabBarIndicatorSize.tab,
              dividerColor: Colors.transparent,
              splashFactory: NoSplash.splashFactory,
              labelStyle:
                  const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5),
              unselectedLabelStyle:
                  const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5),
              labelColor: AppColors.fufu,
              unselectedLabelColor: AppColors.textSecondary,
              tabs: const [
                Tab(height: 40, text: 'Email'),
                Tab(height: 40, text: 'Phone OTP'),
              ],
            ),
          ),
          const SizedBox(height: 22),

          // Tab content
          SizedBox(
            height: 200,
            child: TabBarView(
              controller: tabController,
              children: [
                _EmailForm(
                  emailCtrl: emailCtrl,
                  passwordCtrl: passwordCtrl,
                  obscurePassword: obscurePassword,
                  onToggleObscure: onToggleObscure,
                ),
                _OtpForm(
                  phoneCtrl: phoneCtrl,
                  otpCtrl: otpCtrl,
                  otpSent: otpSent,
                  sendingOtp: sendingOtp,
                  onSendOtp: onSendOtp,
                ),
              ],
            ),
          ),

          // Forgot password (email tab only)
          if (tabController.index == 0)
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: () => context.push('/auth/forgot-password'),
                child: const Text('Forgot password?',
                    style: TextStyle(
                        color: AppColors.primary,
                        fontSize: 13,
                        fontWeight: FontWeight.w700)),
              ),
            ),

          if (error != null) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                  color: AppColors.errorSurface,
                  borderRadius: BorderRadius.circular(14)),
              child: Row(children: [
                const Icon(Icons.error_outline,
                    color: AppColors.error, size: 18),
                const SizedBox(width: 8),
                Expanded(
                    child: Text(error!,
                        style: const TextStyle(
                            color: AppColors.error, fontSize: 13))),
              ]),
            ),
          ],

          const SizedBox(height: 18),
          if (tabController.index == 0 &&
              biometricAvailable &&
              biometricEnabled)
            Row(
              children: [
                Expanded(
                  child: AuthPrimaryButton(
                    label: isLoading ? 'Signing in…' : 'Sign In',
                    isLoading: isLoading,
                    onTap: onSubmit,
                    icon: Icons.arrow_forward_rounded,
                  ),
                ),
                const SizedBox(width: 12),
                InkWell(
                  onTap: isLoading ? null : onBiometricTap,
                  borderRadius: BorderRadius.circular(27),
                  child: Container(
                    height: 54,
                    width: 54,
                    decoration: BoxDecoration(
                      border: Border.all(color: AppColors.moringa, width: 1.5),
                      borderRadius: BorderRadius.circular(27),
                      color: AppColors.surface,
                    ),
                    child: Center(
                      child: Icon(
                        biometricIcon,
                        size: 24,
                        color: AppColors.moringa,
                      ),
                    ),
                  ),
                ),
              ],
            )
          else
            AuthPrimaryButton(
              label: isLoading ? 'Signing in…' : 'Sign In',
              isLoading: isLoading,
              onTap: onSubmit,
              icon: Icons.arrow_forward_rounded,
            ),
          const SizedBox(height: 22),
          const _SignUpPrompt(),
        ],
      ),
    );
  }
}

// ── Email form sub-widget ─────────────────────────────────────────────────────
class _EmailForm extends StatelessWidget {
  final TextEditingController emailCtrl;
  final TextEditingController passwordCtrl;
  final bool obscurePassword;
  final VoidCallback onToggleObscure;

  const _EmailForm({
    required this.emailCtrl,
    required this.passwordCtrl,
    required this.obscurePassword,
    required this.onToggleObscure,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        CnTextField(
            label: 'Email',
            controller: emailCtrl,
            hint: 'you@example.com',
            keyboardType: TextInputType.emailAddress),
        const SizedBox(height: 14),
        CnTextField(
          label: 'Password',
          controller: passwordCtrl,
          hint: 'Your password',
          obscureText: obscurePassword,
          suffix: IconButton(
            icon: Icon(
                obscurePassword
                    ? Icons.visibility_off_outlined
                    : Icons.visibility_outlined,
                size: 20,
                color: AppColors.textSecondary),
            onPressed: onToggleObscure,
          ),
        ),
      ],
    );
  }
}

// ── OTP form sub-widget ───────────────────────────────────────────────────────
class _OtpForm extends StatelessWidget {
  final TextEditingController phoneCtrl;
  final TextEditingController otpCtrl;
  final bool otpSent;
  final bool sendingOtp;
  final VoidCallback onSendOtp;

  const _OtpForm({
    required this.phoneCtrl,
    required this.otpCtrl,
    required this.otpSent,
    required this.sendingOtp,
    required this.onSendOtp,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        CnTextField(
            label: 'Phone Number',
            controller: phoneCtrl,
            hint: '+250 7XX XXX XXX',
            keyboardType: TextInputType.phone),
        const SizedBox(height: 14),
        if (otpSent)
          CnTextField(
              label: 'OTP Code',
              controller: otpCtrl,
              hint: '• • • • • •',
              keyboardType: TextInputType.number)
        else
          SizedBox(
            width: double.infinity,
            child: CnSecondaryButton(
              label: sendingOtp ? 'Sending…' : 'Send OTP',
              isLoading: sendingOtp,
              onTap: onSendOtp,
            ),
          ),
      ],
    );
  }
}
