
import {unsignedSlice} from "../int32.js";
import {Device} from "../virgule.js";
import {DeviceView} from "../view.js";

export class BitmapOutput extends Device {
    constructor(firstAddress, width, height) {
        super(firstAddress, width * height);
        this.width   = width;
        this.height  = height;
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
                c: unsignedSlice(value, 8 * i + 7, 8 * i)
            })
        }
    }
}

export class BitmapOutputView extends DeviceView {
    update() {
        const pixels = this.device.getData();
        const canvas = document.getElementById(this.id);
        const scaleX = canvas.width  / this.device.width;
        const scaleY = canvas.height / this.device.height;
        const ctx = canvas.getContext("2d");
        for (let p of pixels) {
            const red   = Math.floor(255 * unsignedSlice(p.c, 7, 5) / 7);
            const green = Math.floor(255 * unsignedSlice(p.c, 4, 2) / 7);
            const blue  = Math.floor(255 * unsignedSlice(p.c, 1, 0) / 3);
            ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
            ctx.fillRect(p.x * scaleX, p.y * scaleY, scaleX, scaleY);
        }
    }

    clear() {
        const canvas = document.getElementById(this.id);
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    getXY(clientX, clientY) {
        const rect = document.getElementById(this.id).getBoundingClientRect();
        let x = Math.floor((clientX - rect.left) * this.device.width  / rect.width);
        x = Math.max(x, 0);
        x = Math.min(x, this.device.width - 1);

        let y = Math.floor((clientY - rect.top)  * this.device.height / rect.height);
        y = Math.max(y, 0);
        y = Math.min(y, this.device.height - 1);

        return {x, y};
    }
}
