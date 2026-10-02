import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/services/google_auth_service.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/widgets/buttons/google_auth_button.dart';
import '../../shared/widgets/inputs/cn_text_field.dart';
import '../../shared/widgets/layout/auth_shell.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Form fields
  final _firstNameCtrl = TextEditingController();
  final _lastNameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  String _selectedRole = 'consumer';
  bool _obscurePassword = true;
  bool _agreedToTerms = false;
  bool _googleSigningIn = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _tabController.dispose();
    _firstNameCtrl.dispose();
    _lastNameCtrl.dispose();
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final isLoading = authState is AuthLoading;
    final error = authState is AuthError ? authState.message : null;

    ref.listen(authProvider, (_, next) {
      if (next is AuthAuthenticated) {
        HapticFeedback.heavyImpact();
        final role = next.activeRole;
        if (role == 'business_owner') {
          context.go('/business/dashboard');
        } else {
          context.go('/home');
        }
      }
    });

    return AuthShell(
      onBack: () =>
          context.canPop() ? context.pop() : context.go('/auth/login'),
      title: 'Create account',
      subtitle: 'Join ChopNow and start rescuing food today.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'I want to',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 14),

          Row(
            children: [
              Expanded(
                  child: _RolePill(
                icon: Icons.shopping_bag_rounded,
                label: 'Consumer',
                subtitle: 'Buy food',
                selected: _selectedRole == 'consumer',
                onTap: () => setState(() => _selectedRole = 'consumer'),
              )),
              const SizedBox(width: 12),
              Expanded(
                  child: _RolePill(
                icon: Icons.storefront_rounded,
                label: 'Business',
                subtitle: 'Sell food',
                selected: _selectedRole == 'business_owner',
                onTap: () => setState(() => _selectedRole = 'business_owner'),
              )),
            ],
          ),
          const SizedBox(height: 24),

          // Google sign-up - consumer only; a business account needs
          // role-specific onboarding fields a bare Google credential can't
          // supply, matching the web app's SignUp.jsx.
          if (_selectedRole == 'consumer') ...[
            GoogleAuthButton(
              label: 'Sign up with Google',
              onTap: _googleSigningIn ? null : _signUpWithGoogle,
              isLoading: _googleSigningIn,
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

          // Form
          Form(
            key: _formKey,
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                        child: CnTextField(
                      label: 'First Name',
                      controller: _firstNameCtrl,
                      hint: 'Jane',
                      validator: (v) =>
                          v == null || v.trim().length < 2 ? 'Required' : null,
                    )),
                    const SizedBox(width: 12),
                    Expanded(
                        child: CnTextField(
                      label: 'Last Name',
                      controller: _lastNameCtrl,
                      hint: 'Doe',
                      validator: (v) =>
                          v == null || v.trim().length < 2 ? 'Required' : null,
                    )),
                  ],
                ),
                const SizedBox(height: 14),
                CnTextField(
                  label: 'Email Address',
                  controller: _emailCtrl,
                  hint: 'jane@example.com',
                  keyboardType: TextInputType.emailAddress,
                  validator: (v) {
                    if (v == null || v.isEmpty) return 'Required';
                    if (!v.contains('@')) return 'Invalid email';
                    return null;
                  },
                ),
                const SizedBox(height: 14),
                CnTextField(
                  label: 'Phone (optional)',
                  controller: _phoneCtrl,
                  hint: '+250 7XX XXX XXX',
                  keyboardType: TextInputType.phone,
                ),
                const SizedBox(height: 14),
                CnTextField(
                  label: 'Password',
                  controller: _passwordCtrl,
                  hint: 'Min 8 characters',
                  obscureText: _obscurePassword,
                  suffix: IconButton(
                    icon: Icon(
                        _obscurePassword
                            ? Icons.visibility_off_outlined
                            : Icons.visibility_outlined,
                        size: 20,
                        color: AppColors.textSecondary),
                    onPressed: () =>
                        setState(() => _obscurePassword = !_obscurePassword),
                  ),
                  validator: (v) {
                    if (v == null || v.length < 8) {
                      return 'Min 8 characters';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),

                // Terms checkbox
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(
                      width: 24,
                      height: 24,
                      child: Checkbox(
                        value: _agreedToTerms,
                        onChanged: (v) =>
                            setState(() => _agreedToTerms = v ?? false),
                        activeColor: AppColors.primary,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(4)),
                      ),
                    ),
                    const SizedBox(width: 10),
                    const Expanded(
                      child: Text(
                        'I agree to the Terms of Service and Privacy Policy',
                        style: TextStyle(
                            fontSize: 13,
                            color: AppColors.textSecondary,
                            height: 1.4),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          if (error != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                  color: AppColors.errorSurface,
                  borderRadius: BorderRadius.circular(10)),
              child: Row(
                children: [
                  const Icon(Icons.error_outline,
                      color: AppColors.error, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                      child: Text(error,
                          style: const TextStyle(
                              color: AppColors.error, fontSize: 13))),
                ],
              ),
            ),
          ],

          const SizedBox(height: 20),
          AuthPrimaryButton(
            label: _selectedRole == 'business_owner'
                ? 'Create Business Account'
                : 'Create Account',
            isLoading: isLoading,
            onTap: (!_agreedToTerms || isLoading) ? null : _submit,
          ),
          const SizedBox(height: 16),

          // Already have an account
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('Already have an account? ',
                  style:
                      TextStyle(fontSize: 14, color: AppColors.textSecondary)),
              GestureDetector(
                onTap: () => context.go('/auth/login'),
                child: const Text('Sign In',
                    style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primary)),
              ),
            ],
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }

  Future<void> _signUpWithGoogle() async {
    HapticFeedback.mediumImpact();
    setState(() => _googleSigningIn = true);
    try {
      final idToken = await GoogleAuthService.signIn();
      if (idToken == null) return; // cancelled
      await ref
          .read(authProvider.notifier)
          .loginWithGoogle(idToken, preferredRole: 'consumer');
    } finally {
      if (mounted) setState(() => _googleSigningIn = false);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    HapticFeedback.mediumImpact();
    if (_selectedRole == 'business_owner') {
      await ref.read(authProvider.notifier).registerAsBusinessOwner(
            firstName: _firstNameCtrl.text.trim(),
            lastName: _lastNameCtrl.text.trim(),
            email: _emailCtrl.text.trim(),
            password: _passwordCtrl.text,
            phone:
                _phoneCtrl.text.trim().isEmpty ? null : _phoneCtrl.text.trim(),
          );
    } else {
      await ref.read(authProvider.notifier).register(
            firstName: _firstNameCtrl.text.trim(),
            lastName: _lastNameCtrl.text.trim(),
            email: _emailCtrl.text.trim(),
            password: _passwordCtrl.text,
            phone:
                _phoneCtrl.text.trim().isEmpty ? null : _phoneCtrl.text.trim(),
          );
    }
  }
}

class _RolePill extends StatelessWidget {
  final IconData icon;
  final String label;
  final String subtitle;
  final bool selected;
  final VoidCallback onTap;
  const _RolePill(
      {required this.icon,
      required this.label,
      required this.subtitle,
      required this.selected,
      required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: selected ? AppColors.primarySurface : AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
              color: selected ? AppColors.primary : AppColors.border,
              width: 1.5),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  icon,
                  size: 16,
                  color: selected ? AppColors.primary : AppColors.textSecondary,
                ),
                const SizedBox(width: 6),
                Text(
                  label,
                  style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color:
                          selected ? AppColors.primary : AppColors.textPrimary),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(subtitle,
                style: const TextStyle(
                    fontSize: 11, color: AppColors.textSecondary)),
          ],
        ),
      ),
    );
  }
}
