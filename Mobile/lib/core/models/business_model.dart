class Business {
  final String id;
  final String name;
  final String? type;
  final String? description;
  final String? logo;
  final String? coverImage;
  final List<String> photos;
  final String status; // 'active', 'inactive', 'suspended'
  final String
      verificationStatus; // 'unverified', 'pending', 'verified', 'approved', 'rejected', 'info_requested'
  final String? address;
  final String? phone;
  final String? email;
  final double? rating;
  final int? reviewCount;
  final Map<String, dynamic>? owner;
  final double balance;
  final Map<String, dynamic>? stats;
  final Map<String, dynamic>? payoutInfo;

  const Business({
    required this.id,
    required this.name,
    this.type,
    this.description,
    this.logo,
    this.coverImage,
    required this.photos,
    required this.status,
    required this.verificationStatus,
    this.address,
    this.phone,
    this.email,
    this.rating,
    this.reviewCount,
    this.owner,
    this.balance = 0.0,
    this.stats,
    this.payoutInfo,
  });

  bool get isPending => verificationStatus == 'pending';
  bool get isApproved =>
      status == 'active' &&
      (verificationStatus == 'verified' || verificationStatus == 'approved');
  bool get isRejected => verificationStatus == 'rejected';
  bool get isSuspended => status == 'suspended';
  bool get isUnverified => verificationStatus == 'unverified';

  factory Business.fromJson(Map<String, dynamic> json) {
    // Address can be a string or a structured object (e.g. { street, city, text })
    String? addressStr;
    if (json['address'] != null) {
      if (json['address'] is Map) {
        addressStr = json['address']['text'] ?? json['address']['street'] ?? '';
      } else {
        addressStr = json['address'].toString();
      }
    }

    return Business(
      id: json['_id'] ?? json['id'] ?? '',
      name: json['name'] ?? json['businessName'] ?? '',
      type: json['type'],
      description: json['description'],
      logo: json['logo'],
      coverImage: json['coverImage'],
      photos:
          (json['photos'] as List?)?.map((p) => p.toString()).toList() ?? [],
      status: json['status'] ?? 'active',
      verificationStatus: json['verification'] is Map
          ? (json['verification']['status'] ?? 'unverified')
          : (json['verificationStatus'] ?? 'unverified'),
      address: addressStr,
      phone: json['phone'] ?? json['contact']?['phone'],
      email: json['email'] ?? json['contact']?['email'],
      rating: json['rating'] is Map
          ? (json['rating']['average'] as num?)?.toDouble()
          : (json['rating'] is num
              ? (json['rating'] as num).toDouble()
              : (json['stats']?['averageRating'] as num?)?.toDouble()),
      reviewCount: json['rating'] is Map
          ? (json['rating']['count'] as num?)?.toInt()
          : (json['reviewCount'] is num
              ? (json['reviewCount'] as num).toInt()
              : (json['stats']?['reviewCount'] as num?)?.toInt()),
      owner: json['owner'] is Map
          ? Map<String, dynamic>.from(json['owner'] as Map)
          : (json['owner'] is String ? {'_id': json['owner']} : null),
      balance: (json['stats']?['balance'] as num?)?.toDouble() ?? 0.0,
      stats: json['stats'] is Map
          ? Map<String, dynamic>.from(json['stats'] as Map)
          : null,
      payoutInfo: json['payoutInfo'] is Map
          ? Map<String, dynamic>.from(json['payoutInfo'] as Map)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'name': name,
        if (type != null) 'type': type,
        if (description != null) 'description': description,
        if (address != null) 'address': address,
        if (phone != null) 'phone': phone,
        if (email != null) 'email': email,
        if (payoutInfo != null) 'payoutInfo': payoutInfo,
      };
}
