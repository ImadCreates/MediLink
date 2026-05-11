import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

// Background message handler — must be top-level function
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  print('Background FCM message received: ${message.messageId}');
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
      print('FCM permission granted');

      // Get device token
      String? token = await _messaging.getToken();
      if (token != null) {
        await _saveTokenToFirestore(token);
        print('FCM token saved: $token');
      }

      // Listen for token refresh
      _messaging.onTokenRefresh.listen((newToken) {
        _saveTokenToFirestore(newToken);
      });

      // Handle foreground messages
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        print('Foreground FCM message: ${message.notification?.title}');
      });
    }
  }

  static Future<void> _saveTokenToFirestore(String token) async {
    await FirebaseFirestore.instance
        .collection('fcm_tokens')
        .doc('responder_token')
        .set({
      'token': token,
      'updatedAt': Timestamp.now(),
    });
  }
  
}
