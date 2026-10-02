import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/impact_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/widgets/feedback/cn_states.dart';

class ImpactDashboardScreen extends ConsumerWidget {
  const ImpactDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncImpact = ref.watch(userImpactProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          // ── Animated Gradient AppBar ──
          SliverAppBar(
            expandedHeight: 220,
            pinned: true,
            backgroundColor: AppColors.primary,
            iconTheme: const IconThemeData(color: Colors.white),
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      AppColors.primaryLight,
                      AppColors.moringa,
                      AppColors.primaryDark
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: Stack(
                  children: [
                    // Decorative blobs
                    Positioned(
                      top: -40,
                      right: -40,
                      child: Container(
                        width: 180,
                        height: 180,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.white.withValues(alpha: 0.07),
                        ),
                      ),
                    ),
                    Positioned(
                      bottom: -30,
                      left: -30,
                      child: Container(
                        width: 140,
                        height: 140,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.white.withValues(alpha: 0.05),
                        ),
                      ),
                    ),
                    const SafeArea(
                      child: Padding(
                        padding: EdgeInsets.fromLTRB(20, 16, 20, 20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(Icons.public_rounded,
                                    size: 16, color: Colors.white70),
                                SizedBox(width: 6),
                                Text('My Impact',
                                    style: TextStyle(
                                        color: Colors.white70,
                                        fontSize: 14,
                                        fontWeight: FontWeight.w600)),
                              ],
                            ),
                            SizedBox(height: 4),
                            Text('Your Food Rescue Journey',
                                style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 22,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: -0.3)),
                            Spacer(),
                            Text(
                                'Every meal you rescue makes a difference for our planet!',
                                style: TextStyle(
                                    color: Colors.white70,
                                    fontSize: 13,
                                    height: 1.4)),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              titlePadding: EdgeInsets.zero,
            ),
          ),

          // ── Content ──
          SliverToBoxAdapter(
            child: RefreshIndicator(
              color: AppColors.primary,
              onRefresh: () async => ref.invalidate(userImpactProvider),
              child: asyncImpact.when(
                loading: () => const Padding(
                  padding: EdgeInsets.only(top: 60),
                  child: Center(
                      child:
                          CircularProgressIndicator(color: AppColors.primary)),
                ),
                error: (e, _) => Padding(
                  padding: const EdgeInsets.only(top: 60),
                  child: CnErrorState(
                    message: 'Could not load your impact data',
                    onRetry: () => ref.invalidate(userImpactProvider),
                  ),
                ),
                data: (impact) => _ImpactContent(impact: impact),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ImpactContent extends StatefulWidget {
  final Map<String, dynamic> impact;
  const _ImpactContent({required this.impact});

  @override
  State<_ImpactContent> createState() => _ImpactContentState();
}

class _ImpactContentState extends State<_ImpactContent>
    with SingleTickerProviderStateMixin {
  late AnimationController _animCtrl;
  late Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();
    _animCtrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 600));
    _fadeAnim = CurvedAnimation(parent: _animCtrl, curve: Curves.easeOut);
    _animCtrl.forward();
  }

  @override
  void dispose() {
    _animCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final mealsRescued =
        widget.impact['mealsRescued'] ?? widget.impact['totalMeals'] ?? 0;
    final co2Saved =
        widget.impact['co2Saved'] ?? widget.impact['totalCo2'] ?? 0;
    final moneySaved =
        widget.impact['moneySaved'] ?? widget.impact['totalSavings'] ?? 0;
    final streak = widget.impact['currentStreak'] ?? 0;
    final totalOrders = widget.impact['totalOrders'] ?? 0;

    return FadeTransition(
      opacity: _fadeAnim,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Big 3 Stats ──
            Row(
              children: [
                Expanded(
                    child: _BigStatCard(
                        icon: Icons.restaurant_menu_rounded,
                        value: '$mealsRescued',
                        label: 'Meals Rescued',
                        color: AppColors.primary)),
                const SizedBox(width: 10),
                Expanded(
                    child: _BigStatCard(
                        icon: Icons.eco_rounded,
                        value: '${co2Saved}g',
                        label: 'CO₂ Saved',
                        color: AppColors.success)),
                const SizedBox(width: 10),
                Expanded(
                    child: _BigStatCard(
                        icon: Icons.payments_rounded,
                        value: 'RWF\n${_fmt(moneySaved as num)}',
                        label: 'Money Saved',
                        color: AppColors.accent)),
              ],
            ),
            const SizedBox(height: 14),

            // ── Streak & Orders ──
            Row(
              children: [
                Expanded(
                  child: _StreakCard(streak: streak as int),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Column(
                      children: [
                        const Icon(Icons.inventory_2_rounded,
                            size: 28, color: AppColors.primary),
                        const SizedBox(height: 6),
                        Text('$totalOrders',
                            style: const TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.w900,
                                color: AppColors.primary)),
                        const SizedBox(height: 2),
                        const Text('Total Orders',
                            style: TextStyle(
                                fontSize: 12, color: AppColors.textSecondary)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // ── Progress Bar for next badge ──
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.track_changes_rounded,
                          size: 20, color: AppColors.primary),
                      SizedBox(width: 8),
                      Text('Next Goal',
                          style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                              color: AppColors.textPrimary)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  _GoalProgress(mealsRescued: mealsRescued as int),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // ── Badges ──
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.emoji_events_rounded,
                          size: 20, color: AppColors.primary),
                      SizedBox(width: 8),
                      Text('Badges',
                          style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                              color: AppColors.textPrimary)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _badgesForCount(mealsRescued)
                        .map((b) => _BadgePill(
                            label: b['label'] as String,
                            earned: b['earned'] as bool,
                            icon: b['icon'] as IconData))
                        .toList(),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // ── Did you know ──
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppColors.primary.withValues(alpha: 0.08),
                    AppColors.success.withValues(alpha: 0.08)
                  ],
                ),
                borderRadius: BorderRadius.circular(16),
                border:
                    Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.lightbulb_rounded,
                          size: 16, color: AppColors.primary),
                      SizedBox(width: 6),
                      Text('Did you know?',
                          style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                              color: AppColors.primary)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _contextMessage(co2Saved as num),
                    style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.textSecondary,
                        height: 1.6),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  static String _fmt(num n) {
    if (n >= 1000) return '${(n / 1000).toStringAsFixed(1)}K';
    return n.toStringAsFixed(0);
  }

  static String _contextMessage(num co2) {
    if (co2 <= 0) {
      return 'Every meal you rescue keeps food out of landfill and CO₂ out of the atmosphere. Start ordering to see your impact!';
    }
    if (co2 < 500) {
      return 'You\'ve saved ${co2}g of CO₂ — that\'s like not driving a car for ${(co2 / 120).toStringAsFixed(1)} km!';
    }
    return 'Amazing! You\'ve saved ${(co2 / 1000).toStringAsFixed(2)}kg of CO₂ — equivalent to planting ${(co2 / 600).round()} trees!';
  }

  static List<Map<String, dynamic>> _badgesForCount(int count) => [
        {
          'label': 'First Rescue',
          'earned': count >= 1,
          'icon': Icons.eco_rounded
        },
        {
          'label': '5 Meals',
          'earned': count >= 5,
          'icon': Icons.restaurant_menu_rounded
        },
        {
          'label': 'Food Hero',
          'earned': count >= 10,
          'icon': Icons.public_rounded
        },
        {
          'label': 'Champion',
          'earned': count >= 25,
          'icon': Icons.emoji_events_rounded
        },
        {'label': 'Legend', 'earned': count >= 50, 'icon': Icons.stars_rounded},
      ];
}

class _BigStatCard extends StatelessWidget {
  final IconData icon;
  final String value;
  final String label;
  final Color color;
  const _BigStatCard(
      {required this.icon,
      required this.value,
      required this.label,
      required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Column(
        children: [
          Icon(icon, size: 26, color: color),
          const SizedBox(height: 6),
          Text(value,
              textAlign: TextAlign.center,
              style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w900,
                  color: color,
                  height: 1.2)),
          const SizedBox(height: 3),
          Text(label,
              textAlign: TextAlign.center,
              style: const TextStyle(
                  fontSize: 10, color: AppColors.textSecondary, height: 1.2)),
        ],
      ),
    );
  }
}

class _StreakCard extends StatelessWidget {
  final int streak;
  const _StreakCard({required this.streak});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: streak > 0
            ? const LinearGradient(
                colors: [Color(0xFFFF7043), Color(0xFFFF5722)])
            : null,
        color: streak == 0 ? AppColors.surface : null,
        borderRadius: BorderRadius.circular(16),
        border: streak == 0 ? Border.all(color: AppColors.border) : null,
        boxShadow: streak > 0
            ? [
                BoxShadow(
                    color: const Color(0xFFFF5722).withValues(alpha: 0.3),
                    blurRadius: 12,
                    offset: const Offset(0, 4))
              ]
            : null,
      ),
      child: Column(
        children: [
          Icon(Icons.local_fire_department_rounded,
              size: 28,
              color: streak > 0 ? Colors.white : AppColors.textSecondary),
          const SizedBox(height: 6),
          Text('$streak',
              style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w900,
                  color: streak > 0 ? Colors.white : AppColors.textSecondary)),
          const SizedBox(height: 2),
          Text('Day Streak',
              style: TextStyle(
                  fontSize: 12,
                  color:
                      streak > 0 ? Colors.white70 : AppColors.textSecondary)),
        ],
      ),
    );
  }
}

class _GoalProgress extends StatelessWidget {
  final int mealsRescued;
  const _GoalProgress({required this.mealsRescued});

  static const _milestones = [1, 5, 10, 25, 50, 100];
  static const _labels = [
    'First Rescue',
    '5 Meals',
    'Food Hero',
    'Champion',
    'Legend',
    'Master'
  ];

  @override
  Widget build(BuildContext context) {
    int nextIdx = _milestones.indexWhere((m) => m > mealsRescued);
    if (nextIdx == -1) nextIdx = _milestones.length - 1;
    final nextGoal = _milestones[nextIdx];
    final prevGoal = nextIdx > 0 ? _milestones[nextIdx - 1] : 0;
    final progress = nextGoal > prevGoal
        ? ((mealsRescued - prevGoal) / (nextGoal - prevGoal)).clamp(0.0, 1.0)
        : 1.0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('$mealsRescued meals rescued',
                style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary)),
            Text('Goal: $nextGoal (${_labels[nextIdx]})',
                style: const TextStyle(
                    fontSize: 12, color: AppColors.textSecondary)),
          ],
        ),
        const SizedBox(height: 10),
        ClipRRect(
          borderRadius: BorderRadius.circular(100),
          child: LinearProgressIndicator(
            value: progress,
            minHeight: 10,
            backgroundColor: AppColors.surfaceVariant,
            valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
          ),
        ),
        const SizedBox(height: 6),
        Text(
          '${nextGoal - mealsRescued} more to reach ${_labels[nextIdx]}!',
          style: const TextStyle(
              fontSize: 12,
              color: AppColors.primary,
              fontWeight: FontWeight.w600),
        ),
      ],
    );
  }
}

class _BadgePill extends StatelessWidget {
  final String label;
  final bool earned;
  final IconData icon;
  const _BadgePill(
      {required this.label, required this.earned, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(
        color: earned ? AppColors.primarySurface : AppColors.surfaceVariant,
        borderRadius: BorderRadius.circular(100),
        border:
            Border.all(color: earned ? AppColors.primary : AppColors.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            earned ? icon : Icons.lock_rounded,
            size: 14,
            color: earned ? AppColors.primary : AppColors.textTertiary,
          ),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: earned ? AppColors.primary : AppColors.textTertiary,
            ),
          ),
        ],
      ),
    );
  }
}
