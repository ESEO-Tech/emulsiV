
    .set TEXT_OUT,           0xc0000000
    .set TEXT_IN,            0xb0000000
    .set TEXT_IN_IRQ_MASK,   0x0040
    .set TEXT_IN_IRQ_ENABLE, 0x0080

    .text

    .global __reset

__reset:
    j start

__irq:
    lhu x3, (x1)
    xor x3, x3, TEXT_IN_IRQ_MASK
    sh x3, (x1)
    srli x3, x3, 8
    sb x3, (x2)
    mret

start:
    li x1, TEXT_IN
    li x2, TEXT_OUT
    li x3, TEXT_IN_IRQ_ENABLE
    sh x3, (x1)
    j .
