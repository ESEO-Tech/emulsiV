
LIB_DIR := $(dir $(lastword $(MAKEFILE_LIST)))

include $(LIB_DIR)/emulsiV-common.make

%.elf: %.o $(LD_SCRIPT)
	$(CC) $(LD_FLAGS) -o $@ $<
