import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/widgets/buttons/cn_buttons.dart';
import '../../shared/widgets/inputs/cn_text_field.dart';

class ReviewScreen extends ConsumerStatefulWidget {
  final String orderId;
  const ReviewScreen({super.key, required this.orderId});

  @override
  ConsumerState<ReviewScreen> createState() => _ReviewScreenState();
}

class _ReviewScreenState extends ConsumerState<ReviewScreen> {
  int _rating = 0;
  int _freshness = 0;
  int _value = 0;
  int _accuracy = 0;
  final _commentCtrl = TextEditingController();
  bool _isLoading = false;
  String? _error;

  static const _labels = ['Terrible', 'Bad', 'Okay', 'Good', 'Amazing'];

  @override
  void dispose() {
    _commentCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Leave a Review',
            style: TextStyle(
                fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Overall Rating',
                style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary)),
            const SizedBox(height: 10),
            Center(
              child: Column(
                children: [
                  _StarRow(
                      rating: _rating,
                      size: 40,
                      onRated: (r) => setState(() => _rating = r)),
                  const SizedBox(height: 6),
                  if (_rating > 0)
                    Text(_labels[_rating - 1],
                        style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: AppColors.primary)),
                ],
              ),
            ),
            const SizedBox(height: 24),
            const Divider(color: AppColors.border),
            const SizedBox(height: 16),
            const Text('Rate specific aspects',
                style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary)),
            const SizedBox(height: 12),
            _SubRating(
                label: 'Freshness',
                rating: _freshness,
                onRated: (r) => setState(() => _freshness = r)),
            const SizedBox(height: 10),
            _SubRating(
                label: 'Value for Money',
                rating: _value,
                onRated: (r) => setState(() => _value = r)),
            const SizedBox(height: 10),
            _SubRating(
                label: 'Accuracy',
                rating: _accuracy,
                onRated: (r) => setState(() => _accuracy = r)),
            const SizedBox(height: 20),
            const Divider(color: AppColors.border),
            const SizedBox(height: 16),
            CnTextField(
              label: 'Write a comment (optional)',
              controller: _commentCtrl,
              maxLines: 4,
              hint: 'Tell others about your experience...',
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!,
                  style: const TextStyle(color: AppColors.error, fontSize: 13)),
            ],
            const SizedBox(height: 24),
            CnPrimaryButton(
              label: 'Submit Review',
              isLoading: _isLoading,
              onTap: _rating == 0 ? null : _submit,
            ),
            if (_rating == 0)
              const Padding(
                padding: EdgeInsets.only(top: 8),
                child: Text('Please select a star rating to continue',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                        fontSize: 12, color: AppColors.textSecondary)),
              ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Future<void> _submit() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      await ApiClient.instance.post(AppEndpoints.reviews, data: {
        'order': widget.orderId,
        'rating': _rating,
        'freshness': _freshness > 0 ? _freshness : null,
        'valueForMoney': _value > 0 ? _value : null,
        'accuracy': _accuracy > 0 ? _accuracy : null,
        if (_commentCtrl.text.isNotEmpty) 'comment': _commentCtrl.text.trim(),
      });
      HapticFeedback.heavyImpact();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Review submitted! Thank you'),
              backgroundColor: AppColors.primary),
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
}

class _StarRow extends StatelessWidget {
  final int rating;
  final double size;
  final void Function(int) onRated;
  const _StarRow(
      {required this.rating, required this.size, required this.onRated});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(
          5,
          (i) => GestureDetector(
                onTap: () {
                  HapticFeedback.selectionClick();
                  onRated(i + 1);
                },
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: Icon(
                    i < rating ? Icons.star_rounded : Icons.star_border_rounded,
                    size: size,
                    color:
                        i < rating ? AppColors.nowYellow : AppColors.border,
                  ),
                ),
              )),
    );
  }
}

class _SubRating extends StatelessWidget {
  final String label;
  final int rating;
  final void Function(int) onRated;
  const _SubRating(
      {required this.label, required this.rating, required this.onRated});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
            child: Text(label,
                style: const TextStyle(
                    fontSize: 13, color: AppColors.textPrimary))),
        _StarRow(rating: rating, size: 22, onRated: onRated),
      ],
    );
  }
}
