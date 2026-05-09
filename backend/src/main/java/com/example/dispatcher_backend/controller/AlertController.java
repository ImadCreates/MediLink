package com.example.dispatcher_backend.controller;

import com.example.dispatcher_backend.dto.AlertRequest;
import com.example.dispatcher_backend.service.SerialService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.dispatcher_backend.service.AlertService;  // Add this!

import java.util.HashMap;
import java.util.Map;
    
@RestController
@RequestMapping("/api/alerts")
@CrossOrigin(origins = "http://localhost:5173") // Connects to your React frontend
public class AlertController {

    @Autowired
    private SerialService serialService; // Inject the new service

    @Autowired
    private AlertService alertService; // Inject the AlertService

    @PostMapping("/create")
    public ResponseEntity<Map<String, Object>> createAlert(@RequestBody AlertRequest request) {
        // 1. Define base codes for types
        int typeOffset = switch (request.getIncidentType()) {
            case "Fire" -> 10;           // 0x0A
            case "Medical" -> 20;        // 0x14
            case "Police" -> 30;         // 0x1E
            case "Infrastructure" -> 40; // 0x28
            default -> 0;
        };

        // 2. Combine Type + Priority (e.g., Fire Priority 2 = 12)
        int finalCode = typeOffset + request.getPriority();

        // 3. Send this unique code to the Serial Port
        serialService.sendEncodedAlert(finalCode);

        // Return the data to React so the UI knows what was sent
        Map<String, Object> response = new HashMap<>();
        response.put("incident", request.getIncidentType());
        response.put("systemCode", String.format("0x%02X", finalCode));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/status")
    public ResponseEntity<String> getStatus() {
        // This calls the AlertService we just created
        return ResponseEntity.ok(alertService.getCurrentStatus());
    }
}