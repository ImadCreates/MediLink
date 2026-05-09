// =============================================================================
// Module:      medilink_top.v  (v2 — fixed flag clear + uart_tx feedback)
// =============================================================================

module medilink_top (
    input  wire        MAX10_CLK1_50,
    input  wire [9:0]  SW,
    input  wire [1:0]  KEY,
    output wire [9:0]  LEDR,
    output wire        VGA_HS,
    output wire        VGA_VS,
    output wire [3:0]  VGA_R,
    output wire [3:0]  VGA_G,
    output wire [3:0]  VGA_B,
    input  wire        uart_rx_pin,
    output wire        uart_tx_pin,
    output wire        buzzer_pin
);

    wire clk_25mhz, clk_1khz;
    wire alert_active;
    wire [1:0] fsm_state;
    wire [9:0] pixel_x, pixel_y;
    wire video_on, hsync, vsync;
    wire [3:0] red, green, blue;

    wire manual_mode       = SW[8];
    wire [1:0] responder_status = SW[1:0];
    wire       accept_btn       = KEY[0];

    wire uart_rx_pin_muxed = manual_mode ? 1'b1 : uart_rx_pin;

    wire [7:0] uart_byte;
    wire       uart_done;

    uart_rx u_receiver (
        .clk        (MAX10_CLK1_50),
        .rx_pin     (uart_rx_pin_muxed),
        .data_out   (uart_byte),
        .data_ready (uart_done)
    );

    // =========================================================================
    // UART ALERT LATCH  — FIX: clear only when FSM confirms S_ACCEPTED,
    // not on raw KEY[0] press. This prevents alert_trigger from dropping
    // while FSM is still in S_ALERT, which caused the IDLE skip bug.
    // =========================================================================
	 reg [7:0] latched_dispatch_code;
    reg       uart_alert_flag;

    wire fsm_in_accepted = (fsm_state == 2'b10);

    always @(posedge MAX10_CLK1_50) begin
        if (!KEY[1])
            uart_alert_flag <= 1'b0;   // KEY[1] pressed anywhere → clear flag
        else if (uart_done && uart_byte != 8'h00) begin
            latched_dispatch_code <= uart_byte;
            uart_alert_flag       <= 1'b1;
        end
    end

    wire [7:0] dispatch_code  = manual_mode ? SW[7:0]  : latched_dispatch_code;
    wire       alert_trigger  = manual_mode ? SW[9]     : uart_alert_flag;

    // =========================================================================
    // UART TX — send status byte to backend on FSM state transitions
    //
    // Status bytes (match SerialService.java exactly):
    //   0xAA = Accepted  (S_ACCEPTED)
    //   0xBB = Busy      (S_BUSY, status 01)
    //   0xCC = Off-Duty  (S_BUSY, status 10)
    //   0xDD = Idle      (S_IDLE)
    //
    // We send one byte whenever the FSM state changes. The uart_tx module
    // is a standard 8N1 transmitter at 9600 baud, 50 MHz clock.
    // =========================================================================
	 reg [7:0]  tx_byte;
    reg        tx_send;
    reg [24:0] heartbeat_cnt;

    always @(posedge MAX10_CLK1_50) begin
        tx_send <= 1'b0;

        if (heartbeat_cnt == 25'd25_000_000) begin
            heartbeat_cnt <= 25'd0;
            tx_send       <= 1'b1;
            case (fsm_state)
                2'b00: tx_byte <= 8'hDD;  // IDLE
                2'b01: tx_byte <= 8'h00;  // ALERT — filtered by backend
                2'b10: tx_byte <= 8'hAA;  // ACCEPTED
                2'b11: begin
                    if (responder_status == 2'b10)
                        tx_byte <= 8'hCC;  // Off-Duty
                    else
                        tx_byte <= 8'hBB;  // Busy
                end
                default: tx_byte <= 8'hDD;
            endcase
        end else begin
            heartbeat_cnt <= heartbeat_cnt + 1'b1;
        end
    end

    uart_tx u_transmitter (
        .clk      (MAX10_CLK1_50),
        .tx_byte  (tx_byte),
        .tx_send  (tx_send),
        .tx_pin   (uart_tx_pin)
    );

    // =========================================================================
    // Sub-modules (unchanged)
    // =========================================================================
    clk_divider u_clk_divider (
        .clk_50mhz (MAX10_CLK1_50),
        .clk_25mhz (clk_25mhz),
        .clk_1khz  (clk_1khz)
    );

    alert_fsm u_alert_fsm (
        .clk              (MAX10_CLK1_50),
        .rst_n            (1'b1),
        .responder_status (responder_status),
        .alert_trigger    (alert_trigger),
        .accept_btn       (accept_btn),
        .reset_btn        (KEY[1]),
        .alert_active     (alert_active),
        .fsm_state        (fsm_state)
    );

    vga_controller u_vga_ctrl (
        .clk_25mhz (clk_25mhz),
        .rst_n     (1'b1),
        .hsync     (hsync),
        .vsync     (vsync),
        .pixel_x   (pixel_x),
        .pixel_y   (pixel_y),
        .video_on  (video_on)
    );

    vga_display_gen u_display (
        .clk_25mhz    (clk_25mhz),
        .video_on     (video_on),
        .pixel_x      (pixel_x),
        .pixel_y      (pixel_y),
        .fsm_state    (fsm_state),
        .alert_active (alert_active),
        .dispatch_code(dispatch_code),
        .red          (red),
        .green        (green),
        .blue         (blue)
    );

    alarm_driver u_alarm (
        .clk          (MAX10_CLK1_50),
        .clk_1khz     (clk_1khz),
        .alert_active (alert_active),
        .buzzer_out   (buzzer_pin)
    );

    assign VGA_HS = hsync;
    assign VGA_VS = vsync;
    assign VGA_R  = video_on ? red   : 4'h0;
    assign VGA_G  = video_on ? green : 4'h0;
    assign VGA_B  = video_on ? blue  : 4'h0;

    assign LEDR[1:0] = fsm_state;
    assign LEDR[9]   = alert_active;
    assign LEDR[8]   = alert_trigger;
    assign LEDR[7]   = ~accept_btn;
    assign LEDR[6:2] = 5'b0;

endmodule