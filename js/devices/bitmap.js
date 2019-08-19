
import {getSlice} from "../decoder.js";
import {Device}   from "../virgule.js";

export class BitmapOutput extends Device {
    constructor(firstAddress, width, height) {
        super(firstAddress, width * height);
        this.width   = width;
        this.height  = height;
        this.reset();
    }

    reset() {
        this.pixels  = [];
    }

    hasData() {
        return this.pixels.length > 0;
    }

    getData() {
        const result = this.pixels;
        this.pixels = [];
        return result;
    }

    localWrite(address, size, value) {
        for (let i = 0; i < size; i ++) {
            this.pixels.push({
                x: (address + i) % this.width,
                y: Math.floor((address + i) / this.width),
                c: getSlice(value, 8 * i + 7, 8 * i)
            })
        }
    }
}
