import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/widgets/buttons/cn_buttons.dart';
import '../../shared/widgets/inputs/cn_text_field.dart';

class DisputeScreen extends ConsumerStatefulWidget {
  final String orderId;
  const DisputeScreen({super.key, required this.orderId});

  @override
  ConsumerState<DisputeScreen> createState() => _DisputeScreenState();
}

class _DisputeScreenState extends ConsumerState<DisputeScreen> {
  static const List<String> _reasons = [
    'Wrong item received',
    'Missing items',
    'Food quality issue',
    'Order never arrived',
    'Overcharged',
    'Other',
  ];

  String? _selectedReason;
  final _descriptionCtrl = TextEditingController();
  bool _isLoading = false;
  String? _error;

  @override
  void dispose() {
    _descriptionCtrl.dispose();
    super.dispose();
  }

  bool get _canSubmit =>
      _selectedReason != null && _descriptionCtrl.text.trim().length >= 20;

  Future<void> _submit() async {
    final desc = _descriptionCtrl.text.trim();
    if (_selectedReason == null) {
      setState(() => _error = 'Please select a reason for your dispute.');
      return;
    }
    if (desc.length < 20) {
      setState(() => _error = 'Description must be at least 20 characters.');
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      await ApiClient.instance.post(AppEndpoints.disputes, data: {
        'order': widget.orderId,
        'reason': _selectedReason,
        'description': desc,
      });
      HapticFeedback.heavyImpact();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content:
                Text('Dispute submitted! Our team will review it shortly.'),
            backgroundColor: AppColors.primary,
          ),
        );
        if (context.canPop()) {
          context.pop();
        } else {
          context.go('/orders');
        }
      }
    } catch (e) {
      setState(() => _error = 'Could not submit — please try again.');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Report an Issue',
          style: TextStyle(
              fontWeight: FontWeight.w800, color: AppColors.textPrimary),
        ),
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Reason picker ──
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'What went wrong?',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _reasons.map((reason) {
                      final selected = _selectedReason == reason;
                      return GestureDetector(
                        onTap: () {
                          HapticFeedback.selectionClick();
                          setState(() => _selectedReason = reason);
                        },
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 180),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 9),
                          decoration: BoxDecoration(
                            color: selected
                                ? AppColors.primary
                                : AppColors.background,
                            borderRadius: BorderRadius.circular(100),
                            border: Border.all(
                              color: selected
                                  ? AppColors.primary
                                  : AppColors.border,
                              width: selected ? 1.5 : 1,
                            ),
                          ),
                          child: Text(
                            reason,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: selected
                                  ? Colors.white
                                  : AppColors.textPrimary,
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // ── Description ──
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Describe the issue',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 12),
                  CnTextField(
                    label: 'Description (required)',
                    controller: _descriptionCtrl,
                    maxLines: 5,
                    hint:
                        'Please provide details about your issue (at least 20 characters)…',
                    onChanged: (_) => setState(() {}),
                  ),
                  const SizedBox(height: 6),
                  Align(
                    alignment: Alignment.centerRight,
                    child: Text(
                      '${_descriptionCtrl.text.trim().length} chars'
                      '${_descriptionCtrl.text.trim().length < 20 ? ' (min 20)' : ''}',
                      style: TextStyle(
                        fontSize: 11,
                        color: _descriptionCtrl.text.trim().length >= 20
                            ? AppColors.primary
                            : AppColors.textSecondary,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // ── Error ──
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(
                _error!,
                style: const TextStyle(color: AppColors.error, fontSize: 13),
              ),
            ],

            const SizedBox(height: 28),

            // ── Submit ──
            CnPrimaryButton(
              label: 'Submit Dispute',
              isLoading: _isLoading,
              onTap: _canSubmit ? _submit : null,
            ),

            if (!_canSubmit)
              const Padding(
                padding: EdgeInsets.only(top: 8),
                child: Text(
                  'Select a reason and write at least 20 characters to continue',
                  textAlign: TextAlign.center,
                  style:
                      TextStyle(fontSize: 12, color: AppColors.textSecondary),
                ),
              ),

            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}
