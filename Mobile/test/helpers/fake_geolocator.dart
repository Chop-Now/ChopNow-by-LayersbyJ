import 'dart:async';

import 'package:geolocator_platform_interface/geolocator_platform_interface.dart';

/// Fake for `GeolocatorPlatform.instance`, installed via its public settable
/// `instance` seam (the standard federated-plugin test pattern - same idea
/// as `fake_firebase.dart`'s `Firebase.delegatePackingProperty`).
///
/// Without this, `GeolocatorPlatform.instance` defaults to
/// `MethodChannelGeolocator()`, which under `flutter test` empirically
/// degrades "gracefully but silently": `isLocationServiceEnabled()` etc. end
/// up caught by ActiveDeliveryScreen's own try/catch blocks (no crash), but
/// `getPositionStream()`'s `onError` callback - the M28 tracking-failure
/// banner's only trigger - never fires because nothing ever calls back at
/// all. This fake makes that path exercisable on demand via
/// [emitPosition]/[emitError].
class FakeGeolocatorPlatform extends GeolocatorPlatform {
  bool serviceEnabled = true;
  LocationPermission permission = LocationPermission.whileInUse;
  Position? currentPosition;
  Object? currentPositionError;

  final _positionController = StreamController<Position>.broadcast();

  void emitPosition(Position position) => _positionController.add(position);
  void emitError(Object error) => _positionController.addError(error);

  static Position samplePosition({double lat = -1.95, double lng = 30.06}) {
    return Position(
      latitude: lat,
      longitude: lng,
      timestamp: DateTime(2026, 1, 1),
      accuracy: 5,
      altitude: 0,
      altitudeAccuracy: 0,
      heading: 0,
      headingAccuracy: 0,
      speed: 0,
      speedAccuracy: 0,
    );
  }

  @override
  Future<bool> isLocationServiceEnabled() async => serviceEnabled;

  @override
  Future<LocationPermission> checkPermission() async => permission;

  @override
  Future<LocationPermission> requestPermission() async => permission;

  @override
  Future<Position> getCurrentPosition({LocationSettings? locationSettings}) async {
    if (currentPositionError != null) throw currentPositionError!;
    return currentPosition ?? samplePosition();
  }

  @override
  Stream<Position> getPositionStream({LocationSettings? locationSettings}) {
    return _positionController.stream;
  }

  void dispose() => _positionController.close();
}
