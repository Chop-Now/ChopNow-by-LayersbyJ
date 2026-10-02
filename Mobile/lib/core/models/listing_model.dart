class Listing {
  final String id;
  final String title;
  final String description;
  final double price;
  final double offerPrice;
  final int quantity;
  final List<String> photos;
  final String? category;
  final String? status;
  final DateTime? expiresAt;
  final DateTime? availableUntil;
  final Map<String, dynamic>? business;
  final double? distance;
  final double? rating;
  final int? reviewCount;
  final List<String>? allergens;
  final int? co2Saved;
  final int? calories;
  final double? protein;
  final double? carbs;
  final double? fats;

  const Listing({
    required this.id,
    required this.title,
    required this.description,
    required this.price,
    required this.offerPrice,
    required this.quantity,
    required this.photos,
    this.category,
    this.status,
    this.expiresAt,
    this.availableUntil,
    this.business,
    this.distance,
    this.rating,
    this.reviewCount,
    this.allergens,
    this.co2Saved,
    this.calories,
    this.protein,
    this.carbs,
    this.fats,
  });

  factory Listing.fromJson(Map<String, dynamic> json) {
    // 1. Parse pricing info (support nested "pricing" map or flat fields)
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

    // 2. Parse inventory quantity (support nested "inventory" map or flat fields)
    int parsedQuantity = 0;
    final rawInventory = json['inventory'];
    if (rawInventory is Map) {
      parsedQuantity = (rawInventory['quantity'] as num?)?.toInt() ?? 0;
    } else {
      parsedQuantity = (json['quantity'] as num?)?.toInt() ?? 0;
    }

    // 3. Parse photos / images (support lists in "photos", "images", "image" or single String)
    List<String> parsedPhotos = [];
    final rawPhotos = json['photos'];
    final rawImages = json['images'];
    final rawImage = json['image'];
    if (rawPhotos is List) {
      parsedPhotos = rawPhotos.map((e) => e.toString()).toList();
    } else if (rawImages is List) {
      parsedPhotos = rawImages.map((e) => e.toString()).toList();
    } else if (rawImage is List) {
      parsedPhotos = rawImage.map((e) => e.toString()).toList();
    } else if (rawImage is String) {
      parsedPhotos = [rawImage.toString()];
    }

    // 4. Parse availableUntil / timeWindow
    final parsedAvailableUntil = json['availableUntil'] != null
        ? DateTime.tryParse(json['availableUntil'].toString())
        : (json['timeWindow'] is Map &&
                (json['timeWindow'] as Map)['availableUntil'] != null
            ? DateTime.tryParse(
                (json['timeWindow'] as Map)['availableUntil'].toString())
            : null);

    // 5. Parse business info safely
    Map<String, dynamic>? businessMap;
    final rawBusiness = json['business'];
    if (rawBusiness is Map) {
      businessMap = Map<String, dynamic>.from(rawBusiness);
    } else if (rawBusiness is String) {
      businessMap = {'_id': rawBusiness, 'name': ''};
    }

    // 6. Parse allergens (support allergens list or nested in nutritionalInfo)
    List<String>? allergensList;
    final rawAllergens = json['allergens'];
    final rawNutritional = json['nutritionalInfo'];
    if (rawAllergens is List) {
      allergensList = rawAllergens.map((e) => e.toString()).toList();
    } else if (rawNutritional is Map && rawNutritional['allergens'] is List) {
      allergensList = (rawNutritional['allergens'] as List)
          .map((e) => e.toString())
          .toList();
    }

    // 7. Parse co2Saved (from flat or nested stats/nutritionalInfo if present)
    int? parsedCo2;
    if (json['co2Saved'] is num) {
      parsedCo2 = (json['co2Saved'] as num).toInt();
    } else if (rawNutritional is Map && rawNutritional['co2Saved'] is num) {
      parsedCo2 = (rawNutritional['co2Saved'] as num).toInt();
    }

    // 8. Parse macros
    int? parsedCalories;
    double? parsedProtein;
    double? parsedCarbs;
    double? parsedFats;
    if (rawNutritional is Map) {
      parsedCalories = (rawNutritional['calories'] as num?)?.toInt();
      parsedProtein = (rawNutritional['protein'] as num?)?.toDouble();
      parsedCarbs = (rawNutritional['carbs'] as num?)?.toDouble();
      parsedFats = (rawNutritional['fats'] as num?)?.toDouble();
    }

    return Listing(
      id: json['_id'] ?? json['id'] ?? '',
      title: json['title'] ?? json['name'] ?? '',
      description: json['description'] ?? '',
      price: parsedPrice,
      offerPrice: parsedOfferPrice,
      quantity: parsedQuantity,
      photos: parsedPhotos,
      category: json['category']?.toString(),
      status: json['status']?.toString(),
      expiresAt: json['expiresAt'] != null
          ? DateTime.tryParse(json['expiresAt'].toString())
          : parsedAvailableUntil,
      availableUntil: parsedAvailableUntil,
      business: businessMap,
      distance: (json['distance'] as num?)?.toDouble(),
      rating: (json['rating'] as num?)?.toDouble(),
      reviewCount: (json['reviewCount'] as num?)?.toInt(),
      allergens: allergensList,
      co2Saved: parsedCo2,
      calories: parsedCalories,
      protein: parsedProtein,
      carbs: parsedCarbs,
      fats: parsedFats,
    );
  }

  /// Flat shape matching the non-nested branches `fromJson` already parses -
  /// used for local persistence (M22), not sent to the backend.
  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'description': description,
        'price': price,
        'offerPrice': offerPrice,
        'quantity': quantity,
        'photos': photos,
        'category': category,
        'status': status,
        'expiresAt': expiresAt?.toIso8601String(),
        'availableUntil': availableUntil?.toIso8601String(),
        'business': business,
        'distance': distance,
        'rating': rating,
        'reviewCount': reviewCount,
        'allergens': allergens,
        'co2Saved': co2Saved,
        'calories': calories,
        'protein': protein,
        'carbs': carbs,
        'fats': fats,
      };

  int get discountPercent {
    if (price <= 0) return 0;
    return ((price - offerPrice) / price * 100).round();
  }

  bool get isLowStock => quantity > 0 && quantity <= 3;
  bool get isSoldOut => quantity <= 0 || status == 'sold_out';

  String get businessName =>
      business?['name'] ?? business?['businessName'] ?? '';
  String get businessId => business?['_id'] ?? business?['id'] ?? '';
  String? get firstPhoto => photos.isNotEmpty ? photos.first : null;
}
