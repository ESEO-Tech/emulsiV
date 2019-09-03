
import {Device} from "../virgule.js";
import * as fmt from "../fmt.js";
import * as asm from "../asm.js";
import * as i32 from "../i32.js";

export class AsmOutput extends Device {
    constructor(mem) {
        super(mem.firstAddress, mem.size);
        this.mem = mem;
        this.reset();
    }

    reset() {
        this.instrs = {};
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
        const instr = fmt.fromWord(word);
        this.instrs[i32.toHex(address)] = {
            asm:    asm.toString(instr, address),
            pseudo: asm.pseudoToString(instr, address),
            meta:   asm.metaToString(instr, address)
        };
    }
}
