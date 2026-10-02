import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../shared/widgets/layout/cn_floating_nav.dart';

/// BusinessShell — same floating glass nav as the consumer side, so the two
/// roles feel like one app. See [CnFloatingNav].
class BusinessShell extends ConsumerWidget {
  final Widget child;
  const BusinessShell({super.key, required this.child});

  static const _tabs = [
    CnNavTab(
        label: 'Dashboard',
        icon: Icons.dashboard_outlined,
        activeIcon: Icons.dashboard_rounded,
        path: '/business/dashboard'),
    CnNavTab(
        label: 'Listings',
        icon: Icons.store_outlined,
        activeIcon: Icons.store_rounded,
        path: '/business/listings'),
    CnNavTab(
        label: 'Orders',
        icon: Icons.receipt_long_outlined,
        activeIcon: Icons.receipt_long_rounded,
        path: '/business/orders'),
    CnNavTab(
        label: 'Analytics',
        icon: Icons.bar_chart_outlined,
        activeIcon: Icons.bar_chart_rounded,
        path: '/business/analytics'),
  ];

  int _current(BuildContext context) {
    final path = GoRouterState.of(context).uri.path;
    if (path.startsWith('/business/listings')) return 1;
    if (path.startsWith('/business/orders')) return 2;
    if (path.startsWith('/business/analytics')) return 3;
    return 0;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final current = _current(context);

    // Same guard as ConsumerShell: tab switches use context.go(), which
    // replaces GoRouter's page stack, so a system back gesture can pop the
    // last page and trip a 'currentConfiguration.isNotEmpty' assertion.
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        if (current != 0) {
          context.go('/business/dashboard');
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
            CnFloatingNav(tabs: _tabs, current: current),
          ],
        ),
      ),
    );
  }
}
