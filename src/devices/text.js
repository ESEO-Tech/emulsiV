
import {Device, Memory} from "../virgule.js";
import {DeviceView} from "../view.js";

export class TextOutput extends Device {
    constructor(...args) {
        super(...args);
        this.reset();
    }

    reset() {
        this.data = "";
    }

    localWrite(address, count, value) {
        const charCode = value & 0xFF;
        this.data = (charCode === 0x0a || charCode >= 0x20 && charCode < 0x7f || charCode >= 0xa1) ? String.fromCharCode(charCode) : "\ufffd";
    }

    hasData() {
        return this.data.length > 0;
    }

    getData() {
        const res = this.data;
        this.data = "";
        return res;
    }
}

export class TextOutputView extends DeviceView {
    update() {
        document.getElementById(this.id).innerHTML += this.device.getData();
    }

    clear() {
        document.getElementById(this.id).innerHTML = "";
    }
}

export class TextInput extends Memory {
    constructor(firstAddress) {
        super(firstAddress, 2);
    }

    reset() {
        this.localWrite(0, 2, 0);
    }

    onKeyDown(code) {
        // Status reg.
        this.localWrite(0, 1, this.localRead(0, 1) | 0x40);
        // Data reg.
        this.localWrite(1, 1, code);
    }

    irq() {
        const status = this.localRead(0, 1);
        return !!(status & 0x40) && !!(status & 0x80);
    }
}
