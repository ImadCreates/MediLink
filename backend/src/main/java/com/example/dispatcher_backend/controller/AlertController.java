package com.example.dispatcher_backend.controller;

import com.example.dispatcher_backend.dto.AlertRequest;
import com.example.dispatcher_backend.service.SerialService;
import com.example.dispatcher_backend.service.AlertService;
import com.example.dispatcher_backend.service.FcmNotificationService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/alerts")
@CrossOrigin(origins = {"http://localhost:5173", "https://medilink-technologies.vercel.app"})
public class AlertController {

    @Autowired
    private SerialService serialService;

    @Autowired
    private AlertService alertService;

    @Autowired
    private FcmNotificationService fcmNotificationService;

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

        // Firestore write is handled by the dashboard (handleConfirmDispatch addDoc).
        // The backend only handles UART encoding and FCM delivery.

        // Send FCM push notification to the assigned responder only
        String location = request.getLocation() != null && !request.getLocation().isEmpty()
            ? request.getLocation()
            : "Location not specified";
        String assignedTo = request.getAssignedTo();
        if (assignedTo != null && !assignedTo.isEmpty()) {
            fcmNotificationService.sendAlertNotification(
                request.getIncidentType(), location, assignedTo
            );
        } else {
            System.err.println("No assignedTo in request — FCM notification skipped");
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