// =============================================================================
// Module:      alarm_driver.v  (v3 — rewritten for ACTIVE buzzer)
// Project:     MediLink FPGA Emergency Alert Receiver
//
// BUZZER MODEL: Bestar BT2412XH9.5-06LF  (Active buzzer, 3V rated)
//
// WHY THE PREVIOUS VERSION FAILED:
//   The v2 code output:  buzzer_out = alert_active & pulse_on & clk_1khz
//   This assumes a PASSIVE buzzer that needs an external square wave.
//   The BT2412XH9.5-06LF is an ACTIVE buzzer with a built-in oscillator.
//   An active buzzer buzzes whenever DC voltage is applied — it ignores
//   the frequency of the input signal entirely.
//   Result: buzzer sounded continuously as soon as the GPIO pin went HIGH.
//
// ACTIVE BUZZER CONTROL:
//   Active buzzer: HIGH = ON (buzzing at its own fixed internal frequency)
//                  LOW  = OFF (silent)
//   So the output just needs to be a clean ON/OFF signal.
//   We implement a 2Hz beep pattern: 0.5s ON, 0.5s OFF.
//   This creates an attention-grabbing pulsed alert rather than a
//   continuous tone, which is also less annoying during demoing.
//
// STARTUP BUZZ FIX (GPIO pin floats HIGH during FPGA configuration):
//   The FPGA GPIO pin is HIGH during JTAG programming before the design
//   loads. This causes a brief buzz on startup even with correct logic.
//   Fix: add a "startup lockout" counter — the buzzer output is forced LOW
//   for the first 200ms after power-on, by which time the FPGA is fully
//   configured and all registers have their correct initial values.
//
// CLKS_PER_HALF_BEEP at 50 MHz for 1Hz toggle (0.5s ON, 0.5s OFF):
//   50,000,000 / 2 = 25,000,000 cycles  → 25-bit counter (max 33,554,431)
//
// STARTUP_LOCKOUT at 50 MHz for 200ms:
//   50,000,000 * 0.2 = 10,000,000 cycles → 24-bit counter (max 16,777,215)
// =============================================================================

module alarm_driver (
    input  wire clk,           // 50 MHz system clock
    input  wire clk_1khz,      // Unused for active buzzer — kept for port compat
    input  wire alert_active,  // HIGH only when FSM is in S_ALERT
    output wire buzzer_out     // Connect directly to buzzer + terminal
);

    // =========================================================================
    // Startup lockout — force output LOW for first 200ms
    // Prevents the GPIO startup-high glitch from sounding the buzzer.
    // =========================================================================
    localparam integer LOCKOUT_CYCLES = 10_000_000;  // 200ms at 50MHz
    localparam integer LOCKOUT_W      = 24;           // ceil(log2(10M)) = 24

    reg [LOCKOUT_W-1:0] lockout_cnt;
    reg                 lockout_done;   // HIGH once startup lockout has elapsed

    always @(posedge clk) begin
        if (!lockout_done) begin
            if (lockout_cnt == LOCKOUT_CYCLES - 1) begin
                lockout_done <= 1'b1;
            end else begin
                lockout_cnt <= lockout_cnt + 1'b1;
            end
        end
    end

    // =========================================================================
    // Beep pattern generator — 2Hz toggle (0.5s ON, 0.5s OFF)
    // Counter runs freely; only the output gate cares about alert_active.
    // =========================================================================
    localparam integer HALF_BEEP_CYCLES = 25_000_000; // 0.5s at 50MHz
    localparam integer BEEP_CNT_W       = 25;          // ceil(log2(25M)) = 25

    reg [BEEP_CNT_W-1:0] beep_cnt;
    reg                  beep_phase;  // 0 = ON half, 1 = OFF half

    always @(posedge clk) begin
        if (!alert_active) begin
            // Reset counter when not alerting so each new alert starts
            // immediately in the ON phase — no waiting for the counter
            // to happen to be in the right half of its cycle.
            beep_cnt   <= 0;
            beep_phase <= 1'b0;   // 0 = ON phase
        end else begin
            if (beep_cnt == HALF_BEEP_CYCLES - 1) begin
                beep_cnt   <= 0;
                beep_phase <= ~beep_phase;  // Toggle ON/OFF
            end else begin
                beep_cnt <= beep_cnt + 1'b1;
            end
        end
    end

    // =========================================================================
    // Output gate (combinational, zero latency):
    //   buzzer_out = HIGH only when ALL of:
    //     1. Startup lockout has elapsed (FPGA fully configured)
    //     2. FSM says alert is active
    //     3. Beep pattern is in the ON phase
    //
    // For the active BT2412XH9.5-06LF:
    //   HIGH = buzzer sounds at its internal frequency (~2.4 kHz)
    //   LOW  = buzzer is completely silent
    // =========================================================================
    assign buzzer_out = lockout_done & alert_active & ~beep_phase;

endmodule