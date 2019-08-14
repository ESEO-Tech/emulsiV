
    .set TEXT_IN,            0xb0000000
    .set TEXT_IN_IRQ_MASK,   0x0040
    .set TEXT_IN_IRQ_ENABLE, 0x0080

    .text

    .global __reset

__reset:
    j start

__irq:
    /* Save all used registers to the stack */
    addi sp, sp, -24
    sw t0, 0(sp)
    sw t1, 4(sp)
    sw t2, 8(sp)
    sw a0, 12(sp)
    sw a1, 16(sp)
    sw ra, 20(sp)

    /* Clear the interrupt flag */
    li t0, TEXT_IN
    lhu t1, (t0)
    xori t1, t1, TEXT_IN_IRQ_MASK
    sh t1, (t0)
    srli t1, t1, 8

    /* Read the current cursor location */
    la t0, cursor_index
    lw a0, (t0)

check_move_left:
    li t2, '4'
    bne t1, t2, check_move_right

    addi a0, a0, -1
    andi a0, a0, 1023
    sw a0, (t0)
    la a1, left_right_mask
    jal draw

    j irq_end

check_move_right:
    li t2, '6'
    bne t1, t2, check_move_up

    addi t2, a0, 1
    andi a0, a0, 1023
    sw t2, (t0)
    la a1, left_right_mask
    jal draw

    j irq_end

check_move_up:
    li t2, '8'
    bne t1, t2, check_move_down

    addi a0, a0, -32
    andi a0, a0, 1023
    sw a0, (t0)
    la a1, up_down_mask
    jal draw

    j irq_end

check_move_down:
    li t2, '2'
    bne t1, t2, irq_end

    addi t2, a0, 32
    andi a0, a0, 1023
    sw t2, (t0)
    la a1, up_down_mask
    jal draw

irq_end:
    /* Restore all registers from the stack */
    lw t0, 0(sp)
    lw t1, 4(sp)
    lw t2, 8(sp)
    lw a0, 12(sp)
    lw a1, 16(sp)
    lw ra, 20(sp)
    addi sp, sp, 24
    mret

start:
    /* Draw cursor */
    la a0, cursor_index
    lw a0, (a0)
    la a1, cursor_mask
    jal draw

    /* Enable interrupts */
    li t0, TEXT_IN
    li t1, TEXT_IN_IRQ_ENABLE
    sh t1, (t0)

    j .

/*
    Args:
        a0: cursor location
        a1: mask address
*/
draw:
    addi sp, sp, -8
    sw s0, 0(sp)
    sw s1, 4(sp)

    la s0, background

    /* t0: end mask address */
    addi t0, a1, 16
draw_for_each_row:
    /* t1: end mask row address */
    addi t1, a1, 4
draw_for_each_column:
    la s0, background
    add s0, s0, a0
    lbu t2, (s0)
    lbu s1, (a1)
    xor t2, t2, s1
    sb t2, (s0)

    addi a0, a0, 1
    andi a0, a0, 1023
    addi a1, a1, 1
    blt a1, t1, draw_for_each_column

    addi a0, a0, 28
    andi a0, a0, 1023
    blt a1, t0, draw_for_each_row

    lw s0, 0(sp)
    lw s1, 4(sp)
    addi sp, sp, 8

    ret

    .data

cursor_index: .word 0

cursor_mask:
    .byte 0x00, 0xff, 0x00, 0x00
    .byte 0xff, 0xff, 0xff, 0x00
    .byte 0x00, 0xff, 0x00, 0x00
    .byte 0x00, 0x00, 0x00, 0x00

left_right_mask:
    .byte 0x00, 0xff, 0xff, 0x00
    .byte 0xff, 0x00, 0x00, 0xff
    .byte 0x00, 0xff, 0xff, 0x00
    .byte 0x00, 0x00, 0x00, 0x00

up_down_mask:
    .byte 0x00, 0xff, 0x00, 0x00
    .byte 0xff, 0x00, 0xff, 0x00
    .byte 0xff, 0x00, 0xff, 0x00
    .byte 0x00, 0xff, 0x00, 0x00

    .section bitmap, "a"

    .set B, 0x61
    .set F, 0x62
    .set G, 0x63
    .set H, 0x87

background:
    .byte B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B
    .byte B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B
    .byte B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, F, B, B, B, B, B
    .byte B, B, B, B, B, F, F, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, F, F, F, B, B, B, B
    .byte B, B, B, B, F, G, G, F, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, F, B, B, B, B, B
    .byte B, B, B, B, F, G, G, F, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B
    .byte B, B, B, B, B, F, F, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B
    .byte B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B
    .byte B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B
    .byte B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, F, F, F, B, B, B, B, B, B, B, B, B, B, B, B, B, B
    .byte B, B, B, B, B, B, B, B, B, B, B, B, B, F, F, G, G, G, F, F, B, B, B, B, B, B, B, B, B, B, B, B
    .byte B, B, B, B, B, B, B, B, B, B, B, B, F, G, G, G, G, G, G, G, F, B, B, B, B, B, B, B, B, B, B, B
    .byte B, B, B, B, B, B, B, B, B, B, B, F, G, G, G, G, G, G, G, G, G, F, B, B, B, B, B, B, B, B, B, B
    .byte B, B, B, B, B, B, B, B, B, B, B, F, G, G, G, H, H, H, G, G, G, F, B, B, B, B, B, B, B, B, B, B
    .byte B, B, B, B, B, B, B, B, B, B, F, G, G, G, H, H, H, H, H, G, G, G, F, B, B, B, B, B, B, B, B, B
    .byte B, B, B, B, B, B, B, B, B, B, F, G, G, G, H, H, H, H, H, G, G, G, F, B, B, B, B, B, B, B, B, B
    .byte B, B, B, B, B, B, B, B, B, B, F, G, G, G, H, H, H, H, H, G, G, G, F, B, B, B, B, B, F, B, B, B
    .byte B, B, B, B, B, B, B, B, B, B, B, F, G, G, G, H, H, H, G, G, G, F, B, B, B, B, B, F, F, F, B, B
    .byte B, B, B, B, B, B, B, B, B, B, B, F, G, G, G, G, G, G, G, G, G, F, B, B, B, B, B, B, F, B, B, B
    .byte B, B, B, B, B, B, B, B, B, B, B, B, F, G, G, G, G, G, G, G, F, B, B, B, B, B, B, B, B, B, B, B
    .byte B, B, B, B, B, B, B, B, B, B, B, B, B, F, F, G, G, G, F, F, B, B, B, B, B, B, B, B, B, B, B, B
    .byte B, B, B, B, F, B, B, B, B, B, B, B, B, B, B, F, F, F, B, B, B, B, B, B, B, B, B, B, B, B, B, B
    .byte B, B, B, F, F, F, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B
    .byte B, B, B, B, F, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B
    .byte B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B
    .byte B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, F, F, B, B, B, B, B, B, B, B
    .byte B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, F, G, G, F, B, B, B, B, B, B, B
    .byte B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, F, G, G, F, B, B, B, B, B, B, B
    .byte B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, F, F, B, B, B, B, B, B, B, B
    .byte B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B
    .byte B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B
    .byte B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B
