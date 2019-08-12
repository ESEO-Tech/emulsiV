
    .text

    .global __reset

__reset:
    li x1, 0    /* Pixel index */
    li x2, 1024 /* Pixel count */
    li x6, 0xc00
loop:
    andi x3, x1, 31 /* x = x1 % 32 */
    srli x4, x1, 5  /* y = x1 / 32 */

    add  x5, x3, x4
    andi x5, x5, 3  /* (x + y) % 4 => blue */

    andi x3, x3, 0x1c
    or   x5, x5, x3 /* x / 4 => green */

    andi x4, x4, 0x1c
    slli x4, x4, 3
    or   x5, x5, x4 /* x / 4 => green */

    sb x5, (x6)

    addi x6, x6, 1
    addi x1, x1, 1
    blt x1, x2, loop

done:
    j .
