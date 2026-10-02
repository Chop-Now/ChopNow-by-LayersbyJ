# ChopNow Mobile — always remember

This file is a living list of project-specific facts and conventions for this
Flutter app. Keep entries short and factual. Update it whenever corrected.

## Brand colours

The approved palette (Moringa `#0F3D2E` / Now Yellow `#FFC531` / Pepper
`#E8552F` / Fufu `#FAF3E4` / Char `#17150F`), its usage proportions, contrast
pairings, and logo lockups live in the **root `CLAUDE.md`** — single source of
truth, shared with the web app. Don't duplicate the values here; they drift.

Mobile-side notes:

- All colours belong in `lib/core/theme/app_colors.dart` (consumed by
  `app_theme.dart`). 18 files currently hardcode `Color(0x…)` outside it — a
  palette migration has to sweep those too, not just retheme `AppColors`.
- `AppColors` is still on the **legacy** green/orange brand (`primary`
  `#00A86B`, `accent` `#FF7A00`). The palette swap hasn't happened yet; the
  web app's Home/FAQ/Privacy/Terms pages are already migrated.
- `AppColors.success` is currently the same green as the brand `primary`.
  Moringa is also a green, so when migrating keep success visually distinct
  from the brand colour or success/error states stop reading correctly.

## Stack

- Flutter, Riverpod for state, GoRouter-style router in `lib/core/router`.
- Backend: Node/Express + MongoDB (Mongoose) + JWT auth — **not** Supabase,
  **not** Firebase Auth. Firebase is used only for FCM push notifications.
- Payments: pawaPay (MTN MoMo / Airtel Money, Rwanda). No card numbers or
  MoMo PINs ever pass through the app or backend — pawaPay handles that via
  the mobile money USSD/push flow. Webhook is verified with RFC-9421
  cryptographic signatures (`Backend/utils/pawapaySignatures.js`).
- Image/doc uploads go to Cloudinary via the backend (`multer` in memory,
  never written to disk). Client uses `image_picker` with `imageQuality`
  compression only — no explicit post-compression byte-size cap yet.

## Backend connection

- Default `apiBaseUrl`/`socketUrl` (`lib/core/utils/constants.dart`) point at
  the **deployed Render backend** (`https://chopnow-backend.onrender.com`),
  not a local server. `flutter run` works with zero local setup — no backend
  needs to be started on the dev machine. It shares one MongoDB Atlas DB with
  the web app and every teammate's mobile build, so data added by anyone
  shows up for everyone.
- The custom domain `api.chopnow.app` (referenced in `.env.example` and old
  comments) is currently **broken** — it resolves to a dead Vercel
  deployment, not Render. Don't point anything at it until that's fixed
  (whoever owns the DNS/Vercel project needs to repoint it at Render, or the
  Render service needs the custom domain attached).
- Render free tier cold-starts after inactivity (~30-50s to wake up on first
  request) — a "timeout" on the very first request after a while can just be
  that, not a real bug. `connectTimeout`/`receiveTimeout` are 30s each.
- To point at a local backend instead (e.g. testing backend changes before
  they're deployed): run the backend with `npm run dev` in `Backend/` (it
  uses port 5001, not 5000 — 5000 conflicts with macOS's AirPlay Receiver),
  then launch the app with:
  ```
  flutter run --dart-define=API_BASE_URL=http://<your-lan-ip>:5001/api/v1 \
              --dart-define=SOCKET_URL=http://<your-lan-ip>:5001
  ```
  Use your Mac's LAN IP (`ipconfig getifaddr en0`), not `10.0.2.2` — that
  alias only works on the Android emulator, not iOS. LAN IP is DHCP-assigned
  and can change across reconnects.
- **This local override works on iOS but is blocked on Android.**
  `android/app/src/main/AndroidManifest.xml` sets
  `android:usesCleartextTraffic="false"`, so any plain `http://` URL fails
  silently on Android. To test a local backend from Android you must either
  put the backend behind HTTPS (e.g. an ngrok/Cloudflare tunnel — preferred),
  or temporarily flip that flag to `true` and never commit that change.
  This is also why the old `http://10.0.2.2:5000` default could never have
  worked on Android as shipped.

## Auth / secure storage

- Access token, refresh token, userId, active role: **always**
  `flutter_secure_storage` (`lib/core/services/auth_service.dart`), never
  `SharedPreferences`.
- `LocalStorageService` (SharedPreferences) is explicitly for non-sensitive
  data only: cart, theme, FCM token cache, notif prefs, last known location.

## iOS push notifications (FCM)

- Currently **disabled on iOS** via `_fcmSupported` flag in
  `lib/core/services/notification_service.dart` — the project has no paid
  Apple Developer Program membership, so the Push Notifications capability
  can't be provisioned (Apple blocks it for free/personal team accounts).
- `ios/Runner/Runner.entitlements` (aps-environment) and
  `UIBackgroundModes: remote-notification` in `Info.plist` are already wired
  up in the Xcode project (`CODE_SIGN_ENTITLEMENTS` set for all 3 build
  configs) — ready for whenever a paid account is added. At that point,
  remove/relax the `_fcmSupported` iOS gate to re-enable.
- Android push is unaffected and works normally.
- Notification setup (`NotificationService.initialize()` in `main.dart`) must
  **never throw uncaught** — it's awaited directly in `main()` before
  `runApp()`, so an unhandled exception there hangs the app on the splash
  screen forever. Always wrap risky calls (`getToken`, `getAPNSToken`, etc.)
  in try/catch.

## iOS project

- Always open `ios/Runner.xcworkspace` in Xcode, never `Runner.xcodeproj` —
  the project uses CocoaPods, and opening the bare `.xcodeproj` skips Pods
  integration.
- `mobile_scanner` is pinned to `^7.4.0` (bumped from `^5.2.2`) — the old
  version's GoogleMLKit dependency conflicted with `firebase_messaging`'s
  required `GoogleDataTransport` version in CocoaPods dependency resolution.
  Don't downgrade it without checking that conflict is still resolved.

## Android project

- `MainActivity` **must** extend `FlutterFragmentActivity`, not
  `FlutterActivity` — `local_auth`'s biometric prompt requires a
  `FragmentActivity` host and fails at runtime otherwise. Don't "simplify"
  it back. (`USE_BIOMETRIC` needs no app-level declaration; the plugin's own
  manifest merges it in.)
- `android/gradle.properties` carries `android.builtInKotlin=false` and
  `android.newDsl=false`, added by Flutter's migrator. These are
  load-bearing: several plugins (`mobile_scanner`, `local_auth_android`,
  `camera_android_camerax`, `share_plus`, `shared_preferences_android`) still
  apply the Kotlin Gradle Plugin, and the build warns that future Flutter
  versions will reject that. Don't delete these lines until those plugins
  ship Built-in Kotlin support.
- `usesCleartextTraffic="false"` — see the Backend connection section; all
  Android traffic must be HTTPS.

## GoRouter + ShellRoute + dialogs (crash class, fixed but stay alert)

- Bottom-nav tab switches (`ConsumerShell`, and the Rider/Business shells) use
  `context.go(tab.path)`, which **replaces** GoRouter's whole page stack
  rather than pushing. So a bottom-nav tab is frequently the _only_ page
  GoRouter knows about (`currentConfiguration` has exactly 1 entry).
- `showDialog` / `showCupertinoDialog` default to `useRootNavigator: true`,
  which pushes onto GoRouter's own Pages-API navigator. GoRouter tracks every
  route on that navigator to keep its internal page list in sync — closing
  such a dialog when the stack has only 1 page confuses GoRouter into
  thinking its last real page was removed, and it crashes with:
  `_AssertionError ('currentConfiguration.isNotEmpty': You have popped the
last page off of the stack...)`.
- Fix applied everywhere in the app: every `showDialog`/`showCupertinoDialog`
  call now passes `useRootNavigator: false`, so dialogs live on the local
  (shell) navigator instead. `showModalBottomSheet` already defaults to
  `useRootNavigator: false`, which is why the role-switcher bottom sheet
  never had this bug.
- **Always pass `useRootNavigator: false` on any new `showDialog` /
  `showCupertinoDialog` call added anywhere in this app** — this isn't
  optional style, it's what prevents this crash class from coming back.
- Separately, `ConsumerShell` is wrapped in `PopScope(canPop: false, ...)` to
  stop system back gestures (iOS edge-swipe, Android back button) from
  reaching GoRouter's pop with nothing left to pop to — a related but
  distinct mechanism from the dialog issue above; both are needed.
- Any route reached via `context.go(...)` (not `.push(...)`) from inside a
  tab screen has this same latent single-page-stack risk even outside the
  shell (e.g. `/impact` used to be `.go()`'d and had no working back button —
  fixed by switching its callers to `.push('/impact')` instead).

## Logging / PII

- Every `debugPrint`/log call must be gated behind `if (kDebugMode)` — this
  is the project's actual mechanism for "no logs in production" (Dart tree-shakes
  the dead branch in release builds), not manual removal before shipping.
- Never log raw email, phone, password, token, OTP, or payment details, even
  behind `kDebugMode` — log an event name / boolean / length instead.

## Input sanitization (backend)

- `Backend/middleware/sanitizeInput.js` runs globally on every request body
  string field via `sanitize-html` with an empty allowlist (strips all HTML
  tags from everything, not just specific fields like review text).
- `Backend/middleware/auth.js` — `protect` (JWT verify) + `authorize(...roles)`
  gate every sensitive route. Payment/payout routes are already `protect` +
  role-gated; don't add new sensitive routes without both.

## Known gaps / open items (not yet fixed)

- Business verification documents (ID, business license) uploaded via
  `Backend/middleware/uploadDocs.js` go to Cloudinary through the same
  upload path as public images — no evidence of `type: 'private'` /
  `access_mode: 'authenticated'` / signed delivery URLs. These are
  potentially sensitive KYC documents living at guessable-but-unlisted
  public Cloudinary URLs. Worth revisiting if this becomes a compliance
  concern.
- No explicit max-file-size-after-compression check on the client (only
  `imageQuality` percentage via `image_picker`); server caps raw upload at
  5MB (images) / 10MB (docs) via `multer`, which is the real enforcement
  point, but there's no guaranteed post-compression byte target.
