
    .text

    .global __reset

__reset:
    li x1, 0    /* Pixel index */
    li x2, 1024 /* Pixel count */
loop:
    andi x3, x1, 31 /* x = x1 % 32 */
    srli x4, x1, 5  /* y = x1 / 32 */
    li x5, 0
    bne x3, x4, skip1
    ori x5, x5, 0x03 /* main diagonal => blue */
skip1:
    blt x3, x4, skip2
    ori x5, x5, 0xe0 /* north-east => red */
skip2:
    addi x3, x3, -31
    neg x3, x3   /* x = 31 - x */
    blt x3, x4, skip3
    ori x5, x5, 0x1c /* north-west => green */
skip3:
    li x3, 0xc00
    add x3, x3, x1
    sb x5, (x3)

    addi x1, x1, 1
    blt x1, x2, loop

done:
    j .
