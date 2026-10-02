import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/widgets/buttons/cn_buttons.dart';
import '../../shared/widgets/inputs/cn_text_field.dart';

/// Forgot Password — 3 step flow:
///   Step 1: Enter email → sends OTP
///   Step 2: Enter 6-digit OTP
///   Step 3: Enter new password + confirm
class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() =>
      _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  int _step = 0; // 0=email, 1=otp, 2=new password
  bool _loading = false;
  String? _error;
  String? _email;

  final _emailCtrl = TextEditingController();
  final _otpCtrl = TextEditingController();
  final _newPassCtrl = TextEditingController();
  final _confirmPassCtrl = TextEditingController();
  int _resendCooldown = 0;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _otpCtrl.dispose();
    _newPassCtrl.dispose();
    _confirmPassCtrl.dispose();
    super.dispose();
  }

  Future<void> _sendOtp() async {
    final email = _emailCtrl.text.trim();
    if (email.isEmpty || !email.contains('@')) {
      setState(() => _error = 'Please enter a valid email address');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await ApiClient.instance
          .post(AppEndpoints.forgotPassword, data: {'email': email});
      setState(() {
        _email = email;
        _step = 1;
        _resendCooldown = 60;
      });
      _startCooldown();
    } catch (e) {
      setState(() => _error = _parseError(e));
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _verifyOtp() async {
    final otp = _otpCtrl.text.trim();
    if (otp.length != 6) {
      setState(() => _error = 'Please enter the 6-digit code');
      return;
    }
    // OTP is validated in step 3 when setting password
    setState(() {
      _step = 2;
      _error = null;
    });
  }

  Future<void> _resetPassword() async {
    final newPass = _newPassCtrl.text;
    final confirmPass = _confirmPassCtrl.text;
    if (newPass.length < 8) {
      setState(() => _error = 'Password must be at least 8 characters');
      return;
    }
    if (newPass != confirmPass) {
      setState(() => _error = 'Passwords do not match');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await ApiClient.instance.post(AppEndpoints.resetPassword, data: {
        'email': _email,
        'otp': _otpCtrl.text.trim(),
        'newPassword': newPass,
      });
      if (mounted) {
        HapticFeedback.heavyImpact();
        _showSuccessAndNavigate();
      }
    } catch (e) {
      setState(() => _error = _parseError(e));
    } finally {
      setState(() => _loading = false);
    }
  }

  void _showSuccessAndNavigate() {
    showDialog(
      context: context,
      useRootNavigator: false,
      barrierDismissible: false,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: const BoxDecoration(
                  gradient: AppColors.primaryGradient, shape: BoxShape.circle),
              child: const Center(
                  child:
                      Icon(Icons.check_rounded, color: Colors.white, size: 36)),
            ),
            const SizedBox(height: 16),
            const Text('Password Reset!',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
            const SizedBox(height: 8),
            const Text('Your password has been updated successfully.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.textSecondary, fontSize: 14)),
            const SizedBox(height: 20),
            CnPrimaryButton(
                label: 'Back to Login', onTap: () => context.go('/auth/login')),
          ],
        ),
      ),
    );
  }

  void _startCooldown() {
    Future.doWhile(() async {
      await Future.delayed(const Duration(seconds: 1));
      if (!mounted) return false;
      setState(() => _resendCooldown--);
      return _resendCooldown > 0;
    });
  }

  String _parseError(dynamic e) {
    final msg = e.toString();
    if (msg.contains('404') || msg.contains('not found')) {
      return 'No account found with this email.';
    }
    if (msg.contains('expired')) return 'Code has expired. Request a new one.';
    if (msg.contains('invalid')) return 'Invalid code. Please try again.';
    return msg.replaceAll('Exception: ', '');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Reset Password',
            style: TextStyle(
                fontWeight: FontWeight.w900,
                color: AppColors.textPrimary,
                fontSize: 18)),
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Step indicator
              _StepIndicator(current: _step),
              const SizedBox(height: 32),

              // Content for each step
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 300),
                child: KeyedSubtree(
                  key: ValueKey(_step),
                  child: _step == 0
                      ? _EmailStep(ctrl: _emailCtrl)
                      : _step == 1
                          ? _OtpStep(
                              ctrl: _otpCtrl,
                              email: _email ?? '',
                              resendCooldown: _resendCooldown,
                              onResend: () async {
                                if (_resendCooldown > 0) return;
                                setState(() {
                                  _loading = true;
                                  _error = null;
                                });
                                try {
                                  await ApiClient.instance.post(
                                      AppEndpoints.forgotPassword,
                                      data: {'email': _email});
                                  setState(() {
                                    _resendCooldown = 60;
                                  });
                                  _startCooldown();
                                } catch (e) {
                                  setState(() => _error = _parseError(e));
                                } finally {
                                  setState(() => _loading = false);
                                }
                              },
                            )
                          : _NewPasswordStep(
                              newCtrl: _newPassCtrl,
                              confirmCtrl: _confirmPassCtrl,
                            ),
                ),
              ),

              if (_error != null) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.errorSurface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                        color: AppColors.error.withValues(alpha: 0.4)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline_rounded,
                          color: AppColors.error, size: 18),
                      const SizedBox(width: 10),
                      Expanded(
                          child: Text(_error!,
                              style: const TextStyle(
                                  color: AppColors.error, fontSize: 13))),
                    ],
                  ),
                ),
              ],

              const SizedBox(height: 24),

              CnPrimaryButton(
                label: _loading
                    ? 'Please wait...'
                    : _step == 0
                        ? 'Send Reset Code'
                        : _step == 1
                            ? 'Verify Code'
                            : 'Reset Password',
                isLoading: _loading,
                onTap: _loading
                    ? null
                    : _step == 0
                        ? _sendOtp
                        : _step == 1
                            ? _verifyOtp
                            : _resetPassword,
              ),

              if (_step > 0) ...[
                const SizedBox(height: 12),
                Center(
                  child: TextButton(
                    onPressed: () => setState(() {
                      _step--;
                      _error = null;
                    }),
                    child: const Text('← Go Back',
                        style: TextStyle(color: AppColors.textSecondary)),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _StepIndicator extends StatelessWidget {
  final int current;
  const _StepIndicator({required this.current});

  static const _labels = ['Email', 'Verify OTP', 'New Password'];

  @override
  Widget build(BuildContext context) {
    return Row(
      children: List.generate(3, (i) {
        final done = i < current;
        final active = i == current;
        return Expanded(
          child: Row(
            children: [
              Expanded(
                child: Column(
                  children: [
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 300),
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        gradient:
                            (done || active) ? AppColors.primaryGradient : null,
                        color:
                            (done || active) ? null : AppColors.surfaceVariant,
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: done
                            ? const Icon(Icons.check_rounded,
                                color: Colors.white, size: 16)
                            : Text('${i + 1}',
                                style: TextStyle(
                                    fontWeight: FontWeight.w800,
                                    color: active
                                        ? Colors.white
                                        : AppColors.textSecondary,
                                    fontSize: 13)),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(_labels[i],
                        style: TextStyle(
                            fontSize: 10,
                            fontWeight:
                                active ? FontWeight.w700 : FontWeight.w400,
                            color: active
                                ? AppColors.primary
                                : AppColors.textSecondary)),
                  ],
                ),
              ),
              if (i < 2)
                Container(
                  width: 32,
                  height: 2,
                  color: i < current ? AppColors.primary : AppColors.border,
                ),
            ],
          ),
        );
      }),
    );
  }
}

class _EmailStep extends StatelessWidget {
  final TextEditingController ctrl;
  const _EmailStep({required this.ctrl});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Forgot your password?',
            style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w900,
                color: AppColors.textPrimary)),
        const SizedBox(height: 8),
        const Text(
            'Enter your email address and we\'ll send you a 6-digit reset code.',
            style: TextStyle(
                fontSize: 14, color: AppColors.textSecondary, height: 1.5)),
        const SizedBox(height: 24),
        CnTextField(
          controller: ctrl,
          label: 'Email Address',
          hint: 'your@email.com',
          keyboardType: TextInputType.emailAddress,
          prefixIcon: Icons.email_outlined,
          autofillHints: const [AutofillHints.email],
        ),
      ],
    );
  }
}

class _OtpStep extends StatelessWidget {
  final TextEditingController ctrl;
  final String email;
  final int resendCooldown;
  final VoidCallback onResend;
  const _OtpStep(
      {required this.ctrl,
      required this.email,
      required this.resendCooldown,
      required this.onResend});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Enter the code',
            style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w900,
                color: AppColors.textPrimary)),
        const SizedBox(height: 8),
        Text('We sent a 6-digit code to $email',
            style: const TextStyle(
                fontSize: 14, color: AppColors.textSecondary, height: 1.5)),
        const SizedBox(height: 24),
        CnTextField(
          controller: ctrl,
          label: 'Verification Code',
          hint: '000000',
          keyboardType: TextInputType.number,
          prefixIcon: Icons.lock_outline_rounded,
          maxLength: 6,
        ),
        const SizedBox(height: 12),
        TextButton.icon(
          onPressed: resendCooldown > 0 ? null : onResend,
          icon: const Icon(Icons.refresh_rounded, size: 16),
          label: Text(resendCooldown > 0
              ? 'Resend in ${resendCooldown}s'
              : 'Resend Code'),
          style: TextButton.styleFrom(foregroundColor: AppColors.primary),
        ),
      ],
    );
  }
}

class _NewPasswordStep extends StatelessWidget {
  final TextEditingController newCtrl;
  final TextEditingController confirmCtrl;
  const _NewPasswordStep({
    required this.newCtrl,
    required this.confirmCtrl,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Set new password',
            style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w900,
                color: AppColors.textPrimary)),
        const SizedBox(height: 8),
        const Text('Choose a strong password with at least 8 characters.',
            style: TextStyle(
                fontSize: 14, color: AppColors.textSecondary, height: 1.5)),
        const SizedBox(height: 24),
        CnTextField(
          controller: newCtrl,
          label: 'New Password',
          hint: 'Min. 8 characters',
          obscureText: true,
          showPasswordToggle: true,
          prefixIcon: Icons.lock_outline_rounded,
        ),
        const SizedBox(height: 14),
        CnTextField(
          controller: confirmCtrl,
          label: 'Confirm Password',
          hint: 'Repeat your password',
          obscureText: true,
          showPasswordToggle: true,
          prefixIcon: Icons.lock_outline_rounded,
        ),
      ],
    );
  }
}
