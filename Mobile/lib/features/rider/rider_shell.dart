import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';

class RiderShell extends StatelessWidget {
  final Widget child;
  const RiderShell({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    final path = GoRouterState.of(context).uri.path;

    // Determine active tab index
    int activeIdx = 0;
    if (path.startsWith('/rider/earnings')) {
      activeIdx = 1;
    } else if (path.startsWith('/rider/profile')) {
      activeIdx = 2;
    }

    return Scaffold(
      body: child,
      bottomNavigationBar: _RiderNavBar(activeIdx: activeIdx),
    );
  }
}

class _RiderNavBar extends StatelessWidget {
  final int activeIdx;
  const _RiderNavBar({required this.activeIdx});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        border:
            const Border(top: BorderSide(color: AppColors.border, width: 0.5)),
        boxShadow: [
          BoxShadow(
            color: AppColors.char.withValues(alpha: 0.06),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 68,
          child: Row(
            children: [
              _NavItem(
                icon: Icons.delivery_dining_rounded,
                label: 'Deliveries',
                isActive: activeIdx == 0,
                onTap: () => context.go('/rider/dashboard'),
              ),
              _NavItem(
                icon: Icons.account_balance_wallet_rounded,
                label: 'Earnings',
                isActive: activeIdx == 1,
                onTap: () => context.go('/rider/earnings'),
              ),
              _NavItem(
                icon: Icons.person_rounded,
                label: 'Profile',
                isActive: activeIdx == 2,
                onTap: () => context.go('/rider/profile'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isActive;
  final VoidCallback onTap;

  const _NavItem({
    required this.icon,
    required this.label,
    required this.isActive,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Animated indicator pill
              AnimatedContainer(
                duration: const Duration(milliseconds: 250),
                curve: Curves.easeOutBack,
                padding: EdgeInsets.symmetric(
                  horizontal: isActive ? 16 : 10,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: isActive
                      ? AppColors.primary.withValues(alpha: 0.12)
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(100),
                ),
                child: Icon(
                  icon,
                  size: 24,
                  color: isActive ? AppColors.primary : AppColors.textTertiary,
                ),
              ),
              const SizedBox(height: 3),
              AnimatedDefaultTextStyle(
                duration: const Duration(milliseconds: 200),
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: isActive ? FontWeight.w700 : FontWeight.w400,
                  color: isActive ? AppColors.primary : AppColors.textTertiary,
                ),
                child: Text(label),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
