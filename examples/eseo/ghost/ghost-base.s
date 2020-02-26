
    .text

    .global __reset

__reset:
    j .

    .section bitmap, "a"

background:
    .include "bitmap.inc"
