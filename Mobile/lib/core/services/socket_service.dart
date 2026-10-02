import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../utils/constants.dart';

class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  SocketService._internal();

  io.Socket? _socket;
  final _orderStatusController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _newOrderController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _locationController =
      StreamController<Map<String, dynamic>>.broadcast();

  // Room memberships live on the server-side socket connection, not the
  // client object - any reconnect (a token refresh per M27, a network drop,
  // backgrounding) gets a fresh connection with none of them. Remembering
  // the last business room here lets onConnect below silently re-join it
  // instead of leaving the UI's "am I joined?" state and the server's
  // actual room membership out of sync after a reconnect.
  String? _lastBusinessId;

  Stream<Map<String, dynamic>> get orderStatusStream =>
      _orderStatusController.stream;
  Stream<Map<String, dynamic>> get newOrderStream => _newOrderController.stream;
  Stream<Map<String, dynamic>> get locationStream => _locationController.stream;

  bool get isConnected => _socket != null && _socket!.connected;

  void connect(String token) {
    if (_socket != null && _socket!.connected) return;

    try {
      const baseUrl = AppConstants.socketUrl;

      _socket = io.io(
        baseUrl,
        io.OptionBuilder()
            .setTransports(['websocket'])
            .disableAutoConnect()
            .setExtraHeaders({'Authorization': 'Bearer $token'})
            .build(),
      );

      _socket!.connect();

      _socket!.onConnect((_) {
        if (kDebugMode) debugPrint('Socket connected: ${_socket!.id}');
        if (_lastBusinessId != null) {
          _socket!.emit('join_business', _lastBusinessId);
        }
      });

      _socket!.onDisconnect((_) {
        if (kDebugMode) debugPrint('Socket disconnected');
      });

      // Listen for order status updates (for Consumers, Vendors, Riders)
      _socket!.on('order_status_updated', (data) {
        if (kDebugMode) debugPrint('Live order update received via Socket!');
        _orderStatusController.add(Map<String, dynamic>.from(data));
      });

      // Listen for new orders (for Vendors)
      _socket!.on('new_order', (data) {
        if (kDebugMode) debugPrint('Live new order received via Socket!');
        _newOrderController.add(Map<String, dynamic>.from(data));
      });

      // Listen for live rider location updates (for Consumers tracking their delivery)
      _socket!.on('location_update', (data) {
        if (kDebugMode) debugPrint('Live rider location update received via Socket!');
        _locationController.add(Map<String, dynamic>.from(data));
      });
    } catch (e) {
      if (kDebugMode) debugPrint('Socket connection error: $e');
    }
  }

  /// Subscribe consumer/rider to a specific order's tracking updates room
  void trackOrder(String orderId) {
    if (_socket == null || !_socket!.connected) return;
    if (kDebugMode) debugPrint('Emitting track_order for order: $orderId');
    _socket!.emit('track_order', orderId);
  }

  /// M25: a vendor's socket only receives `new_order` events once it has
  /// joined that business's room - the backend never broadcasts new orders
  /// to a business owner who hasn't emitted this. Without it, listening to
  /// newOrderStream would never fire regardless of what the UI does with it.
  /// Remembered and auto-replayed on every (re)connect - see onConnect above.
  void joinBusinessRoom(String businessId) {
    _lastBusinessId = businessId;
    if (_socket == null || !_socket!.connected) return;
    if (kDebugMode) debugPrint('Emitting join_business for business: $businessId');
    _socket!.emit('join_business', businessId);
  }

  /// M27: re-establish the connection under a freshly-refreshed access
  /// token. Deliberately NOT plain disconnect() + connect() - disconnect()
  /// also clears _lastBusinessId (correct for an actual logout, since the
  /// next person to use this device shouldn't inherit a stale room), but
  /// this is still the same user mid-session, so the room membership should
  /// survive the reconnect (onConnect replays it automatically).
  void reconnectWithToken(String newToken) {
    _socket?.disconnect();
    _socket = null;
    connect(newToken);
  }

  /// Emit location update from rider to tracking room
  void updateRiderLocation(String orderId, double lat, double lng) {
    if (_socket == null || !_socket!.connected) return;
    if (kDebugMode) debugPrint('Emitting rider_location_update: $lat, $lng');
    _socket!.emit('rider_location_update', {
      'orderId': orderId,
      'lat': lat,
      'lng': lng,
    });
  }

  void disconnect() {
    _socket?.disconnect();
    _socket = null;
    // Clears the remembered room too - otherwise a different user logging
    // in on this same device afterward would have their fresh socket
    // auto-rejoin the PREVIOUS user's business room on connect.
    _lastBusinessId = null;
  }
}