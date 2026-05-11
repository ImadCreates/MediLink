package com.example.dispatcher_backend.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.springframework.context.annotation.Configuration;
import jakarta.annotation.PostConstruct;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;

@Configuration
public class FirebaseConfig {

    @PostConstruct
    public void initialize() {
        try {
            if (!FirebaseApp.getApps().isEmpty()) return;

            InputStream serviceAccount;

            // Try environment variable first (for Railway/cloud deployment)
            String serviceAccountJson = System.getenv("FIREBASE_SERVICE_ACCOUNT");
            if (serviceAccountJson != null && !serviceAccountJson.isEmpty()) {
                System.out.println("Loading Firebase credentials from environment variable");
                serviceAccount = new ByteArrayInputStream(
                    serviceAccountJson.getBytes()
                );
            } else {
                // Fall back to local file (for local development)
                System.out.println("Loading Firebase credentials from local file");
                serviceAccount = getClass().getClassLoader()
                    .getResourceAsStream("serviceAccountKey.json");
                if (serviceAccount == null) {
                    System.err.println("serviceAccountKey.json NOT FOUND");
                    return;
                }
            }

            FirebaseOptions options = FirebaseOptions.builder()
                .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                .build();

            FirebaseApp.initializeApp(options);
            System.out.println("Firebase initialized successfully");

        } catch (IOException e) {
            System.err.println("Firebase init error: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
