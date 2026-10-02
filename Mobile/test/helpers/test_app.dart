import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// A minimal host app for widget-testing a single screen that navigates via
/// `context.push`/`context.go` (checkout, active delivery, ...): a real
/// GoRouter so those calls don't throw for lack of a router ancestor, with
/// the destination routes it can land on replaced by cheap marker screens
/// (`Text('...')`) instead of the real, provider-heavy destination screens.
class TestRouteScreen extends StatelessWidget {
  final String label;
  const TestRouteScreen(this.label, {super.key});

  @override
  Widget build(BuildContext context) => Scaffold(body: Center(child: Text(label)));
}

Widget buildTestApp({
  required Widget home,
  required List<Override> overrides,
  String initialLocation = '/home',
  Map<String, Widget Function(GoRouterState)> extraRoutes = const {},
}) {
  final router = GoRouter(
    initialLocation: initialLocation,
    routes: [
      GoRoute(path: '/home', builder: (_, __) => home),
      for (final entry in extraRoutes.entries)
        GoRoute(path: entry.key, builder: (_, state) => entry.value(state)),
    ],
  );

  return ProviderScope(
    overrides: overrides,
    child: MaterialApp.router(routerConfig: router),
  );
}
