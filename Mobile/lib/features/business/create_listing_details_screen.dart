import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_colors.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../shared/widgets/inputs/cn_text_field.dart';
import '../../shared/widgets/buttons/cn_buttons.dart';
import 'my_listings_screen.dart';

class CreateListingDetailsScreen extends ConsumerStatefulWidget {
  final String imagePath;
  final String? listingId;
  const CreateListingDetailsScreen(
      {super.key, this.imagePath = '', this.listingId});

  @override
  ConsumerState<CreateListingDetailsScreen> createState() =>
      _CreateListingDetailsScreenState();
}

class _CreateListingDetailsScreenState
    extends ConsumerState<CreateListingDetailsScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleCtrl = TextEditingController();
  final _originalPriceCtrl = TextEditingController();
  final _offerPriceCtrl = TextEditingController();
  final _quantityCtrl = TextEditingController();
  final _descCtrl = TextEditingController();

  String _selectedCategory = 'meals';
  DateTime _availableFrom = DateTime.now();
  DateTime _availableUntil = DateTime.now().add(const Duration(hours: 4));
  bool _isLoading = false;
  String? _error;
  String? _businessId;
  String? _existingImageUrl;

  final List<String> _allAllergens = [
    'Gluten',
    'Dairy',
    'Nuts',
    'Soy',
    'Eggs',
    'Fish',
    'Shellfish',
    'Sesame'
  ];
  final Set<String> _selectedAllergens = {};

  static const _categories = [
    {'key': 'meals', 'label': 'Prepared Meals'},
    {'key': 'baked-goods', 'label': 'Baked Goods'},
    {'key': 'fruit-veg', 'label': 'Fruits & Veggies'},
    {'key': 'dairy', 'label': 'Dairy Products'},
    {'key': 'meat', 'label': 'Meat & Fish'},
    {'key': 'beverages', 'label': 'Beverages'},
    {'key': 'pantry', 'label': 'Pantry Items'},
    {'key': 'other', 'label': 'Other surplus'},
  ];

  @override
  void initState() {
    super.initState();
    _fetchBusiness();
    if (widget.listingId != null) {
      _loadListingDetails();
    }
  }

  Future<void> _loadListingDetails() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiClient.instance
          .get(AppEndpoints.listingById(widget.listingId!));
      final raw = res.data;
      final json = raw is Map<String, dynamic>
          ? (raw['listing'] ?? raw['data'] ?? raw) as Map<String, dynamic>
          : raw as Map<String, dynamic>;

      _titleCtrl.text = json['title'] ?? json['name'] ?? '';
      _descCtrl.text = json['description'] ?? '';
      _selectedCategory = json['category'] ?? 'meals';

      double parsedPrice = 0;
      double parsedOfferPrice = 0;
      final rawPricing = json['pricing'];
      if (rawPricing is Map) {
        parsedPrice = (rawPricing['originalPrice'] as num?)?.toDouble() ??
            (rawPricing['price'] as num?)?.toDouble() ??
            0;
        parsedOfferPrice =
            (rawPricing['price'] as num?)?.toDouble() ?? parsedPrice;
      } else {
        parsedPrice = (json['price'] as num?)?.toDouble() ?? 0;
        parsedOfferPrice =
            (json['offerPrice'] as num?)?.toDouble() ?? parsedPrice;
      }

      _originalPriceCtrl.text = parsedPrice.toStringAsFixed(0);
      _offerPriceCtrl.text = parsedOfferPrice.toStringAsFixed(0);

      int parsedQuantity = 0;
      final rawInventory = json['inventory'];
      if (rawInventory is Map) {
        parsedQuantity = (rawInventory['quantity'] as num?)?.toInt() ?? 0;
      } else {
        parsedQuantity = (json['quantity'] as num?)?.toInt() ?? 0;
      }
      _quantityCtrl.text = parsedQuantity.toString();

      final timeWindow = json['timeWindow'] as Map?;
      if (timeWindow != null) {
        if (timeWindow['availableFrom'] != null) {
          _availableFrom =
              DateTime.parse(timeWindow['availableFrom'].toString()).toLocal();
        }
        if (timeWindow['availableUntil'] != null) {
          _availableUntil =
              DateTime.parse(timeWindow['availableUntil'].toString()).toLocal();
        }
      }

      final rawNutritional = json['nutritionalInfo'];
      List<dynamic>? allergensList;
      if (json['allergens'] is List) {
        allergensList = json['allergens'] as List;
      } else if (rawNutritional is Map && rawNutritional['allergens'] is List) {
        allergensList = rawNutritional['allergens'] as List;
      }
      if (allergensList != null) {
        _selectedAllergens.clear();
        _selectedAllergens.addAll(allergensList.map((e) => e.toString()));
      }

      final photos = json['photos'] as List?;
      if (photos != null && photos.isNotEmpty) {
        _existingImageUrl = photos.first.toString();
      } else if (json['image'] != null) {
        _existingImageUrl = json['image'].toString();
      }
    } catch (e) {
      setState(() => _error = 'Failed to load listing details: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _originalPriceCtrl.dispose();
    _offerPriceCtrl.dispose();
    _quantityCtrl.dispose();
    _descCtrl.dispose();
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
        });
      }
    } catch (e) {
      if (kDebugMode) debugPrint('Error loading business: $e');
    }
  }

  Future<void> _selectDateTime(BuildContext context, bool isFrom) async {
    final initialDate = isFrom ? _availableFrom : _availableUntil;
    final date = await showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: DateTime.now().subtract(const Duration(days: 1)),
      lastDate: DateTime.now().add(const Duration(days: 30)),
    );
    if (date == null) return;

    if (!context.mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(initialDate),
    );
    if (time == null) return;

    setState(() {
      final fullDateTime =
          DateTime(date.year, date.month, date.day, time.hour, time.minute);
      if (isFrom) {
        _availableFrom = fullDateTime;
        if (_availableUntil.isBefore(_availableFrom)) {
          _availableUntil = _availableFrom.add(const Duration(hours: 4));
        }
      } else {
        _availableUntil = fullDateTime;
      }
    });
  }

  Future<void> _publishListing() async {
    if (!_formKey.currentState!.validate()) return;
    if (_businessId == null) {
      setState(() => _error =
          'No business profile loaded. Make sure you have setup your business.');
      return;
    }
    if (widget.listingId == null && widget.imagePath.isEmpty) {
      setState(() => _error = 'Please capture a photo first.');
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final payload = {
        'title': _titleCtrl.text.trim(),
        'description': _descCtrl.text.trim(),
        'category': _selectedCategory,
        'business': _businessId,
        'allergens': _selectedAllergens.toList(),
        'pricing': {
          'price': double.parse(_offerPriceCtrl.text.trim()),
          'originalPrice': double.parse(_originalPriceCtrl.text.trim()),
          'currency': 'RWF',
        },
        'inventory': {
          'quantity': int.parse(_quantityCtrl.text.trim()),
          'unit': 'item',
        },
        'timeWindow': {
          'availableFrom': _availableFrom.toUtc().toIso8601String(),
          'availableUntil': _availableUntil.toUtc().toIso8601String(),
        },
      };

      final String listingId;
      if (widget.listingId != null) {
        await ApiClient.instance
            .put(AppEndpoints.listingById(widget.listingId!), data: payload);
        listingId = widget.listingId!;
      } else {
        final res =
            await ApiClient.instance.post(AppEndpoints.listings, data: payload);
        final createdData = res.data;
        final rawListing = createdData is Map<String, dynamic>
            ? (createdData['listing'] ?? createdData['data'] ?? createdData)
                as Map<String, dynamic>
            : createdData as Map<String, dynamic>;
        listingId = rawListing['_id'] ?? rawListing['id'];
      }

      if (widget.imagePath.isNotEmpty) {
        final formData = FormData.fromMap({
          'photos': await MultipartFile.fromFile(widget.imagePath,
              filename: 'photo.jpg'),
        });
        await ApiClient.instance
            .post(AppEndpoints.listingPhotos(listingId), data: formData);
      }
      ref.invalidate(myListingsProvider);
      HapticFeedback.heavyImpact();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.listingId != null
                ? 'Listing updated successfully'
                : 'Listing published successfully'),
            backgroundColor: AppColors.primary,
          ),
        );
        context.go('/business/listings');
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
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
            widget.listingId != null ? 'Edit Listing' : 'Listing Details',
            style: const TextStyle(
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
              // Photo preview
              Center(
                child: Container(
                  height: 180,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(16),
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
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(15),
                    child: widget.imagePath.isNotEmpty
                        ? Image.file(
                            File(widget.imagePath),
                            fit: BoxFit.cover,
                          )
                        : (_existingImageUrl != null
                            ? Image.network(
                                _existingImageUrl!,
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => const Icon(
                                    Icons.broken_image,
                                    size: 50,
                                    color: AppColors.textSecondary),
                              )
                            : const Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.add_photo_alternate_outlined,
                                      size: 40, color: AppColors.textSecondary),
                                  SizedBox(height: 8),
                                  Text('Add Photo',
                                      style: TextStyle(
                                          color: AppColors.textSecondary,
                                          fontSize: 13)),
                                ],
                              )),
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Category selector
              const Text('Category',
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
                  children: _categories.map((c) {
                    final selected = _selectedCategory == c['key'];
                    return GestureDetector(
                      onTap: () =>
                          setState(() => _selectedCategory = c['key']!),
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
                          child: Text(c['label']!,
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
                label: 'Food Name / Title *',
                controller: _titleCtrl,
                hint: 'e.g. Fresh Avocado rescue box',
                validator: (v) => v == null || v.trim().length < 3
                    ? 'Required (min 3 chars)'
                    : null,
              ),
              const SizedBox(height: 12),

              Row(
                children: [
                  Expanded(
                    child: CnTextField(
                      label: 'Original Price (RWF) *',
                      controller: _originalPriceCtrl,
                      hint: 'e.g. 5000',
                      keyboardType: TextInputType.number,
                      validator: (v) => v == null ||
                              double.tryParse(v) == null ||
                              double.parse(v) <= 0
                          ? 'Invalid price'
                          : null,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: CnTextField(
                      label: 'Rescue Price (RWF) *',
                      controller: _offerPriceCtrl,
                      hint: 'e.g. 2000',
                      keyboardType: TextInputType.number,
                      validator: (v) {
                        if (v == null ||
                            double.tryParse(v) == null ||
                            double.parse(v) <= 0) {
                          return 'Invalid price';
                        }
                        if (_originalPriceCtrl.text.isNotEmpty) {
                          final orig = double.tryParse(_originalPriceCtrl.text);
                          if (orig != null && double.parse(v) >= orig) {
                            return 'Must be < original';
                          }
                        }
                        return null;
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              CnTextField(
                label: 'Quantity Available *',
                controller: _quantityCtrl,
                hint: 'e.g. 3',
                keyboardType: TextInputType.number,
                validator: (v) =>
                    v == null || int.tryParse(v) == null || int.parse(v) < 1
                        ? 'Invalid quantity'
                        : null,
              ),
              const SizedBox(height: 12),

              CnTextField(
                label: 'Description *',
                controller: _descCtrl,
                hint: 'Specify allergens, freshness, pickup notes…',
                maxLines: 3,
                validator: (v) => v == null || v.trim().length < 10
                    ? 'Describe in at least 10 chars'
                    : null,
              ),
              const SizedBox(height: 16),

              // Allergens Selection Chips
              const Text('Allergens',
                  style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _allAllergens.map((allergen) {
                  final isSelected = _selectedAllergens.contains(allergen);
                  return GestureDetector(
                    onTap: () {
                      setState(() {
                        if (isSelected) {
                          _selectedAllergens.remove(allergen);
                        } else {
                          _selectedAllergens.add(allergen);
                        }
                      });
                      HapticFeedback.selectionClick();
                    },
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? AppColors.warningSurface
                            : AppColors.surface,
                        borderRadius: BorderRadius.circular(100),
                        border: Border.all(
                            color: isSelected
                                ? AppColors.warning
                                : AppColors.border),
                      ),
                      child: Text(
                        allergen,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: isSelected
                              ? AppColors.warning
                              : AppColors.textPrimary,
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),

              // Time windows
              const Text('Pickup Window',
                  style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary)),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () => _selectDateTime(context, true),
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 14),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Available From',
                                style: TextStyle(
                                    fontSize: 11,
                                    color: AppColors.textTertiary)),
                            const SizedBox(height: 4),
                            Text(
                              '${_availableFrom.day}/${_availableFrom.month} at ${_availableFrom.hour.toString().padLeft(2, '0')}:${_availableFrom.minute.toString().padLeft(2, '0')}',
                              style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.textPrimary),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: InkWell(
                      onTap: () => _selectDateTime(context, false),
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 14),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Available Until',
                                style: TextStyle(
                                    fontSize: 11,
                                    color: AppColors.textTertiary)),
                            const SizedBox(height: 4),
                            Text(
                              '${_availableUntil.day}/${_availableUntil.month} at ${_availableUntil.hour.toString().padLeft(2, '0')}:${_availableUntil.minute.toString().padLeft(2, '0')}',
                              style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.textPrimary),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

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
                    ? (widget.listingId != null ? 'Saving...' : 'Publishing...')
                    : (widget.listingId != null
                        ? 'Save Changes'
                        : 'Publish Listing'),
                isLoading: _isLoading,
                onTap: _isLoading ? null : _publishListing,
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
