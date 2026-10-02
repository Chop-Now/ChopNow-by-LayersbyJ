import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/api/api_exception.dart';
import '../../core/theme/app_colors.dart';
import 'widgets/biz_ui.dart';
import '../../shared/widgets/feedback/cn_states.dart';
import '../../shared/widgets/inputs/animated_segmented_control.dart';

final _businessOrdersProvider = FutureProvider<List<dynamic>>((ref) async {
  final res = await ApiClient.instance.get(AppEndpoints.orders);
  final data = res.data;
  if (data is List) return data;
  if (data is Map) return (data['orders'] ?? data['data'] ?? []) as List;
  return [];
});

class BusinessOrdersScreen extends ConsumerStatefulWidget {
  const BusinessOrdersScreen({super.key});
  @override
  ConsumerState<BusinessOrdersScreen> createState() =>
      _BusinessOrdersScreenState();
}

class _BusinessOrdersScreenState extends ConsumerState<BusinessOrdersScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
    _tabs.addListener(() {
      if (!_tabs.indexIsChanging) {
        setState(() {});
      }
    });
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final asyncOrders = ref.watch(_businessOrdersProvider);

    List<int>? badgeCounts;
    asyncOrders.whenData((allOrders) {
      final newOrders = allOrders.where((o) {
        final status = o['status']?.toString() ?? '';
        final payment = o['payment'] is Map ? o['payment'] : {};
        final method = payment['paymentMethod']?.toString() ?? '';
        return status == 'pending' ||
            status == 'paid' ||
            (status == 'pending_payment' && method == 'cash');
      }).length;
      final activeOrders = allOrders
          .where((o) => ['confirmed', 'preparing', 'ready_for_pickup']
              .contains(o['status']))
          .length;
      final doneOrders = allOrders
          .where((o) => ['completed', 'cancelled'].contains(o['status']))
          .length;
      badgeCounts = [newOrders, activeOrders, doneOrders];
    });

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Orders',
            style: TextStyle(
                fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
        backgroundColor: AppColors.surface,
        automaticallyImplyLeading: false,
        elevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(56),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
            child: AnimatedSegmentedControl(
              segments: const ['New', 'Active', 'Done'],
              selectedIndex: _tabs.index,
              badgeCounts: badgeCounts,
              onValueChanged: (index) {
                _tabs.animateTo(index);
                setState(() {});
              },
            ),
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: AppColors.primary),
            onPressed: () => ref.invalidate(_businessOrdersProvider),
          ),
        ],
      ),
      // Lifted clear of the floating nav pill.
      floatingActionButton: Padding(
        padding: const EdgeInsets.only(bottom: 78),
        child: FloatingActionButton.extended(
          onPressed: () => _showQuickVerifyDialog(),
          backgroundColor: AppColors.primary,
          icon: const Icon(Icons.qr_code_scanner_rounded, color: Colors.white),
          label: const Text('Quick Verify',
              style: TextStyle(
                  color: AppColors.surface,
                  fontWeight: FontWeight.w700,
                  fontSize: 13)),
        ),
      ),
      body: asyncOrders.when(
        loading: () => const Center(
            child: CircularProgressIndicator(color: AppColors.primary)),
        error: (e, _) => CnErrorState(
            message: e.toString(),
            onRetry: () => ref.invalidate(_businessOrdersProvider)),
        data: (allOrders) {
          final newOrders = allOrders.where((o) {
            final status = o['status']?.toString() ?? '';
            final payment = o['payment'] is Map ? o['payment'] : {};
            final method = payment['paymentMethod']?.toString() ?? '';
            return status == 'pending' ||
                status == 'paid' ||
                (status == 'pending_payment' && method == 'cash');
          }).toList();
          final activeOrders = allOrders
              .where((o) => ['confirmed', 'preparing', 'ready_for_pickup']
                  .contains(o['status']))
              .toList();
          final doneOrders = allOrders
              .where((o) => ['completed', 'cancelled'].contains(o['status']))
              .toList();

          return RefreshIndicator(
            color: AppColors.primary,
            onRefresh: () async => ref.invalidate(_businessOrdersProvider),
            child: TabBarView(
              controller: _tabs,
              children: [
                _OrderList(
                    orders: newOrders,
                    emptyMessage: 'No new orders',
                    onUpdate: (id, status) => _updateStatus(id, status),
                    onVerifyPickup: (id) => _showVerifyPickupDialog(id)),
                _OrderList(
                    orders: activeOrders,
                    emptyMessage: 'No active orders',
                    onUpdate: (id, status) => _updateStatus(id, status),
                    onVerifyPickup: (id) => _showVerifyPickupDialog(id)),
                _OrderList(
                    orders: doneOrders,
                    emptyMessage: 'No completed orders',
                    showActions: false,
                    onUpdate: (_, __) {},
                    onVerifyPickup: (_) {}),
              ],
            ),
          );
        },
      ),
    );
  }

  Future<void> _updateStatus(String orderId, String newStatus) async {
    HapticFeedback.mediumImpact();
    try {
      await ApiClient.instance
          .put(AppEndpoints.orderStatus(orderId), data: {'status': newStatus});
      ref.invalidate(_businessOrdersProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('Order status updated to $newStatus'),
              backgroundColor: AppColors.primary),
        );
      }
    } on Exception catch (e) {
      final msg = e is ApiException ? e.message : 'Failed to update order';
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(msg), backgroundColor: AppColors.error));
      }
    }
  }

  Future<void> _showVerifyPickupDialog(String orderId) async {
    final code = await showDialog<String>(
      context: context,
      barrierDismissible: false,
      builder: (_) => _PickupCodeDialog(
        title: 'Verify Pickup Code',
        subtitle:
            'Order #${orderId.length > 8 ? orderId.substring(0, 8) : orderId}',
      ),
    );
    if (code == null || !mounted) return;

    HapticFeedback.mediumImpact();
    try {
      await ApiClient.instance
          .post(AppEndpoints.verifyPickup(orderId), data: {'code': code});
      ref.invalidate(_businessOrdersProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text(
                  'Pickup verified for #${orderId.length > 8 ? orderId.substring(0, 8) : orderId}'),
              backgroundColor: AppColors.primary),
        );
      }
    } on Exception catch (e) {
      final msg = e is ApiException ? e.message : 'Verification failed';
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(msg), backgroundColor: AppColors.error));
      }
    }
  }

  Future<void> _showQuickVerifyDialog() async {
    final code = await showDialog<String>(
      context: context,
      barrierDismissible: false,
      builder: (_) => const _PickupCodeDialog(
        title: 'Quick Verify Pickup Code',
        subtitle: 'Enter the customer\'s 6-digit code',
      ),
    );
    if (code == null || !mounted) return;

    HapticFeedback.mediumImpact();
    try {
      final res = await ApiClient.instance
          .post(AppEndpoints.verifyPickupDirect, data: {'code': code});
      ref.invalidate(_businessOrdersProvider);
      final orderId = res.data is Map
          ? (res.data['order']?['_id'] ?? res.data['_id'] ?? '').toString()
          : '';
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text(orderId.isNotEmpty
                  ? 'Pickup verified for #${orderId.length > 8 ? orderId.substring(0, 8) : orderId}'
                  : 'Pickup verified successfully'),
              backgroundColor: AppColors.primary),
        );
      }
    } on Exception catch (e) {
      final msg = e is ApiException ? e.message : 'Verification failed';
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(msg), backgroundColor: AppColors.error));
      }
    }
  }
}

// ── Pickup Code Dialog ─────────────────────────────────────────────────────

class _PickupCodeDialog extends StatefulWidget {
  final String title;
  final String subtitle;
  const _PickupCodeDialog({required this.title, required this.subtitle});

  @override
  State<_PickupCodeDialog> createState() => _PickupCodeDialogState();
}

class _PickupCodeDialogState extends State<_PickupCodeDialog> {
  final List<TextEditingController> _controllers =
      List.generate(6, (_) => TextEditingController());
  final List<FocusNode> _focusNodes = List.generate(6, (_) => FocusNode());
  bool _isLoading = false;
  String? _error;

  @override
  void dispose() {
    for (final c in _controllers) {
      c.dispose();
    }
    for (final f in _focusNodes) {
      f.dispose();
    }
    super.dispose();
  }

  String get _code => _controllers.map((c) => c.text.toUpperCase()).join();
  bool get _isComplete => _code.length == 6;

  void _onChanged(int index, String value) {
    if (_error != null) setState(() => _error = null);

    if (value.length == 1 && index < 5) {
      _focusNodes[index + 1].requestFocus();
    }
    // Handle paste: if multiple characters entered, fill remaining fields
    if (value.length > 1) {
      final chars = value.split('');
      for (var i = 0; i < chars.length && (index + i) < 6; i++) {
        _controllers[index + i].text = chars[i];
      }
      final nextIdx = (index + chars.length).clamp(0, 5);
      _focusNodes[nextIdx].requestFocus();
    }
    setState(() {});
  }

  void _onBackspace(int index) {
    if (_controllers[index].text.isEmpty && index > 0) {
      _controllers[index - 1].clear();
      _focusNodes[index - 1].requestFocus();
      setState(() {});
    }
  }

  void _submit() {
    if (!_isComplete) {
      setState(() => _error = 'Please enter all 6 digits');
      return;
    }
    setState(() => _isLoading = true);
    Navigator.of(context).pop(_code);
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: AppColors.surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      insetPadding: const EdgeInsets.symmetric(horizontal: 24),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 28, 24, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(14),
              decoration: const BoxDecoration(
                color: AppColors.primarySurface,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.verified_user_rounded,
                  color: AppColors.primary, size: 32),
            ),
            const SizedBox(height: 16),
            Text(widget.title,
                style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary)),
            const SizedBox(height: 4),
            Text(widget.subtitle,
                style: const TextStyle(
                    fontSize: 13, color: AppColors.textSecondary)),
            const SizedBox(height: 24),

            // 6-digit PIN input
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(6, (i) {
                return Container(
                  width: 44,
                  height: 52,
                  margin: EdgeInsets.only(right: i < 5 ? 8 : 0),
                  child: KeyboardListener(
                    focusNode: FocusNode(),
                    onKeyEvent: (event) {
                      if (event is KeyDownEvent &&
                          event.logicalKey == LogicalKeyboardKey.backspace) {
                        _onBackspace(i);
                      }
                    },
                    child: TextField(
                      controller: _controllers[i],
                      focusNode: _focusNodes[i],
                      keyboardType: TextInputType.text,
                      textCapitalization: TextCapitalization.characters,
                      textAlign: TextAlign.center,
                      maxLength: 1,
                      style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary),
                      inputFormatters: [
                        FilteringTextInputFormatter.allow(
                            RegExp(r'[a-zA-Z0-9]')),
                      ],
                      decoration: InputDecoration(
                        counterText: '',
                        contentPadding:
                            const EdgeInsets.symmetric(vertical: 12),
                        filled: true,
                        fillColor: AppColors.background,
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(
                              color: _error != null
                                  ? AppColors.error
                                  : AppColors.border,
                              width: 1.5),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(
                              color: AppColors.primary, width: 2),
                        ),
                      ),
                      onChanged: (v) => _onChanged(i, v),
                    ),
                  ),
                );
              }),
            ),

            if (_error != null) ...[
              const SizedBox(height: 10),
              Text(_error!,
                  style: const TextStyle(
                      color: AppColors.error,
                      fontSize: 12,
                      fontWeight: FontWeight.w600)),
            ],

            const SizedBox(height: 24),

            // Verify button
            SizedBox(
              width: double.infinity,
              child: GestureDetector(
                onTap: _isLoading ? null : _submit,
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  decoration: BoxDecoration(
                    color: _isComplete
                        ? AppColors.primary
                        : AppColors.primary.withValues(alpha: 0.4),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                    child: _isLoading
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                                color: Colors.white, strokeWidth: 2.5))
                        : const Text('Verify Pickup',
                            style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w700,
                                fontSize: 15)),
                  ),
                ),
              ),
            ),

            const SizedBox(height: 10),

            // Cancel button
            GestureDetector(
              onTap: _isLoading ? null : () => Navigator.of(context).pop(),
              child: const Padding(
                padding: EdgeInsets.symmetric(vertical: 6),
                child: Text('Cancel',
                    style: TextStyle(
                        color: AppColors.textSecondary,
                        fontWeight: FontWeight.w600,
                        fontSize: 14)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Order List ─────────────────────────────────────────────────────────────

class _OrderList extends StatelessWidget {
  final List<dynamic> orders;
  final String emptyMessage;
  final bool showActions;
  final void Function(String id, String status) onUpdate;
  final void Function(String id) onVerifyPickup;
  const _OrderList(
      {required this.orders,
      required this.emptyMessage,
      required this.onUpdate,
      required this.onVerifyPickup,
      this.showActions = true});

  @override
  Widget build(BuildContext context) {
    if (orders.isEmpty) {
      return CnEmptyState(
          title: emptyMessage, imagePath: 'assets/images/empty_orders.png');
    }
    return ListView.separated(
      physics:
          const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
      padding: const EdgeInsets.all(12),
      itemCount: orders.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (_, i) => _BusinessOrderCard(
          order: orders[i],
          showActions: showActions,
          onUpdate: onUpdate,
          onVerifyPickup: onVerifyPickup),
    );
  }
}

// ── Order Card ─────────────────────────────────────────────────────────────

class _BusinessOrderCard extends StatelessWidget {
  final dynamic order;
  final bool showActions;
  final void Function(String id, String status) onUpdate;
  final void Function(String id) onVerifyPickup;
  const _BusinessOrderCard(
      {required this.order,
      required this.showActions,
      required this.onUpdate,
      required this.onVerifyPickup});

  @override
  Widget build(BuildContext context) {
    final status = order['status']?.toString() ?? 'pending';
    final orderId = order['_id']?.toString() ?? '';
    final customerName = order['customer'] is Map
        ? '${order['customer']['firstName'] ?? ''} ${order['customer']['lastName'] ?? ''}'
            .trim()
        : order['user'] is Map
            ? '${order['user']['firstName'] ?? ''} ${order['user']['lastName'] ?? ''}'
                .trim()
            : 'Customer';

    final payment = order['payment'] is Map ? order['payment'] : {};
    final method = payment['paymentMethod']?.toString() ?? '';
    final isNew = status == 'pending' ||
        status == 'paid' ||
        (status == 'pending_payment' && method == 'cash');

    final (color, label) = isNew
        ? (AppColors.warning, 'NEW')
        : switch (status) {
            'confirmed' => (AppColors.primary, 'CONFIRMED'),
            'preparing' => (AppColors.primary, 'PREPARING'),
            'ready_for_pickup' => (AppColors.success, 'READY'),
            'completed' => (AppColors.success, 'COMPLETED'),
            'cancelled' => (AppColors.error, 'CANCELLED'),
            _ => (AppColors.textSecondary, status.toUpperCase()),
          };

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        boxShadow: BizStyle.shadow(),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
                'ORDER #${orderId.length > 5 ? orderId.substring(orderId.length - 5).toUpperCase() : orderId}',
                style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 14,
                    color: AppColors.textPrimary)),
            Row(
              children: [
                Container(
                  width: 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: color,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  label,
                  style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.5,
                      color: color),
                ),
              ],
            ),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: AppColors.surfaceVariant,
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Icon(Icons.receipt_long_rounded,
                  color: AppColors.textSecondary, size: 24),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(customerName,
                      style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary)),
                  const SizedBox(height: 4),
                  if (order['items'] is List)
                    ...(order['items'] as List).take(2).map((item) {
                      if (item is! Map) return const SizedBox.shrink();
                      final title = item['title'] ??
                          (item['listing'] is Map
                              ? item['listing']['title']
                              : null) ??
                          'Item';
                      return Text('${item['quantity']}x $title',
                          style: const TextStyle(
                              fontSize: 13,
                              color: AppColors.textSecondary,
                              fontWeight: FontWeight.w500));
                    }),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text('RWF ${order['total'] ?? order['totalAmount'] ?? 0}',
              style: const TextStyle(
                  fontWeight: FontWeight.w900,
                  color: AppColors.textPrimary,
                  fontSize: 18)),
          Text(order['fulfillmentType'] == 'delivery' ? 'Delivery' : 'Pickup',
              style: const TextStyle(
                  fontSize: 13,
                  color: AppColors.textSecondary,
                  fontWeight: FontWeight.w600)),
        ]),
        if (showActions) ...[
          const SizedBox(height: 16),
          _actionButtons(order),
        ],
      ]),
    );
  }

  Widget _actionButtons(dynamic order) {
    final status = order['status']?.toString() ?? 'pending';
    final orderId = order['_id']?.toString() ?? '';
    final payment = order['payment'] is Map ? order['payment'] : {};
    final method = payment['paymentMethod']?.toString() ?? '';

    final isNew = status == 'pending' ||
        status == 'paid' ||
        (status == 'pending_payment' && method == 'cash');

    if (isNew) {
      return Row(children: [
        Expanded(
            child: _OutlineBtn(
                label: 'Reject',
                color: AppColors.error,
                onTap: () => onUpdate(orderId, 'cancelled'))),
        const SizedBox(width: 12),
        Expanded(
            child: _FilledBtn(
                label: 'Accept', onTap: () => onUpdate(orderId, 'confirmed'))),
      ]);
    }

    return switch (status) {
      'confirmed' => _FilledBtn(
          label: 'Start Preparing',
          onTap: () => onUpdate(orderId, 'preparing')),
      'preparing' => _FilledBtn(
          label: 'Mark as Ready',
          onTap: () => onUpdate(orderId, 'ready_for_pickup')),
      'ready_for_pickup' => _FilledBtn(
          label: 'Verify & Complete', onTap: () => onVerifyPickup(orderId)),
      _ => const SizedBox.shrink(),
    };
  }
}

// ── Button Widgets ─────────────────────────────────────────────────────────

class _FilledBtn extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  const _FilledBtn({required this.label, required this.onTap});
  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
              color: AppColors.primary,
              borderRadius: BorderRadius.circular(10)),
          child: Center(
              child: Text(label,
                  style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                      fontSize: 13))),
        ),
      );
}

class _OutlineBtn extends StatelessWidget {
  final String label;
  final Color color;
  final VoidCallback onTap;
  const _OutlineBtn(
      {required this.label, required this.color, required this.onTap});
  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: color)),
          child: Center(
              child: Text(label,
                  style: TextStyle(
                      color: color,
                      fontWeight: FontWeight.w700,
                      fontSize: 13))),
        ),
      );
}
