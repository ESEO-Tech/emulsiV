
import {Memory, Device} from "../virgule.js";
import * as view from "../view.js";
import {toHex, unsignedSlice} from "../int32.js";

const GPIO_DIR_ADDR         = 0;
const GPIO_INT_ADDR         = 4;
const GPIO_RISING_EVT_ADDR  = 8;
const GPIO_FALLING_EVT_ADDR = 12;
const GPIO_STATUS_ADDR      = 16;

export class GPIO extends Memory {
    constructor(firstAddress) {
        super(firstAddress, GPIO_STATUS_ADDR + 4);
        this.changed = new Set();
        this.reset();
    }

    checkChanges(fn) {
        const saved = [];
        for (let i = GPIO_RISING_EVT_ADDR; i < this.size; i ++) {
            saved.push(this.localRead(i, 1));
        }
        fn();
        for (let i = GPIO_RISING_EVT_ADDR; i < this.size; i ++) {
            if (saved[i - GPIO_RISING_EVT_ADDR] !== this.localRead(i, 1)) {
                this.changed.add(i);
            }
        }
    }

    get direction() {
        return super.localRead(GPIO_DIR_ADDR, 4);
    }

    set direction(value) {
        super.localWrite(GPIO_DIR_ADDR, 4, value);
    }

    get interruptEnable() {
        return super.localRead(GPIO_INT_ADDR, 4);
    }

    set interruptEnable(value) {
        super.localWrite(GPIO_INT_ADDR, 4, value);
    }

    get inputRisingEvents() {
        return super.localRead(GPIO_RISING_EVT_ADDR, 4);
    }

    set inputRisingEvents(value) {
        super.localWrite(GPIO_RISING_EVT_ADDR, 4, value);
    }

    get inputFallingEvents() {
        return super.localRead(GPIO_FALLING_EVT_ADDR, 4);
    }

    set inputFallingEvents(value) {
        super.localWrite(GPIO_FALLING_EVT_ADDR, 4, value);
    }

    get inputEvents() {
        return this.inputRisingEvents | this.inputFallingEvents;
    }

    get ioStatus() {
        return this.currentInputs                   &  this.direction |
               super.localRead(GPIO_STATUS_ADDR, 4) & ~this.direction;
    }

    set ioStatus(value) {
        super.localWrite(GPIO_STATUS_ADDR, 4, value);
    }

    reset() {
        this.direction          = 0xFFFFFFFF;
        this.interruptEnable    = 0;
        this.inputRisingEvents  = 0;
        this.inputFallingEvents = 0;
        this.ioStatus           = 0;
        this.currentInputs      = 0;
        this.changed            = new Set();
    }

    localRead(address, size) {
        if (address < GPIO_STATUS_ADDR) {
            return super.localRead(address, size);
        }
        const right = (address - GPIO_STATUS_ADDR) * 8;
        const left = right + size * 8 - 1;
        return unsignedSlice(this.ioStatus, left, right);
    }

    localWrite(address, size, value) {
        for (let a = address; a < address + size; a ++) {
            this.changed.add(a);
            if (a < GPIO_INT_ADDR) {
                this.changed.add(a + GPIO_STATUS_ADDR);
            }
        }
        super.localWrite(address, size, value);
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
            if (this.currentInputs & mask) {
                this.inputRisingEvents |= mask;
            }
            else {
                this.inputFallingEvents |= mask;
            }
        });
    }

    irq() {
        return !!(this.inputEvents & this.interruptEnable);
    }
}

export class GPIOConfig extends Device {
    constructor(firstAddress, size, view) {
        super(firstAddress, size);
        this.view = view;
    }

    localWrite(address, size, value) {
        for (let a = address; a < address + size; a ++) {
            const bitIndex = address + 7 - 2 * (address % 8);
            const right = (a - address) * 8;
            let deviceType = "none";
            switch (unsignedSlice(value, right + 7, right)) {
                case 1: deviceType = "push";   break;
                case 2: deviceType = "toggle"; break;
                case 3: deviceType = "led";    break;
            }
            this.view.setDeviceType(this.view.getElementAtIndex(address), bitIndex, deviceType);
        }
    }

    localRead(address, size) {
        let value = 0;
        for (let a = address; a < address + size; a ++) {
            const bitIndex = address + 7 - 2 * (address % 8);
            let deviceTypeId = 0;
            switch (this.view.deviceTypes[bitIndex]) {
                case "push":   deviceTypeId = 1; break;
                case "toggle": deviceTypeId = 2; break;
                case "led":    deviceTypeId = 3; break;
            }
            value |= deviceTypeId << (8 * (a - address));
        }
        return value;
    }
}

export class GPIOView extends view.DeviceView {
    constructor(...args) {
        super(...args);

        this.deviceTypes = [];

        document.querySelectorAll(`#${this.id} td`).forEach((elt, eltIndex) => {
            const bitIndex = eltIndex + 7 - 2 * (eltIndex % 8);

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

        for (let index = 0; index < this.device.size; index ++) {
            const addr = this.device.firstAddress + index;
            const cellId = "mem" + toHex(addr);
            view.setupRegister(cellId, {
                onBlur: value => {
                    this.device.localWrite(index, 1, value);
                    this.update();
                }
            });
        }
    }

    getElementAtIndex(eltIndex) {
        return document.querySelectorAll(`#${this.id} td`)[eltIndex];
    }

    setDeviceType(elt, bitIndex, type) {
        if (bitIndex < this.deviceTypes.length) {
            elt.classList.remove(this.deviceTypes[bitIndex]);
        }
        elt.classList.add(type);
        this.deviceTypes[bitIndex] = type;
        let title = "Right-click to change this input device";
        switch (type) {
            case "push":   title = "Push-button";   break;
            case "toggle": title = "Toggle switch"; break;
            case "led":    title = "LED";           break;
        }
        elt.setAttribute("title", title);
        this.device.clearInput(bitIndex);
        this.update();
    }

    setNextDeviceType(elt, bitIndex) {
        let nextType = "none";
        switch (this.deviceTypes[bitIndex]) {
            case "none":   nextType = "push";   break;
            case "push":   nextType = "toggle"; break;
            case "toggle": nextType = "led";    break;
            case "led":    nextType = "none";   break;
        }
        this.setDeviceType(elt, bitIndex, nextType);
    }

    toggleInput(bitIndex) {
        this.device.toggleInput(bitIndex);
        this.update();
    }

    clear() {
        for (let elt of document.querySelectorAll(`#${this.id} td`)) {
            elt.classList.remove("on");
        }
    }

    update() {
        for (let a of this.device.getData()) {
            view.update("mem" + toHex(this.device.firstAddress + a), toHex(this.device.localRead(a, 1), 2));
        }

        document.querySelectorAll(`#${this.id} td`).forEach((elt, eltIndex) => {
            const bitIndex = eltIndex + 7 - 2 * (eltIndex % 8);
            if (this.device.ioStatus & (1 << bitIndex)) {
                elt.classList.add("on");
            }
            else {
                elt.classList.remove("on");
            }
        });
    }
}
