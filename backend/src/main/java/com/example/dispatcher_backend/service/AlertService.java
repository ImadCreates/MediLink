package com.example.dispatcher_backend.service;

import org.springframework.stereotype.Service;
import java.util.concurrent.atomic.AtomicReference;

@Service
public class AlertService {

    // This stores the status of the "current" alert
    private AtomicReference<String> currentStatus = new AtomicReference<>("IDLE");

    public void updateStatus(String newStatus) {
        this.currentStatus.set(newStatus);
        System.out.println("System Status Updated to: " + newStatus);
    }

    public void updateStatusFromByte(int byteValue) {
        switch (byteValue) {
            case 0xAA -> updateStatus("IN_PROGRESS");
            case 0xBB -> updateStatus("BUSY");
            case 0xCC -> updateStatus("OFF_DUTY");
            case 0xDD -> updateStatus("IDLE");
            default   -> System.out.println("Unknown status byte: " + byteValue);
        }
    }

    public String getCurrentStatus() {
        return currentStatus.get();
    }
}