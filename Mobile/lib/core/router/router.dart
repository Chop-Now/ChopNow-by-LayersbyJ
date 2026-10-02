import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/auth_provider.dart';

// Screen imports
import '../../features/onboarding/splash_screen.dart';
import '../../features/onboarding/onboarding_screen.dart';
import '../../features/auth/login_screen.dart';
import '../../features/auth/register_screen.dart';
import '../../features/auth/forgot_password_screen.dart';
import '../../features/home/home_screen.dart';
import '../../features/listings/listing_detail_screen.dart';
import '../../features/cart/cart_screen.dart';
import '../../features/cart/checkout_screen.dart';
import '../../features/orders/order_confirmation_screen.dart';
import '../../features/orders/order_tracking_screen.dart';
import '../../features/orders/order_history_screen.dart';
import '../../features/orders/order_detail_screen.dart';
import '../../features/orders/review_screen.dart';
import '../../features/orders/dispute_screen.dart';
import '../../features/notifications/notifications_screen.dart';
import '../../features/profile/profile_screen.dart';
import '../../features/profile/edit_profile_screen.dart';
import '../../features/profile/addresses_screen.dart';
import '../../features/impact/impact_dashboard_screen.dart';
import '../../features/business/business_shell.dart';
import '../../features/business/business_dashboard_screen.dart';
import '../../features/business/my_listings_screen.dart';
import '../../features/business/create_listing_camera_screen.dart';
import '../../features/business/create_listing_details_screen.dart';
import '../../features/business/business_orders_screen.dart';
import '../../features/business/analytics_screen.dart';
import '../../features/business/create_business_screen.dart';
import '../../features/business/business_verification_screen.dart';
import '../../features/business/pending_review_screen.dart';
import '../../features/business/payouts_screen.dart';
import '../../features/rider/rider_shell.dart';
import '../../features/rider/rider_dashboard_screen.dart';
import '../../features/rider/active_delivery_screen.dart';
import '../../features/rider/rider_earnings_screen.dart';
import '../../features/rider/rider_profile_screen.dart';
import '../../features/rider/become_rider_screen.dart';
import '../../features/home/browse_screen.dart';
import '../../features/profile/settings_screen.dart';
import '../../features/profile/favorites_screen.dart';
import '../../features/listings/business_profile_screen.dart';
import '../../shared/widgets/layout/consumer_shell.dart';

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/splash',
    refreshListenable:
        GoRouterRefreshStream(ref.watch(authProvider.notifier).stream),
    redirect: (context, state) async {
      final auth = ref.read(authProvider);
      final path = state.uri.path;

      final publicPaths = [
        '/splash',
        '/onboarding',
        '/auth/login',
        '/auth/register',
        '/auth/forgot-password',
      ];

      if (auth is AuthInitial) {
        return path == '/splash' ? null : '/splash';
      }

      if (auth is AuthLoading) {
        // If we're already on a public path (like login/register), stay there so the button can show a spinner.
        // Otherwise, go to splash while we load/check auth.
        if (publicPaths.any((p) => path.startsWith(p))) return null;
        return '/splash';
      }

      if (auth is AuthUnauthenticated || auth is AuthError) {
        if (publicPaths.any((p) => path.startsWith(p))) return null;
        return '/auth/login';
      }

      if (auth is AuthAuthenticated) {
        // Already on auth screen → redirect to home by role
        if (path == '/splash' ||
            path == '/onboarding' ||
            path.startsWith('/auth')) {
          return _homeForRole(auth.user.activeRole);
        }

        // Wrong role shell → redirect
        if (path.startsWith('/business') &&
            auth.user.activeRole != 'business_owner') {
          return '/home';
        }
        if (path.startsWith('/rider') && auth.user.activeRole != 'rider') {
          return '/home';
        }
      }
      return null;
    },
    routes: [
      // ── System ──
      GoRoute(path: '/splash', builder: (_, __) => const SplashScreen()),
      GoRoute(
          path: '/onboarding', builder: (_, __) => const OnboardingScreen()),
      GoRoute(
          path: '/become-rider', builder: (_, __) => const BecomeRiderScreen()),
      GoRoute(
          path: '/business/verify',
          builder: (_, __) => const BusinessVerificationScreen()),
      GoRoute(
          path: '/business/pending-review',
          builder: (_, __) => const PendingReviewScreen()),
      GoRoute(
        path: '/listings/:id',
        builder: (_, state) =>
            ListingDetailScreen(listingId: state.pathParameters['id']!),
      ),

      // ── Auth ──
      GoRoute(path: '/auth/login', builder: (_, __) => const LoginScreen()),
      GoRoute(
          path: '/auth/register', builder: (_, __) => const RegisterScreen()),
      GoRoute(
          path: '/auth/forgot-password',
          builder: (_, __) => const ForgotPasswordScreen()),

      // ── Consumer Pages (Root Level to prevent duplicate shells & clashing keys) ──
      GoRoute(
          path: '/checkout', builder: (_, __) => const CheckoutScreen()),
      GoRoute(
        path: '/orders/:id/confirmation',
        builder: (_, state) =>
            OrderConfirmationScreen(orderId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/orders/:id/tracking',
        builder: (_, state) =>
            OrderTrackingScreen(orderId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/orders/:id',
        builder: (_, state) =>
            OrderDetailScreen(orderId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/orders/:id/review',
        builder: (_, state) =>
            ReviewScreen(orderId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/orders/:id/dispute',
        builder: (_, state) =>
            DisputeScreen(orderId: state.pathParameters['id']!),
      ),
      GoRoute(
          path: '/notifications',
          builder: (_, __) => const NotificationsScreen()),
      GoRoute(
          path: '/profile/edit',
          builder: (_, __) => const EditProfileScreen()),
      GoRoute(
          path: '/profile/addresses',
          builder: (_, __) => const AddressesScreen()),
      GoRoute(
          path: '/profile/favorites',
          builder: (_, __) => const FavoritesScreen()),
      GoRoute(
          path: '/profile/settings',
          builder: (_, __) => const SettingsScreen()),
      GoRoute(
          path: '/impact',
          builder: (_, __) => const ImpactDashboardScreen()),
      GoRoute(
        path: '/business/:id/profile',
        builder: (_, state) =>
            BusinessProfileScreen(businessId: state.pathParameters['id']!),
      ),

      // ── Consumer Shell (Only for Main Navigation Tabs) ──
      ShellRoute(
        builder: (context, state, child) => ConsumerShell(child: child),
        routes: [
          GoRoute(path: '/home', builder: (_, __) => const HomeScreen()),
          GoRoute(path: '/browse', builder: (_, __) => const BrowseScreen()),
          GoRoute(path: '/cart', builder: (_, __) => const CartScreen()),
          GoRoute(path: '/orders', builder: (_, __) => const OrderHistoryScreen()),
          GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
        ],
      ),

      // ── Business Shell ──
      ShellRoute(
        builder: (context, state, child) => BusinessShell(child: child),
        routes: [
          GoRoute(
              path: '/business/dashboard',
              builder: (_, __) => const BusinessDashboardScreen()),
          GoRoute(
              path: '/business/create',
              builder: (_, __) => const CreateBusinessScreen()),
          GoRoute(
              path: '/business/listings',
              builder: (_, __) => const MyListingsScreen()),
          GoRoute(
              path: '/business/listings/camera',
              builder: (_, __) => const CreateListingCameraScreen()),
          GoRoute(
            path: '/business/listings/create',
            builder: (_, state) {
              final imagePath = state.uri.queryParameters['imagePath'] ?? '';
              return CreateListingDetailsScreen(imagePath: imagePath);
            },
          ),
          GoRoute(
              path: '/business/orders',
              builder: (_, __) => const BusinessOrdersScreen()),
          GoRoute(
              path: '/business/analytics',
              builder: (_, __) => const AnalyticsScreen()),
          GoRoute(
              path: '/business/payouts',
              builder: (_, __) => const PayoutsScreen()),
          GoRoute(
            path: '/business/listings/:id/edit',
            builder: (_, state) {
              final id = state.pathParameters['id']!;
              return CreateListingDetailsScreen(imagePath: '', listingId: id);
            },
          ),
        ],
      ),

      // ── Rider Shell ──
      ShellRoute(
        builder: (context, state, child) => RiderShell(child: child),
        routes: [
          GoRoute(
              path: '/rider/dashboard',
              builder: (_, __) => const RiderDashboardScreen()),
          GoRoute(
              path: '/rider/earnings',
              builder: (_, __) => const RiderEarningsScreen()),
          GoRoute(
              path: '/rider/profile',
              builder: (_, __) => const RiderProfileScreen()),
          GoRoute(
            path: '/rider/deliveries/:id',
            builder: (_, state) =>
                ActiveDeliveryScreen(orderId: state.pathParameters['id']!),
          ),
        ],
      ),
    ],
  );
});

String _homeForRole(String role) {
  return switch (role) {
    'business_owner' => '/business/dashboard',
    'rider' => '/rider/dashboard',
    _ => '/home',
  };
}

/// Adapter to make Riverpod stream compatible with GoRouter's refreshListenable
class GoRouterRefreshStream extends ChangeNotifier {
  late final StreamSubscription<dynamic> _sub;

  GoRouterRefreshStream(Stream<dynamic> stream) {
    _sub = stream.listen((_) => notifyListeners());
  }

  @override
  void dispose() {
    _sub.cancel();
    super.dispose();
  }
}
