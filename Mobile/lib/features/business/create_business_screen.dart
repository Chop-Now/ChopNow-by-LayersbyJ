import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:geocoding/geocoding.dart';
import '../../core/providers/business_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/widgets/buttons/cn_buttons.dart';
import '../../shared/widgets/inputs/cn_text_field.dart';

class CreateBusinessScreen extends ConsumerStatefulWidget {
  const CreateBusinessScreen({super.key});

  @override
  ConsumerState<CreateBusinessScreen> createState() =>
      _CreateBusinessScreenState();
}

class _CreateBusinessScreenState extends ConsumerState<CreateBusinessScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();

  String _selectedType = 'restaurant';
  String? _logoPath;
  bool _isLoading = false;
  String? _error;

  static const _types = [
    {'key': 'restaurant', 'label': 'Restaurant'},
    {'key': 'bakery', 'label': 'Bakery'},
    {'key': 'cafe', 'label': 'Café'},
    {'key': 'supermarket', 'label': 'Supermarket'},
    {'key': 'other', 'label': 'Other'},
  ];

  @override
  void dispose() {
    _nameCtrl.dispose();
    _descCtrl.dispose();
    _addressCtrl.dispose();
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Create Business',
            style: TextStyle(
                fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Logo picker
              Center(
                child: GestureDetector(
                  onTap: _pickLogo,
                  child: Container(
                    width: 96,
                    height: 96,
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                          color: AppColors.border.withValues(alpha: 0.5)),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.char.withValues(alpha: 0.03),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        )
                      ],
                    ),
                    child: _logoPath != null
                        ? ClipRRect(
                            borderRadius: BorderRadius.circular(19),
                            child:
                                Image.file(File(_logoPath!), fit: BoxFit.cover))
                        : const Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                                Icon(Icons.add_photo_alternate_outlined,
                                    size: 28, color: AppColors.textSecondary),
                                SizedBox(height: 4),
                                Text('Add Logo',
                                    style: TextStyle(
                                        fontSize: 11,
                                        color: AppColors.textSecondary)),
                              ]),
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Business type
              const Text('Business Type',
                  style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary)),
              const SizedBox(height: 8),
              SizedBox(
                height: 48,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  children: _types.map((t) {
                    final selected = _selectedType == t['key'];
                    return GestureDetector(
                      onTap: () => setState(() => _selectedType = t['key']!),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 150),
                        margin: const EdgeInsets.only(right: 8),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 8),
                        decoration: BoxDecoration(
                          color:
                              selected ? AppColors.primary : AppColors.surface,
                          borderRadius: BorderRadius.circular(100),
                          border: Border.all(
                              color: selected
                                  ? AppColors.primary
                                  : AppColors.border.withValues(alpha: 0.5)),
                          boxShadow: selected
                              ? [
                                  BoxShadow(
                                      color: AppColors.primary
                                          .withValues(alpha: 0.3),
                                      blurRadius: 6,
                                      offset: const Offset(0, 2))
                                ]
                              : [
                                  BoxShadow(
                                      color: AppColors.char
                                          .withValues(alpha: 0.02),
                                      blurRadius: 4,
                                      offset: const Offset(0, 2))
                                ],
                        ),
                        child: Center(
                          child: Text(t['label']!,
                              style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: selected
                                      ? FontWeight.w700
                                      : FontWeight.w500,
                                  color: selected
                                      ? Colors.white
                                      : AppColors.textPrimary)),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(height: 16),

              CnTextField(
                  label: 'Business Name *',
                  controller: _nameCtrl,
                  hint: 'e.g. Mama Cooks Kitchen',
                  validator: (v) =>
                      v == null || v.trim().length < 2 ? 'Required' : null),
              const SizedBox(height: 12),
              CnTextField(
                  label: 'Description *',
                  controller: _descCtrl,
                  hint: 'Tell customers about your food…',
                  maxLines: 3,
                  validator: (v) =>
                      v == null || v.trim().length < 10 ? 'Too short' : null),
              const SizedBox(height: 12),
              CnTextField(
                  label: 'Address *',
                  controller: _addressCtrl,
                  hint: 'KN 5 Rd, Kigali',
                  validator: (v) =>
                      v == null || v.trim().isEmpty ? 'Required' : null),
              const SizedBox(height: 12),
              CnTextField(
                label: 'Business Phone *',
                controller: _phoneCtrl,
                hint: '+250 7XX XXX XXX',
                keyboardType: TextInputType.phone,
                validator: (v) =>
                    v == null || v.trim().isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 12),
              CnTextField(
                label: 'Business Email *',
                controller: _emailCtrl,
                hint: 'info@yourbiz.com',
                keyboardType: TextInputType.emailAddress,
                validator: (v) =>
                    v == null || !v.contains('@') ? 'Invalid email' : null,
              ),

              if (_error != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                      color: AppColors.errorSurface,
                      borderRadius: BorderRadius.circular(10)),
                  child: Text(_error!,
                      style: const TextStyle(
                          color: AppColors.error, fontSize: 13)),
                ),
              ],

              const SizedBox(height: 24),
              // Pending notice
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                    color: AppColors.warningSurface,
                    borderRadius: BorderRadius.circular(10)),
                child: const Row(children: [
                  Icon(Icons.info_outline, color: AppColors.warning, size: 18),
                  SizedBox(width: 8),
                  Expanded(
                      child: Text(
                    'Your business will be reviewed by our team before it goes live (usually 24-48 hours).',
                    style: TextStyle(fontSize: 12, color: AppColors.warning),
                  )),
                ]),
              ),
              const SizedBox(height: 20),

              CnPrimaryButton(
                label: 'Submit for Approval',
                isLoading: _isLoading,
                onTap: _isLoading ? null : _submit,
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Future<List<double>> _resolveCoordinates(String query) async {
    try {
      final locations = await locationFromAddress(query);
      if (locations.isNotEmpty) {
        return [locations.first.longitude, locations.first.latitude];
      }
    } catch (e) {
      if (kDebugMode) debugPrint('Geocoding failed for business address: $e');
    }
    return [30.0619, -1.9403]; // Default Kigali coordinates
  }

  Future<void> _pickLogo() async {
    final picker = ImagePicker();
    final img =
        await picker.pickImage(source: ImageSource.gallery, imageQuality: 80);
    if (img != null) setState(() => _logoPath = img.path);
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    HapticFeedback.mediumImpact();
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final phoneVal = _phoneCtrl.text.trim();
      final formattedPhone = phoneVal.startsWith('+')
          ? phoneVal
          : (phoneVal.startsWith('0')
              ? '+250${phoneVal.substring(1)}'
              : phoneVal);
      final coords = await _resolveCoordinates(_addressCtrl.text.trim());

      final businessData = {
        'name': _nameCtrl.text.trim(),
        'type': _selectedType,
        'description': _descCtrl.text.trim(),
        'contact': {
          'email': _emailCtrl.text.trim(),
          'phone': formattedPhone,
        },
        'address': {
          'street': _addressCtrl.text.trim(),
          'city': 'Kigali', // Default city
          'location': {
            'type': 'Point',
            'coordinates': coords,
          },
        },
      };

      final biz = await ref
          .read(businessNotifierProvider.notifier)
          .createBusiness(businessData);

      // Upload logo if selected
      if (_logoPath != null) {
        try {
          await ref
              .read(businessNotifierProvider.notifier)
              .uploadLogo(biz.id, _logoPath!);
        } catch (_) {}
      }

      HapticFeedback.heavyImpact();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Business submitted for approval'),
              backgroundColor: AppColors.primary),
        );
        context.go('/business/dashboard');
      }
    } catch (e) {
      setState(() => _error = e.toString().replaceAll('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }
}
