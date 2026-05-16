import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

// Background message handler — must be top-level function
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // no-op: background messages are handled silently
}

class FcmService {
  static final FirebaseMessaging _messaging = FirebaseMessaging.instance;

  static Future<void> initialize() async {
    // Request permission for notifications
    NotificationSettings settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      // Get device token and store it under this user's UID
      String? token = await _messaging.getToken();
      if (token != null) {
        await _saveTokenToFirestore(token);
      }

      // Re-save on token rotation so it stays current
      _messaging.onTokenRefresh.listen((newToken) {
        _saveTokenToFirestore(newToken);
      });

      // Foreground messages are delivered as FCM data payloads;
      // the app's alert list updates via the Firestore StreamBuilder.
      FirebaseMessaging.onMessage.listen((_) {});
    }
  }

  /// Stores the FCM device token under fcm_tokens/{uid} so the backend
  /// can look it up by the responder's Firebase Auth UID when dispatching.
  static Future<void> _saveTokenToFirestore(String token) async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) return; // not logged in yet — skip
    await FirebaseFirestore.instance
        .collection('fcm_tokens')
        .doc(uid)
        .set({
      'token': token,
      'updatedAt': Timestamp.now(),
    });
  }
}
