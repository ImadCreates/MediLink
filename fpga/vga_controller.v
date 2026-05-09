// =============================================================================
// Module:      vga_controller.v
// Project:     MediLink FPGA Emergency Alert Receiver
// Board:       DE10-Lite (MAX 10 FPGA: 10M50DAF484C7G)
// Description: Generates VGA sync signals and pixel coordinates for the
//              standard 640x480 @ 60 Hz timing mode.
//
// --- VGA 640x480 @ 60 Hz Timing Parameters ---
//   Pixel clock:        25.175 MHz (we use 25 MHz, within VGA tolerance)
//
//   Horizontal timing (in pixels at 25 MHz):
//     Visible area:     640
//     Front porch:       16
//     Sync pulse:        96   (H-Sync active LOW)
//     Back porch:        48
//     Total:            800
//
//   Vertical timing (in lines):
//     Visible area:     480
//     Front porch:       10
//     Sync pulse:         2   (V-Sync active LOW)
//     Back porch:        33
//     Total:            525
//
// --- Output pixel_x / pixel_y ---
//   These counters run over the FULL frame (including blanking), so:
//     pixel_x: 0 to 799
//     pixel_y: 0 to 524
//   `video_on` is HIGH only when pixel_x < 640 AND pixel_y < 480.
//   The display generator must use `video_on` to gate colours to black.
// =============================================================================

module vga_controller (
    input  wire        clk_25mhz,  // 25 MHz pixel clock from clk_divider
    input  wire        rst_n,      // Active-low synchronous reset
    output reg         hsync,      // Horizontal sync (active LOW per VGA std)
    output reg         vsync,      // Vertical sync   (active LOW per VGA std)
    output reg  [9:0]  pixel_x,    // Horizontal counter: 0 to 799
    output reg  [9:0]  pixel_y,    // Vertical counter:   0 to 524
    output wire        video_on    // HIGH during visible pixel region
);

    // =========================================================================
    // Horizontal timing constants  (all in pixel-clock cycles)
    // =========================================================================
    localparam H_VISIBLE    = 640;
    localparam H_FP         = 16;   // Front porch
    localparam H_SYNC_W     = 96;   // Sync pulse width
    localparam H_BP         = 48;   // Back porch
    localparam H_TOTAL      = H_VISIBLE + H_FP + H_SYNC_W + H_BP; // = 800

    // H-Sync pulse span within the horizontal counter
    localparam H_SYNC_START = H_VISIBLE + H_FP;         // = 656
    localparam H_SYNC_END   = H_SYNC_START + H_SYNC_W;  // = 752

    // =========================================================================
    // Vertical timing constants  (all in line counts)
    // =========================================================================
    localparam V_VISIBLE    = 480;
    localparam V_FP         = 10;   // Front porch
    localparam V_SYNC_W     = 2;    // Sync pulse width
    localparam V_BP         = 33;   // Back porch
    localparam V_TOTAL      = V_VISIBLE + V_FP + V_SYNC_W + V_BP; // = 525

    // V-Sync pulse span within the vertical counter
    localparam V_SYNC_START = V_VISIBLE + V_FP;         // = 490
    localparam V_SYNC_END   = V_SYNC_START + V_SYNC_W;  // = 492

    // =========================================================================
    // Horizontal counter
    // =========================================================================
    always @(posedge clk_25mhz) begin
        if (!rst_n) begin
            pixel_x <= 10'd0;
        end else begin
            if (pixel_x == H_TOTAL - 1)
                pixel_x <= 10'd0;        // Wrap at end of line
            else
                pixel_x <= pixel_x + 1'b1;
        end
    end

    // =========================================================================
    // Vertical counter  (increments each time horizontal wraps)
    // =========================================================================
    always @(posedge clk_25mhz) begin
        if (!rst_n) begin
            pixel_y <= 10'd0;
        end else begin
            if (pixel_x == H_TOTAL - 1) begin  // End of each scanline
                if (pixel_y == V_TOTAL - 1)
                    pixel_y <= 10'd0;    // Wrap at end of frame
                else
                    pixel_y <= pixel_y + 1'b1;
            end
        end
    end

    // =========================================================================
    // Sync signal generation  (active LOW, as per VGA standard)
    // =========================================================================
    always @(posedge clk_25mhz) begin
        if (!rst_n) begin
            hsync <= 1'b1;
            vsync <= 1'b1;
        end else begin
            // H-Sync: pull LOW during sync pulse window
            hsync <= ~((pixel_x >= H_SYNC_START) && (pixel_x < H_SYNC_END));

            // V-Sync: pull LOW during sync pulse window
            vsync <= ~((pixel_y >= V_SYNC_START) && (pixel_y < V_SYNC_END));
        end
    end

    // =========================================================================
    // Video-on  (combinational: HIGH only in visible 640x480 region)
    // =========================================================================
    assign video_on = (pixel_x < H_VISIBLE) && (pixel_y < V_VISIBLE);

endmodule