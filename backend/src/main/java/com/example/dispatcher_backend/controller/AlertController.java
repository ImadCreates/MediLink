package com.example.dispatcher_backend.controller;

import com.example.dispatcher_backend.dto.AlertRequest;
import com.example.dispatcher_backend.service.SerialService;
import com.example.dispatcher_backend.service.AlertService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Value;


import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/alerts")
@CrossOrigin(origins = "http://localhost:5173")
public class AlertController {

    @Autowired
    private SerialService serialService;

    @Autowired
    private AlertService alertService;

    @Value("${firebase.api.key}")
    private String firebaseApiKey;

    @PostMapping("/create")
    public ResponseEntity<Map<String, Object>> createAlert(@RequestBody AlertRequest request) {
        int typeOffset = switch (request.getIncidentType()) {
            case "Fire" -> 10;
            case "Medical" -> 20;
            case "Police" -> 30;
            case "Infrastructure" -> 40;
            default -> 0;
        };

        int finalCode = typeOffset + request.getPriority();

        // UART — wrapped separately so failure doesn't block Firestore
        try {
            serialService.sendEncodedAlert(finalCode);
        } catch (Exception e) {
            System.err.println("UART send failed (no FPGA): " + e.getMessage());
        }

        // Write to Firestore via REST API
        try {
            String apiKey = firebaseApiKey;
            String projectId = "medilink-responder";
            String url = "https://firestore.googleapis.com/v1/projects/" + projectId + 
                        "/databases/(default)/documents/alerts";

            String location = (request.getLocation() != null && !request.getLocation().isEmpty())
                ? request.getLocation()
                : "Location not specified";

            String jsonBody = String.format("""
                {
                "fields": {
                    "type": {"stringValue": "%s"},
                    "location": {"stringValue": "%s"},
                    "status": {"stringValue": "pending"},
                    "priority": {"integerValue": %d}
                }
                }
                """,
                request.getIncidentType(),
                location,
                request.getPriority()
            );

            java.net.http.HttpClient client = java.net.http.HttpClient.newHttpClient();
            java.net.http.HttpRequest httpRequest = java.net.http.HttpRequest.newBuilder()
                .uri(java.net.URI.create(url + "?key=" + apiKey))
                .header("Content-Type", "application/json")
                .POST(java.net.http.HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();

            java.net.http.HttpResponse<String> httpResponse = client.send(
                httpRequest, 
                java.net.http.HttpResponse.BodyHandlers.ofString()
            );

            if (httpResponse.statusCode() == 200) {
                System.out.println("Firestore REST write successful");
            } else {
                System.err.println("Firestore REST write failed: " + httpResponse.body());
            }
        } catch (Exception e) {
            System.err.println("Firestore REST error: " + e.getMessage());
        }

        Map<String, Object> response = new HashMap<>();
        response.put("incident", request.getIncidentType());
        response.put("systemCode", String.format("0x%02X", finalCode));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/status")
    public ResponseEntity<String> getStatus() {
        return ResponseEntity.ok(alertService.getCurrentStatus());
    }
}