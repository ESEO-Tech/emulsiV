
    .text

    .global __reset

__reset:
    la x1, ascii_table
    li x2, 0
    li x3, 0xff
    li x4, 0xc0000000
loop:
    sb x2, (x1)
    sb x2, (x4)
    addi x1, x1, 1
    addi x2, x2, 1
    ble x2, x3, loop
done:
    j .

    .data
ascii_table:
    .asciz "XXXX"
