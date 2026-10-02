import 'package:google_sign_in/google_sign_in.dart';

/// GoogleAuthService — wraps google_sign_in to obtain an ID token, mirroring
/// the web app's GoogleLogin flow (Frontend/src/Pages/Login.jsx). The backend
/// (Backend/controllers/userController.js googleLogin) verifies this token's
/// signature, issuer, expiry and audience (H5 fix) - it must be an ID token,
/// never a bare access token.
///
/// [serverClientId] is the project's OAuth "Web" client id (client_type 3 in
/// Mobile/android/app/google-services.json) - the same audience the backend
/// checks the token against. It's a public identifier, not a secret.
class GoogleAuthService {
  static const _serverClientId =
      '369024297315-bopdf7jqbtgcfa6r9visauts8ao07i81.apps.googleusercontent.com';

  static final GoogleSignIn _googleSignIn = GoogleSignIn(
    serverClientId: _serverClientId,
  );

  /// Runs the interactive Google sign-in flow and returns the ID token to
  /// send to the backend, or null if the user cancelled or no ID token came
  /// back (e.g. Play Services unavailable).
  static Future<String?> signIn() async {
    final account = await _googleSignIn.signIn();
    if (account == null) return null;
    final auth = await account.authentication;
    return auth.idToken;
  }

  static Future<void> signOut() => _googleSignIn.signOut();
}
