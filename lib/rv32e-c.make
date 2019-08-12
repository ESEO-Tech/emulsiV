
LIB_DIR  := $(dir $(lastword $(MAKEFILE_LIST)))

include $(LIB_DIR)/rv32e-common.make

%.elf: %.o $(OBJ_DEPS) $(OBJ_STARTUP) $(LD_SCRIPT)
	$(CC) $(C_FLAGS) $(LD_FLAGS) -o $@ $(OBJ_DEPS) $< $(OBJ_STARTUP)
