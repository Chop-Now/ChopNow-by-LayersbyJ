class Order {
  final String id;
  final String status;
  final List<OrderItem> items;
  final double total;
  final String? paymentMethod;
  final String? deliveryType;
  final Map<String, dynamic>? business;
  final DateTime? createdAt;
  final DateTime? readyAt;
  final int? co2Saved;

  /// Orders placed together in one multi-vendor checkout (one per vendor)
  /// share this id and are paid with a single mobile-money payment.
  final String? checkoutGroup;

  const Order({
    required this.id,
    required this.status,
    required this.items,
    required this.total,
    this.paymentMethod,
    this.deliveryType,
    this.business,
    this.createdAt,
    this.readyAt,
    this.co2Saved,
    this.checkoutGroup,
  });

  factory Order.fromJson(Map<String, dynamic> json) {
    Map<String, dynamic>? businessMap;
    final rawBusiness = json['business'];
    if (rawBusiness is Map) {
      businessMap = Map<String, dynamic>.from(rawBusiness);
    } else if (rawBusiness is String) {
      businessMap = {'_id': rawBusiness, 'name': ''};
    }

    return Order(
      id: json['_id'] ?? json['id'] ?? '',
      status: json['status'] ?? 'pending',
      items: (json['items'] as List?)
              ?.map((e) => OrderItem.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      total: (json['total'] as num?)?.toDouble() ??
          (json['pricing']?['total'] as num?)?.toDouble() ??
          (json['totalAmount'] as num?)?.toDouble() ??
          0,
      paymentMethod: json['paymentMethod'] ?? json['payment']?['paymentMethod'],
      deliveryType: json['deliveryType'],
      business: businessMap,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString())
          : null,
      readyAt: json['readyAt'] != null
          ? DateTime.tryParse(json['readyAt'].toString())
          : null,
      co2Saved: (json['co2Saved'] as num?)?.toInt(),
      checkoutGroup: json['checkoutGroup']?.toString(),
    );
  }

  bool get isActive => [
        'pending',
        'pending_payment',
        'paid',
        'confirmed',
        'ready_for_pickup',
        'out_for_delivery'
      ].contains(status);

  bool get isCompleted => status == 'completed';
  bool get isCancelled => status == 'cancelled';

  /// Placed with mobile money but not paid yet - the customer can still pay.
  bool get awaitingPayment =>
      status == 'pending_payment' && paymentMethod != 'cash';

  /// Mirrors Order.canBeCancelled() on the backend, which is what actually
  /// enforces this - the UI only uses it to decide whether to show the button.
  bool get canBeCancelled =>
      const ['pending_payment', 'paid', 'confirmed'].contains(status);
}

class OrderItem {
  final String id;
  final String listingId;
  final String name;
  final double price;
  final int quantity;
  final String? photo;

  const OrderItem({
    required this.id,
    required this.listingId,
    required this.name,
    required this.price,
    required this.quantity,
    this.photo,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    Map<String, dynamic>? listingMap;
    final rawListing = json['listing'];
    if (rawListing is Map) {
      listingMap = Map<String, dynamic>.from(rawListing);
    } else if (rawListing is String) {
      listingMap = {'_id': rawListing};
    }

    String? parsedPhoto;
    if (listingMap != null) {
      final rawPhotos = listingMap['photos'];
      final rawImages = listingMap['images'];
      final rawImage = listingMap['image'];
      if (rawPhotos is List && rawPhotos.isNotEmpty) {
        parsedPhoto = rawPhotos[0].toString();
      } else if (rawImages is List && rawImages.isNotEmpty) {
        parsedPhoto = rawImages[0].toString();
      } else if (rawImage is List && rawImage.isNotEmpty) {
        parsedPhoto = rawImage[0].toString();
      } else if (rawImage is String) {
        parsedPhoto = rawImage;
      }
    }

    return OrderItem(
      id: json['_id'] ?? json['id'] ?? '',
      listingId:
          listingMap?['_id'] ?? listingMap?['id'] ?? json['listingId'] ?? '',
      name: listingMap?['title'] ?? listingMap?['name'] ?? json['name'] ?? json['title'] ?? '',
      price: (json['price'] as num?)?.toDouble() ??
          (json['unitPrice'] as num?)?.toDouble() ??
          0,
      quantity: (json['quantity'] as num?)?.toInt() ?? 1,
      photo: parsedPhoto ?? json['photo']?.toString(),
    );
  }
}
