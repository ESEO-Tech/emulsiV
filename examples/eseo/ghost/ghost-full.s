
    .set MASK, 0x24

    .text

    .global __reset

__reset:
    li x6, 0x1000
    addi x5, x6, -0x400
loop:
    lbu x7, (x5)
    andi x7, x7, MASK
    beqz x7, store
    li x7, 0xff
store:
    sb x7, (x5)
    addi x5, x5, 1
    blt x5, x6, loop

    j .

    .section bitmap, "a"

background:
    .include "bitmap.inc"
