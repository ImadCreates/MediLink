package com.example.dispatcher_backend.dto;

import lombok.Data;

@Data
public class AlertRequest {
    private String incidentType;
    private int priority;
    private String location;
    private String assignedTo;  // UID of the responder selected in the dispatch modal
}