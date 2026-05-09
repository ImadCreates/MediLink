// =============================================================================
// Module:      vga_display_gen.v  (v3 — UART dispatch_code overlay)
// Project:     MediLink FPGA Emergency Alert Receiver
// Board:       DE10-Lite (MAX 10 FPGA: 10M50DAF484C7G)
// Author:      Generated for ECSE 3216 Capstone
//
// =============================================================================
// DATA FLOW CONTEXT (from reviewed Java/React source files)
// =============================================================================
//
//  AlertController.java calculates:
//      finalCode = typeOffset + priority
//      where  Fire=10, Medical=20, Police=30, Infrastructure=40
//      and    priority in {1, 2, 3}
//
//  Valid dispatch_code values received over UART:
//      Fire          : 11 (0x0B), 12 (0x0C), 13 (0x0D)
//      Medical       : 21 (0x15), 22 (0x16), 23 (0x17)
//      Police        : 31 (0x1F), 32 (0x20), 33 (0x21)
//      Infrastructure: 41 (0x29), 42 (0x2A), 43 (0x2B)
//
//  Incident type extraction:
//      dispatch_code[7:0] / 10  -> quotient  (1=Fire, 2=Med, 3=Police, 4=Infra)
//      dispatch_code[7:0] % 10  -> remainder (priority 1/2/3)
//
//  SerialService.java also sends status bytes FROM the FPGA back to the PC:
//      0xAA = Accepted (S_ACCEPTED -> IN_PROGRESS on Dashboard)
//      0xBB = Busy     (S_BUSY)
//      0xCC = Off-Duty (S_BUSY, off-duty variant)
//      0xDD = Idle     (S_IDLE)
//  Those TX bytes are handled by a uart_tx module (next sprint), not here.
//
// =============================================================================
// FULL SCREEN LAYOUT (640 x 480 pixels)
// =============================================================================
//
//   y:   0 -  59   HEADER BAR        (dark navy, static)
//   y:  60 - 419   MAIN PANEL        (state-colour background)
//   y: 420 - 479   FOOTER BAR        (state-colour strip)
//
//   When FSM is in S_ALERT or S_ACCEPTED, three overlay zones appear:
//
//   +------+---------------------------------------------+----------+
//   |      |  HEADER (y 0-59)                            |          |
//   +------+---------------------------------------------+----------+
//   | TYPE |                                             | PRIORITY |
//   | BOX  |        STATE INDICATOR BLOCK                |  METER   |
//   | x:   |        (centred, existing logic)            |  x:      |
//   | 20-  |                                             | 548-     |
//   | 119  |                                             |  620     |
//   | y:   |                                             |  y:      |
//   | 70-  |                                             |  70-     |
//   | 189  |                                             | 380      |
//   +------+---------------------------------------------+----------+
//   |      |  FOOTER (y 420-479)                         |          |
//   +------+---------------------------------------------+----------+
//
//   TYPE BOX  (x: 20-119,  y: 70-189)  120 x 120 px
//     Draws a letter symbol for each incident type using coordinate ranges.
//     Symbols are drawn as thick pixel-art strokes, each stroke being a
//     filled rectangle defined by (x_min, x_max, y_min, y_max) bounds.
//
//   PRIORITY METER  (x: 548-620,  y: 70-380)  73 x 311 px
//     Three stacked bars, drawn bottom-to-top (priority 1 = bottom bar).
//     Bars are coloured  yellow / orange / red  in priority 1 / 2 / 3 order.
//     Active bars are fully lit; inactive bars are drawn in a dim grey.
//
// =============================================================================
// STATE ENCODING  (mirrors alert_fsm.v v2)
// =============================================================================
//   S_IDLE     2'b00   Dark green bg + bright green block
//   S_ALERT    2'b01   Dark red bg   + striped red block   + OVERLAY ON
//   S_ACCEPTED 2'b10   Dark blue bg  + bright cyan block   + OVERLAY ON
//   S_BUSY     2'b11   Dark amber bg + orange block
//
// =============================================================================

module vga_display_gen (
    input  wire        clk_25mhz,     // 25 MHz pixel clock
    input  wire        video_on,      // HIGH when in visible 640x480 region
    input  wire [9:0]  pixel_x,       // Horizontal pixel coordinate (0-639)
    input  wire [9:0]  pixel_y,       // Vertical pixel coordinate   (0-479)
    input  wire [1:0]  fsm_state,     // FSM state from alert_fsm.v
    input  wire        alert_active,  // Convenience: HIGH in S_ALERT only
    // -------------------------------------------------------------------------
    // NEW in v3: raw 8-bit dispatch code decoded from UART RX byte.
    // Connected to the output register of the uart_rx module (next sprint).
    // For this sprint, you can tie this to SW[7:0] for bench verification.
    // -------------------------------------------------------------------------
    input  wire [7:0]  dispatch_code, // e.g. 23 = Medical Priority 3
    output reg  [3:0]  red,
    output reg  [3:0]  green,
    output reg  [3:0]  blue
);

    // =========================================================================
    // State encoding literals
    // =========================================================================
    localparam [1:0]
        S_IDLE     = 2'b00,
        S_ALERT    = 2'b01,
        S_ACCEPTED = 2'b10,
        S_BUSY     = 2'b11;

    // =========================================================================
    // Screen region boundaries
    // =========================================================================
    localparam H_VISIBLE   = 10'd640;
    localparam V_VISIBLE   = 10'd480;

    localparam HEADER_TOP  = 10'd0;
    localparam HEADER_BOT  = 10'd59;
    localparam PANEL_TOP   = 10'd60;
    localparam PANEL_BOT   = 10'd419;
    localparam FOOTER_TOP  = 10'd420;
    localparam FOOTER_BOT  = 10'd479;

    // State indicator block (centred in main panel, from vga_display_gen v2)
    localparam BLOCK_LEFT  = 10'd170;
    localparam BLOCK_RIGHT = 10'd469;
    localparam BLOCK_TOP   = 10'd150;
    localparam BLOCK_BOT   = 10'd329;
    localparam BORDER_W    = 10'd8;
    localparam INNER_LEFT  = BLOCK_LEFT  + BORDER_W;
    localparam INNER_RIGHT = BLOCK_RIGHT - BORDER_W;
    localparam INNER_TOP   = BLOCK_TOP   + BORDER_W;
    localparam INNER_BOT   = BLOCK_BOT   - BORDER_W;

    // =========================================================================
    // TYPE BOX region  (x: 20-139, y: 70-189)  — 120 x 120 px
    // Left margin area, clear of the main indicator block
    // =========================================================================
    localparam TB_X0  = 10'd20;   // Left edge
    localparam TB_X1  = 10'd139;  // Right edge
    localparam TB_Y0  = 10'd70;   // Top edge
    localparam TB_Y1  = 10'd189;  // Bottom edge

    // Type box background: slightly lighter than the panel bg so it reads
    // as a distinct inset card.  Colour is computed in the always block below.

    // =========================================================================
    // PRIORITY METER region  (x: 548-620, y: 70-380)  — 73 x 311 px
    // Right margin area, three bars stacked bottom-to-top
    //
    // Bar heights (each bar 85 px tall, 10 px gap between):
    //   Bar 1 (yellow) : y 295-380   (bottom)
    //   Bar 2 (orange) : y 200-285
    //   Bar 3 (red)    : y 105-190   (top)
    //   (gap between bars = 10 px, i.e., 285<y<295 and 190<y<200 are gaps)
    // =========================================================================
    localparam PM_X0    = 10'd548;   // Left edge of meter column
    localparam PM_X1    = 10'd620;   // Right edge of meter column

    // Bar 1 — Yellow  (Priority >= 1)
    localparam BAR1_Y0  = 10'd295;
    localparam BAR1_Y1  = 10'd380;

    // Bar 2 — Orange  (Priority >= 2)
    localparam BAR2_Y0  = 10'd200;
    localparam BAR2_Y1  = 10'd285;

    // Bar 3 — Red     (Priority == 3)
    localparam BAR3_Y0  = 10'd105;
    localparam BAR3_Y1  = 10'd190;

    // Dim colour for inactive bars (dark grey, visible but clearly inactive)
    // Defined as parameters so synthesis tools can optimise them away easily.
    localparam [3:0] DIM_R = 4'h2;
    localparam [3:0] DIM_G = 4'h2;
    localparam [3:0] DIM_B = 4'h2;

    // =========================================================================
    // DISPATCH CODE DECODING
    // =========================================================================
    // Extract incident type and priority from the 8-bit dispatch_code.
    //
    // From AlertController.java:
    //   finalCode = typeOffset + priority
    //   typeOffset in {10, 20, 30, 40}
    //   priority   in {1, 2, 3}
    //
    // Integer division and modulo by 10 in hardware:
    //   We use explicit range comparisons rather than a hardware divider,
    //   which avoids the need for a multi-cycle divider and synthesises
    //   purely as combinational LUT logic.
    //
    //   Type ranges:
    //     Fire          :  11 <= code <= 13
    //     Medical       :  21 <= code <= 23
    //     Police        :  31 <= code <= 33
    //     Infrastructure:  41 <= code <= 43
    //
    //   Priority extraction (last digit of the decimal value):
    //     Priority 1: code is 11, 21, 31, or 41  (i.e., code % 10 == 1)
    //     Priority 2: code is 12, 22, 32, or 42
    //     Priority 3: code is 13, 23, 33, or 43
    //
    //   We implement %10 as subtracting the nearest lower multiple of 10:
    //     if      code >= 41 -> prio_raw = code - 40
    //     else if code >= 31 -> prio_raw = code - 30
    //     else if code >= 21 -> prio_raw = code - 20
    //     else               -> prio_raw = code - 10
    //
    //   This gives prio_raw in {1,2,3} for all valid codes.
    // =========================================================================

    // Incident type flags (combinational)
    wire is_fire   = (dispatch_code >= 8'd11) && (dispatch_code <= 8'd13);
    wire is_med    = (dispatch_code >= 8'd21) && (dispatch_code <= 8'd23);
    wire is_police = (dispatch_code >= 8'd31) && (dispatch_code <= 8'd33);
    wire is_infra  = (dispatch_code >= 8'd41) && (dispatch_code <= 8'd43);

    // Priority extraction (combinational, no divider needed)
    wire [7:0] prio_raw =
        (dispatch_code >= 8'd41) ? (dispatch_code - 8'd40) :
        (dispatch_code >= 8'd31) ? (dispatch_code - 8'd30) :
        (dispatch_code >= 8'd21) ? (dispatch_code - 8'd20) :
                                   (dispatch_code - 8'd10);
    // prio_raw is now 1, 2, or 3 for all valid dispatch_codes.
    wire prio1 = (prio_raw == 8'd1);
    wire prio2 = (prio_raw == 8'd2);
    wire prio3 = (prio_raw == 8'd3);

    // Overlay enable: only active in S_ALERT or S_ACCEPTED
    wire overlay_on = (fsm_state == S_ALERT) || (fsm_state == S_ACCEPTED);

    // =========================================================================
    // REGION FLAGS  (combinational)
    // =========================================================================
    wire in_header = (pixel_y <= HEADER_BOT);
    wire in_panel  = (pixel_y >= PANEL_TOP)  && (pixel_y <= PANEL_BOT);
    wire in_footer = (pixel_y >= FOOTER_TOP);

    wire in_block  = (pixel_x >= BLOCK_LEFT)  && (pixel_x <= BLOCK_RIGHT)
                  && (pixel_y >= BLOCK_TOP)   && (pixel_y <= BLOCK_BOT);
    wire in_inner  = (pixel_x >= INNER_LEFT)  && (pixel_x <= INNER_RIGHT)
                  && (pixel_y >= INNER_TOP)   && (pixel_y <= INNER_BOT);
    wire in_border = in_block && !in_inner;

    // ALERT stripe for the indicator block
    wire alert_stripe = pixel_y[3];

    // Type box region
    wire in_type_box = (pixel_x >= TB_X0) && (pixel_x <= TB_X1)
                    && (pixel_y >= TB_Y0) && (pixel_y <= TB_Y1);

    // Priority meter column
    wire in_pm_col = (pixel_x >= PM_X0) && (pixel_x <= PM_X1);

    // Individual meter bars
    wire in_bar1 = in_pm_col && (pixel_y >= BAR1_Y0) && (pixel_y <= BAR1_Y1);
    wire in_bar2 = in_pm_col && (pixel_y >= BAR2_Y0) && (pixel_y <= BAR2_Y1);
    wire in_bar3 = in_pm_col && (pixel_y >= BAR3_Y0) && (pixel_y <= BAR3_Y1);

    // =========================================================================
    // TYPE BOX SYMBOL DRAWING
    // =========================================================================
    // Each letter is drawn as a set of filled rectangular pixel-art strokes
    // relative to the type box origin (TB_X0, TB_Y0).
    //
    // The type box is 120x120 px. Stroke width is 12 px throughout.
    // All coordinates below are ABSOLUTE pixel coordinates (not relative)
    // so the synthesiser can evaluate them as constants.
    //
    // Naming convention: [letter]_[stroke] where stroke is h(horizontal) or
    // v(vertical), numbered from top.
    //
    // --------------------------------------------------------------------------
    // LETTER "F"  (Fire)   — three horizontal bars + one vertical left stem
    //
    //   Stem  (v): x 28-39,  y  78-181     (12 px wide, full height)
    //   Top H (h): x 28-131, y  78- 89     (full width, 12 px tall)
    //   Mid H (h): x 28-105, y 128-139     (3/4 width,  12 px tall)
    //
    // --------------------------------------------------------------------------
    localparam F_VL_X0 = TB_X0 + 10'd8;    // = 28  stem left
    localparam F_VL_X1 = TB_X0 + 10'd19;   // = 39  stem right
    localparam F_VL_Y0 = TB_Y0 + 10'd8;    // = 78  stem top
    localparam F_VL_Y1 = TB_Y1 - 10'd8;    // = 181 stem bottom

    localparam F_TH_X0 = TB_X0 + 10'd8;    // = 28  top bar left
    localparam F_TH_X1 = TB_X1 - 10'd8;    // = 131 top bar right
    localparam F_TH_Y0 = TB_Y0 + 10'd8;    // = 78  top bar top
    localparam F_TH_Y1 = TB_Y0 + 10'd19;   // = 89  top bar bottom

    localparam F_MH_X0 = TB_X0 + 10'd8;    // = 28  mid bar left
    localparam F_MH_X1 = TB_X0 + 10'd85;   // = 105 mid bar right
    localparam F_MH_Y0 = TB_Y0 + 10'd58;   // = 128 mid bar top
    localparam F_MH_Y1 = TB_Y0 + 10'd69;   // = 139 mid bar bottom

    wire px_F = (
        // Vertical stem
        ((pixel_x >= F_VL_X0) && (pixel_x <= F_VL_X1) &&
         (pixel_y >= F_VL_Y0) && (pixel_y <= F_VL_Y1))
        ||
        // Top horizontal bar
        ((pixel_x >= F_TH_X0) && (pixel_x <= F_TH_X1) &&
         (pixel_y >= F_TH_Y0) && (pixel_y <= F_TH_Y1))
        ||
        // Middle horizontal bar
        ((pixel_x >= F_MH_X0) && (pixel_x <= F_MH_X1) &&
         (pixel_y >= F_MH_Y0) && (pixel_y <= F_MH_Y1))
    );

    // --------------------------------------------------------------------------
    // LETTER "M"  (Medical) — two vertical stems + two diagonal strokes
    // Diagonals approximated as staircase-style horizontal slices:
    //   Left diagonal  (top-left to centre-bottom):
    //     Each of 5 slices is 12 px tall, shifts 8 px right per slice
    //   Right diagonal (top-right to centre-bottom):
    //     Mirror of left diagonal
    //
    //  Left stem  (v): x  28- 39, y  78-181
    //  Right stem (v): x 120-131, y  78-181
    //  Left diag  : 5 horizontal slices stepping right
    //  Right diag : 5 horizontal slices stepping left (mirror)
    //
    // --------------------------------------------------------------------------
    localparam M_VL_X0 = TB_X0 + 10'd8;    // = 28   left stem L
    localparam M_VL_X1 = TB_X0 + 10'd19;   // = 39   left stem R
    localparam M_VL_Y0 = TB_Y0 + 10'd8;    // = 78   stems top
    localparam M_VL_Y1 = TB_Y1 - 10'd8;    // = 181  stems bottom

    localparam M_VR_X0 = TB_X1 - 10'd19;   // = 120  right stem L
    localparam M_VR_X1 = TB_X1 - 10'd8;    // = 131  right stem R

    // Left diagonal — 5 staircase slices (each 12 px tall, 8 px wide per step)
    // Slice 0: x 28-47,  y  78- 89   Slice 1: x 36-55, y  90-101
    // Slice 2: x 44-63,  y 102-113   Slice 3: x 52-71, y 114-125
    // Slice 4: x 60-79,  y 126-137
    wire px_M_ld =
        ((pixel_x >= 10'd28) && (pixel_x <= 10'd47) && (pixel_y >= 10'd78)  && (pixel_y <= 10'd89))  ||
        ((pixel_x >= 10'd36) && (pixel_x <= 10'd55) && (pixel_y >= 10'd90)  && (pixel_y <= 10'd101)) ||
        ((pixel_x >= 10'd44) && (pixel_x <= 10'd63) && (pixel_y >= 10'd102) && (pixel_y <= 10'd113)) ||
        ((pixel_x >= 10'd52) && (pixel_x <= 10'd71) && (pixel_y >= 10'd114) && (pixel_y <= 10'd125)) ||
        ((pixel_x >= 10'd60) && (pixel_x <= 10'd79) && (pixel_y >= 10'd126) && (pixel_y <= 10'd137));

    // Right diagonal — mirror of left around centre x=79.5
    // Slice 0: x 112-131, y  78- 89   Slice 1: x 104-123, y  90-101
    // Slice 2: x  96-115, y 102-113   Slice 3: x  88-107, y 114-125
    // Slice 4: x  80- 99, y 126-137
    wire px_M_rd =
        ((pixel_x >= 10'd112) && (pixel_x <= 10'd131) && (pixel_y >= 10'd78)  && (pixel_y <= 10'd89))  ||
        ((pixel_x >= 10'd104) && (pixel_x <= 10'd123) && (pixel_y >= 10'd90)  && (pixel_y <= 10'd101)) ||
        ((pixel_x >= 10'd96)  && (pixel_x <= 10'd115) && (pixel_y >= 10'd102) && (pixel_y <= 10'd113)) ||
        ((pixel_x >= 10'd88)  && (pixel_x <= 10'd107) && (pixel_y >= 10'd114) && (pixel_y <= 10'd125)) ||
        ((pixel_x >= 10'd80)  && (pixel_x <= 10'd99)  && (pixel_y >= 10'd126) && (pixel_y <= 10'd137));

    wire px_M = (
        // Left vertical stem
        ((pixel_x >= M_VL_X0) && (pixel_x <= M_VL_X1) &&
         (pixel_y >= M_VL_Y0) && (pixel_y <= M_VL_Y1))
        ||
        // Right vertical stem
        ((pixel_x >= M_VR_X0) && (pixel_x <= M_VR_X1) &&
         (pixel_y >= M_VL_Y0) && (pixel_y <= M_VL_Y1))
        ||
        px_M_ld || px_M_rd
    );

    // --------------------------------------------------------------------------
    // LETTER "P"  (Police) — vertical left stem + rounded bump on top-right
    // Bump approximated as three horizontal bars of decreasing width:
    //   Top arc    : x 28-107, y  78- 89   (wide)
    //   Mid arc    : x 28-119, y  90-125   (wider — the bulge body)
    //   Bot arc    : x 28-107, y 126-137   (wide again)
    //   Arc right  : x 108-119, y 78-137  (right wall of bump)
    //  Stem        : x  28- 39, y  78-181
    //
    // --------------------------------------------------------------------------
    localparam P_VS_X0 = TB_X0 + 10'd8;    // = 28  stem left
    localparam P_VS_X1 = TB_X0 + 10'd19;   // = 39  stem right
    localparam P_VS_Y0 = TB_Y0 + 10'd8;    // = 78  stem top
    localparam P_VS_Y1 = TB_Y1 - 10'd8;    // = 181 stem bottom

    wire px_P = (
        // Vertical stem (full height)
        ((pixel_x >= P_VS_X0) && (pixel_x <= P_VS_X1) &&
         (pixel_y >= P_VS_Y0) && (pixel_y <= P_VS_Y1))
        ||
        // Top horizontal of bump
        ((pixel_x >= 10'd28) && (pixel_x <= 10'd107) &&
         (pixel_y >= 10'd78)  && (pixel_y <= 10'd89))
        ||
        // Body of bump (slightly wider)
        ((pixel_x >= 10'd28) && (pixel_x <= 10'd119) &&
         (pixel_y >= 10'd90)  && (pixel_y <= 10'd125))
        ||
        // Bottom horizontal of bump
        ((pixel_x >= 10'd28) && (pixel_x <= 10'd107) &&
         (pixel_y >= 10'd126) && (pixel_y <= 10'd137))
        ||
        // Right wall of bump
        ((pixel_x >= 10'd108) && (pixel_x <= 10'd119) &&
         (pixel_y >= 10'd78)  && (pixel_y <= 10'd137))
    );

    // --------------------------------------------------------------------------
    // LETTER "I"  (Infrastructure) — top bar + vertical stem + bottom bar
    //   Top H  : x  40-119, y  78- 89
    //   Stem V : x  72- 83, y  78-181   (centred in 120-px box)
    //   Bot H  : x  40-119, y 170-181
    //
    // --------------------------------------------------------------------------
    wire px_I = (
        // Top horizontal serif bar
        ((pixel_x >= 10'd40) && (pixel_x <= 10'd119) &&
         (pixel_y >= 10'd78) && (pixel_y <= 10'd89))
        ||
        // Vertical stem (centred)
        ((pixel_x >= 10'd72) && (pixel_x <= 10'd83) &&
         (pixel_y >= 10'd78) && (pixel_y <= 10'd181))
        ||
        // Bottom horizontal serif bar
        ((pixel_x >= 10'd40) && (pixel_x <= 10'd119) &&
         (pixel_y >= 10'd170) && (pixel_y <= 10'd181))
    );

    // =========================================================================
    // COLOUR SELECTION  (fully combinational)
    // =========================================================================

    reg [3:0] r_next, g_next, b_next;

    always @(*) begin
        // Default: black (outside video region forced to 0 in top-level)
        r_next = 4'h0;
        g_next = 4'h0;
        b_next = 4'h0;

        if (video_on) begin

            // =================================================================
            // HEADER BAR  (y 0-59) — always dark navy, independent of state
            // =================================================================
            if (in_header) begin
                if (pixel_y <= 10'd3) begin
                    r_next = 4'h0; g_next = 4'hF; b_next = 4'hC; // teal top stripe
                end else begin
                    r_next = 4'h0; g_next = 4'h2; b_next = 4'h5; // dark navy
                end
            end

            // =================================================================
            // MAIN PANEL  (y 60-419)
            // Layer order (back to front):
            //   1. State background
            //   2. State indicator block (white border + state fill)
            //   3. Type box overlay      (only when overlay_on)
            //   4. Priority meter bars   (only when overlay_on)
            // =================================================================
            else if (in_panel) begin

                // ---------------------------------------------------------
                // PRIORITY METER BARS  (drawn first so indicator block can
                // overlap if ranges coincide — they don't with current layout
                // but this order is safest)
                // ---------------------------------------------------------
                if (overlay_on && in_bar3) begin
                    // Bar 3 — top bar — RED  if priority 3, dim otherwise
                    if (prio3) begin
                        r_next = 4'hF; g_next = 4'h0; b_next = 4'h0;
                    end else begin
                        r_next = DIM_R; g_next = DIM_G; b_next = DIM_B;
                    end
                end

                else if (overlay_on && in_bar2) begin
                    // Bar 2 — middle bar — ORANGE  if priority >= 2, dim otherwise
                    if (prio2 || prio3) begin
                        r_next = 4'hF; g_next = 4'h6; b_next = 4'h0;
                    end else begin
                        r_next = DIM_R; g_next = DIM_G; b_next = DIM_B;
                    end
                end

                else if (overlay_on && in_bar1) begin
                    // Bar 1 — bottom bar — YELLOW  always lit if overlay active
                    // (priority 1, 2, or 3 all light the bottom bar)
                    r_next = 4'hF; g_next = 4'hE; b_next = 4'h0;
                end

                // ---------------------------------------------------------
                // TYPE BOX  (x 20-139, y 70-189)
                // When overlay is active, draw the type box card:
                //   - Dark card background
                //   - Symbol pixel on top
                // ---------------------------------------------------------
                else if (overlay_on && in_type_box) begin
                    // Type box card background
                    // Use a dark slate-grey that contrasts against both
                    // the red (ALERT) and blue (ACCEPTED) panel backgrounds.
                    r_next = 4'h1; g_next = 4'h1; b_next = 4'h2;

                    // Symbol fill — overrides card background where symbol pixels hit
                    if (is_fire && px_F) begin
                        r_next = 4'hF; g_next = 4'h4; b_next = 4'h0; // Red-orange
                    end else if (is_med && px_M) begin
                        r_next = 4'h0; g_next = 4'hF; b_next = 4'h4; // Bright green
                    end else if (is_police && px_P) begin
                        r_next = 4'h4; g_next = 4'h4; b_next = 4'hF; // Bright blue
                    end else if (is_infra && px_I) begin
                        r_next = 4'hF; g_next = 4'hC; b_next = 4'h0; // Amber
                    end
                end

                // ---------------------------------------------------------
                // STATE INDICATOR BLOCK (centred)
                // ---------------------------------------------------------
                else if (in_border) begin
                    r_next = 4'hF; g_next = 4'hF; b_next = 4'hF; // White border
                end

                else if (in_inner) begin
                    case (fsm_state)
                        S_IDLE: begin
                            r_next = 4'h0; g_next = 4'hF; b_next = 4'h2;
                        end
                        S_ALERT: begin
                            if (alert_stripe) begin
                                r_next = 4'hF; g_next = 4'h0; b_next = 4'h0;
                            end else begin
                                r_next = 4'h8; g_next = 4'h0; b_next = 4'h0;
                            end
                        end
                        S_ACCEPTED: begin
                            r_next = 4'h0; g_next = 4'hF; b_next = 4'hF; // Cyan
                        end
                        S_BUSY: begin
                            r_next = 4'hF; g_next = 4'h8; b_next = 4'h0; // Orange
                        end
                        default: begin
                            r_next = 4'h0; g_next = 4'h0; b_next = 4'h0;
                        end
                    endcase
                end

                // ---------------------------------------------------------
                // PANEL BACKGROUND  (everything else in the panel region)
                // ---------------------------------------------------------
                else begin
                    case (fsm_state)
                        S_IDLE:    begin r_next=4'h0; g_next=4'h3; b_next=4'h0; end
                        S_ALERT:   begin r_next=4'h4; g_next=4'h0; b_next=4'h0; end
                        S_ACCEPTED:begin r_next=4'h0; g_next=4'h1; b_next=4'h4; end
                        S_BUSY:    begin r_next=4'h3; g_next=4'h2; b_next=4'h0; end
                        default:   begin r_next=4'h0; g_next=4'h0; b_next=4'h0; end
                    endcase
                end
            end // in_panel

            // =================================================================
            // FOOTER BAR  (y 420-479) — state-colour strip
            // =================================================================
            else if (in_footer) begin
                if (pixel_y <= FOOTER_TOP + 10'd1) begin
                    r_next = 4'hF; g_next = 4'hF; b_next = 4'hF; // separator
                end else begin
                    case (fsm_state)
                        S_IDLE:    begin r_next=4'h0; g_next=4'hA; b_next=4'h0; end
                        S_ALERT:   begin r_next=4'hF; g_next=4'h0; b_next=4'h0; end
                        S_ACCEPTED:begin r_next=4'h0; g_next=4'hA; b_next=4'hF; end
                        S_BUSY:    begin r_next=4'hF; g_next=4'hF; b_next=4'h0; end
                        default:   begin r_next=4'h0; g_next=4'h0; b_next=4'h0; end
                    endcase
                end
            end

        end // video_on
    end // always @(*)

    // =========================================================================
    // Register outputs on pixel clock for clean signal edges
    // =========================================================================
    always @(posedge clk_25mhz) begin
        red   <= r_next;
        green <= g_next;
        blue  <= b_next;
    end

endmodule