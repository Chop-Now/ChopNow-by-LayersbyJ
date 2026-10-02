import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/models/user_model.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/animations/scale_tap.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  static const _sheetRadius = 28.0;

  final _headerKey = GlobalKey();
  final _scrollController = ScrollController();
  // Drives only the header layer's rebuild (via ValueListenableBuilder) so
  // scrolling doesn't rebuild the whole list every frame.
  final _scrollOffset = ValueNotifier<double>(0);
  // Reasonable initial guess so there's no flash of 0 height before the
  // first frame is measured.
  double _headerHeight = 260;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    _scrollOffset.dispose();
    super.dispose();
  }

  void _onScroll() {
    // Negative offset = top overscroll bounce; treat as 0 so the header
    // doesn't grow past its natural height.
    _scrollOffset.value = _scrollController.offset.clamp(0.0, double.infinity);
  }

  void _measureHeader() {
    final renderObject = _headerKey.currentContext?.findRenderObject();
    if (renderObject is! RenderBox) return;
    if (renderObject.size.height != _headerHeight) {
      setState(() => _headerHeight = renderObject.size.height);
    }
  }

  @override
  Widget build(BuildContext context) {
    WidgetsBinding.instance.addPostFrameCallback((_) => _measureHeader());

    final auth = ref.watch(authProvider);
    final user = auth is AuthAuthenticated ? auth.user : null;
    final name = '${user?.firstName ?? ''} ${user?.lastName ?? ''}'.trim();
    final avatarUrl = user?.avatar;
    final role = auth is AuthAuthenticated ? auth.user.activeRole : 'consumer';

    return Scaffold(
      // White, not green — so bottom overscroll bounce reveals white, not
      // green. The green comes from the backdrop layer below instead.
      backgroundColor: AppColors.surface,
      body: Stack(
        children: [
          // ── 1. Green backdrop (bottom layer, fixed) ──
          // Extends one corner-radius past the header so the sheet's rounded
          // top corners always have green behind their notches, at any
          // scroll position.
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: _headerHeight + _sheetRadius,
            child: const ColoredBox(color: AppColors.primary),
          ),

          // ── 2. Scrolling sheet — slides up over the green backdrop ──
          CustomScrollView(
            controller: _scrollController,
            physics: const BouncingScrollPhysics(
                parent: AlwaysScrollableScrollPhysics()),
            slivers: [
              SliverToBoxAdapter(child: SizedBox(height: _headerHeight)),
              SliverToBoxAdapter(
                child: Container(
                  constraints: BoxConstraints(
                      minHeight:
                          MediaQuery.of(context).size.height - _headerHeight),
                  decoration: const BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.vertical(
                        top: Radius.circular(_sheetRadius)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Padding(
                        padding: EdgeInsets.fromLTRB(20, 28, 20, 8),
                        child: Text(
                          'Profile',
                          style: TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.w800,
                              color: AppColors.textPrimary),
                        ),
                      ),
                      _Row(
                          icon: Icons.receipt_long_outlined,
                          label: 'Order History',
                          onTap: () => context.go('/orders')),
                      _Row(
                          icon: Icons.person_outline_rounded,
                          label: 'Account',
                          onTap: () => context.push('/profile/edit')),
                      _Row(
                          icon: Icons.location_on_outlined,
                          label: 'My Addresses',
                          onTap: () => context.push('/profile/addresses')),
                      _Row(
                          icon: Icons.favorite_border_rounded,
                          label: 'Favorites',
                          onTap: () => context.push('/profile/favorites')),
                      const _RowDivider(),
                      _Row(
                          icon: Icons.eco_outlined,
                          label: 'My Impact',
                          onTap: () => context.push('/impact')),
                      if (user != null && user.roles.length > 1)
                        _Row(
                          icon: Icons.swap_horiz_rounded,
                          label: 'Switch Role',
                          onTap: () =>
                              _showRoleSwitcher(context, ref, user, role),
                        ),
                      if (user != null && !user.isRider)
                        _Row(
                          icon: Icons.directions_bike_outlined,
                          label: 'Earn with ChopNow',
                          onTap: () => context.push('/become-rider'),
                        ),
                      _Row(
                          icon: Icons.settings_outlined,
                          label: 'Settings',
                          onTap: () => context.push('/profile/settings')),
                      _Row(
                          icon: Icons.help_outline_rounded,
                          label: 'Help & FAQ',
                          onTap: () => _showHelpFAQ(context)),
                      _Row(
                          icon: Icons.info_outline_rounded,
                          label: 'About ChopNow',
                          onTap: () => _showAboutDialog(context)),
                      _Row(
                          icon: Icons.privacy_tip_outlined,
                          label: 'Privacy Policy',
                          onTap: () => _showPrivacyPolicy(context)),
                      const SizedBox(height: 8),
                      _Row(
                        icon: Icons.logout_rounded,
                        label: 'Log out',
                        showChevron: false,
                        onTap: () async {
                          HapticFeedback.mediumImpact();
                          final confirm = await _showLogoutConfirm(context);
                          if (confirm == true && context.mounted) {
                            ref.read(authProvider.notifier).logout();
                          }
                        },
                      ),
                      const SizedBox(height: 24),
                      const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 20),
                        child: Align(
                          alignment: Alignment.centerRight,
                          child: Text(
                            'Version 1.0.0 (1)',
                            style: TextStyle(
                                fontSize: 13, color: AppColors.textTertiary),
                          ),
                        ),
                      ),
                      const SizedBox(height: 32),
                    ],
                  ),
                ),
              ),
            ],
          ),

          // ── 3. Header content (top layer) ──
          // Deliberately has NO background color: ColoredBox is opaque to hit
          // testing, so a colored wrapper here would swallow scroll drags and
          // taps meant for the list. The green is painted by layer 1 instead;
          // this layer contributes only its own tappable widgets.
          // Clipped to exactly the part the rising sheet hasn't covered yet,
          // which both produces the slide-over reveal and stops the hidden
          // part from absorbing touches (ClipRect clips hit tests too).
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: ValueListenableBuilder<double>(
              valueListenable: _scrollOffset,
              builder: (context, offset, child) {
                final visible = _headerHeight <= 0
                    ? 1.0
                    : ((_headerHeight - offset) / _headerHeight)
                        .clamp(0.0, 1.0);
                return ClipRect(
                  child: Align(
                    alignment: Alignment.topCenter,
                    heightFactor: visible,
                    child: child,
                  ),
                );
              },
              child: SafeArea(
                key: _headerKey,
                bottom: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      ScaleTap(
                        onTap: () => _showHelpFAQ(context),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 18, vertical: 10),
                          decoration: BoxDecoration(
                            color: AppColors.accent,
                            borderRadius: BorderRadius.circular(100),
                          ),
                          child: const Text('Help',
                              style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w800,
                                  fontSize: 14)),
                        ),
                      ),
                      const SizedBox(height: 28),
                      ScaleTap(
                        onTap: () => context.push('/profile/edit'),
                        child: Row(
                          children: [
                            _Avatar(url: avatarUrl, name: name, size: 64),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    name.isEmpty ? 'ChopNow User' : name,
                                    style: const TextStyle(
                                        fontSize: 24,
                                        fontWeight: FontWeight.w800,
                                        color: Colors.white),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    _roleLabel(role),
                                    style: TextStyle(
                                        fontSize: 14,
                                        color: Colors.white
                                            .withValues(alpha: 0.85)),
                                  ),
                                ],
                              ),
                            ),
                            Icon(Icons.chevron_right_rounded,
                                color: Colors.white.withValues(alpha: 0.85),
                                size: 26),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<bool?> _showLogoutConfirm(BuildContext context) {
    return showCupertinoDialog<bool>(
      context: context,
      useRootNavigator: false,
      builder: (ctx) => CupertinoTheme(
        data: const CupertinoThemeData(primaryColor: AppColors.primary),
        child: CupertinoAlertDialog(
          title: const Text('Log out'),
          content: const Text('Are you sure you want to log out?'),
          actions: [
            CupertinoDialogAction(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel'),
            ),
            CupertinoDialogAction(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Yes'),
            ),
          ],
        ),
      ),
    );
  }

  void _showHelpFAQ(BuildContext context) {
    showDialog(
      context: context,
      useRootNavigator: false,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Help & FAQ',
            style: TextStyle(
                fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
        content: const Text(
          'Frequently Asked Questions:\n\n'
          'Q: What is ChopNow?\n'
          'A: ChopNow helps you rescue surplus food from local restaurants and cafés at a discount, saving money and reducing waste.\n\n'
          'Q: How do I collect my order?\n'
          'A: Show the 6-digit pickup code on your tracking screen to the vendor at the counter.',
          style: TextStyle(color: AppColors.textSecondary, height: 1.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close',
                style: TextStyle(
                    color: AppColors.primary, fontWeight: FontWeight.bold)),
          )
        ],
      ),
    );
  }

  void _showAboutDialog(BuildContext context) {
    showDialog(
      context: context,
      useRootNavigator: false,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('About ChopNow',
            style: TextStyle(
                fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
        content: const Text(
          'ChopNow is dedicated to eliminating food waste while making premium food affordable for everyone. Join us in sustaining tomorrow, one meal at a time.',
          style: TextStyle(color: AppColors.textSecondary, height: 1.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cool!',
                style: TextStyle(
                    color: AppColors.primary, fontWeight: FontWeight.bold)),
          )
        ],
      ),
    );
  }

  void _showPrivacyPolicy(BuildContext context) {
    showDialog(
      context: context,
      useRootNavigator: false,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Privacy Policy',
            style: TextStyle(
                fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
        content: const Text(
          'We value your privacy. ChopNow secure-stores only data needed to complete your orders, match delivery partners, and ensure safety. Your private info is never sold.',
          style: TextStyle(color: AppColors.textSecondary, height: 1.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close',
                style: TextStyle(
                    color: AppColors.primary, fontWeight: FontWeight.bold)),
          )
        ],
      ),
    );
  }

  static String _roleLabel(String role) => switch (role) {
        'business_owner' => 'Business Owner',
        'rider' => 'Rider',
        _ => 'Consumer',
      };

  void _showRoleSwitcher(
      BuildContext context, WidgetRef ref, AppUser? appUser, String current) {
    final List<String> roles = (appUser?.roles ?? const ['consumer'])
        .map((e) => e.toString())
        .toList();
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(2))),
            const SizedBox(height: 20),
            const Text('Switch Role',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 16),
            ...roles.map((r) => ListTile(
                  leading: Icon(
                      r == current
                          ? Icons.radio_button_checked
                          : Icons.radio_button_off,
                      color: AppColors.primary),
                  title: Text(_roleLabel(r),
                      style: const TextStyle(fontWeight: FontWeight.w600)),
                  onTap: () async {
                    await ref.read(authProvider.notifier).switchRole(r);
                    if (context.mounted) {
                      Navigator.pop(context);
                      final target = switch (r) {
                        'business_owner' => '/business/dashboard',
                        'rider' => '/rider/dashboard',
                        _ => '/home',
                      };
                      context.go(target);
                    }
                  },
                )),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}

class _Avatar extends StatelessWidget {
  final String? url;
  final String name;
  final double size;
  const _Avatar({this.url, required this.name, required this.size});

  @override
  Widget build(BuildContext context) {
    final initials = name.isNotEmpty
        ? name
            .split(' ')
            .take(2)
            .map((w) => w.isEmpty ? '' : w[0].toUpperCase())
            .join()
        : '?';
    return CircleAvatar(
      radius: size / 2,
      backgroundColor: AppColors.primaryLight.withValues(alpha: 0.9),
      backgroundImage: url != null &&
              url!.isNotEmpty &&
              (url!.startsWith('http://') || url!.startsWith('https://'))
          ? NetworkImage(url!)
          : null,
      child: url == null ||
              url!.isEmpty ||
              !(url!.startsWith('http://') || url!.startsWith('https://'))
          ? Text(initials,
              style: TextStyle(
                  fontSize: size * 0.35,
                  fontWeight: FontWeight.w800,
                  color: Colors.white))
          : null,
    );
  }
}

/// A single flat, borderless profile list row: outline icon, label, chevron.
/// Deliberately no background chip or subtitle — matches a plain settings-list style.
class _Row extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool showChevron;
  const _Row({
    required this.icon,
    required this.label,
    required this.onTap,
    this.showChevron = true,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          child: Row(
            children: [
              Icon(icon, size: 24, color: AppColors.textPrimary),
              const SizedBox(width: 18),
              Expanded(
                child: Text(label,
                    style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                        color: AppColors.textPrimary)),
              ),
              if (showChevron)
                const Icon(Icons.chevron_right_rounded,
                    color: AppColors.textTertiary, size: 22),
            ],
          ),
        ),
      ),
    );
  }
}

class _RowDivider extends StatelessWidget {
  const _RowDivider();
  @override
  Widget build(BuildContext context) => const Padding(
        padding: EdgeInsets.symmetric(horizontal: 20, vertical: 8),
        child: Divider(height: 1, color: AppColors.border),
      );
}
