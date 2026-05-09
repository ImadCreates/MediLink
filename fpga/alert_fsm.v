// =============================================================================
// Module:      alert_fsm.v  (v3 — debounced KEY[0], fixed accept_fall)
// Project:     MediLink FPGA Emergency Alert Receiver
//
// BUGS FIXED vs v2:
// -----------------
// 1. KEY[0] BOUNCE (primary buzzer bug cause):
//    KEY[0] is a mechanical button. Without debouncing, a single press
//    generates 5-50 spurious 0→1→0 transitions in ~5ms. The original
//    accept_fall edge detector saw these bounces as multiple press events,
//    causing the FSM to flicker between S_ALERT and S_ACCEPTED rapidly.
//    During the flicker window, alert_active toggled at high frequency,
//    making the buzzer appear to stay on.
//
//    FIX: 20ms hardware debouncer on KEY[0] using a 1,000,000 cycle
//    counter at 50 MHz (= 20ms). The output (accept_clean) only changes
//    state after the input has been stable for the full debounce period.
//
// 2. ACCEPT_FALL GENERATION:
//    The original edge detector compared the raw KEY[0] to its previous
//    value. With bouncing, prev could be 1 and current 0 and back to 1
//    within one bouncing burst, generating accept_fall spuriously.
//    FIX: accept_fall is now derived from accept_clean (debounced signal),
//    so it fires exactly once per physical button press.
//
// 3. ALERT_TRIGGER EDGE DETECTOR preserved correctly:
//    SW[9] is a slide switch (not a button) so it doesn't need debouncing,
//    but the rising-edge detector is kept so that holding SW[9] HIGH
//    triggers exactly one alert.
// =============================================================================

module alert_fsm (
    input  wire       clk,
    input  wire       rst_n,
    input  wire [1:0] responder_status,
    input  wire       alert_trigger,    // SW[9]: HIGH = alert incoming
    input  wire       accept_btn,       // KEY[0]: LOW when pressed (active LOW)
	 input  wire       reset_btn,        // KEY[1]: LOW when pressed (active LOW)
    output reg        alert_active,     // HIGH only in S_ALERT
    output reg  [1:0] fsm_state
);

    // =========================================================================
    // State encoding
    // =========================================================================
    localparam [1:0]
        S_IDLE     = 2'b00,
        S_ALERT    = 2'b01,
        S_ACCEPTED = 2'b10,
        S_BUSY     = 2'b11;

    localparam [1:0]
        STATUS_IDLE     = 2'b00,
        STATUS_BUSY     = 2'b01,
        STATUS_OFF_DUTY = 2'b10;

    // =========================================================================
    // RESPONDER STATUS DEBOUNCER (20ms at 50MHz)
    // SW[1:0] are mechanical slide switches — they bounce when moved.
    // Without debouncing, moving SW[1] from HIGH to LOW passes through
    // intermediate states that the FSM misreads as BUSY before settling.
    // =========================================================================
    reg [1:0]  status_sync_0, status_sync_1, status_sync_2;
    reg [19:0] status_debounce_cnt;
    reg [1:0]  status_clean;

    always @(posedge clk) begin
        status_sync_0 <= responder_status;
        status_sync_1 <= status_sync_0;
        status_sync_2 <= status_sync_1;
    end

    always @(posedge clk) begin
        if (!rst_n) begin
            status_debounce_cnt <= 20'd0;
            status_clean        <= 2'b00;
        end else begin
            if (status_sync_2 != status_clean) begin
                status_debounce_cnt <= status_debounce_cnt + 1'b1;
                if (status_debounce_cnt == DEBOUNCE_MAX) begin
                    status_clean        <= status_sync_2;
                    status_debounce_cnt <= 20'd0;
                end
            end else begin
                status_debounce_cnt <= 20'd0;
            end
        end
    end
   
	// KEY[0] DEBOUNCER  (20ms at 50 MHz = 1,000,000 cycles)
    // -------------------------------------------------------------------------
    // The debouncer works as a "change detector + stable timer":
    //   - sync_0, sync_1: two-FF synchroniser to move KEY[0] into clk domain
    //   - debounce_cnt:   counts stable cycles; resets on any input change
    //   - accept_clean:   only updates when count reaches DEBOUNCE_MAX

    localparam integer DEBOUNCE_MAX = 1_000_000 - 1;  // 20ms at 50MHz

    reg sync_0, sync_1, sync_2;  // 3-stage synchroniser for metastability

    always @(posedge clk) begin
        sync_0 <= accept_btn;   // accept_btn is active LOW from KEY[0]
        sync_1 <= sync_0;
        sync_2 <= sync_1;
    end

    reg [19:0]  debounce_cnt;
    reg         accept_clean;   // Debounced version of accept_btn (active LOW)

    always @(posedge clk) begin
        if (!rst_n) begin
            debounce_cnt <= 20'd0;
            accept_clean <= 1'b1;    // Released (HIGH = not pressed, active LOW)
        end else begin
            if (sync_2 != accept_clean) begin
                // Input disagrees with current stable state — start counting
                debounce_cnt <= debounce_cnt + 1'b1;
                if (debounce_cnt == DEBOUNCE_MAX) begin
                    // Input has been different for 20ms → accept new state
                    accept_clean <= sync_2;
                    debounce_cnt <= 20'd0;
                end
            end else begin
                // Input matches current stable state → reset counter
                debounce_cnt <= 20'd0;
            end
        end
    end

    // =========================================================================
    // EDGE DETECTORS (on clean/debounced signals)
    // =========================================================================

    // Rising edge on SW[9]: alert_trigger 0→1 fires one alert per toggle
    reg alert_prev;
    wire alert_rise = alert_trigger & ~alert_prev;

    always @(posedge clk) begin
        if (!rst_n) alert_prev <= 1'b0;
        else        alert_prev <= alert_trigger;
    end

    // Falling edge on accept_clean: HIGH→LOW = button press (active LOW)
    reg accept_prev;
    wire accept_fall = ~accept_clean & accept_prev;

    always @(posedge clk) begin
        if (!rst_n) accept_prev <= 1'b1;
        else        accept_prev <= accept_clean;
    end

    // =========================================================================
    // KEY[1] DEBOUNCER — same 20ms logic, controls return to IDLE
    // =========================================================================
    reg sync1_0, sync1_1, sync1_2;
    always @(posedge clk) begin
        sync1_0 <= reset_btn;
        sync1_1 <= sync1_0;
        sync1_2 <= sync1_1;
    end

    reg [19:0] debounce1_cnt;
    reg        reset_clean;

    always @(posedge clk) begin
        if (!rst_n) begin
            debounce1_cnt <= 20'd0;
            reset_clean   <= 1'b1;
        end else begin
            if (sync1_2 != reset_clean) begin
                debounce1_cnt <= debounce1_cnt + 1'b1;
                if (debounce1_cnt == DEBOUNCE_MAX) begin
                    reset_clean   <= sync1_2;
                    debounce1_cnt <= 20'd0;
                end
            end else begin
                debounce1_cnt <= 20'd0;
            end
        end
    end

    reg reset_prev;
    wire reset_fall = ~reset_clean & reset_prev;

    always @(posedge clk) begin
        if (!rst_n) reset_prev <= 1'b1;
        else        reset_prev <= reset_clean;
    end

    // =========================================================================
    // FSM state register
    // =========================================================================
    reg [1:0] state, next_state;

    always @(posedge clk) begin
        if (!rst_n) state <= S_IDLE;
        else        state <= next_state;
    end

    // =========================================================================
    // Next-state logic (combinational)
    // =========================================================================
    always @(*) begin
        next_state = state;

        case (state)
            S_IDLE: begin
                if (status_clean == STATUS_BUSY ||
                    status_clean == STATUS_OFF_DUTY)
                    next_state = S_BUSY;
                else if (alert_rise)
                    next_state = S_ALERT;
            end

            S_ALERT: begin
                if (status_clean == STATUS_BUSY ||
                    status_clean == STATUS_OFF_DUTY)
                    next_state = S_BUSY;
                else if (accept_fall)
                    next_state = S_ACCEPTED;
            end

            S_ACCEPTED: begin
                if (reset_fall)
                    next_state = S_IDLE;
                else if (status_clean == STATUS_BUSY ||
                         status_clean == STATUS_OFF_DUTY)
                    next_state = S_BUSY;
            end

            S_BUSY: begin
                if (reset_fall)
                    next_state = S_IDLE;
                else if (status_clean == STATUS_IDLE)
                    next_state = S_IDLE;
            end

            default: next_state = S_IDLE;
        endcase
    end

    // =========================================================================
    // Output logic (registered)
    // =========================================================================
    always @(posedge clk) begin
        if (!rst_n) begin
            alert_active <= 1'b0;
            fsm_state    <= S_IDLE;
        end else begin
            fsm_state    <= next_state;
            alert_active <= (next_state == S_ALERT) ? 1'b1 : 1'b0;
        end
    end

endmodule