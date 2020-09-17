
    .set GPIO,            0xd0000000
    .set GPIO_IRQ_ENABLE, 0x0040A040
    .set GPIO_BTN_UP,     0x00000040
    .set GPIO_BTN_LEFT,   0x00008000
    .set GPIO_BTN_RIGHT,  0x00002000
    .set GPIO_BTN_DOWN,   0x00400000

    .set DIR_HORIZONTAL, 0
    .set DIR_VERTICAL,   1
    .set DIR_BACKWARDS,  2

    .set DIR_RIGHT, DIR_HORIZONTAL
    .set DIR_LEFT,  DIR_HORIZONTAL | DIR_BACKWARDS
    .set DIR_DOWN,  DIR_VERTICAL
    .set DIR_UP,    DIR_VERTICAL | DIR_BACKWARDS

    .text

    .global __reset

__reset:
    j start

__irq:
    /* Save all used registers to the stack */
    addi sp, sp, -12
    sw t0, 0(sp)
    sw t1, 4(sp)
    sw t2, 8(sp)

    /* Read the GPIO "rising-edge" indicators and clear all event flags */
    li t1, GPIO
    lw t0, 8(t1)
    sw x0, 8(t1)
    sw x0, 12(t1)

    /* If the previous movement has not been processed yet, do nothing. */
    lw t1, cursor_index
    lw t2, cursor_index_next
    bne t1, t2, irq_end

irq_check_move_left:
    li t2, GPIO_BTN_LEFT
    and t2, t2, t0
    beqz t2, irq_check_move_right
    addi t1, t1, -1
    li t2, DIR_LEFT
    j irq_store

irq_check_move_right:
    li t2, GPIO_BTN_RIGHT
    and t2, t2, t0
    beqz t2, irq_check_move_up
    addi t1, t1, 1
    li t2, DIR_RIGHT
    j irq_store

irq_check_move_up:
    li t2, GPIO_BTN_UP
    and t2, t2, t0
    beqz t2, irq_check_move_down
    addi t1, t1, -32
    li t2, DIR_UP
    j irq_store

irq_check_move_down:
    li t2, GPIO_BTN_DOWN
    and t2, t2, t0
    beqz t2, irq_end
    addi t1, t1, 32
    li t2, DIR_DOWN

irq_store:
    /* Store the new location */
    andi t1, t1, 1023
    sw t1, cursor_index_next, t0
    sw t2, cursor_direction, t0

irq_end:
    /* Restore all registers from the stack */
    lw t0, 0(sp)
    lw t1, 4(sp)
    lw t2, 8(sp)
    addi sp, sp, 12
    mret

start:
    la sp, __stack_pointer

    /* Draw cursor */
    lw a0, cursor_index
    la a1, cursor_mask
    jal draw

    /* Enable interrupts */
    li t0, GPIO
    li t1, GPIO_IRQ_ENABLE
    sw t1, 4(t0)

main_loop:
    /* By default, we will draw at the current cursor location */
    lw a0, cursor_index

    /* Loop until the location changes */
main_polling_loop:
    lw t0, cursor_index_next
    beq a0, t0, main_polling_loop

    /* Check the direction, if backwards, use the new location when drawing */
    lw t1, cursor_direction
    andi t2, t1, DIR_BACKWARDS
    beqz t2, main_select_mask
    mv a0, t0

main_select_mask:
    la a1, left_right_mask
    andi t2, t1, DIR_VERTICAL
    beqz t2, main_draw
    la a1, up_down_mask

main_draw:
    /* Store the new location */
    sw t0, cursor_index, t1

    jal draw

    j main_loop

/*
    Args:
        a0: cursor location
        a1: mask address
*/
draw:
    addi sp, sp, -8
    sw s0, 0(sp)
    sw s1, 4(sp)

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

cursor_index:      .word 0
cursor_index_next: .word 0
cursor_direction:  .word 0

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

    .section gpio_config, "a"

btns:
    .byte 0, 1, 0, 0, 0, 0, 0, 0
    .byte 1, 0, 1, 0, 0, 0, 0, 0
    .byte 0, 1, 0, 0, 0, 0, 0, 0
