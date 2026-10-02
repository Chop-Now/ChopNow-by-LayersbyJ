import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:dio/dio.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/models/user_model.dart';
import '../../core/theme/app_colors.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../shared/animations/scale_tap.dart';
import '../../shared/widgets/buttons/cn_buttons.dart';
import '../../shared/widgets/inputs/cn_text_field.dart';

class BecomeRiderScreen extends ConsumerStatefulWidget {
  const BecomeRiderScreen({super.key});

  @override
  ConsumerState<BecomeRiderScreen> createState() => _BecomeRiderScreenState();
}

class _BecomeRiderScreenState extends ConsumerState<BecomeRiderScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phoneCtrl = TextEditingController();
  final _idCtrl = TextEditingController();
  final _plateCtrl = TextEditingController();
  final _picker = ImagePicker();

  String _selectedVehicle = 'bicycle';
  String? _nationalIdPhotoPath;
  String? _vehiclePhotoPath;
  bool _agreedToTerms = false;
  bool _isLoading = false;
  String? _error;

  final List<Map<String, dynamic>> _vehicles = [
    {
      'key': 'bicycle',
      'label': 'Bicycle',
      'icon': Icons.directions_bike_rounded,
      'desc': 'Best for short urban trips'
    },
    {
      'key': 'motorcycle',
      'label': 'Motorcycle',
      'icon': Icons.motorcycle_rounded,
      'desc': 'Fastest for standard delivery'
    },
    {
      'key': 'car',
      'label': 'Car',
      'icon': Icons.directions_car_rounded,
      'desc': 'Ideal for bulk orders & bad weather'
    },
    {
      'key': 'walking',
      'label': 'Walking',
      'icon': Icons.directions_walk_rounded,
      'desc': 'Eco-friendly hyper-local'
    },
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final user = ref.read(currentUserProvider);
      if (user?.phone != null && user!.phone!.isNotEmpty) {
        _phoneCtrl.text = user.phone!;
      }
      if (user?.riderDetails != null) {
        final details = user!.riderDetails!;
        if (details['phone'] != null) _phoneCtrl.text = details['phone'];
        if (details['vehicleType'] != null) {
          setState(() {
            _selectedVehicle = details['vehicleType'];
          });
        }
        if (details['nationalId'] != null) _idCtrl.text = details['nationalId'];
        if (details['licensePlate'] != null) {
          _plateCtrl.text = details['licensePlate'];
        }
      }
    });
  }

  @override
  void dispose() {
    _phoneCtrl.dispose();
    _idCtrl.dispose();
    _plateCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickImage(bool isNationalId) async {
    try {
      final file = await _picker.pickImage(
          source: ImageSource.gallery, imageQuality: 80);
      if (file != null) {
        setState(() {
          if (isNationalId) {
            _nationalIdPhotoPath = file.path;
          } else {
            _vehiclePhotoPath = file.path;
          }
        });
        HapticFeedback.selectionClick();
      }
    } catch (e) {
      setState(() => _error = 'Failed to pick image: $e');
    }
  }

  void _removeImage(bool isNationalId) {
    setState(() {
      if (isNationalId) {
        _nationalIdPhotoPath = null;
      } else {
        _vehiclePhotoPath = null;
      }
    });
    HapticFeedback.lightImpact();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_agreedToTerms) {
      setState(() => _error = 'You must agree to the terms and conditions');
      return;
    }
    if (_nationalIdPhotoPath == null) {
      setState(() =>
          _error = 'Please upload a photo of your National ID or Passport');
      return;
    }
    if (_vehiclePhotoPath == null) {
      setState(() =>
          _error = 'Please upload a photo of your Vehicle or Ownership Proof');
      return;
    }

    HapticFeedback.mediumImpact();
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final formData = FormData();
      formData.fields.add(MapEntry('phone', _phoneCtrl.text.trim()));
      formData.fields.add(MapEntry('vehicleType', _selectedVehicle));
      formData.fields.add(MapEntry('nationalId', _idCtrl.text.trim()));

      final showPlate =
          _selectedVehicle == 'motorcycle' || _selectedVehicle == 'car';
      if (showPlate) {
        formData.fields.add(MapEntry('licensePlate', _plateCtrl.text.trim()));
      }

      formData.files.add(MapEntry(
        'nationalIdPhoto',
        await MultipartFile.fromFile(_nationalIdPhotoPath!,
            filename: _nationalIdPhotoPath!.split('/').last),
      ));

      formData.files.add(MapEntry(
        'vehiclePhoto',
        await MultipartFile.fromFile(_vehiclePhotoPath!,
            filename: _vehiclePhotoPath!.split('/').last),
      ));

      await ApiClient.instance.post(AppEndpoints.applyRider, data: formData);

      // Refresh state to fetch updated riderStatus (pending)
      await ref.read(authProvider.notifier).refreshProfile();

      HapticFeedback.heavyImpact();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Rider application submitted successfully!'),
            backgroundColor: AppColors.primary,
          ),
        );
      }
    } catch (e) {
      setState(() => _error = e.toString().replaceAll('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _refreshStatus() async {
    HapticFeedback.lightImpact();
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      await ref.read(authProvider.notifier).refreshProfile();
    } catch (e) {
      setState(() => _error = e.toString().replaceAll('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    final status = user?.riderStatus ?? 'none';

    if (status == 'approved') {
      return _buildApprovedScreen(context);
    }

    if (status == 'pending') {
      return _buildPendingScreen(context);
    }

    return _buildApplicationFormScreen(context, user);
  }

  Widget _buildApprovedScreen(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Application Approved',
            style: TextStyle(
                fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        automaticallyImplyLeading: false,
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: const BoxDecoration(
                    color: AppColors.successSurface, shape: BoxShape.circle),
                child: const Icon(Icons.check_circle_outline_rounded,
                    color: AppColors.success, size: 48),
              ),
              const SizedBox(height: 24),
              const Text(
                'Application Approved!',
                style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    color: AppColors.textPrimary),
              ),
              const SizedBox(height: 12),
              const Text(
                'Congratulations! Your rider application has been reviewed and approved by the admin team. You are now authorized to complete deliveries.',
                textAlign: TextAlign.center,
                style: TextStyle(
                    fontSize: 14, color: AppColors.textSecondary, height: 1.5),
              ),
              const SizedBox(height: 32),
              CnPrimaryButton(
                label: 'Go to Rider Dashboard',
                onTap: () async {
                  HapticFeedback.selectionClick();
                  await ref.read(authProvider.notifier).switchRole('rider');
                  if (context.mounted) {
                    context.go('/rider/dashboard');
                  }
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPendingScreen(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Application Status',
            style: TextStyle(
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary,
                fontSize: 16)),
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        automaticallyImplyLeading: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.close_rounded),
            onPressed: () => context.go('/home'),
          ),
        ],
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: const BoxDecoration(
                    color: AppColors.warningSurface, shape: BoxShape.circle),
                child: const Icon(Icons.hourglass_empty_rounded,
                    color: AppColors.warning, size: 40),
              ),
              const SizedBox(height: 24),
              const Text(
                "We're reviewing your application",
                textAlign: TextAlign.center,
                style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                    color: AppColors.textPrimary),
              ),
              const SizedBox(height: 10),
              const Text(
                "Thank you for applying to be a ChopNow delivery partner! Our administrative team is currently verifying your National ID copy, license plate, and vehicle details.",
                textAlign: TextAlign.center,
                style: TextStyle(
                    fontSize: 13, color: AppColors.textSecondary, height: 1.5),
              ),
              const SizedBox(height: 20),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: AppColors.primarySurface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                      color: AppColors.primary.withValues(alpha: 0.1)),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.access_time_rounded,
                        color: AppColors.primary, size: 16),
                    SizedBox(width: 8),
                    Text(
                      'Verification review takes 12-24 hours',
                      style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),
              CnPrimaryButton(
                label: _isLoading ? 'Refreshing...' : 'Refresh Status',
                isLoading: _isLoading,
                onTap: _isLoading ? null : _refreshStatus,
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: () => context.go('/home'),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(50),
                  side: const BorderSide(color: AppColors.border),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
                child: const Text('Back to Home',
                    style: TextStyle(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.bold)),
              ),
              if (_error != null) ...[
                const SizedBox(height: 16),
                Text(_error!,
                    style:
                        const TextStyle(color: AppColors.error, fontSize: 12)),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildApplicationFormScreen(BuildContext context, AppUser? user) {
    final showPlate =
        _selectedVehicle == 'motorcycle' || _selectedVehicle == 'car';

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Earn with ChopNow',
            style: TextStyle(
                fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Rejection alert
              if (user?.riderStatus == 'rejected') ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.errorSurface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                        color: AppColors.error.withValues(alpha: 0.15)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.error_outline_rounded,
                              color: AppColors.error, size: 20),
                          SizedBox(width: 8),
                          Text('Application Rejected',
                              style: TextStyle(
                                  fontWeight: FontWeight.w800,
                                  color: AppColors.error,
                                  fontSize: 14)),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Reason: ${user?.riderDetails?['rejectedReason'] ?? 'Documents provided were unclear or invalid.'}',
                        style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.error,
                            fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Please correct your details and upload clear photo documents below to re-submit.',
                        style: TextStyle(
                            fontSize: 11, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
              ],

              // Hero Banner
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: AppColors.heroGradient,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                        color: AppColors.primary.withValues(alpha: 0.2),
                        blurRadius: 10,
                        offset: const Offset(0, 4)),
                  ],
                ),
                child: const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Deliver Food & Fuel Change',
                      style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.w900),
                    ),
                    SizedBox(height: 6),
                    Text(
                      'Earn money on your own schedule. Rescue surplus meals and deliver them to eager buyers nearby.',
                      style: TextStyle(
                          color: Colors.white70, fontSize: 12, height: 1.4),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Vehicle Type Grid
              const Text('Select Your Vehicle',
                  style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary)),
              const SizedBox(height: 12),
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 1.3,
                ),
                itemCount: _vehicles.length,
                itemBuilder: (context, index) {
                  final v = _vehicles[index];
                  final selected = _selectedVehicle == v['key'];
                  return ScaleTap(
                    onTap: () {
                      HapticFeedback.selectionClick();
                      setState(() {
                        _selectedVehicle = v['key'];
                        if (!showPlate) {
                          _plateCtrl.clear();
                        }
                      });
                    },
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: selected
                            ? AppColors.primarySurface
                            : AppColors.surface,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                            color:
                                selected ? AppColors.primary : AppColors.border,
                            width: 2),
                        boxShadow: selected
                            ? [
                                BoxShadow(
                                    color: AppColors.primary
                                        .withValues(alpha: 0.08),
                                    blurRadius: 8,
                                    offset: const Offset(0, 2))
                              ]
                            : null,
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(v['icon'] as IconData,
                              size: 28,
                              color: selected
                                  ? AppColors.primary
                                  : AppColors.textSecondary),
                          const SizedBox(height: 8),
                          Text(
                            v['label'] as String,
                            style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: selected
                                    ? AppColors.primary
                                    : AppColors.textPrimary),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            v['desc'] as String,
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                                fontSize: 9, color: AppColors.textTertiary),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(height: 24),

              // Text Inputs
              CnTextField(
                label: 'Phone Number *',
                controller: _phoneCtrl,
                hint: '+250 7XX XXX XXX',
                keyboardType: TextInputType.phone,
                validator: (v) => v == null || v.trim().length < 9
                    ? 'Please enter a valid phone number'
                    : null,
              ),
              const SizedBox(height: 16),
              CnTextField(
                label: 'National ID or Passport Number *',
                controller: _idCtrl,
                hint: 'Enter your government ID no.',
                validator: (v) => v == null || v.trim().isEmpty
                    ? 'Required for verification'
                    : null,
              ),
              if (showPlate) ...[
                const SizedBox(height: 16),
                CnTextField(
                  key: const ValueKey('plate_field'),
                  label: 'Vehicle License Plate *',
                  controller: _plateCtrl,
                  hint: 'e.g. RA 123 A',
                  validator: (v) => v == null || v.trim().isEmpty
                      ? 'Required for motor vehicles'
                      : null,
                ),
              ],
              const SizedBox(height: 24),

              // Upload copies
              const Text('Required Documentation *',
                  style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary)),
              const SizedBox(height: 12),

              // National ID Upload
              const Text('National ID or Passport Copy *',
                  style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary)),
              const SizedBox(height: 8),
              _buildPhotoPicker(
                path: _nationalIdPhotoPath,
                label: 'Upload ID Document image',
                onPick: () => _pickImage(true),
                onRemove: () => _removeImage(true),
              ),
              const SizedBox(height: 16),

              // Vehicle Photo Upload
              const Text('Vehicle Photo or Ownership Proof *',
                  style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary)),
              const SizedBox(height: 8),
              _buildPhotoPicker(
                path: _vehiclePhotoPath,
                label: 'Upload Vehicle image',
                onPick: () => _pickImage(false),
                onRemove: () => _removeImage(false),
              ),
              const SizedBox(height: 24),

              // Terms Checklist
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    height: 24,
                    width: 24,
                    child: Checkbox(
                      value: _agreedToTerms,
                      activeColor: AppColors.primary,
                      onChanged: (v) =>
                          setState(() => _agreedToTerms = v ?? false),
                    ),
                  ),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Text(
                      'I agree to the ChopNow Rider Terms of Service and Code of Conduct. I verify that I have the required vehicle insurance and authorization to operate.',
                      style: TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                          height: 1.4),
                    ),
                  ),
                ],
              ),

              if (_error != null) ...[
                const SizedBox(height: 16),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                      color: AppColors.errorSurface,
                      borderRadius: BorderRadius.circular(12)),
                  child: Text(_error!,
                      style: const TextStyle(
                          color: AppColors.error,
                          fontSize: 13,
                          fontWeight: FontWeight.w500)),
                ),
              ],

              const SizedBox(height: 32),

              CnPrimaryButton(
                label: _isLoading
                    ? 'Submitting Application...'
                    : 'Submit Application',
                isLoading: _isLoading,
                onTap: _isLoading ? null : _submit,
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPhotoPicker({
    required String? path,
    required String label,
    required VoidCallback onPick,
    required VoidCallback onRemove,
  }) {
    if (path != null) {
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.file(
                File(path),
                width: 48,
                height: 48,
                fit: BoxFit.cover,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    path.split('/').last,
                    style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  const Text('Image selected',
                      style: TextStyle(
                          fontSize: 10, color: AppColors.textSecondary)),
                ],
              ),
            ),
            IconButton(
              icon: const Icon(Icons.close, color: AppColors.error, size: 20),
              onPressed: onRemove,
            ),
          ],
        ),
      );
    }

    return InkWell(
      onTap: onPick,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border),
        ),
        child: Center(
          child: Column(
            children: [
              Icon(Icons.cloud_upload_outlined,
                  color: AppColors.primary.withValues(alpha: 0.7), size: 32),
              const SizedBox(height: 8),
              Text(label,
                  style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary)),
              const SizedBox(height: 2),
              const Text('JPG, JPEG, PNG formats (Max 5MB)',
                  style: TextStyle(fontSize: 9, color: AppColors.textTertiary)),
            ],
          ),
        ),
      ),
    );
  }
}
