
    .section vectors, "x"

    .global __reset
__reset:
    j start

__irq:
    j irq_handler


    .text

    .align 4

    .weak irq_handler
irq_handler:
    mret

start:
    la gp, __global_pointer
    la sp, __stack_pointer
    la t0, __bss_start
    la t1, __bss_end
    bgeu t0, t1, memclr_done
memclr:
    sw zero, (t0)
    addi t0, t0, 4
    bltu t0, t1, memclr

memclr_done:
    call main
    j .
