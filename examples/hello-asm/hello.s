
    .text

    .global __reset

__reset:
    la x1, str
    li x2, 0xC0000000
loop:
    lbu x3, (x1)
    beq x3, zero, done
    sb x3, (x2)
    addi x1, x1, 1
    jal zero, loop
done:
    j .

    .data
str:
    .asciz "Hello"
