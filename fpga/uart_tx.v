// =============================================================================
// Module:      uart_tx.v
// 9600 baud, 8N1, 50 MHz clock
// CLKS_PER_BIT = 50_000_000 / 9600 = 5208
// =============================================================================
module uart_tx (
    input  wire       clk,
    input  wire [7:0] tx_byte,
    input  wire       tx_send,   // Pulse HIGH for one cycle to send
    output reg        tx_pin
);
    localparam CLKS_PER_BIT = 5208;

    localparam S_IDLE  = 2'd0;
    localparam S_START = 2'd1;
    localparam S_DATA  = 2'd2;
    localparam S_STOP  = 2'd3;

    reg [1:0]  state     = S_IDLE;
    reg [12:0] clk_cnt   = 0;
    reg [2:0]  bit_idx   = 0;
    reg [7:0]  shift_reg = 0;

    always @(posedge clk) begin
        case (state)
            S_IDLE: begin
                tx_pin <= 1'b1;  // Line idle HIGH
                if (tx_send) begin
                    shift_reg <= tx_byte;
                    clk_cnt   <= 0;
                    state     <= S_START;
                end
            end
            S_START: begin
                tx_pin <= 1'b0;  // Start bit
                if (clk_cnt == CLKS_PER_BIT - 1) begin
                    clk_cnt <= 0;
                    bit_idx <= 0;
                    state   <= S_DATA;
                end else clk_cnt <= clk_cnt + 1;
            end
            S_DATA: begin
                tx_pin <= shift_reg[0];
                if (clk_cnt == CLKS_PER_BIT - 1) begin
                    clk_cnt   <= 0;
                    shift_reg <= shift_reg >> 1;
                    if (bit_idx == 7) state <= S_STOP;
                    else              bit_idx <= bit_idx + 1;
                end else clk_cnt <= clk_cnt + 1;
            end
            S_STOP: begin
                tx_pin <= 1'b1;  // Stop bit
                if (clk_cnt == CLKS_PER_BIT - 1) begin
                    clk_cnt <= 0;
                    state   <= S_IDLE;
                end else clk_cnt <= clk_cnt + 1;
            end
        endcase
    end
endmodule