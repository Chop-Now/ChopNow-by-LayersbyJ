import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/services/socket_service.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/widgets/buttons/cn_buttons.dart';
import '../../shared/widgets/inputs/cn_text_field.dart';

/// One mobile-money prompt for a whole checkout (several vendor orders, via
/// [checkoutId]) or a single unpaid order (via [orderId]).
///
/// [onPaid] runs once the payment is confirmed (by socket or polling);
/// [onLater] when the customer closes the sheet to pay later.
Future<void> showMobileMoneyPaymentSheet({
  required BuildContext context,
  required WidgetRef ref,
  String? checkoutId,
  String? orderId,
  required List<String> orderIds,
  required double total,
  String initialProvider = 'momo',
  required VoidCallback onPaid,
  required VoidCallback onLater,
}) {
  assert(checkoutId != null || orderId != null);
  final phoneCtrl =
      TextEditingController(text: ref.read(currentUserProvider)?.phone ?? '');
  String provider = initialProvider == 'airtel' ? 'airtel' : 'momo';
  String statusText = 'Confirm your number below to pay.';
  String? sheetError;
  bool isPaymentLoading = false;
  bool finished = false;

  StreamSubscription? socketSub;
  Timer? pollTimer;

  void stopWatching() {
    pollTimer?.cancel();
    socketSub?.cancel();
  }

  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    isDismissible: false,
    enableDrag: false,
    shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    builder: (ctx) {
      return StatefulBuilder(
        builder: (ctx, setSheetState) {
          final isMomo = provider == 'momo';
          final themeColor = isMomo ? AppColors.nowYellow : AppColors.error;
          final providerName = isMomo ? 'MTN MoMo' : 'Airtel Money';

          void succeed() {
            if (finished) return;
            finished = true;
            stopWatching();
            setSheetState(() => statusText = 'Payment successful! Redirecting...');
            HapticFeedback.heavyImpact();
            Future.delayed(const Duration(seconds: 2), () {
              if (ctx.mounted) Navigator.pop(ctx);
              onPaid();
            });
          }

          void fail(String message) {
            if (finished) return;
            stopWatching();
            setSheetState(() {
              isPaymentLoading = false;
              sheetError = message;
            });
          }

          Future<void> pay() async {
            var phone = phoneCtrl.text.trim().replaceAll(RegExp(r'[\s+]'), '');
            if (phone.startsWith('0')) phone = '250${phone.substring(1)}';
            if (!RegExp(r'^250\d{9}$').hasMatch(phone)) {
              setSheetState(() =>
                  sheetError = 'Enter a valid Rwandan number (e.g. 078xxxxxxx)');
              return;
            }

            setSheetState(() {
              isPaymentLoading = true;
              sheetError = null;
              statusText = 'Initiating payment...';
            });

            try {
              final response =
                  await ApiClient.instance.post(AppEndpoints.paymentDeposit, data: {
                if (checkoutId != null) 'checkoutId': checkoutId else 'orderId': orderId,
                'phoneNumber': phone,
                'correspondent': isMomo ? 'MTN_MOMO_RWA' : 'AIRTEL_RWA',
              });
              final data = response.data;
              if (data is! Map || data['success'] != true) {
                fail('Payment initiation rejected by provider.');
                return;
              }
              setSheetState(() => statusText = 'Prompt sent! Enter PIN on your phone...');

              final paidFor = ((data['orders'] as List?) ?? orderIds)
                  .map((e) => e.toString())
                  .toList();

              socketSub = SocketService().orderStatusStream.listen((event) {
                if (paidFor.contains(event['_id']?.toString()) &&
                    event['status'] == 'paid') {
                  succeed();
                }
              });

              int polls = 0;
              const maxPolls = 20; // ~60 seconds
              pollTimer = Timer.periodic(const Duration(seconds: 3), (timer) async {
                if (finished) {
                  timer.cancel();
                  return;
                }
                polls++;
                try {
                  final status = await ApiClient.instance
                      .get(AppEndpoints.paymentStatus(paidFor.first));
                  final s = status.data is Map ? status.data['status'] : null;
                  if (s == 'completed') {
                    succeed();
                    return;
                  }
                  if (s == 'failed') {
                    final description =
                        status.data['failureReason']?['description'] ??
                            'Transaction failed';
                    fail('Payment failed: $description');
                    return;
                  }
                } catch (_) {
                  // transient - keep polling until the timeout
                }
                if (polls >= maxPolls) {
                  fail('Payment confirmation timed out. If money left your '
                      'account, your order will update shortly - check your orders.');
                }
              });
            } catch (e) {
              fail(e.toString().replaceAll('Exception: ', ''));
            }
          }

          return PopScope(
            canPop: !isPaymentLoading,
            child: Padding(
              padding: EdgeInsets.fromLTRB(
                  20, 20, 20, MediaQuery.of(ctx).viewInsets.bottom + 20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('$providerName Checkout',
                          style: const TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w800,
                              color: AppColors.textPrimary)),
                      if (!isPaymentLoading)
                        IconButton(
                          onPressed: () {
                            Navigator.pop(ctx);
                            onLater();
                          },
                          icon: const Icon(Icons.close,
                              size: 20, color: AppColors.textSecondary),
                        ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: themeColor,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Center(
                      child: Text(isMomo ? 'MoMo' : 'Airtel',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w900,
                            color: isMomo ? AppColors.info : Colors.white,
                          )),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Pay RWF ${total.toStringAsFixed(0)}',
                    style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                        color: AppColors.textPrimary),
                  ),
                  if (orderIds.length > 1) ...[
                    const SizedBox(height: 4),
                    Text('One payment for your ${orderIds.length} vendor orders',
                        style: const TextStyle(
                            fontSize: 12, color: AppColors.textSecondary)),
                  ],
                  const SizedBox(height: 8),
                  if (isPaymentLoading) ...[
                    const SizedBox(height: 16),
                    const SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(
                          strokeWidth: 2.5, color: AppColors.primary),
                    ),
                    const SizedBox(height: 16),
                    Text(statusText,
                        style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textSecondary)),
                    const SizedBox(height: 4),
                    const Text(
                      'Please approve the prompt on your phone to complete the payment.',
                      style: TextStyle(fontSize: 11, color: AppColors.textTertiary),
                      textAlign: TextAlign.center,
                    ),
                  ] else ...[
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        for (final p in const ['momo', 'airtel'])
                          Expanded(
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 4),
                              child: ChoiceChip(
                                label: Center(
                                    child: Text(p == 'momo'
                                        ? 'MTN MoMo'
                                        : 'Airtel Money')),
                                selected: provider == p,
                                onSelected: (_) =>
                                    setSheetState(() => provider = p),
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    CnTextField(
                      label: 'Phone Number',
                      controller: phoneCtrl,
                      hint: '078xxxxxxx',
                      keyboardType: TextInputType.phone,
                    ),
                    if (sheetError != null) ...[
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          const Icon(Icons.error_outline,
                              color: AppColors.error, size: 16),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(sheetError!,
                                style: const TextStyle(
                                    color: AppColors.error,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600)),
                          ),
                        ],
                      ),
                    ],
                    const SizedBox(height: 20),
                    CnPrimaryButton(label: 'Confirm & Pay', onTap: pay),
                    const SizedBox(height: 10),
                    TextButton(
                      onPressed: () {
                        Navigator.pop(ctx);
                        onLater();
                      },
                      child: const Text('Pay Later from My Orders',
                          style: TextStyle(
                              color: AppColors.textSecondary,
                              fontWeight: FontWeight.bold,
                              fontSize: 13)),
                    ),
                  ],
                  const SizedBox(height: 12),
                ],
              ),
            ),
          );
        },
      );
    },
  ).whenComplete(stopWatching);
}
