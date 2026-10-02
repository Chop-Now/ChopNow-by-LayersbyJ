import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'firebase_options.dart';
import 'core/theme/app_theme.dart';
import 'core/router/router.dart';
import 'core/services/notification_service.dart';
import 'shared/widgets/notifications/in_app_notification_overlay.dart';

// H18: without this, a crash in the field is invisible to the team - it
// just looks like a user "the app closed" report with no stack trace, no
// device info, nothing to act on. Firebase is already integrated for
// notifications, so Crashlytics is the lowest-friction way to get real
// crash visibility (the same Firebase project just needs Crashlytics turned
// on in its console - no new project/SDK setup required).
void main() async {
  runZonedGuarded(() async {
    WidgetsFlutterBinding.ensureInitialized();

    // ── 1. Initialize Firebase ────────────────────────────────────────────────
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );

    // Flutter framework errors (widget build/layout/paint errors, etc.).
    FlutterError.onError = (details) {
      FirebaseCrashlytics.instance.recordFlutterFatalError(details);
    };

    // Errors thrown outside the Flutter framework's own error zone (async
    // gaps, isolate-level errors) that FlutterError.onError never sees.
    PlatformDispatcher.instance.onError = (error, stack) {
      FirebaseCrashlytics.instance.recordError(error, stack, fatal: true);
      return true;
    };

    // Disable in debug builds so local development errors don't pollute
    // Crashlytics with noise from work-in-progress code.
    await FirebaseCrashlytics.instance
        .setCrashlyticsCollectionEnabled(!kDebugMode);

    // ── 2. Initialize push notification service ────────────────────────────────
    await NotificationService.instance.initialize();

    // ── 3. Lock to portrait orientation ──────────────────────────────────────
    await SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.portraitDown,
    ]);

    // ── 4. Premium transparent status bar ──────────────────────────────────────
    SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
    ));

    runApp(
      const ProviderScope(
        child: ChopNowApp(),
      ),
    );
  }, (error, stack) {
    // Anything that escapes the zone entirely (e.g. thrown before Firebase
    // finished initializing above) still gets recorded, guarded so a
    // Crashlytics failure itself can never crash error reporting.
    try {
      FirebaseCrashlytics.instance.recordError(error, stack, fatal: true);
    } catch (_) {
      if (kDebugMode) debugPrint('Uncaught error: $error\n$stack');
    }
  });
}

class ChopNowApp extends ConsumerWidget {
  const ChopNowApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'ChopNow',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: ThemeMode.system,
      routerConfig: router,
      builder: (context, child) {
        // Wrap the entire app in the premium in-app notification overlay
        return NotificationOverlayWrapper(
          child: child ?? const SizedBox.shrink(),
        );
      },
    );
  }
}
