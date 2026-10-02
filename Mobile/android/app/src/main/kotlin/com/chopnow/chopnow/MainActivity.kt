package com.chopnow.chopnow

import io.flutter.embedding.android.FlutterFragmentActivity

// FlutterFragmentActivity (not FlutterActivity) is required by local_auth:
// the biometric prompt needs a FragmentActivity host. Using FlutterActivity
// makes biometric auth fail at runtime on Android.
class MainActivity : FlutterFragmentActivity()
