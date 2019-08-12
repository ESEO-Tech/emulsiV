
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
    lui x1, 0xb0000
    lui x2, 0xc0000
    lui x3, 0x00004
    lui x4, 0x00008
    sh x4, (x1)
    j .
