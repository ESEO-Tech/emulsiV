    .text

    .global __reset

__reset:
    nop
    li x4, 12
    mv x4, x5
    not x4, x5
    neg x4, x5
    seqz x4, x5
    snez x4, x5
    sltz x4, x5
    sgtz x4, x5
    beqz x4, target
    bnez x4, target
    blez x4, target
    bgez x4, target
    bltz x4, target
    bgtz x4, target
    j target
    jal target
    jr x4
    jalr x4
    ret

target:
    nop
