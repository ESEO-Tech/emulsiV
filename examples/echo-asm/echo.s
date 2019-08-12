
    .text

    .global __reset

__reset:
    j start

__irq:
    lhu x4, (x1)
    xor x4, x4, x3
    sh x4, (x1)
    sb x4, (x2)
    mret

start:
    li x1, 0xb0000000
    li x2, 0xc0000000
    li x3, 0x00004000
    li x4, 0x00008000
    sh x4, (x1)
    j .
