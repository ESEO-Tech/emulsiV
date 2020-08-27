
import {Device, Memory} from "../virgule.js";
import * as view from "../view.js";
import {toHex, unsignedSlice} from "../int32.js";

export class GPIO extends Memory {
    constructor(firstAddress) {
        super(firstAddress, 16);
        this.changed = new Set();
        this.reset();
    }

    get direction() {
        return super.localRead(0, 4);
    }

    set direction(value) {
        this.localWrite(0, 4, value);
    }

    get interruptEnable() {
        return super.localRead(4, 4);
    }

    set interruptEnable(value) {
        this.localWrite(4, 4, value);
    }

    get inputEvents() {
        return super.localRead(8, 4);
    }

    set inputEvents(value) {
        this.localWrite(8, 4, value);
    }

    get ioStatus() {
        return this.currentInputs     &  this.direction |
               super.localRead(12, 4) & ~this.direction;
    }

    set ioStatus(value) {
        this.localWrite(12, 4, value);
    }

    reset() {
        this.direction       = 0xFFFFFFFF;
        this.interruptEnable = 0;
        this.inputEvents     = 0;
        this.ioStatus        = 0;
        this.currentInputs   = 0;
        this.changed         = new Set();
    }

    localRead(address, size) {
        if (address < 12) {
            return super.localRead(address, size);
        }
        const right = (address - 12) * 8;
        const left = right + size * 8 - 1;
        return unsignedSlice(this.ioStatus, left, right);
    }

    checkChanges(fn) {
        const saved = [];
        for (let i = 8; i < this.size; i ++) {
            saved.push(this.localRead(i, 1));
        }
        fn();
        for (let i = 8; i < this.size; i ++) {
            if (saved[i - 8] !== this.localRead(i, 1)) {
                this.changed.add(i);
            }
        }
    }

    localWrite(address, size, value) {
        this.checkChanges(() => {
            super.localWrite(address, size, value);
        });
    }

    hasData() {
        return this.changed.size > 0;
    }

    getData() {
        const result = this.changed;
        this.changed = new Set();
        return result;
    }

    clearInput(bitIndex) {
        this.checkChanges(() => {
            const mask = ~(1 << bitIndex);
            this.currentInputs &= mask;
        });
    }

    toggleInput(bitIndex) {
        this.checkChanges(() => {
            const mask = 1 << bitIndex;
            this.currentInputs ^= mask;
            this.inputEvents   |= mask;
        });
    }

    irq() {
        return !!(this.inputEvents & this.interruptEnable);
    }
}

export class GPIOView extends view.DeviceView {
    constructor(...args) {
        super(...args);

        this.deviceTypes = [];

        document.querySelectorAll(`#${this.id} td`).forEach((elt, index) => {
            const bitIndex = index + 7 - 2 * (index % 8);

            this.setDeviceType(elt, bitIndex, "none");

            elt.addEventListener("contextmenu", evt => {
                this.setNextDeviceType(elt, bitIndex);
                evt.preventDefault();
            });

            elt.addEventListener("mousedown", evt => {
                if (evt.button !== 0) {
                    return;
                }
                if (this.deviceTypes[bitIndex] === "push" || this.deviceTypes[bitIndex] === "toggle") {
                    this.toggleInput(bitIndex);
                }
            });

            elt.addEventListener("mouseup", evt => {
                if (evt.button !== 0) {
                    return;
                }
                if (this.deviceTypes[bitIndex] === "push") {
                    this.toggleInput(bitIndex);
                }
            });
        });
    }

    setDeviceType(elt, index, type) {
        if (index < this.deviceTypes.length) {
            elt.classList.remove(this.deviceTypes[index]);
        }
        elt.classList.add(type);
        this.deviceTypes[index] = type;
        let title = "Right-click to change this input device";
        switch (type) {
            case "push":   title = "Push-button";   break;
            case "toggle": title = "Toggle switch"; break;
            case "led":    title = "LED";           break;
        }
        elt.setAttribute("title", title);
        this.device.clearInput(index);
        this.update();
    }

    setNextDeviceType(elt, index) {
        let nextType = "none";
        switch (this.deviceTypes[index]) {
            case "none":   nextType = "push";   break;
            case "push":   nextType = "toggle"; break;
            case "toggle": nextType = "led";    break;
            case "led":    nextType = "none";   break;
        }
        this.setDeviceType(elt, index, nextType);
    }

    toggleInput(bitIndex) {
        const savedIrq = this.controller.bus.irq();
        this.device.toggleInput(bitIndex);
        this.update();
        // Update the IRQ input view if it has changed.
        const irq = this.controller.bus.irq();
        if (irq !== savedIrq) {
            view.update("irq", irq);
        }
    }

    // FIXME update IRQ input.
    update() {
        for (let a of this.device.getData()) {
            view.update("mem" + toHex(this.device.firstAddress + a), toHex(this.device.localRead(a, 1), 2));
        }

        document.querySelectorAll(`#${this.id} td`).forEach((elt, index) => {
            const bitIndex = index + 7 - 2 * (index % 8);
            if (this.device.ioStatus & (1 << bitIndex)) {
                elt.classList.add("on");
            }
            else {
                elt.classList.remove("on");
            }
        });
    }
}
