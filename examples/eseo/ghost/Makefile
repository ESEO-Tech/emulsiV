
all: bitmap.inc ghost-full.hex ghost-base.hex

bitmap.inc: wolf.ppm ghost.ppm
	./convert.py wolf.ppm ghost.ppm > $@

include ../../../lib/emulsiV-asm.make
