
import {Device} from "../virgule.js";
import {DeviceView, simpleUpdate} from "../view.js";
import {decode} from "../binary.js";
import {disassemble, disassemblePseudo, disassembleMeta} from "../assembly.js";
import {toHex, unsignedSlice, signedSlice, signed, unsigned} from "../int32.js";

export class AsmOutput extends Device {
    constructor(mem) {
        super(mem.firstAddress, mem.size);
        this.mem = mem;
        this.instrs = {};
        this.reset();
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

export class AsmOutputView extends DeviceView {
    constructor(...args) {
        super(...args);
        this.format = "asm";
    }

    update() {
        const instrs = this.device.getData();
        for (let [addr, {word, asm, pseudo, meta}] of Object.entries(instrs)) {
            let res = "";
            switch (this.format) {
                case "asm":
                case "pseudo":
                    if (this.format === "pseudo" && pseudo) {
                        const metaStr = meta ? ` <${meta}>` : "";
                        res = `<abbr title="${asm}${metaStr}">${pseudo}</abbr>`;
                    }
                    else if (meta) {
                        const s = asm.split(" ");
                        const asmr = s[s.length-1];
                        const asml = asm.slice(0, -asmr.length);
                        res = `${asml} <abbr title="${meta}">${asmr}</abbr>`;
                    }
                    else {
                        res = asm;
                    }
                    break;

                case "ascii":
                    for (let i = 0; i < 32; i += 8) {
                        const charCode = unsignedSlice(word, i + 7, i);
                        const char = (charCode >= 0x20 && charCode < 0x7f || charCode >= 0xa1) ? String.fromCharCode(charCode) : "\ufffd";
                        res += char;
                    }
                    break;

                case "int32":  res = signed(word).toString(); break;
                case "uint32": res = unsigned(word).toString(); break;
                case "int16":
                    res = [signedSlice(word, 15, 0), signedSlice(word, 31, 16)].map(s => s.toString()).join(", ");
                    break;
                case "uint16":
                    res = [unsignedSlice(word, 15, 0), unsignedSlice(word, 31, 16)].map(s => s.toString()).join(", ");
                    break;
                case "int8":
                    res = [signedSlice(word, 7, 0),   signedSlice(word, 15, 8),
                           signedSlice(word, 23, 16), signedSlice(word, 31, 24),].map(s => s.toString()).join(", ");
                    break;
                case "uint8":
                    res = [unsignedSlice(word, 7, 0),   unsignedSlice(word, 15, 8),
                           unsignedSlice(word, 23, 16), unsignedSlice(word, 31, 24),].map(s => s.toString()).join(", ");
                    break;
            }
            if (res.length) {
                simpleUpdate(this.id + addr, res);
            }
        }
    }
}
