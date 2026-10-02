import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_colors.dart';
import 'widgets/biz_ui.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/api/api_exception.dart';
import '../../core/providers/business_provider.dart';
import '../../shared/widgets/inputs/cn_text_field.dart';
import '../../shared/widgets/buttons/cn_buttons.dart';

final payoutsHistoryProvider =
    FutureProvider.autoDispose<List<dynamic>>((ref) async {
  final res = await ApiClient.instance.get(AppEndpoints.payoutsMe);
  final data = res.data;
  if (data is List) return data;
  if (data is Map) return (data['payouts'] ?? data['data'] ?? []) as List;
  return [];
});

class PayoutsScreen extends ConsumerStatefulWidget {
  const PayoutsScreen({super.key});

  @override
  ConsumerState<PayoutsScreen> createState() => _PayoutsScreenState();
}

class _PayoutsScreenState extends ConsumerState<PayoutsScreen> {
  final _formKey = GlobalKey<FormState>();
  final _withdrawFormKey = GlobalKey<FormState>();

  // Bank form controllers
  final _bankNameCtrl = TextEditingController();
  final _accountHolderCtrl = TextEditingController();
  final _accountNumberCtrl = TextEditingController();
  final _swiftCodeCtrl = TextEditingController();

  // Mobile money controllers
  final _mobileAccountNameCtrl = TextEditingController();
  final _mobilePhoneCtrl = TextEditingController();
  String _mobileProvider = 'MTN';

  // Withdraw controller
  final _withdrawAmountCtrl = TextEditingController();

  String _preferredMethod = 'mobile'; // 'bank' or 'mobile'
  bool _isEditing = false;
  bool _isSavingSettings = false;
  bool _isRequestingPayout = false;
  String? _error;
  String? _businessId;
  double _balance = 0.0;

  @override
  void initState() {
    super.initState();
    _fetchBusinessInfo();
  }

  @override
  void dispose() {
    _bankNameCtrl.dispose();
    _accountHolderCtrl.dispose();
    _accountNumberCtrl.dispose();
    _swiftCodeCtrl.dispose();
    _mobileAccountNameCtrl.dispose();
    _mobilePhoneCtrl.dispose();
    _withdrawAmountCtrl.dispose();
    super.dispose();
  }

  Future<void> _fetchBusinessInfo() async {
    try {
      final res = await ApiClient.instance.get(AppEndpoints.myBusinesses);
      final data = res.data;
      final List items;
      if (data is List) {
        items = data;
      } else if (data is Map && data['businesses'] != null) {
        items = data['businesses'] as List;
      } else if (data is Map && data['data'] != null) {
        items = data['data'] as List;
      } else {
        items = [];
      }

      if (items.isNotEmpty) {
        final bizJson = items.first as Map<String, dynamic>;
        _businessId = bizJson['_id'] ?? bizJson['id'];

        final payoutInfo = bizJson['payoutInfo'] as Map?;
        if (payoutInfo != null) {
          _bankNameCtrl.text = payoutInfo['bankName'] ?? '';
          _accountHolderCtrl.text = payoutInfo['accountHolder'] ?? '';
          _accountNumberCtrl.text = payoutInfo['accountNumber'] ?? '';
          _swiftCodeCtrl.text = payoutInfo['swiftCode'] ?? '';
          _mobileAccountNameCtrl.text = payoutInfo['mobileAccountName'] ?? '';
          _mobilePhoneCtrl.text = payoutInfo['mobilePhone'] ?? '';
          _mobileProvider = payoutInfo['mobileProvider'] ?? 'MTN';
          _preferredMethod = payoutInfo['preferredMethod'] ?? 'mobile';
        }

        final stats = bizJson['stats'] as Map?;
        if (stats != null) {
          _balance = (stats['balance'] as num?)?.toDouble() ?? 0.0;
        }

        if (mounted) setState(() {});
      }
    } catch (e) {
      if (kDebugMode) debugPrint('Error fetching business payout info: $e');
    }
  }

  Future<void> _saveSettings() async {
    if (_businessId == null) return;
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isSavingSettings = true;
      _error = null;
    });

    try {
      final payoutInfo = {
        'preferredMethod': _preferredMethod,
        'bankName': _bankNameCtrl.text.trim(),
        'accountHolder': _accountHolderCtrl.text.trim(),
        'accountNumber': _accountNumberCtrl.text.trim(),
        'swiftCode': _swiftCodeCtrl.text.trim(),
        'mobileProvider': _mobileProvider,
        'mobilePhone': _mobilePhoneCtrl.text.trim(),
        'mobileAccountName': _mobileAccountNameCtrl.text.trim(),
      };

      await ApiClient.instance.put(
        AppEndpoints.businessById(_businessId!),
        data: {'payoutInfo': payoutInfo},
      );

      ref.invalidate(myBusinessesProvider);
      HapticFeedback.heavyImpact();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Payout info updated successfully'),
              backgroundColor: AppColors.primary),
        );
        setState(() => _isEditing = false);
      }
    } on Exception catch (e) {
      setState(() {
        _error = e is ApiException ? e.message : e.toString();
      });
    } finally {
      if (mounted) setState(() => _isSavingSettings = false);
    }
  }

  Future<void> _requestPayout() async {
    if (_businessId == null) return;
    if (!_withdrawFormKey.currentState!.validate()) return;

    final amountStr = _withdrawAmountCtrl.text.trim();
    final amount = double.tryParse(amountStr);
    if (amount == null || amount <= 0) return;

    if (amount > _balance) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Insufficient balance'),
            backgroundColor: AppColors.error),
      );
      return;
    }

    setState(() {
      _isRequestingPayout = true;
      _error = null;
    });

    try {
      await ApiClient.instance.post(
        AppEndpoints.payoutsRequest,
        data: {
          'amount': amount,
          'method': _preferredMethod,
        },
      );

      _withdrawAmountCtrl.clear();
      ref.invalidate(payoutsHistoryProvider);
      await _fetchBusinessInfo(); // Reload balance

      HapticFeedback.heavyImpact();

      if (mounted) {
        Navigator.pop(context); // Close dialog
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Payout requested successfully!'),
              backgroundColor: AppColors.primary),
        );
      }
    } on Exception catch (e) {
      if (mounted) {
        final msg = e is ApiException ? e.message : e.toString();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(msg), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _isRequestingPayout = false);
    }
  }

  void _showWithdrawDialog() {
    showDialog(
      context: context,
      useRootNavigator: false,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Text('Request Payout',
              style: TextStyle(fontWeight: FontWeight.w800)),
          content: Form(
            key: _withdrawFormKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Available Balance: RWF ${_balance.toStringAsFixed(0)}',
                  style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      color: AppColors.primary,
                      fontSize: 13),
                ),
                const SizedBox(height: 12),
                CnTextField(
                  label: 'Amount to Withdraw (RWF) *',
                  controller: _withdrawAmountCtrl,
                  hint: 'Min 5,000 RWF',
                  keyboardType: TextInputType.number,
                  validator: (v) {
                    if (v == null || double.tryParse(v) == null) {
                      return 'Enter a valid amount';
                    }
                    final amt = double.parse(v);
                    if (amt < 5000) return 'Minimum withdrawal is 5,000 RWF';
                    if (amt > _balance) {
                      return 'Amount exceeds available balance';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 8),
                Text(
                  'Withdrawal will be processed via your preferred method: ${_preferredMethod.toUpperCase()}',
                  style: const TextStyle(
                      fontSize: 11, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: _isRequestingPayout
                  ? null
                  : () async {
                      setDialogState(() => _isRequestingPayout = true);
                      await _requestPayout();
                      setDialogState(() => _isRequestingPayout = false);
                    },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10)),
              ),
              child: _isRequestingPayout
                  ? const SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white))
                  : const Text('Submit'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final asyncPayouts = ref.watch(payoutsHistoryProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Payouts & Earnings',
            style: TextStyle(
                fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: AppColors.primary),
            onPressed: () {
              _fetchBusinessInfo();
              ref.invalidate(payoutsHistoryProvider);
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Balance Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.primary, AppColors.primaryDark],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primary.withValues(alpha: 0.25),
                    blurRadius: 16,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Available Balance',
                      style: TextStyle(
                          color: Colors.white70,
                          fontSize: 13,
                          fontWeight: FontWeight.w600)),
                  const SizedBox(height: 6),
                  Text(
                    'RWF ${_balance.toStringAsFixed(0)}',
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 36,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -0.5),
                  ),
                  const SizedBox(height: 18),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _balance >= 5000 ? _showWithdrawDialog : null,
                      icon: const Icon(Icons.account_balance_wallet_rounded,
                          size: 16),
                      label: const Text('Request Withdrawal',
                          style: TextStyle(fontWeight: FontWeight.bold)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.background,
                        foregroundColor: AppColors.primary,
                        disabledBackgroundColor:
                            Colors.white.withValues(alpha: 0.4),
                        disabledForegroundColor: Colors.white70,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Schedule Info
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.primarySurface,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(
                    color: AppColors.primary.withValues(alpha: 0.15)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline_rounded,
                      color: AppColors.primary, size: 20),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Settlements are automatically processed on the 1st and 15th of each month.',
                      style: TextStyle(
                          fontSize: 12,
                          color: AppColors.primary.withValues(alpha: 0.9),
                          fontWeight: FontWeight.w600,
                          height: 1.4),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Method Selector & Settings form
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Payout Account Details',
                    style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary)),
                TextButton.icon(
                  onPressed: () {
                    setState(() {
                      if (_isEditing) {
                        _isEditing = false;
                        _fetchBusinessInfo(); // Revert
                      } else {
                        _isEditing = true;
                      }
                    });
                  },
                  icon: Icon(_isEditing ? Icons.close : Icons.edit, size: 16),
                  label: Text(_isEditing ? 'Cancel' : 'Edit'),
                ),
              ],
            ),
            const SizedBox(height: 8),

            Form(
              key: _formKey,
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: BizStyle.shadow(),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Preferred payout channel:',
                        style: TextStyle(
                            fontSize: 12,
                            color: AppColors.textSecondary,
                            fontWeight: FontWeight.bold)),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: ChoiceChip(
                            label: const Center(child: Text('Mobile Money')),
                            selected: _preferredMethod == 'mobile',
                            onSelected: _isEditing
                                ? (val) =>
                                    setState(() => _preferredMethod = 'mobile')
                                : null,
                            selectedColor: AppColors.primarySurface,
                            labelStyle: TextStyle(
                              color: _preferredMethod == 'mobile'
                                  ? AppColors.primary
                                  : AppColors.textSecondary,
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: ChoiceChip(
                            label: const Center(child: Text('Bank Account')),
                            selected: _preferredMethod == 'bank',
                            onSelected: _isEditing
                                ? (val) =>
                                    setState(() => _preferredMethod = 'bank')
                                : null,
                            selectedColor: AppColors.primarySurface,
                            labelStyle: TextStyle(
                              color: _preferredMethod == 'bank'
                                  ? AppColors.primary
                                  : AppColors.textSecondary,
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    if (_preferredMethod == 'mobile') ...[
                      DropdownButtonFormField<String>(
                        initialValue: _mobileProvider,
                        decoration: InputDecoration(
                          labelText: 'Mobile Money Provider *',
                          labelStyle: const TextStyle(
                              fontSize: 12, color: AppColors.textSecondary),
                          border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8)),
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 10),
                        ),
                        items: ['MTN', 'Airtel', 'Vodafone'].map((p) {
                          return DropdownMenuItem(
                              value: p,
                              child: Text(p,
                                  style: const TextStyle(fontSize: 13)));
                        }).toList(),
                        onChanged: _isEditing
                            ? (val) => setState(() => _mobileProvider = val!)
                            : null,
                      ),
                      const SizedBox(height: 12),
                      CnTextField(
                        label: 'Registered Account Name *',
                        controller: _mobileAccountNameCtrl,
                        hint: 'e.g. John Doe',
                        readOnly: !_isEditing,
                        validator: (v) => _preferredMethod == 'mobile' &&
                                (v == null || v.trim().isEmpty)
                            ? 'Required'
                            : null,
                      ),
                      const SizedBox(height: 12),
                      CnTextField(
                        label: 'Mobile Money Phone Number *',
                        controller: _mobilePhoneCtrl,
                        hint: 'e.g. 0788XXXXXX',
                        keyboardType: TextInputType.phone,
                        readOnly: !_isEditing,
                        validator: (v) => _preferredMethod == 'mobile' &&
                                (v == null || v.trim().length < 9)
                            ? 'Required valid phone'
                            : null,
                      ),
                    ] else ...[
                      CnTextField(
                        label: 'Bank Name *',
                        controller: _bankNameCtrl,
                        hint: 'e.g. BK, I&M, Equity',
                        readOnly: !_isEditing,
                        validator: (v) => _preferredMethod == 'bank' &&
                                (v == null || v.trim().isEmpty)
                            ? 'Required'
                            : null,
                      ),
                      const SizedBox(height: 12),
                      CnTextField(
                        label: 'Account Holder Name *',
                        controller: _accountHolderCtrl,
                        hint: 'e.g. John Doe',
                        readOnly: !_isEditing,
                        validator: (v) => _preferredMethod == 'bank' &&
                                (v == null || v.trim().isEmpty)
                            ? 'Required'
                            : null,
                      ),
                      const SizedBox(height: 12),
                      CnTextField(
                        label: 'Account Number *',
                        controller: _accountNumberCtrl,
                        hint: 'e.g. 1000293849182',
                        keyboardType: TextInputType.number,
                        readOnly: !_isEditing,
                        validator: (v) => _preferredMethod == 'bank' &&
                                (v == null || v.trim().length < 8)
                            ? 'Required valid account'
                            : null,
                      ),
                      const SizedBox(height: 12),
                      CnTextField(
                        label: 'SWIFT / BIC Code (Optional)',
                        controller: _swiftCodeCtrl,
                        hint: 'e.g. BKRWRWKW',
                        readOnly: !_isEditing,
                      ),
                    ],
                    if (_isEditing) ...[
                      const SizedBox(height: 16),
                      if (_error != null) ...[
                        Text(_error!,
                            style: const TextStyle(
                                color: AppColors.error, fontSize: 12)),
                        const SizedBox(height: 8),
                      ],
                      SizedBox(
                        width: double.infinity,
                        child: CnPrimaryButton(
                          label: _isSavingSettings
                              ? 'Saving Settings...'
                              : 'Save Payment Info',
                          isLoading: _isSavingSettings,
                          onTap: _isSavingSettings ? null : _saveSettings,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Payout History
            const Text('Payout History',
                style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary)),
            const SizedBox(height: 8),

            asyncPayouts.when(
              loading: () => const Center(
                  child: Padding(
                      padding: EdgeInsets.all(20),
                      child:
                          CircularProgressIndicator(color: AppColors.primary))),
              error: (e, _) =>
                  Center(child: Text(ApiException.fromDioError(e).message)),
              data: (payouts) {
                if (payouts.isEmpty) {
                  return Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppColors.border)),
                    child: const Center(
                        child: Text('No payout transactions found',
                            style: TextStyle(
                                color: AppColors.textTertiary, fontSize: 13))),
                  );
                }
                return ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: payouts.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (_, i) {
                    final p = payouts[i];
                    final amount = (p['amount'] as num?)?.toDouble() ?? 0.0;
                    final status = p['status']?.toString() ?? 'requested';
                    final dateStr = p['createdAt'] != null
                        ? DateTime.parse(p['createdAt'])
                            .toLocal()
                            .toString()
                            .substring(0, 10)
                        : 'N/A';
                    final method = p['method']?.toString() ?? 'mobile';

                    final (badgeColor, badgeBg, badgeText) = switch (status) {
                      'completed' => (
                          AppColors.success,
                          AppColors.successSurface,
                          'Completed'
                        ),
                      'processing' => (
                          AppColors.primary,
                          AppColors.primarySurface,
                          'Processing'
                        ),
                      'failed' => (
                          AppColors.error,
                          AppColors.errorSurface,
                          'Failed'
                        ),
                      'cancelled' => (
                          AppColors.textSecondary,
                          AppColors.surfaceVariant,
                          'Cancelled'
                        ),
                      _ => (
                          AppColors.warning,
                          AppColors.warningSurface,
                          'Pending'
                        ),
                    };

                    return Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: BizStyle.shadow(),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: method == 'mobile'
                                  ? AppColors.nowYellow.withValues(alpha: 0.18)
                                  : AppColors.info.withValues(alpha: 0.12),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              method == 'mobile'
                                  ? Icons.phone_android_rounded
                                  : Icons.account_balance_rounded,
                              color: method == 'mobile'
                                  ? AppColors.accentDark
                                  : AppColors.info,
                              size: 20,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Withdrawal via ${method.toUpperCase()}',
                                  style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 13,
                                      color: AppColors.textPrimary),
                                ),
                                const SizedBox(height: 4),
                                Text(dateStr,
                                    style: const TextStyle(
                                        fontSize: 11,
                                        color: AppColors.textTertiary)),
                              ],
                            ),
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                'RWF ${amount.toStringAsFixed(0)}',
                                style: const TextStyle(
                                    fontWeight: FontWeight.w800,
                                    fontSize: 13,
                                    color: AppColors.textPrimary),
                              ),
                              const SizedBox(height: 4),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                    color: badgeBg,
                                    borderRadius: BorderRadius.circular(100)),
                                child: Text(badgeText,
                                    style: TextStyle(
                                        fontSize: 9,
                                        fontWeight: FontWeight.bold,
                                        color: badgeColor)),
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  },
                );
              },
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}
