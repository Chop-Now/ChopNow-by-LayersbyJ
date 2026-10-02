import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import '../../core/theme/app_colors.dart';
import '../../core/api/api_client.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/api/api_endpoints.dart';
import '../../shared/widgets/inputs/cn_text_field.dart';
import '../../shared/widgets/buttons/cn_buttons.dart';

class BusinessVerificationScreen extends ConsumerStatefulWidget {
  const BusinessVerificationScreen({super.key});

  @override
  ConsumerState<BusinessVerificationScreen> createState() =>
      _BusinessVerificationScreenState();
}

class _BusinessVerificationScreenState
    extends ConsumerState<BusinessVerificationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phoneCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  final List<String> _selectedFiles = [];

  bool _isLoading = false;
  bool _isLoadingLocation = false;
  String? _error;
  String? _businessId;
  String? _businessType;
  List<double>? _locationCoords;

  @override
  void initState() {
    super.initState();
    _fetchBusiness();
  }

  @override
  void dispose() {
    _phoneCtrl.dispose();
    _addressCtrl.dispose();
    super.dispose();
  }

  Future<void> _fetchBusiness() async {
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
        setState(() {
          _businessId = items.first['_id'] ?? items.first['id'];
          _businessType = items.first['type'];
          if (items.first['contact']?['phone'] != null) {
            _phoneCtrl.text = items.first['contact']['phone'];
          }
          if (items.first['address']?['street'] != null) {
            _addressCtrl.text = items.first['address']['street'];
          }
        });
      }
    } catch (e) {
      if (kDebugMode) debugPrint('Error loading business: $e');
    }
  }

  Future<void> _fillWithCurrentLocation() async {
    setState(() {
      _isLoadingLocation = true;
      _error = null;
    });

    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) throw Exception('Location services are disabled.');

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          throw Exception('Location permission denied.');
        }
      }

      if (permission == LocationPermission.deniedForever) {
        throw Exception('Location permissions are permanently denied.');
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings:
            const LocationSettings(accuracy: LocationAccuracy.high),
      );

      _locationCoords = [position.longitude, position.latitude];

      final placemarks =
          await placemarkFromCoordinates(position.latitude, position.longitude);
      if (placemarks.isNotEmpty) {
        final pm = placemarks.first;
        final street = [pm.street, pm.subLocality, pm.locality]
            .where((s) => s != null && s.isNotEmpty)
            .join(', ');
        setState(() {
          _addressCtrl.text = street.isEmpty ? 'Unnamed Location' : street;
        });
      }
    } catch (e) {
      setState(() => _error = e.toString().replaceAll('Exception: ', ''));
    } finally {
      setState(() => _isLoadingLocation = false);
    }
  }

  Future<void> _pickDocument() async {
    final picker = ImagePicker();
    final file =
        await picker.pickImage(source: ImageSource.gallery, imageQuality: 80);
    if (file != null) {
      setState(() {
        _selectedFiles.add(file.path);
      });
      HapticFeedback.selectionClick();
    }
  }

  void _removeFile(int index) {
    setState(() {
      _selectedFiles.removeAt(index);
    });
    HapticFeedback.lightImpact();
  }

  Future<void> _submitVerification() async {
    if (!_formKey.currentState!.validate()) return;
    if (_businessId == null) {
      setState(() => _error = 'No business profile loaded.');
      return;
    }
    if (_selectedFiles.isEmpty) {
      setState(() =>
          _error = 'Please upload at least one document for verification.');
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      // Geolocate the typed address if location coordinates are not captured yet
      if (_locationCoords == null && _addressCtrl.text.isNotEmpty) {
        try {
          final query = '${_addressCtrl.text.trim()}, Kigali';
          final locations = await locationFromAddress(query);
          if (locations.isNotEmpty) {
            _locationCoords = [
              locations.first.longitude,
              locations.first.latitude
            ];
          }
        } catch (_) {}
        _locationCoords ??= [30.0619, -1.9403]; // Fallback Kigali coords
      }

      final formData = FormData();
      formData.fields.add(MapEntry('phone', _phoneCtrl.text.trim()));
      formData.fields.add(MapEntry('address', _addressCtrl.text.trim()));
      formData.fields.add(MapEntry('location',
          '{"lat": ${_locationCoords![1]}, "lng": ${_locationCoords![0]}}'));

      // Attach all files
      for (final filePath in _selectedFiles) {
        formData.files.add(MapEntry(
          'documents',
          await MultipartFile.fromFile(filePath,
              filename: filePath.split('/').last),
        ));
      }

      await ApiClient.instance
          .post(AppEndpoints.businessKyc(_businessId!), data: formData);

      HapticFeedback.heavyImpact();
      if (mounted) {
        context.go('/business/pending-review');
      }
    } catch (e) {
      setState(() {
        _error = e.toString().replaceAll('Exception: ', '');
      });
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final typeLabel = switch (_businessType) {
      'farmer' => 'Farmer Registration',
      'supermarket' => 'Business License & Tax',
      'bakery' => 'Food Permit & License',
      'restaurant' => 'Health & Food Permit',
      _ => 'Business Documents',
    };

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Business Verification',
            style: TextStyle(
                fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.textPrimary,
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
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Notice Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.primarySurface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                      color: AppColors.primary.withValues(alpha: 0.15)),
                ),
                child: const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.verified_user_rounded,
                            color: AppColors.primary, size: 20),
                        SizedBox(width: 8),
                        Text('Identity & Safety Verification',
                            style: TextStyle(
                                fontWeight: FontWeight.w800,
                                color: AppColors.primary,
                                fontSize: 14)),
                      ],
                    ),
                    SizedBox(height: 8),
                    Text(
                      'To protect our community and comply with safety regulations, business owners must submit contact and food safety documents before listing rescue bags.',
                      style: TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                          height: 1.5),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Inputs section
              const Text('Contact & Store Info',
                  style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary)),
              const SizedBox(height: 12),

              CnTextField(
                label: 'Business Phone Number *',
                controller: _phoneCtrl,
                hint: '+250 7XX XXX XXX',
                keyboardType: TextInputType.phone,
                validator: (v) => v == null || v.trim().length < 9
                    ? 'Required valid phone'
                    : null,
              ),
              const SizedBox(height: 12),

              CnTextField(
                label: 'Store Address *',
                controller: _addressCtrl,
                hint: 'KN 5 Rd, Kigali',
                validator: (v) =>
                    v == null || v.trim().isEmpty ? 'Required address' : null,
              ),
              const SizedBox(height: 8),

              TextButton.icon(
                onPressed: _isLoadingLocation ? null : _fillWithCurrentLocation,
                icon: _isLoadingLocation
                    ? const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: AppColors.primary))
                    : const Icon(Icons.my_location, size: 16),
                label: Text(
                    _isLoadingLocation
                        ? 'Locating...'
                        : 'Autofill Current GPS Location',
                    style: const TextStyle(fontWeight: FontWeight.bold)),
              ),
              const SizedBox(height: 20),

              // Document picker
              Text('Required: $typeLabel *',
                  style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary)),
              const SizedBox(height: 4),
              const Text(
                  'Upload photo/scan of food permit, health license, or trade registry.',
                  style:
                      TextStyle(fontSize: 11, color: AppColors.textSecondary)),
              const SizedBox(height: 12),

              InkWell(
                onTap: _isLoading ? null : _pickDocument,
                borderRadius: BorderRadius.circular(16),
                child: Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                        color: AppColors.border.withValues(alpha: 0.5)),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.char.withValues(alpha: 0.02),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      )
                    ],
                  ),
                  child: Center(
                    child: Column(
                      children: [
                        Icon(Icons.cloud_upload_outlined,
                            color: AppColors.primary.withValues(alpha: 0.8),
                            size: 36),
                        const SizedBox(height: 8),
                        const Text('Upload Certificate Document',
                            style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                                color: AppColors.primary)),
                        const SizedBox(height: 4),
                        const Text('Supported formats: JPG, PNG, PDF',
                            style: TextStyle(
                                fontSize: 11, color: AppColors.textTertiary)),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // Picked file list
              if (_selectedFiles.isNotEmpty) ...[
                const Text('Uploaded Documents',
                    style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary)),
                const SizedBox(height: 6),
                ..._selectedFiles.asMap().entries.map((e) => Container(
                      margin: const EdgeInsets.only(bottom: 6),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                            color: AppColors.border.withValues(alpha: 0.5)),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.char.withValues(alpha: 0.02),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          )
                        ],
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.description_outlined,
                              size: 18, color: AppColors.textSecondary),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              e.value.split('/').last,
                              style: const TextStyle(
                                  fontSize: 13, color: AppColors.textPrimary),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close,
                                size: 18, color: AppColors.error),
                            onPressed: () => _removeFile(e.key),
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                          ),
                        ],
                      ),
                    )),
                const SizedBox(height: 12),
              ],

              if (_error != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                      color: AppColors.errorSurface,
                      borderRadius: BorderRadius.circular(10)),
                  child: Text(_error!,
                      style: const TextStyle(
                          color: AppColors.error, fontSize: 13)),
                ),
                const SizedBox(height: 16),
              ],

              CnPrimaryButton(
                label: _isLoading
                    ? 'Submitting Verification...'
                    : 'Submit details for Verification',
                isLoading: _isLoading,
                onTap: _isLoading ? null : _submitVerification,
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
