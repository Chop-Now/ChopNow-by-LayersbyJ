import 'dart:async';
import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';

class ExpiryCountdown extends StatefulWidget {
  final String? availableUntil;
  final TextStyle? textStyle;
  final bool compact;

  const ExpiryCountdown({
    super.key,
    required this.availableUntil,
    this.textStyle,
    this.compact = false,
  });

  @override
  State<ExpiryCountdown> createState() => _ExpiryCountdownState();
}

class _ExpiryCountdownState extends State<ExpiryCountdown> {
  Timer? _timer;
  Duration _timeLeft = Duration.zero;
  bool _isExpired = false;

  @override
  void initState() {
    super.initState();
    _calculateTimeLeft();
    _startTimer();
  }

  @override
  void didUpdateWidget(covariant ExpiryCountdown oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.availableUntil != widget.availableUntil) {
      _calculateTimeLeft();
      _startTimer();
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _calculateTimeLeft() {
    if (widget.availableUntil == null) {
      setState(() {
        _isExpired = true;
        _timeLeft = Duration.zero;
      });
      return;
    }

    final expiryTime = DateTime.parse(widget.availableUntil!).toLocal();
    final now = DateTime.now();
    final difference = expiryTime.difference(now);

    setState(() {
      _timeLeft = difference;
      _isExpired = difference.isNegative || difference == Duration.zero;
    });
  }

  void _startTimer() {
    _timer?.cancel();
    if (_isExpired) return;

    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      _calculateTimeLeft();
      if (_isExpired) {
        _timer?.cancel();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    if (widget.availableUntil == null) return const SizedBox.shrink();
    if (_isExpired) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.timer_off_outlined,
              color: AppColors.error, size: 14),
          const SizedBox(width: 4),
          Text(
            'Expired',
            style: (widget.textStyle ?? const TextStyle()).copyWith(
              color: AppColors.error,
              fontWeight: FontWeight.w700,
              fontSize: widget.compact ? 10 : 12,
            ),
          ),
        ],
      );
    }

    // Expiry formats:
    // Greater than 12 hours: Don't show intense warning
    if (_timeLeft.inHours >= 12) {
      final hours = _timeLeft.inHours;
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.schedule, color: AppColors.textTertiary, size: 14),
          const SizedBox(width: 4),
          Text(
            'Ends in $hours hrs',
            style: (widget.textStyle ?? const TextStyle()).copyWith(
              color: AppColors.textSecondary,
              fontSize: widget.compact ? 10 : 12,
            ),
          ),
        ],
      );
    }

    // Between 1 and 12 hours
    if (_timeLeft.inHours >= 1) {
      final hours = _timeLeft.inHours;
      final minutes = _timeLeft.inMinutes.remainder(60);
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.access_time_filled_rounded,
              color: AppColors.warning, size: 14),
          const SizedBox(width: 4),
          Text(
            'Ends in ${hours}h ${minutes}m',
            style: (widget.textStyle ?? const TextStyle()).copyWith(
              color: AppColors.warning,
              fontWeight: FontWeight.w600,
              fontSize: widget.compact ? 10 : 12,
            ),
          ),
        ],
      );
    }

    // Under 1 hour - Real-time warning alert
    final minutes = _timeLeft.inMinutes.remainder(60);
    final seconds = _timeLeft.inSeconds.remainder(60);

    return Container(
      padding: widget.compact
          ? EdgeInsets.zero
          : const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: widget.compact
          ? null
          : BoxDecoration(
              color: AppColors.error.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: AppColors.error.withValues(alpha: 0.2)),
            ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.alarm,
            color: AppColors.error,
            size: widget.compact ? 12 : 14,
          ),
          const SizedBox(width: 4),
          Text(
            'Expires in ${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}',
            style: (widget.textStyle ?? const TextStyle()).copyWith(
              color: AppColors.error,
              fontWeight: FontWeight.w800,
              fontSize: widget.compact ? 10 : 12,
            ),
          ),
        ],
      ),
    );
  }
}
