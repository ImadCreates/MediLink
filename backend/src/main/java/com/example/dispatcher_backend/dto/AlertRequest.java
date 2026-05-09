package com.example.dispatcher_backend.dto;

import lombok.Data;

@Data // This Lombok annotation automatically handles Getters/Setters
public class AlertRequest {
    private String incidentType;
    private int priority;
}