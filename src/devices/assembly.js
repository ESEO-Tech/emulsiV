
import {Device} from "../virgule.js";
import {decode} from "../binary.js";
import {disassemble, disassemblePseudo, disassembleMeta} from "../assembly.js";
import {toHex} from "../int32.js";

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

    refresh() {
        for (let a = 0; a < this.mem.size; a += 4) {
            this.localWrite(a, 1, 0);
        }
    }

    localWrite(address, size, value) {
        address -= address % 4;
        const word = this.mem.read(address, 4, false);
        const instr = decode(word);
        this.instrs[toHex(address)] = {
            word:   word,
            asm:    disassemble(instr),
            pseudo: disassemblePseudo(instr),
            meta:   disassembleMeta(instr, address),
        };
    }
}
