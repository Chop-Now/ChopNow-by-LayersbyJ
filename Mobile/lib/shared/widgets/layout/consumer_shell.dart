import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import '../../../core/providers/cart_provider.dart';
import 'cn_floating_nav.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// ConsumerShell — glassmorphic floating bottom navigation with cart badge.
class ConsumerShell extends ConsumerWidget {
  final Widget child;
  const ConsumerShell({super.key, required this.child});

  static const _tabs = [
    CnNavTab(
        label: 'Home',
        icon: Icons.home_outlined,
        activeIcon: Icons.home_rounded,
        path: '/home'),
    CnNavTab(
        label: 'Browse',
        icon: Icons.search_outlined,
        activeIcon: Icons.search_rounded,
        path: '/browse'),
    CnNavTab(
        label: 'Cart',
        icon: Icons.shopping_cart_outlined,
        activeIcon: Icons.shopping_cart_rounded,
        path: '/cart'),
    CnNavTab(
        label: 'Orders',
        icon: Icons.receipt_long_outlined,
        activeIcon: Icons.receipt_long_rounded,
        path: '/orders'),
    CnNavTab(
        label: 'Profile',
        icon: Icons.person_outline_rounded,
        activeIcon: Icons.person_rounded,
        path: '/profile'),
  ];

  int _currentIndex(BuildContext context) {
    final location = GoRouterState.of(context).uri.path;
    if (location.startsWith('/browse')) return 1;
    if (location.startsWith('/cart')) return 2;
    if (location.startsWith('/orders')) return 3;
    if (location.startsWith('/profile')) return 4;
    return 0;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final current = _currentIndex(context);
    final cartCount = ref.watch(cartCountProvider);

    // Tab switches use context.go(), which replaces GoRouter's whole page
    // stack rather than pushing — so a bottom-nav tab is frequently the only
    // page GoRouter knows about. A system back gesture (iOS edge-swipe,
    // Android back button) reaching GoRouter's own pop with nothing left to
    // pop to crashes with a 'currentConfiguration.isNotEmpty' assertion.
    // Block that here and handle it ourselves instead.
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        if (current != 0) {
          context.go('/home');
        } else {
          SystemNavigator.pop();
        }
      },
      child: Scaffold(
        extendBody: true,
        body: Stack(
          children: [
            Positioned.fill(
              child: Padding(
                padding:
                    const EdgeInsets.only(bottom: CnFloatingNav.reservedHeight),
                child: child,
              ),
            ),
            CnFloatingNav(
              tabs: [
                for (var i = 0; i < _tabs.length; i++)
                  // Cart badge rides the cart tab
                  i == 2
                      ? CnNavTab(
                          label: _tabs[i].label,
                          icon: _tabs[i].icon,
                          activeIcon: _tabs[i].activeIcon,
                          path: _tabs[i].path,
                          badgeCount: cartCount,
                        )
                      : _tabs[i],
              ],
              current: current,
            ),
          ],
        ),
      ),
    );
  }
}
