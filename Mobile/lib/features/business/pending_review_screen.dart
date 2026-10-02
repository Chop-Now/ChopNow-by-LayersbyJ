import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/theme/app_colors.dart';
import '../../core/providers/auth_provider.dart';
import '../../shared/widgets/buttons/cn_buttons.dart';

class PendingReviewScreen extends ConsumerWidget {
  const PendingReviewScreen({super.key});

  void _visitFaq(BuildContext context) async {
    final uri = Uri.parse('https://chopnow.com/faq');
    if (await canLaunchUrl(uri)) launchUrl(uri);
  }

  void _emailSupport(BuildContext context) async {
    final uri =
        Uri.parse('mailto:chopnow.app@gmail.com?subject=Vendor%20KYC%20Inquiry');
    if (await canLaunchUrl(uri)) launchUrl(uri);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Pending Review',
            style: TextStyle(
                fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.textPrimary,
        automaticallyImplyLeading: false,
        elevation: 0,
        actions: [
          TextButton.icon(
            icon: const Icon(Icons.shopping_bag_outlined,
                color: AppColors.primary, size: 18),
            label: const Text('Buyer Mode',
                style: TextStyle(
                    color: AppColors.primary,
                    fontSize: 12,
                    fontWeight: FontWeight.bold)),
            onPressed: () async {
              await ref.read(authProvider.notifier).switchRole('consumer');
              if (context.mounted) context.go('/home');
            },
          ),
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: AppColors.error),
            tooltip: 'Sign Out',
            onPressed: () async {
              final confirm = await showDialog<bool>(
                context: context,
                builder: (ctx) => AlertDialog(
                  title: const Text('Sign Out?',
                      style: TextStyle(fontWeight: FontWeight.w700)),
                  content: const Text(
                      'You will need to sign in again to access your account.'),
                  actions: [
                    TextButton(
                        onPressed: () => Navigator.pop(ctx, false),
                        child: const Text('Cancel')),
                    TextButton(
                        onPressed: () => Navigator.pop(ctx, true),
                        child: const Text('Sign Out',
                            style: TextStyle(color: AppColors.error))),
                  ],
                ),
              );
              if (confirm == true && context.mounted) {
                await ref.read(authProvider.notifier).logout();
              }
            },
          ),
        ],
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Icon Header
                Container(
                  width: 90,
                  height: 90,
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.orange.withValues(alpha: 0.2),
                        blurRadius: 20,
                        spreadRadius: 5,
                      )
                    ],
                  ),
                  child: const Center(
                    child: Icon(
                      Icons.hourglass_empty_rounded,
                      color: Colors.orange,
                      size: 44,
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // Title
                const Text(
                  "We're reviewing your details",
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 10),

                // Subtitle
                const Text(
                  "Thank you for submitting your details. Your application is now under manual review by our team to ensure compliance with health and platform regulations.",
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondary,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 20),

                // Info Box
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: AppColors.primarySurface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                        color: AppColors.primary.withValues(alpha: 0.15)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.access_time_rounded,
                          color: AppColors.primary, size: 16),
                      SizedBox(width: 8),
                      Text(
                        'Estimated Review Time: 2-3 business days',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 32),

                // Dashboard Button
                SizedBox(
                  width: 240,
                  child: CnPrimaryButton(
                    label: 'Go to Marketplace',
                    onTap: () => context.go('/home'),
                  ),
                ),
                const SizedBox(height: 24),
                const Divider(color: AppColors.border, height: 1),
                const SizedBox(height: 24),

                // Next steps
                const Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    "What's next?",
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                const _StepTile(
                  icon: Icons.search_rounded,
                  stepNumber: '1. Admin review',
                  description:
                      'Our team is carefully reviewing your application and documents.',
                ),
                const SizedBox(height: 14),
                const _StepTile(
                  icon: Icons.mark_email_read_rounded,
                  stepNumber: '2. Approval notification',
                  description:
                      'We will notify you via push notification and email once complete.',
                ),
                const SizedBox(height: 14),
                const _StepTile(
                  icon: Icons.dashboard_customize_rounded,
                  stepNumber: '3. Full dashboard access',
                  description:
                      'Once approved, you\'ll gain full access to publish rescue bags.',
                ),
                const SizedBox(height: 24),
                const Divider(color: AppColors.border, height: 1),
                const SizedBox(height: 24),

                // Help/Questions section
                const Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    "Have Questions?",
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
                const SizedBox(height: 6),
                const Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    "Find answers in our FAQ or reach out to our team directly.",
                    style:
                        TextStyle(fontSize: 12, color: AppColors.textSecondary),
                  ),
                ),
                const SizedBox(height: 16),

                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => _visitFaq(context),
                        icon: const Icon(Icons.help_outline_rounded,
                            size: 16, color: AppColors.textPrimary),
                        label: const Text('Visit FAQ',
                            style: TextStyle(
                                color: AppColors.textPrimary,
                                fontWeight: FontWeight.bold,
                                fontSize: 13)),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          side: const BorderSide(color: AppColors.border),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => _emailSupport(context),
                        icon: const Icon(Icons.email_outlined,
                            size: 16, color: AppColors.textPrimary),
                        label: const Text('Email Support',
                            style: TextStyle(
                                color: AppColors.textPrimary,
                                fontWeight: FontWeight.bold,
                                fontSize: 13)),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          side: const BorderSide(color: AppColors.border),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _StepTile extends StatelessWidget {
  final IconData icon;
  final String stepNumber;
  final String description;
  const _StepTile(
      {required this.icon,
      required this.stepNumber,
      required this.description});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: AppColors.surfaceVariant,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border),
          ),
          child: Icon(icon, size: 20, color: AppColors.primary),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                stepNumber,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                description,
                style: const TextStyle(
                    fontSize: 12, color: AppColors.textSecondary, height: 1.4),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
