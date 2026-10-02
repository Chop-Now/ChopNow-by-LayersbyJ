import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import '../../core/theme/app_colors.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../shared/widgets/feedback/cn_states.dart';

// ── Providers ─────────────────────────────────────────────────────────────────

final _earningsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final res = await ApiClient.instance.get(AppEndpoints.riderEarnings);
  final data = res.data;
  return data is Map<String, dynamic> ? data : {};
});

final _payoutsProvider =
    FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final res = await ApiClient.instance
      .get(AppEndpoints.payoutsMe, queryParameters: {'limit': 5});
  final data = res.data;
  final list = data is Map ? data['payouts'] : null;
  return list is List ? List<Map<String, dynamic>>.from(list) : [];
});

// ── Screen ────────────────────────────────────────────────────────────────────

class RiderEarningsScreen extends ConsumerWidget {
  const RiderEarningsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncEarnings = ref.watch(_earningsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: asyncEarnings.when(
        loading: () => const Center(
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
        error: (e, _) => CnErrorState(
          message: 'Could not load your earnings',
          onRetry: () => ref.invalidate(_earningsProvider),
        ),
        data: (data) => _EarningsBody(data: data),
      ),
    );
  }
}

class _EarningsBody extends ConsumerWidget {
  final Map<String, dynamic> data;
  const _EarningsBody({required this.data});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final totalEarnings = data['totalEarnings'] ?? 0;
    final thisWeek = data['thisWeek'] ?? 0;
    final today = data['today'] ?? 0;
    final totalDeliveries = data['totalDeliveries'] ?? 0;
    final ratingVal = data['averageRating'];
    final rating = ratingVal is num ? ratingVal.toStringAsFixed(1) : '-';
    final weeklyRaw = data['weeklyData'];
    final weeklyData = weeklyRaw is List
        ? weeklyRaw.map((v) => (v as num).toDouble()).toList()
        : <double>[0, 0, 0, 0, 0, 0, 0];

    return CustomScrollView(
      slivers: [
        // ── Gradient Header ───────────────────────────────────────────────────
        SliverAppBar(
          expandedHeight: 220,
          pinned: true,
          automaticallyImplyLeading: false,
          backgroundColor: AppColors.primary,
          flexibleSpace: FlexibleSpaceBar(
            background: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [AppColors.primaryLight, AppColors.primaryDark],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'My Earnings',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'All-time earnings summary',
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.white.withValues(alpha: 0.75),
                        ),
                      ),
                      const SizedBox(height: 24),
                      // Big total
                      Text(
                        'RWF ${_fmt(totalEarnings)}',
                        style: const TextStyle(
                          fontSize: 38,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                          letterSpacing: -1,
                        ),
                      ),
                      const Text(
                        'Total Earned',
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.white70,
                        ),
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
                // ── Quick Stats ───────────────────────────────────────────────
                Row(
                  children: [
                    _QuickStat(
                      label: 'Today',
                      value: 'RWF ${_fmt(today)}',
                      icon: Icons.today_rounded,
                      color: AppColors.accent,
                    ),
                    const SizedBox(width: 12),
                    _QuickStat(
                      label: 'This Week',
                      value: 'RWF ${_fmt(thisWeek)}',
                      icon: Icons.calendar_view_week_rounded,
                      color: AppColors.info,
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    _QuickStat(
                      label: 'Deliveries',
                      value: '$totalDeliveries',
                      icon: Icons.delivery_dining_rounded,
                      color: AppColors.primary,
                    ),
                    const SizedBox(width: 12),
                    _QuickStat(
                      label: 'Rating',
                      value: rating,
                      icon: Icons.star_rounded,
                      color: AppColors.warning,
                    ),
                  ],
                ),

                const SizedBox(height: 24),

                // ── Weekly Chart ──────────────────────────────────────────────
                const Text(
                  'Weekly Earnings',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Last 7 days performance',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppColors.textSecondary.withValues(alpha: 0.8),
                  ),
                ),
                const SizedBox(height: 16),

                Container(
                  height: 200,
                  padding: const EdgeInsets.fromLTRB(8, 16, 16, 8),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.border),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.04),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: BarChart(
                    BarChartData(
                      alignment: BarChartAlignment.spaceAround,
                      maxY: (weeklyData.reduce((a, b) => a > b ? a : b) * 1.3),
                      barTouchData: BarTouchData(
                        touchTooltipData: BarTouchTooltipData(
                          getTooltipColor: (_) => AppColors.darkSurface,
                          getTooltipItem: (group, _, rod, __) {
                            return BarTooltipItem(
                              'RWF ${_fmt(rod.toY.toInt())}',
                              const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w700,
                                fontSize: 11,
                              ),
                            );
                          },
                        ),
                      ),
                      titlesData: FlTitlesData(
                        show: true,
                        bottomTitles: AxisTitles(
                          sideTitles: SideTitles(
                            showTitles: true,
                            getTitlesWidget: (val, _) {
                              const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
                              return Text(
                                days[val.toInt() % 7],
                                style: const TextStyle(
                                  fontSize: 10,
                                  color: AppColors.textSecondary,
                                  fontWeight: FontWeight.w600,
                                ),
                              );
                            },
                            reservedSize: 24,
                          ),
                        ),
                        leftTitles: const AxisTitles(
                          sideTitles: SideTitles(showTitles: false),
                        ),
                        topTitles: const AxisTitles(
                          sideTitles: SideTitles(showTitles: false),
                        ),
                        rightTitles: const AxisTitles(
                          sideTitles: SideTitles(showTitles: false),
                        ),
                      ),
                      gridData: FlGridData(
                        show: true,
                        drawVerticalLine: false,
                        getDrawingHorizontalLine: (_) => const FlLine(
                          color: AppColors.border,
                          strokeWidth: 1,
                        ),
                      ),
                      borderData: FlBorderData(show: false),
                      barGroups: List.generate(
                        weeklyData.length,
                        (i) => BarChartGroupData(
                          x: i,
                          barRods: [
                            BarChartRodData(
                              toY: weeklyData[i],
                              gradient: const LinearGradient(
                                colors: [
                                  AppColors.primaryLight,
                                  AppColors.primary,
                                ],
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                              ),
                              width: 22,
                              borderRadius: const BorderRadius.vertical(
                                  top: Radius.circular(6)),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 24),

                // ── Payout Section ────────────────────────────────────────────
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Payout History',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        gradient: AppColors.primaryGradient,
                        borderRadius: BorderRadius.circular(100),
                      ),
                      child: const Text(
                        'Request Payout',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                Consumer(
                  builder: (context, ref, _) {
                    final asyncPayouts = ref.watch(_payoutsProvider);
                    return asyncPayouts.when(
                      loading: () => const Padding(
                        padding: EdgeInsets.symmetric(vertical: 24),
                        child: Center(
                          child: CircularProgressIndicator(
                              color: AppColors.primary),
                        ),
                      ),
                      error: (e, _) => CnErrorState(
                        message: 'Could not load payout history',
                        onRetry: () => ref.invalidate(_payoutsProvider),
                      ),
                      data: (payouts) {
                        if (payouts.isEmpty) {
                          return const CnEmptyState(
                            title: 'No payouts yet',
                            subtitle:
                                'Your completed payouts will show up here.',
                            icon: Icons.account_balance_wallet_outlined,
                          );
                        }
                        return Column(
                          children: payouts
                              .map((p) => Padding(
                                    padding: const EdgeInsets.only(bottom: 10),
                                    child: _PayoutEntry(
                                      date: _formatPayoutDate(p['createdAt']),
                                      amount:
                                          (p['amount'] as num?)?.toInt() ?? 0,
                                      status:
                                          _statusLabel(p['status'] as String?),
                                    ),
                                  ))
                              .toList(),
                        );
                      },
                    );
                  },
                ),

                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ],
    );
  }

  static String _fmt(int value) {
    final s = value.toString();
    final buf = StringBuffer();
    for (int i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 == 0) buf.write(',');
      buf.write(s[i]);
    }
    return buf.toString();
  }

  static String _formatPayoutDate(dynamic raw) {
    if (raw is! String) return '-';
    final date = DateTime.tryParse(raw);
    if (date == null) return '-';
    return DateFormat('MMM d, yyyy').format(date.toLocal());
  }

  static String _statusLabel(String? status) {
    switch (status) {
      case 'requested':
        return 'Requested';
      case 'processing':
        return 'Processing';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status ?? '-';
    }
  }
}

// ── Quick Stat Card ───────────────────────────────────────────────────────────

class _QuickStat extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _QuickStat({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: color, size: 18),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label,
                      style: const TextStyle(
                          fontSize: 10,
                          color: AppColors.textSecondary,
                          fontWeight: FontWeight.w500)),
                  Text(value,
                      style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Payout Entry ──────────────────────────────────────────────────────────────

class _PayoutEntry extends StatelessWidget {
  final String date;
  final int amount;
  final String status;

  const _PayoutEntry({
    required this.date,
    required this.amount,
    required this.status,
  });

  Color get _statusColor {
    switch (status) {
      case 'Failed':
      case 'Cancelled':
        return AppColors.error;
      case 'Requested':
      case 'Processing':
        return AppColors.warning;
      default:
        return AppColors.success;
    }
  }

  Color get _statusBg {
    switch (status) {
      case 'Failed':
      case 'Cancelled':
        return AppColors.errorSurface;
      case 'Requested':
      case 'Processing':
        return AppColors.warningSurface;
      default:
        return AppColors.successSurface;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppColors.successSurface,
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Center(
              child: Icon(Icons.account_balance_wallet_rounded,
                  color: AppColors.primary, size: 20),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Payout',
                    style: TextStyle(
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                        fontSize: 13)),
                Text(date,
                    style: const TextStyle(
                        fontSize: 11, color: AppColors.textSecondary)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('RWF ${_fmt(amount)}',
                  style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      color: AppColors.primary,
                      fontSize: 13)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: _statusBg,
                  borderRadius: BorderRadius.circular(100),
                ),
                child: Text(status,
                    style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.w700,
                        color: _statusColor)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  static String _fmt(int value) {
    final s = value.toString();
    final buf = StringBuffer();
    for (int i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 == 0) buf.write(',');
      buf.write(s[i]);
    }
    return buf.toString();
  }
}
