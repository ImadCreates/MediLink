package com.example.dispatcher_backend.controller;

import com.example.dispatcher_backend.service.SerialService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/serial")
@CrossOrigin(origins = "http://localhost:5173")
public class SerialController {

    @Autowired
    private SerialService serialService;

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getSerialStatus() {
        return ResponseEntity.ok(serialService.getPortInfo());
    }
}
