package com.example.dispatcher_backend.service;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import org.springframework.stereotype.Service;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.concurrent.ExecutionException;

@Service
public class FcmNotificationService {

    public void sendAlertNotification(String incidentType, String location) {
        try {
            // Get the FCM token from Firestore
            com.google.cloud.firestore.Firestore db =
                com.google.firebase.cloud.FirestoreClient.getFirestore();

            com.google.cloud.firestore.DocumentSnapshot tokenDoc =
                db.collection("fcm_tokens")
                  .document("responder_token")
                  .get()
                  .get();

            if (!tokenDoc.exists()) {
                System.out.println("No FCM token found — responder app not registered");
                return;
            }

            String fcmToken = tokenDoc.getString("token");
            if (fcmToken == null || fcmToken.isEmpty()) {
                System.out.println("FCM token is empty");
                return;
            }

            // Get OAuth2 access token from service account
            String serviceAccountJson = System.getenv("FIREBASE_SERVICE_ACCOUNT");
            InputStream serviceAccount;
            if (serviceAccountJson != null && !serviceAccountJson.isEmpty()) {
                System.out.println("FCM: Loading credentials from environment variable");
                serviceAccount = new java.io.ByteArrayInputStream(
                    serviceAccountJson.getBytes()
                );
            } else {
                System.out.println("FCM: Loading credentials from local file");
                serviceAccount = getClass().getClassLoader()
                    .getResourceAsStream("serviceAccountKey.json");
            }

            GoogleCredentials credentials = GoogleCredentials
                .fromStream(serviceAccount)
                .createScoped("https://www.googleapis.com/auth/firebase.messaging");

            credentials.refreshIfExpired();
            String accessToken = credentials.getAccessToken().getTokenValue();

            // Build FCM V1 API request body
            String projectId = "medilink-responder";
            String fcmUrl = "https://fcm.googleapis.com/v1/projects/"
                + projectId + "/messages:send";

            String requestBody = String.format("""
                {
                  "message": {
                    "token": "%s",
                    "notification": {
                      "title": "🚨 New Emergency Alert",
                      "body": "%s — %s"
                    },
                    "android": {
                    "priority": "high",
                    "notification": {
                        "sound": "default",
                        "channel_id": "medilink_alerts",
                        "notification_priority": "PRIORITY_MAX",
                        "visibility": "PUBLIC",
                        "default_vibrate_timings": true,
                        "default_sound": true,
                        "default_light_settings": true
                    }
                    },
                    "data": {
                      "type": "%s",
                      "location": "%s"
                    }
                  }
                }
                """, fcmToken, incidentType, location, incidentType, location);

            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(fcmUrl))
                .header("Authorization", "Bearer " + accessToken)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

            HttpResponse<String> response = client.send(
                request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                System.out.println("FCM notification sent successfully");
            } else {
                System.err.println("FCM notification failed: " + response.body());
            }

        } catch (IOException | InterruptedException | ExecutionException e) {
            System.err.println("FCM error: " + e.getMessage());
        }
    }
}
