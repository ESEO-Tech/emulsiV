
/*
 * Configure the GPIO with:
 * - Byte 0: 8 LEDs
 * - Byte 1: 8 toggle switches
 */

    .text

    .global __reset

__reset:
    j start

__irq:
    /* Clear all event flags on the second GPIO byte */
    sb x0, 9(x1)
    sb x0, 13(x1)
    /* Copy the second GPIO byte to the first byte */
    lbu x2, 17(x1)
    sb x2, 16(x1)
    mret

start:
    li x1, 0xd0000000
    /* Set first GPIO byte as outputs */
    sb x0, (x1)
    /* Enable interrupts for the second GPIO byte */
    li x2, 0xff
    sb x2, 5(x1)
    j .

    .section gpio_config, "a"

leds: .byte 3, 3, 3, 3, 3, 3, 3, 3
sws:  .byte 2, 2, 2, 2, 2, 2, 2, 2
