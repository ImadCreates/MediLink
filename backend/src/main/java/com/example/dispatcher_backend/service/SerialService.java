package com.example.dispatcher_backend.service;

import com.fazecast.jSerialComm.SerialPort;
import com.fazecast.jSerialComm.SerialPortDataListener;
import com.fazecast.jSerialComm.SerialPortEvent;
import org.springframework.stereotype.Service;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import java.util.HashMap;
import java.util.Map;

@Service
public class SerialService {
    private SerialPort comPort;
    
    @Autowired
    private AlertService alertService; 

    @PostConstruct
    public void init() {
        try {
            comPort = SerialPort.getCommPort("COM4"); // FIXED: was COM10, Device Manager shows COM4

            comPort.setBaudRate(9600);
            comPort.setNumDataBits(8);
            comPort.setNumStopBits(SerialPort.ONE_STOP_BIT);
            comPort.setParity(SerialPort.NO_PARITY);

            if (comPort.openPort()) {
                System.out.println("UART Bridge Active on COM4 (FTDI TTL-232R-3V3-2mm)");

                comPort.addDataListener(new SerialPortDataListener() {
                    @Override
                    public int getListeningEvents() {
                        return SerialPort.LISTENING_EVENT_DATA_AVAILABLE;
                    }

                    @Override
                    public void serialEvent(SerialPortEvent event) {
                        if (event.getEventType() != SerialPort.LISTENING_EVENT_DATA_AVAILABLE) return;

                        byte[] newData = new byte[comPort.bytesAvailable()];
                        comPort.readBytes(newData, newData.length);

                        if (newData.length > 0) {
                            byte received = newData[0];

                            // Status bytes sent back FROM the FPGA uart_tx (future sprint)
                            if (received == (byte)0xAA) {
                                System.out.println("UART RX: Accepted (0xAA)");
                                alertService.updateStatus("IN_PROGRESS");
                            } else if (received == (byte)0xBB) {
                                System.out.println("UART RX: Busy (0xBB)");
                                alertService.updateStatus("BUSY");
                            } else if (received == (byte)0xCC) {
                                System.out.println("UART RX: Off-Duty (0xCC)");
                                alertService.updateStatus("OFF_DUTY");
                            } else if (received == (byte)0xDD) {
                                System.out.println("UART RX: Idle reset (0xDD)");
                                alertService.updateStatus("IDLE");
                            }
                        }
                    }
                });
            } else {
                System.err.println("UART: Could not open COM4. Check cable is plugged in and driver installed.");
            }
        } catch (Throwable t) {
            comPort = null;
            System.err.println("UART: Serial bridge disabled. " + t.getMessage());
        }
    }

    public Map<String, Object> getPortInfo() {
        Map<String, Object> info = new HashMap<>();
        if (comPort != null) {
            info.put("portName", comPort.getSystemPortName());
            info.put("isOpen", comPort.isOpen());
            info.put("baudRate", comPort.getBaudRate());
            info.put("dataBits", comPort.getNumDataBits());
            info.put("stopBits", comPort.getNumStopBits());
            info.put("parity", "None");
        } else {
            info.put("portName", "COM4");
            info.put("isOpen", false);
            info.put("baudRate", 9600);
            info.put("dataBits", 8);
            info.put("stopBits", 1);
            info.put("parity", "None");
            info.put("error", "Port could not be opened — check cable and driver");
        }
        return info;
    }

    public void sendEncodedAlert(int code) {
        if (comPort != null && comPort.isOpen()) {
            byte[] data = { (byte) code };
            comPort.writeBytes(data, 1);
            System.out.println("UART TX: Sent byte 0x" + String.format("%02X", code) + " (" + code + ") to COM4");
        } else {
            System.err.println("UART: Cannot transmit — COM4 is not open.");
        }
    }
}