import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/theme/app_colors.dart';
import 'widgets/biz_ui.dart';
import '../../shared/widgets/feedback/cn_states.dart';

// ── Analytics Riverpod Provider ───────────────────────────────────────────────
final _businessAnalyticsProvider =
    FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final res = await ApiClient.instance.get(AppEndpoints.businessAnalytics);
  final data = res.data;
  return data is Map<String, dynamic> ? data : {};
});

// ── Screen Widget ─────────────────────────────────────────────────────────────
class AnalyticsScreen extends ConsumerWidget {
  const AnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncData = ref.watch(_businessAnalyticsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Store Analytics',
            style: TextStyle(
                fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
        backgroundColor: AppColors.surface,
        automaticallyImplyLeading: false,
        elevation: 0,
      ),
      body: asyncData.when(
        loading: () => const Center(
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
        error: (e, _) => CnErrorState(
          message: e.toString(),
          onRetry: () => ref.invalidate(_businessAnalyticsProvider),
        ),
        data: (data) => _AnalyticsBody(data: data),
      ),
    );
  }
}

// ── Analytics Scrollable Body ──────────────────────────────────────────────────
class _AnalyticsBody extends StatelessWidget {
  final Map<String, dynamic> data;
  const _AnalyticsBody({required this.data});

  @override
  Widget build(BuildContext context) {
    // Safe extraction & normalization of payload stats
    final rawStats = data['stats'] as Map? ?? {};
    final rawTrend = data['weeklyTrend'] as List? ?? [];
    final rawProducts = data['topProducts'] as List? ?? [];

    // Sum last 30d sales from weekly trend points
    final totalRevenue = rawTrend.fold<double>(
      0.0,
      (sum, w) => sum + ((w as Map)['sales'] as num? ?? 0.0).toDouble(),
    );

    final totalOrders = rawStats['totalOrders'] as int? ??
        rawTrend.fold<int>(
          0,
          (sum, w) => sum + ((w as Map)['orders'] as num? ?? 0).toInt(),
        );

    final walletBalance = (rawStats['balance'] as num? ?? 0.0).toDouble();
    final activeListings = rawStats['totalListings'] as int? ?? 0;
    final rating = (rawStats['averageRating'] as num?)?.toDouble() ?? 0.0;

    final avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders) : 0.0;

    return CustomScrollView(
      slivers: [
        // ── Total Sales Header ──
        SliverToBoxAdapter(
            child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 28),
            width: double.infinity,
            decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(20),
                boxShadow: BizStyle.shadow()),
            child: Column(
              children: [
                const Text(
                  'Total Sales',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'RWF ${_fmt(totalRevenue.toInt())}',
                  style: const TextStyle(
                    fontSize: 34,
                    fontWeight: FontWeight.w900,
                    color: AppColors.textPrimary,
                    letterSpacing: -1.0,
                  ),
                ),
              ],
            ),
          ),
        )),

        // ── Scrollable content lists ──
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ── KPI Quick Cards Row 1 ──
                Row(
                  children: [
                    _QuickStat(
                      label: 'Wallet Balance',
                      value: 'RWF ${_fmt(walletBalance.toInt())}',
                      icon: Icons.account_balance_wallet_outlined,
                      color: AppColors.success,
                    ),
                    const SizedBox(width: 12),
                    _QuickStat(
                      label: 'Total Orders',
                      value: '$totalOrders',
                      icon: Icons.receipt_long_outlined,
                      color: AppColors.info,
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // ── KPI Quick Cards Row 2 ──
                Row(
                  children: [
                    _QuickStat(
                      label: 'Avg Order Value',
                      value: 'RWF ${_fmt(avgOrderValue.toInt())}',
                      icon: Icons.trending_up_rounded,
                      color: AppColors.accent,
                    ),
                    const SizedBox(width: 12),
                    _QuickStat(
                      label: 'Active Listings',
                      value: '$activeListings',
                      icon: Icons.list_alt_rounded,
                      color: AppColors.warning,
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // ── KPI Quick Cards Row 3 ──
                Row(
                  children: [
                    _QuickStat(
                      label: 'Store Rating',
                      value: rating > 0 ? rating.toStringAsFixed(1) : '—',
                      icon: Icons.star_border_rounded,
                      color: AppColors.warning,
                    ),
                    const SizedBox(width: 12),
                    const Expanded(child: SizedBox.shrink()),
                  ],
                ),
                const SizedBox(height: 24),

                // ── Trend Graph Section ──
                const Text(
                  'Sales & Activity Trends',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Weekly revenue analysis',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppColors.textSecondary.withValues(alpha: 0.8),
                  ),
                ),
                const SizedBox(height: 16),

                Container(
                  height: 220,
                  padding: const EdgeInsets.fromLTRB(10, 20, 20, 10),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: BizStyle.shadow(),
                  ),
                  child: _buildChart(rawTrend),
                ),
                const SizedBox(height: 28),

                // ── Top Products Section ──
                const Text(
                  'Top Performing rescue items',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Products ranked by total quantities sold',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppColors.textSecondary.withValues(alpha: 0.8),
                  ),
                ),
                const SizedBox(height: 14),

                // Top product list cards
                if (rawProducts.isEmpty)
                  const _PlaceholderProductRows()
                else
                  ...List.generate(rawProducts.length, (idx) {
                    final prod = rawProducts[idx] as Map;
                    return _ProductRow(
                      rank: idx + 1,
                      name: prod['name']?.toString() ?? 'Product',
                      sold: (prod['sold'] as num? ?? 0).toInt(),
                      revenue: (prod['revenue'] as num? ?? 0.0).toDouble(),
                    );
                  }),
                const SizedBox(height: 40),
              ],
            ),
          ),
        ),
      ],
    );
  }

  // Double series or sales representation bar builder using fl_chart
  Widget _buildChart(List trend) {
    // Show the chart shape even with no data, greyed out and labelled, so the
    // dashboard never reads as broken or half-built.
    if (trend.isEmpty) {
      return const _PlaceholderBarChart(
        label: 'Not enough data yet',
        hint: 'Your sales trend appears here once orders come through.',
      );
    }

    final double maxVal = trend.fold<double>(
      5000.0,
      (max, w) {
        final val = ((w as Map)['sales'] as num? ?? 0.0).toDouble();
        return val > max ? val : max;
      },
    );

    return BarChart(
      BarChartData(
        alignment: BarChartAlignment.spaceAround,
        maxY: maxVal * 1.25,
        barTouchData: BarTouchData(
          touchTooltipData: BarTouchTooltipData(
            getTooltipColor: (_) => AppColors.darkSurface,
            getTooltipItem: (group, _, rod, __) {
              return BarTooltipItem(
                'RWF ${_fmt(rod.toY.toInt())}',
                const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
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
                final idx = val.toInt();
                if (idx >= 0 && idx < trend.length) {
                  return Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(
                      'Week ${idx + 1}',
                      style: const TextStyle(
                        fontSize: 10,
                        color: AppColors.textSecondary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  );
                }
                return const SizedBox.shrink();
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
          trend.length,
          (i) {
            final salesVal =
                ((trend[i] as Map)['sales'] as num? ?? 0.0).toDouble();
            return BarChartGroupData(
              x: i,
              barRods: [
                BarChartRodData(
                  toY: salesVal,
                  gradient: const LinearGradient(
                    colors: [
                      AppColors.primaryLight,
                      AppColors.primary,
                    ],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                  width: 28,
                  borderRadius:
                      const BorderRadius.vertical(top: Radius.circular(8)),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  static String _fmt(int val) {
    final s = val.toString();
    final buf = StringBuffer();
    for (int i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 == 0) buf.write(',');
      buf.write(s[i]);
    }
    return buf.toString();
  }
}

// ── Quick Stat widget ──
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
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(20),
          boxShadow: BizStyle.shadow(),
        ),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
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
                  Text(
                    label,
                    style: const TextStyle(
                      fontSize: 10,
                      color: AppColors.textSecondary,
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    value,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Ranked Product List Item ──
class _ProductRow extends StatelessWidget {
  final int rank;
  final String name;
  final int sold;
  final double revenue;

  const _ProductRow({
    required this.rank,
    required this.name,
    required this.sold,
    required this.revenue,
  });

  @override
  Widget build(BuildContext context) {
    final rankBg = switch (rank) {
      1 => AppColors.accentSurface,
      2 => AppColors.surfaceVariant,
      3 => AppColors.warningSurface,
      _ => AppColors.surfaceVariant,
    };
    final rankText = switch (rank) {
      1 => AppColors.accentDark,
      2 => AppColors.textSecondary,
      3 => AppColors.pepper,
      _ => AppColors.textTertiary,
    };

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        boxShadow: BizStyle.shadow(),
      ),
      child: Row(
        children: [
          // Rank Badge
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: rankBg,
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                '$rank',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  color: rankText,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),

          // Name and Stats
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  '$sold rescued items sold',
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),

          // Total Revenue
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                'RWF ${_fmt(revenue.toInt())}',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  color: AppColors.primary,
                ),
              ),
              const Text(
                'Total Revenue',
                style: TextStyle(
                  fontSize: 9,
                  color: AppColors.textTertiary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  static String _fmt(int val) {
    final s = val.toString();
    final buf = StringBuffer();
    for (int i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 == 0) buf.write(',');
      buf.write(s[i]);
    }
    return buf.toString();
  }
}

/// A greyed-out bar chart used when there is nothing to plot yet. The shape is
/// dummy data — it exists so the section keeps its visual weight and the user
/// can see what will appear, rather than staring at an empty box.
class _PlaceholderBarChart extends StatelessWidget {
  final String label;
  final String hint;
  const _PlaceholderBarChart({required this.label, required this.hint});

  // Arbitrary but plausible silhouette.
  static const _shape = [0.35, 0.55, 0.4, 0.75, 0.5, 0.85, 0.6];

  @override
  Widget build(BuildContext context) {
    return Stack(
      alignment: Alignment.center,
      children: [
        IgnorePointer(
          child: Opacity(
            opacity: 0.35,
            child: BarChart(
              BarChartData(
                alignment: BarChartAlignment.spaceAround,
                maxY: 1.0,
                minY: 0,
                gridData: const FlGridData(show: false),
                borderData: FlBorderData(show: false),
                titlesData: const FlTitlesData(show: false),
                barTouchData: BarTouchData(enabled: false),
                barGroups: [
                  for (var i = 0; i < _shape.length; i++)
                    BarChartGroupData(
                      x: i,
                      barRods: [
                        BarChartRodData(
                          toY: _shape[i],
                          width: 16,
                          color: AppColors.textTertiary,
                          borderRadius: const BorderRadius.vertical(
                              top: Radius.circular(6)),
                        ),
                      ],
                    ),
                ],
              ),
            ),
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
          decoration: BoxDecoration(
            color: AppColors.surface.withValues(alpha: 0.92),
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: AppColors.moringa.withValues(alpha: 0.08),
                blurRadius: 16,
                offset: const Offset(0, 5),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.insights_rounded,
                      size: 15, color: AppColors.textSecondary),
                  const SizedBox(width: 7),
                  Text(
                    label,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                hint,
                textAlign: TextAlign.center,
                style: const TextStyle(
                    fontSize: 11.5,
                    height: 1.35,
                    color: AppColors.textSecondary),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Greyed skeleton rows standing in for the top-products list.
class _PlaceholderProductRows extends StatelessWidget {
  const _PlaceholderProductRows();

  @override
  Widget build(BuildContext context) {
    return Stack(
      alignment: Alignment.center,
      children: [
        IgnorePointer(
          child: Opacity(
            opacity: 0.3,
            child: Column(
              children: List.generate(
                3,
                (i) => Container(
                  height: 58,
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 30,
                        height: 30,
                        decoration: BoxDecoration(
                          color: AppColors.textTertiary,
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                                height: 9,
                                width: 130,
                                color: AppColors.textTertiary),
                            const SizedBox(height: 7),
                            Container(
                                height: 8,
                                width: 70,
                                color: AppColors.textTertiary),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
          decoration: BoxDecoration(
            color: AppColors.surface.withValues(alpha: 0.94),
            borderRadius: BorderRadius.circular(18),
            boxShadow: [
              BoxShadow(
                color: AppColors.moringa.withValues(alpha: 0.08),
                blurRadius: 14,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: const Text(
            'No sales data yet',
            style: TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary),
          ),
        ),
      ],
    );
  }
}
