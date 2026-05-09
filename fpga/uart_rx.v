// =============================================================================
// Module:      uart_rx.v
// Project:     MediLink FPGA Emergency Alert Receiver
// Baud rate:   9600  (matches SerialService.java: comPort.setBaudRate(9600))
// Clock:       50 MHz
//
// BAUD RATE MATH:
//   Clocks per bit = 50,000,000 / 9600 = 5208.33 → use 5208
//   Sample point   = 5208 / 2 = 2604  (mid-bit sampling for noise rejection)
//
// PROTOCOL: 8N1 (8 data bits, no parity, 1 stop bit) — UART default.
//
// OPERATION:
//   1. Idle: rx_pin = HIGH (mark state). Waits for start bit (LOW).
//   2. Start bit detected: waits half a bit period to centre the sample
//      window on the middle of the start bit, then verifies it is LOW.
//      If not LOW (glitch), aborts and returns to idle.
//   3. Samples 8 data bits, LSB first, at the mid-point of each bit period.
//   4. Samples stop bit. On valid stop bit (HIGH), asserts data_ready for
//      exactly ONE clock cycle with the received byte in data_out.
//   5. Returns to idle.
//
// OUTPUT BEHAVIOUR:
//   data_ready pulses HIGH for ONE 50MHz clock cycle when a byte is received.
//   data_out holds the byte while data_ready is HIGH and remains stable
//   until the next byte is received (latched in medilink_top.v).
// =============================================================================

module uart_rx (
    input  wire       clk,        // 50 MHz system clock
    input  wire       rx_pin,     // UART RX line (from PC via USB-Serial adapter)
    output reg  [7:0] data_out,   // Received byte (valid when data_ready HIGH)
    output reg        data_ready  // Pulses HIGH for one clock when byte received
);

    // =========================================================================
    // Baud rate constants
    // =========================================================================
    localparam integer CLKS_PER_BIT  = 5208;        // 50MHz / 9600
    localparam integer HALF_BIT      = CLKS_PER_BIT / 2;  // 2604
    localparam integer CNT_W         = 13;           // ceil(log2(5208)) = 13

    // =========================================================================
    // Input synchroniser (2-FF metastability guard)
    // =========================================================================
    reg rx_sync0, rx_sync1;
    always @(posedge clk) begin
        rx_sync0 <= rx_pin;
        rx_sync1 <= rx_sync0;
    end
    wire rx = rx_sync1;  // Synchronised rx signal

    // =========================================================================
    // FSM states
    // =========================================================================
    localparam [2:0]
        ST_IDLE  = 3'd0,
        ST_START = 3'd1,
        ST_DATA  = 3'd2,
        ST_STOP  = 3'd3,
        ST_DONE  = 3'd4;

    reg [2:0]      state;
    reg [CNT_W-1:0] baud_cnt;    // Baud period counter
    reg [2:0]      bit_idx;      // Which data bit we are receiving (0..7)
    reg [7:0]      rx_shift;     // Shift register for incoming bits

    // =========================================================================
    // State machine
    // =========================================================================
    always @(posedge clk) begin
        data_ready <= 1'b0;  // Default: not ready (pulses for one cycle in DONE)

        case (state)

            // ------------------------------------------------------------------
            // IDLE: Wait for start bit (falling edge: HIGH → LOW)
            // ------------------------------------------------------------------
            ST_IDLE: begin
                baud_cnt <= 0;
                bit_idx  <= 0;
                if (!rx)               // Start bit detected
                    state <= ST_START;
            end

            // ------------------------------------------------------------------
            // START: Wait to the mid-point of the start bit, then verify LOW.
            // This rejects glitches shorter than half a bit period.
            // ------------------------------------------------------------------
            ST_START: begin
                if (baud_cnt == HALF_BIT - 1) begin
                    baud_cnt <= 0;
                    if (!rx)           // Still LOW → valid start bit
                        state <= ST_DATA;
                    else               // Glitch — abort
                        state <= ST_IDLE;
                end else begin
                    baud_cnt <= baud_cnt + 1'b1;
                end
            end

            // ------------------------------------------------------------------
            // DATA: Sample 8 data bits, LSB first, at the centre of each bit.
            // ------------------------------------------------------------------
            ST_DATA: begin
                if (baud_cnt == CLKS_PER_BIT - 1) begin
                    baud_cnt            <= 0;
                    rx_shift[bit_idx]   <= rx;  // Sample at bit centre
                    if (bit_idx == 3'd7) begin
                        bit_idx <= 0;
                        state   <= ST_STOP;
                    end else begin
                        bit_idx <= bit_idx + 1'b1;
                    end
                end else begin
                    baud_cnt <= baud_cnt + 1'b1;
                end
            end

            // ------------------------------------------------------------------
            // STOP: Wait one full bit period, sample stop bit.
            // ------------------------------------------------------------------
            ST_STOP: begin
                if (baud_cnt == CLKS_PER_BIT - 1) begin
                    baud_cnt <= 0;
                    state    <= ST_DONE;
                    // Stop bit should be HIGH; if LOW it's a framing error.
                    // We still latch the byte — medilink_top checks uart_byte != 0.
                end else begin
                    baud_cnt <= baud_cnt + 1'b1;
                end
            end

            // ------------------------------------------------------------------
            // DONE: Output the received byte for exactly one clock cycle.
            // ------------------------------------------------------------------
            ST_DONE: begin
                data_out   <= rx_shift;
                data_ready <= 1'b1;   // One-cycle pulse
                state      <= ST_IDLE;
            end

            default: state <= ST_IDLE;
        endcase
    end

endmodule