#!/usr/bin/env python3

import sys
import math

if len(sys.argv) <= 2:
    print("No file name")
    exit()

def readppm(filename, width, height, color_max, m, s, w):
    pixels = [0] * (width * height)
    with open(filename) as ppm:
        header = ["P3", "{} {}".format(width, height), str(color_max)]
        line_index  = 0
        pixel_index = 0
        rgb_index   = 0
        for l in ppm:
            # Ignore comments
            if l[0] == '#':
                continue
            if line_index >= len(header):
                for c in l.split():
                    rgb = math.floor(int(c) * m / 255)
                    shift_count = s - w * rgb_index
                    if shift_count >= 0:
                        pixels[pixel_index] = pixels[pixel_index] | (rgb << shift_count)
                    rgb_index += 1
                    if rgb_index == 3:
                        rgb_index = 0
                        pixel_index += 1
            elif l.rstrip() == header[line_index]:
                line_index += 1
            else:
                print("Wrong file format:", l.rstrip())
                break
    return pixels

img1 = readppm(sys.argv[1], 32, 32, 255, 3, 6, 3)
img2 = readppm(sys.argv[2], 32, 32, 255, 1, 5, 3)

img3 = [img1[i] | img2[i] for i in range(1024)]

for i in range(32):
    print(".byte", ", ".join(map(str, img3[i * 32:(i+1)*32])))
