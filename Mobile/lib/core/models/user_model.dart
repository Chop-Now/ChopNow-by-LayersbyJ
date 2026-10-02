class UserAddress {
  final String? id;
  final String label;
  final String street;
  final String? city;
  final String? country;
  final bool isDefault;
  final List<double>? coordinates;

  const UserAddress({
    this.id,
    required this.label,
    required this.street,
    this.city,
    this.country,
    this.isDefault = false,
    this.coordinates,
  });

  factory UserAddress.fromJson(Map<String, dynamic> json) {
    List<double>? coords;
    final loc = json['location'];
    if (loc is Map && loc['coordinates'] is List) {
      coords = (loc['coordinates'] as List)
          .map((e) => (e as num).toDouble())
          .toList();
    } else if (json['coordinates'] is List) {
      coords = (json['coordinates'] as List)
          .map((e) => (e as num).toDouble())
          .toList();
    }
    return UserAddress(
      id: json['_id'] ?? json['id'],
      label: json['label'] ?? 'Home',
      street: json['street'] ?? json['address'] ?? '',
      city: json['city'],
      country: json['country'],
      isDefault: json['isDefault'] == true,
      coordinates: coords,
    );
  }

  Map<String, dynamic> toJson() => {
        'label': label,
        'street': street,
        if (city != null) 'city': city,
        if (country != null) 'country': country,
        'isDefault': isDefault,
        if (coordinates != null) 'coordinates': coordinates,
      };
}

class AppUser {
  final String id;
  final String firstName;
  final String lastName;
  final String email;
  final String? phone;
  final String? avatar;
  final List<String> roles;
  final String activeRole;
  final List<UserAddress> addresses;
  final bool isEmailVerified;
  final bool isActive;
  final String riderStatus; // 'none', 'pending', 'approved', 'rejected'
  final Map<String, dynamic>? riderDetails;

  const AppUser({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.email,
    this.phone,
    this.avatar,
    required this.roles,
    required this.activeRole,
    required this.addresses,
    this.isEmailVerified = false,
    this.isActive = true,
    this.riderStatus = 'none',
    this.riderDetails,
  });

  String get fullName => '$firstName $lastName'.trim();

  factory AppUser.fromJson(Map<String, dynamic> json) {
    return AppUser(
      id: json['_id'] ?? json['id'] ?? '',
      firstName: json['firstName'] ?? '',
      lastName: json['lastName'] ?? '',
      email: json['email'] ?? '',
      phone: json['phone'],
      avatar: json['avatar'],
      roles: json['roles'] is List
          ? (json['roles'] as List).map((r) => r.toString()).toList()
          : (json['roles'] != null
              ? [json['roles'].toString()]
              : const ['consumer']),
      activeRole: json['activeRole'] ?? 'consumer',
      addresses: (json['addresses'] is List)
          ? (json['addresses'] as List)
              .whereType<Map>()
              .map((a) => UserAddress.fromJson(Map<String, dynamic>.from(a)))
              .toList()
          : const [],
      isEmailVerified: json['emailVerified'] == true || json['isEmailVerified'] == true,
      isActive: json['isActive'] != false,
      riderStatus: json['riderStatus'] ?? 'none',
      riderDetails: json['riderDetails'] is Map
          ? Map<String, dynamic>.from(json['riderDetails'] as Map)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'firstName': firstName,
        'lastName': lastName,
        'email': email,
        if (phone != null) 'phone': phone,
        'riderStatus': riderStatus,
        if (riderDetails != null) 'riderDetails': riderDetails,
      };

  bool get isBusinessOwner => roles.contains('business_owner');
  bool get isRider => roles.contains('rider');
  bool get isAdmin => roles.contains('admin');
}
