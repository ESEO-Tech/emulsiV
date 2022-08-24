
ENTRY(__reset)

MEM_SIZE    = 4K;
STACK_SIZE  = 512;
BITMAP_SIZE = 1K;

SECTIONS {
    . = 0x0;

    .text : {
        *(vectors)
        *(.text)
        __text_end = .;
    }

    .data   : { *(.data) }
    .rodata : { *(.rodata) }

    __global_pointer = ALIGN(4);

    .bss ALIGN(4) : {
        __bss_start = .;
        *(.bss COMMON)
        __bss_end = ALIGN(4);
    }

    . = MEM_SIZE - STACK_SIZE - BITMAP_SIZE;

    .stack ALIGN(4) : {
        __stack_start = .;
        . += STACK_SIZE;
        __stack_pointer = .;
    }

    .bitmap ALIGN(4) : {
        __bitmap_start = .;
        *(bitmap)
    }

    __bitmap_end = __bitmap_start + BITMAP_SIZE;

    . = MEM_SIZE;

    .gpio_config ALIGN(4) : {
        *(gpio_config)
    }
}
