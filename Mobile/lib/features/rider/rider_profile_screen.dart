import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/api/api_exception.dart';
import '../../core/theme/app_colors.dart';

// ── Providers ─────────────────────────────────────────────────────────────────

final _riderProfileStatsProvider =
    FutureProvider<Map<String, dynamic>>((ref) async {
  try {
    final res = await ApiClient.instance.get(AppEndpoints.riderStatsFull);
    final data = res.data;
    if (data is Map && data['success'] == true) {
      return data['stats'] is Map
          ? Map<String, dynamic>.from(data['stats'])
          : {};
    }
    return data is Map<String, dynamic> ? data : {};
  } catch (e) {
    throw ApiException.fromDioError(e);
  }
});

String _formatCompactEarnings(num value) {
  final v = value.toDouble();
  if (v >= 1000) return '${(v / 1000).toStringAsFixed(1)}K';
  return v.toInt().toString();
}

class RiderProfileScreen extends ConsumerWidget {
  const RiderProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final firstName = user?.firstName ?? 'Rider';
    final lastName = user?.lastName ?? '';
    final email = user?.email ?? '';

    final stats = ref.watch(_riderProfileStatsProvider).value ?? {};
    final deliveries = stats['totalTrips']?.toString() ?? '-';
    final ratingVal = stats['rating'];
    final rating = ratingVal is num ? ratingVal.toStringAsFixed(1) : '-';
    final totalEarningsVal = stats['totalEarnings'];
    final totalEarnings = totalEarningsVal is num
        ? 'RWF ${_formatCompactEarnings(totalEarningsVal)}'
        : '-';

    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          // ── Header ───────────────────────────────────────────────────────────
          SliverAppBar(
            expandedHeight: 200,
            pinned: true,
            automaticallyImplyLeading: false,
            backgroundColor: AppColors.darkBackground,
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      AppColors.darkSurfaceVariant,
                      AppColors.darkBackground
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                    child: Column(
                      children: [
                        // Avatar
                        Container(
                          width: 80,
                          height: 80,
                          decoration: BoxDecoration(
                            gradient: AppColors.primaryGradient,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.primary.withValues(alpha: 0.4),
                                blurRadius: 20,
                              ),
                            ],
                          ),
                          child: Center(
                            child: Text(
                              '${firstName.isNotEmpty ? firstName[0] : 'R'}${lastName.isNotEmpty ? lastName[0] : ''}',
                              style: const TextStyle(
                                fontSize: 28,
                                fontWeight: FontWeight.w800,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          '$firstName $lastName',
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.primary.withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(100),
                                border: Border.all(
                                  color:
                                      AppColors.primary.withValues(alpha: 0.4),
                                ),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.delivery_dining_rounded,
                                      color: AppColors.primaryLight, size: 14),
                                  SizedBox(width: 4),
                                  Text(
                                    'Rider',
                                    style: TextStyle(
                                      color: AppColors.primaryLight,
                                      fontWeight: FontWeight.w700,
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),

          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── Stats Summary ──────────────────────────────────────────
                  _SectionCard(
                    child: Row(children: [
                      _MiniStat(
                          icon: Icons.directions_bike_rounded,
                          label: 'Deliveries',
                          value: deliveries),
                      _MiniStat(
                          icon: Icons.star_rounded,
                          label: 'Rating',
                          value: rating),
                      _MiniStat(
                          icon: Icons.payments_outlined,
                          label: 'Total',
                          value: totalEarnings),
                    ]),
                  ),

                  const SizedBox(height: 16),

                  // ── Account Section ────────────────────────────────────────
                  const Text(
                    'Account',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textSecondary,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 8),

                  _SectionCard(
                    child: Column(
                      children: [
                        _ProfileRow(
                          icon: Icons.person_outline_rounded,
                          label: 'Full Name',
                          value: '$firstName $lastName',
                        ),
                        const Divider(height: 1, color: AppColors.border),
                        _ProfileRow(
                          icon: Icons.email_outlined,
                          label: 'Email',
                          value: email,
                        ),
                        const Divider(height: 1, color: AppColors.border),
                        const _ProfileRow(
                          icon: Icons.motorcycle_rounded,
                          label: 'Vehicle',
                          value: 'Motorcycle',
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),

                  // ── Support Section ────────────────────────────────────────
                  const Text(
                    'Support',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textSecondary,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 8),

                  _SectionCard(
                    child: Column(
                      children: [
                        _TappableRow(
                          icon: Icons.help_outline_rounded,
                          label: 'Help Center',
                          onTap: () => _showHelpCenter(context),
                        ),
                        const Divider(height: 1, color: AppColors.border),
                        _TappableRow(
                          icon: Icons.policy_outlined,
                          label: 'Terms & Conditions',
                          onTap: () => _showTerms(context),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // ── Sign Out ───────────────────────────────────────────────
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () async {
                        HapticFeedback.mediumImpact();
                        final confirm = await showDialog<bool>(
                          context: context,
                          builder: (ctx) => AlertDialog(
                            backgroundColor: AppColors.surface,
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(20)),
                            title: const Text('Sign Out',
                                style: TextStyle(
                                    fontWeight: FontWeight.w800,
                                    color: AppColors.textPrimary)),
                            content: const Text(
                                'Are you sure you want to sign out?',
                                style:
                                    TextStyle(color: AppColors.textSecondary)),
                            actions: [
                              TextButton(
                                onPressed: () => Navigator.pop(ctx, false),
                                child: const Text('Cancel'),
                              ),
                              ElevatedButton(
                                onPressed: () => Navigator.pop(ctx, true),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.error,
                                  foregroundColor: Colors.white,
                                  shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(10)),
                                ),
                                child: const Text('Sign Out'),
                              ),
                            ],
                          ),
                        );
                        if (confirm == true && context.mounted) {
                          ref.read(authProvider.notifier).logout();
                        }
                      },
                      icon: const Icon(Icons.logout_rounded,
                          color: AppColors.error),
                      label: const Text('Sign Out',
                          style: TextStyle(
                              color: AppColors.error,
                              fontWeight: FontWeight.w700)),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: AppColors.error),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14)),
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
    );
  }

  void _showHelpCenter(BuildContext context) {
    showDialog(
      context: context,
      useRootNavigator: false,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Rider Help Center',
            style: TextStyle(
                fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
        content: const Text(
          'Rider FAQs:\n\n'
          '1. How do I get paid?\n'
          'Earnings are credited to your wallet immediately after a successful delivery confirmation.\n\n'
          '2. What if I can\'t reach the customer?\n'
          'Call the customer using the phone button on the active delivery screen, or contact dispatch support.',
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

  void _showTerms(BuildContext context) {
    showDialog(
      context: context,
      useRootNavigator: false,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Terms & Conditions',
            style: TextStyle(
                fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
        content: const Text(
          'As a ChopNow delivery partner, you agree to deliver orders safely, securely, and in a timely manner. Respect consumer privacy and restaurant policies.',
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
}

// ── Sub-widgets ───────────────────────────────────────────────────────────────

class _SectionCard extends StatelessWidget {
  final Widget child;
  const _SectionCard({required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 8,
              offset: const Offset(0, 2))
        ],
      ),
      child: child,
    );
  }
}

class _MiniStat extends StatelessWidget {
  final IconData icon;
  final String label, value;
  const _MiniStat(
      {required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 14),
        child: Column(children: [
          Icon(icon, size: 22, color: AppColors.primary),
          const SizedBox(height: 4),
          Text(value,
              style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 14,
                  color: AppColors.textPrimary)),
          Text(label,
              style: const TextStyle(
                  fontSize: 10, color: AppColors.textSecondary)),
        ]),
      ),
    );
  }
}

class _ProfileRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _ProfileRow(
      {required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(children: [
        Icon(icon, size: 18, color: AppColors.textSecondary),
        const SizedBox(width: 12),
        Expanded(
          child: Text(label,
              style: const TextStyle(
                  fontSize: 13, color: AppColors.textSecondary)),
        ),
        Text(value,
            style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary),
            maxLines: 1,
            overflow: TextOverflow.ellipsis),
      ]),
    );
  }
}

class _TappableRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _TappableRow(
      {required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(children: [
          Icon(icon, size: 18, color: AppColors.textSecondary),
          const SizedBox(width: 12),
          Expanded(
            child: Text(label,
                style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w500)),
          ),
          const Icon(Icons.chevron_right,
              size: 18, color: AppColors.textSecondary),
        ]),
      ),
    );
  }
}
