
import {Device} from "../virgule.js";
import {decode} from "../decoder.js";
import {toAssembly} from "../disassembler.js";
import * as i32 from "../i32.js";

export class AsmOutput extends Device {
    constructor(mem) {
        super(mem.firstAddress, mem.size);
        this.mem    = mem;
        this.instrs = [];
    }

    hasData() {
        return Object.entries(this.instrs).length > 0;
    }

    getData() {
        const result = this.instrs;
        this.instrs = {};
        return result;
    }

    localWrite(address, size, value) {
        address -= address % 4;
        const word = this.mem.read(address, 4, false);
        this.instrs[i32.toHex(address)] = toAssembly(decode(word));
    }
}
