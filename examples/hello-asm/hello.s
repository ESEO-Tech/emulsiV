
    .text

    .global __reset

__reset:
    la x1, str
    lui x2, 0xc0000
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
