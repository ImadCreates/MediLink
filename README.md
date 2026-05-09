# MediLink — Emergency Dispatch System

A full emergency dispatch ecosystem built solo, connecting hardware
to mobile across four layers.

## System Architecture

React Dashboard → Spring Boot Backend → UART (COM4) → DE10-Lite FPGA
                                                            ↓
Flutter Mobile App ← Firebase ← Spring Boot ← FPGA Status Heartbeat

## Layers

| Layer | Technology | Description |
|---|---|---|
| Hardware | Verilog, DE10-Lite FPGA | 8-module FPGA design with 4-state FSM, UART, VGA |
| Backend | Java 21, Spring Boot | REST API, UART bridge, Firebase sync |
| Web Dashboard | React, Vercel | Dispatcher UI, real-time alert status |
| Mobile App | Flutter, Firebase, Riverpod | Responder app with Firebase Auth login |

## UART Protocol

| Byte | Direction | Meaning |
|---|---|---|
| 0x0B–0x2B | PC → FPGA | Alert codes (type + priority) |
| 0xAA | FPGA → PC | Accepted |
| 0xBB | FPGA → PC | Busy |
| 0xCC | FPGA → PC | Off-Duty |
| 0xDD | FPGA → PC | Idle |

## FPGA Modules

- medilink_top.v — top level, UART latch, 500ms heartbeat TX
- alert_fsm.v — 4-state FSM with debounced KEY inputs
- uart_rx.v — 9600 baud 8N1 receiver
- uart_tx.v — 9600 baud 8N1 transmitter
- vga_controller.v — 640x480 @ 60Hz sync generator
- vga_display_gen.v — state colors, type box, priority meter
- clk_divider.v — 50MHz to 25MHz and 1kHz
- alarm_driver.v — buzzer square wave driver

## Running the Backend

Requires Java 21 LTS and jSerialComm 2.10.4 exactly.
jSerialComm 2.11.0 will fail on AMD64 Windows — do not upgrade.

$env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
.\mvnw.cmd spring-boot:run

## Live Demo

Dashboard: https://medilink-pied.vercel.app

## Build Status

- [x] FPGA hardware layer complete
- [x] Spring Boot backend complete
- [x] React dispatcher dashboard deployed on Vercel
- [x] Flutter responder app — Firebase Auth login complete (responder-app/)
- [ ] Firestore real-time alerts (in progress)
- [ ] FCM push notifications
- [ ] Google Maps responder location
