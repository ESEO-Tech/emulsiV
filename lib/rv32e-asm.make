
LIB_DIR  := $(dir $(lastword $(MAKEFILE_LIST)))

include $(LIB_DIR)/rv32e-common.make

%.elf: %.o $(LD_SCRIPT)
	$(CC) $(LD_FLAGS) -o $@ $<
