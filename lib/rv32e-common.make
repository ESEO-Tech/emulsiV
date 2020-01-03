
# Variables:
#   C_DEPS: C source files to link with the main program
#	C_FLAGS_USER: additional options for the compiler or the assembler
#	LD_FLAGS_USER: additional options for the linker

PLATFORM = riscv32-unknown-elf
CC       = $(PLATFORM)-gcc
OBJCOPY  = $(PLATFORM)-objcopy

LD_SCRIPT = $(LIB_DIR)/rv32e.ld
C_FLAGS   = -march=rv32e -ffreestanding -I$(LIB_DIR) $(C_FLAGS_USER)
LD_FLAGS  = -nostdlib -T $(LD_SCRIPT) $(LD_FLAGS_USER)

OBJ_STARTUP = $(LIB_DIR)/startup.o
OBJ_DEPS = $(C_DEPS:.c=.o) $(ASM_DEPS:.s=.o)

%.o: %.c
	$(CC) $(C_FLAGS) -c -o $@ $<

%.o: %.s
	$(CC) $(C_FLAGS) -Wa,-a -c -o $@ $< > $*.lst

%.hex: %.elf
	$(OBJCOPY) -O ihex $< $@

%.url: %.hex
	$(LIB_DIR)/url-encode.js $< > $@

clean:
	rm -f *.o *.hex *.elf *.lst
