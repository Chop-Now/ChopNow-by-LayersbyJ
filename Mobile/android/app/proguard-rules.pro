# ProGuard configuration for ChopNow release builds

# Keep Flutter Plugins
-keep class io.flutter.plugins.** { *; }

# Keep Firebase classes
-keep class com.google.firebase.** { *; }

# OkHttp3 and Socket.IO warnings suppression
-dontwarn okhttp3.**
-dontwarn io.socket.**

# Keep model classes (avoiding reflection errors if compiled with shrinking/obfuscation)
-keep class com.chopnow.app.models.** { *; }
