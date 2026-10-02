import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/services/biometric_service.dart';
import '../../core/services/local_storage_service.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/animations/scale_tap.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});
  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  bool _pushNotifications = true;
  bool _emailNotifications = true;
  bool _orderUpdates = true;
  bool _promoAlerts = false;
  bool _biometricEnabled = false;
  bool _biometricAvailable = false;
  String _biometricLabel = 'Biometrics';

  @override
  void initState() {
    super.initState();
    _loadPreferences();
  }

  Future<void> _loadPreferences() async {
    final pushPref =
        await LocalStorageService.loadNotifPref('push', defaultValue: true);
    final emailPref =
        await LocalStorageService.loadNotifPref('email', defaultValue: true);
    final orderPref =
        await LocalStorageService.loadNotifPref('orders', defaultValue: true);
    final promoPref =
        await LocalStorageService.loadNotifPref('promo', defaultValue: false);
    final bioAvailable = await BiometricService.isAvailable;
    final bioEnabled = bioAvailable ? await BiometricService.isEnabled : false;
    final bioLabel =
        bioAvailable ? await BiometricService.biometricLabel : 'Biometrics';

    if (mounted) {
      setState(() {
        _pushNotifications = pushPref;
        _emailNotifications = emailPref;
        _orderUpdates = orderPref;
        _promoAlerts = promoPref;
        _biometricAvailable = bioAvailable;
        _biometricEnabled = bioEnabled;
        _biometricLabel = bioLabel;
      });
    }
  }

  Future<void> _toggleNotifPref(
      String key, bool value, void Function(bool) setter) async {
    setter(value);
    HapticFeedback.selectionClick();
    await LocalStorageService.saveNotifPref(key, value);
  }

  Future<void> _toggleBiometric(bool value) async {
    if (value) {
      // Verify identity before enabling
      final authed = await BiometricService.authenticate(
          reason: 'Verify your identity to enable quick sign-in');
      if (!authed) return;
    }
    await BiometricService.setEnabled(value);
    setState(() => _biometricEnabled = value);
    HapticFeedback.selectionClick();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(value
              ? '$_biometricLabel enabled for quick sign-in'
              : '$_biometricLabel disabled'),
          behavior: SnackBarBehavior.floating,
          backgroundColor: AppColors.primary,
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Settings',
            style: TextStyle(
                fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
      ),
      body: ListView(
        children: [
          // ── Notifications Section ──
          const _SectionHeader('Notifications'),
          _SwitchTile(
            icon: Icons.notifications_active_outlined,
            label: 'Push Notifications',
            subtitle: 'Order updates, deals, and reminders',
            value: _pushNotifications,
            onChanged: (v) => _toggleNotifPref(
                'push', v, (val) => setState(() => _pushNotifications = val)),
          ),
          _SwitchTile(
            icon: Icons.email_outlined,
            label: 'Email Notifications',
            subtitle: 'Receipts, newsletters and offers',
            value: _emailNotifications,
            onChanged: (v) => _toggleNotifPref(
                'email', v, (val) => setState(() => _emailNotifications = val)),
          ),
          _SwitchTile(
            icon: Icons.receipt_long_outlined,
            label: 'Order Status Updates',
            subtitle: 'Be notified when your order changes',
            value: _orderUpdates,
            onChanged: (v) => _toggleNotifPref(
                'orders', v, (val) => setState(() => _orderUpdates = val)),
          ),
          _SwitchTile(
            icon: Icons.local_offer_outlined,
            label: 'Promotional Alerts',
            subtitle: 'Flash deals and exclusive discounts',
            value: _promoAlerts,
            onChanged: (v) => _toggleNotifPref(
                'promo', v, (val) => setState(() => _promoAlerts = val)),
          ),

          const SizedBox(height: 8),
          // ── Security Section ──
          const _SectionHeader('Security'),
          if (_biometricAvailable)
            _SwitchTile(
              icon: Icons.fingerprint_rounded,
              label: 'Quick Sign-In ($_biometricLabel)',
              subtitle: 'Use $_biometricLabel to sign in faster',
              value: _biometricEnabled,
              onChanged: _toggleBiometric,
            ),
          _NavTile(
              icon: Icons.lock_outline_rounded,
              label: 'Change Password',
              onTap: () => context.push('/profile/edit')),
          _NavTile(
              icon: Icons.devices_rounded,
              label: 'Active Sessions',
              onTap: () => _showActiveSessions(context)),

          const SizedBox(height: 8),
          // ── Account Section ──
          const _SectionHeader('Account'),
          _NavTile(
              icon: Icons.person_outline_rounded,
              label: 'Edit Profile',
              onTap: () => context.push('/profile/edit')),
          _NavTile(
              icon: Icons.location_on_outlined,
              label: 'Saved Addresses',
              onTap: () => context.push('/profile/addresses')),

          const SizedBox(height: 8),
          // ── Business section (conditional) ──
          Consumer(builder: (_, ref, __) {
            final user = ref.watch(currentUserProvider);
            if (user?.isBusinessOwner != true) return const SizedBox.shrink();
            return Column(children: [
              const _SectionHeader('Business'),
              _NavTile(
                  icon: Icons.storefront_outlined,
                  label: 'My Businesses',
                  onTap: () => context.go('/business/dashboard')),
              _NavTile(
                  icon: Icons.payments_outlined,
                  label: 'Payouts & Earnings',
                  onTap: () => context.push('/business/payouts')),
            ]);
          }),

          const SizedBox(height: 8),
          // ── App section ──
          const _SectionHeader('App'),
          _NavTile(
              icon: Icons.info_outline_rounded,
              label: 'About ChopNow',
              onTap: () => _showAbout(context)),
          _NavTile(
              icon: Icons.privacy_tip_outlined,
              label: 'Privacy Policy',
              onTap: () => _openUrl('https://chopnow.app/privacy')),
          _NavTile(
              icon: Icons.assignment_outlined,
              label: 'Terms of Service',
              onTap: () => _openUrl('https://chopnow.app/terms')),
          _NavTile(
              icon: Icons.bug_report_outlined,
              label: 'Report a Problem',
              onTap: () => _openUrl('mailto:chopnow.app@gmail.com')),

          const SizedBox(height: 8),
          // ── Danger zone ──
          const _SectionHeader('Danger Zone'),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(children: [
              ScaleTap(
                onTap: () => _confirmSignOut(context, ref),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  decoration: BoxDecoration(
                    color: AppColors.errorSurface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                        color: AppColors.error.withValues(alpha: 0.3)),
                  ),
                  child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.logout_rounded,
                            color: AppColors.error, size: 20),
                        SizedBox(width: 8),
                        Text('Sign Out',
                            style: TextStyle(
                                color: AppColors.error,
                                fontWeight: FontWeight.w700)),
                      ]),
                ),
              ),
              const SizedBox(height: 10),
              ScaleTap(
                onTap: () => _confirmDeleteAccount(context, ref),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.border)),
                  child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.delete_forever_rounded,
                            color: AppColors.textSecondary, size: 20),
                        SizedBox(width: 8),
                        Text('Delete Account',
                            style: TextStyle(
                                color: AppColors.textSecondary,
                                fontWeight: FontWeight.w600)),
                      ]),
                ),
              ),
            ]),
          ),

          const SizedBox(height: 8),
          const Center(
              child: Text(
                  'ChopNow v1.0.0${kDebugMode ? ' (debug)' : ''}\nBuilt with ❤️ in Africa',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                      fontSize: 11,
                      color: AppColors.textTertiary,
                      height: 1.6))),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  void _showAbout(BuildContext context) {
    showDialog(
        context: context,
        useRootNavigator: false,
        builder: (_) => AlertDialog(
              title: const Text('About ChopNow',
                  style: TextStyle(fontWeight: FontWeight.w700)),
              content: const Text(
                  'ChopNow helps you rescue surplus food from local restaurants and cafés at up to 70% off, reducing food waste and saving the planet — one meal at a time.',
                  style: TextStyle(height: 1.5)),
              actions: [
                TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Close'))
              ],
            ));
  }

  Future<void> _openUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  void _showActiveSessions(BuildContext context) {
    showDialog(
      context: context,
      useRootNavigator: false,
      builder: (_) => AlertDialog(
        title: const Text('Active Sessions',
            style: TextStyle(fontWeight: FontWeight.w700)),
        content: const Text(
          'You are currently signed in on this device. To sign out of all devices, tap "Sign Out All" below.',
          style: TextStyle(height: 1.5),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Close')),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              ref.read(authProvider.notifier).logout();
            },
            child: const Text('Sign Out All',
                style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmSignOut(BuildContext context, WidgetRef ref) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Sign Out?',
            style: TextStyle(fontWeight: FontWeight.w700)),
        content: const Text(
            'You will need to sign in again to access your account.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Sign Out',
                style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );
    if (confirm == true && context.mounted) {
      ref.read(authProvider.notifier).logout();
    }
  }

  Future<void> _confirmDeleteAccount(
      BuildContext context, WidgetRef ref) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Account?',
            style: TextStyle(fontWeight: FontWeight.w700)),
        content: const Text(
          'This action is irreversible. All your data, orders, and impact history will be permanently deleted. Are you sure?',
          style: TextStyle(height: 1.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete Forever',
                style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );
    if (confirm == true && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text(
                'Please contact chopnow.app@gmail.com to complete account deletion.')),
      );
    }
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader(this.title);
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 6),
        child: Text(title.toUpperCase(),
            style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: AppColors.textSecondary,
                letterSpacing: 0.8)),
      );
}

class _SwitchTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String? subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;
  const _SwitchTile(
      {required this.icon,
      required this.label,
      this.subtitle,
      required this.value,
      required this.onChanged});

  @override
  Widget build(BuildContext context) => Container(
        color: AppColors.surface,
        child: SwitchListTile(
          secondary: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                  color: AppColors.primarySurface,
                  borderRadius: BorderRadius.circular(10)),
              child: Icon(icon, color: AppColors.primary, size: 19)),
          title: Text(label,
              style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary)),
          subtitle: subtitle != null
              ? Text(subtitle!,
                  style: const TextStyle(
                      fontSize: 12, color: AppColors.textSecondary))
              : null,
          value: value,
          onChanged: onChanged,
          activeThumbColor: AppColors.primary,
          activeTrackColor: AppColors.primaryLight.withValues(alpha: 0.4),
        ),
      );
}

class _NavTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _NavTile(
      {required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) => Container(
        color: AppColors.surface,
        child: ListTile(
          leading: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                  color: AppColors.primarySurface,
                  borderRadius: BorderRadius.circular(10)),
              child: Icon(icon, color: AppColors.primary, size: 19)),
          title: Text(label,
              style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary)),
          trailing: const Icon(Icons.chevron_right_rounded,
              color: AppColors.textSecondary, size: 20),
          onTap: onTap,
        ),
      );
}
