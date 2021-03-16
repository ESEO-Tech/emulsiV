
import {toHex, signed} from "./int32.js";

// Assembly operand syntax:
// 'd': destination register
// '1': source register 1
// '2': source register 2
// 'i': immediate
// 'p': offset from PC
// 'a': indirect address
const ASM_TABLE = {
    lui   : "di",
    auipc : "di",
    jal   : "dp",
    jalr  : "d1i",
    beq   : "12p",
    bne   : "12p",
    blt   : "12p",
    bge   : "12p",
    bltu  : "12p",
    bgeu  : "12p",
    lb    : "da",
    lh    : "da",
    lw    : "da",
    lbu   : "da",
    lhu   : "da",
    sb    : "2a",
    sh    : "2a",
    sw    : "2a",
    addi  : "d1i",
    slli  : "d1i",
    slti  : "d1i",
    sltiu : "d1i",
    xori  : "d1i",
    srli  : "d1i",
    srai  : "d1i",
    ori   : "d1i",
    andi  : "d1i",
    add   : "d12",
    sub   : "d12",
    sll   : "d12",
    slt   : "d12",
    sltu  : "d12",
    xor   : "d12",
    srl   : "d12",
    sra   : "d12",
    or    : "d12",
    and   : "d12",
    mret  : "",
    // Pseudo-instructions
    nop    : "",
    li     : "di",
    mv     : "d1",
    not    : "d1",
    neg    : "d2",
    seqz   : "d1",
    snez   : "d2",
    sltz   : "d1",
    sgtz   : "d2",
    beqz   : "1p",
    bnez   : "1p",
    blez   : "2p",
    bgez   : "1p",
    bltz   : "1p",
    bgtz   : "2p",
    j      : "p",
    jal$1  : "p",
    jr     : "1",
    jalr$1 : "1",
    ret    : "",
};

// Psendo-instruction replacement table.
// A suffix '$n' indicates a pseudo-instruction that has the same name as
// a regular instruction.
const PSEUDO_TABLE = {
    nop:    {name: "addi",  rd: 0, rs1: 0,         imm: 0 },
    li:     {name: "addi",         rs1: 0                 },
    mv:     {name: "addi",                         imm: 0 },
    not:    {name: "xori",                         imm: -1},
    neg:    {name: "sub",          rs1: 0                 },
    seqz:   {name: "sltiu",                        imm: 1 },
    snez:   {name: "sltu",         rs1: 0                 },
    sgtz:   {name: "slt",          rs1: 0                 },
    sltz:   {name: "slt",                  rs2: 0         },
    beqz:   {name: "beq",                  rs2: 0         },
    bnez:   {name: "bne",                  rs2: 0         },
    blez:   {name: "bge",          rs1: 0                 },
    bgez:   {name: "bge",                  rs2: 0         },
    bltz:   {name: "blt",                  rs2: 0         },
    bgtz:   {name: "blt",          rs1: 0                 },
    j:      {name: "jal",   rd: 0                         },
    jal$1:  {name: "jal",   rd: 1                         },
    ret:    {name: "jalr",  rd: 0, rs1: 1,         imm: 0 },
    jr:     {name: "jalr",  rd: 0,                 imm: 0 },
    jalr$1: {name: "jalr",  rd: 1,                 imm: 0 },
}

// Disassemble an instruction or pseudo-instruction.
export function disassemble({name, rd, rs1, rs2, imm}) {
    if (!(name in ASM_TABLE)) {
        return "-";
    }

    const emitReg = (n) => "x" + n;

    const operands = ASM_TABLE[name].split("").map(c => {
        switch (c) {
            case "d": return emitReg(rd);
            case "1": return emitReg(rs1);
            case "2": return emitReg(rs2);
            case "i": return Math.abs(imm) > 32768 ? `0x${toHex(imm)}` : signed(imm);
            case "p": return (imm > 0 ? "+" : "") + imm;
            case "a": return `${imm}(${emitReg(rs1)})`;
        }
    });
    // A suffix '$n' indicates a pseudo-instruction that has the same name as
    // a regular instruction.
    name = name.split('$')[0];
    if (operands.length) {
        return name + " " + operands.join(", ");
    }
    return name;
}

// Disassemble as a pseudo-instruction.
// Return null if the given instruction cannot be mapped to a known
// pseudo-instruction.
export function disassemblePseudo(instr) {
    for (let [pname, pinstr] of Object.entries(PSEUDO_TABLE)) {
        if (Object.entries(pinstr).every(([key, value]) => instr[key] === value)) {
            instr.name = pname;
            return disassemble(instr);
        }
    }
    return null;
}

// Extract additional readable information from an instruction.
// Currently, this returns the target address of a PC-relative branch in hexadecimal.
export function disassembleMeta({name, imm}, address) {
    if (!(name in ASM_TABLE)) {
        return null;
    }
    if (ASM_TABLE[name].endsWith("p")) {
        return "0x" + toHex(imm + address);
    }
    return null;
}

// Compose regular expressions in sequence.
function seq(...res) {
    return new RegExp(res.map(e => `(?:${e.source})`).join(""));
}

// Compose regular expressions into an alternative.
function alt(...res) {
    return new RegExp(res.map(e => `(?:${e.source})`).join("|"));
}

// Assembly instruction grammar.
const instructionNameRe     = /\b[a-z]+\b/;
const registerNameRe        = /\bx([0-9]+)\b/;
const decimalLiteralRe      = /[+-]?[0-9]+\b/;
const hexLiteralRe          = /[+-]?0x[0-9a-f]+\b/;
const integerLiteralRe      = alt(decimalLiteralRe, hexLiteralRe);
const indirectAddressRe     = seq(/\(\s*/, registerNameRe, /\s*\)/);
const offsetAddressRe       = seq(integerLiteralRe, /\s*/, indirectAddressRe);
const instructionFragmentRe = new RegExp(alt(instructionNameRe, registerNameRe, indirectAddressRe, offsetAddressRe, integerLiteralRe), "g");

export function assemble(str) {
    const instr = {name: "invalid", rd: 0, rs1: 0, rs2: 0, imm: 0};

    const fragments = str.toLowerCase().match(instructionFragmentRe);
    if (!fragments) {
        return instr;
    }

    // TODO also match pseudo-instructions.
    const [name, ...operands] = fragments;
    if (!(name in ASM_TABLE) || (name in PSEUDO_TABLE)) {
        return instr;
    }
    instr.name = name;

    const syntax = ASM_TABLE[name];

    function parseReg(op) {
        const m = registerNameRe.exec(op);
        if (!m) {
            return 0;
        }
        const res = parseInt(m[1]);
        return isNaN(res) || res < 0 ? 0 :
               res > 31 ? 31 :
               res;
    }

    function parseImm(op) {
        const res = parseInt(op);
        return isNaN(res) ? 0 : res;
    }

    operands.forEach((op, i) => {
        switch (syntax[i]) {
            case "d": instr.rd  = parseReg(op); break;
            case "1": instr.rs1 = parseReg(op); break;
            case "2": instr.rs2 = parseReg(op); break;
            case "i":
            case "p": instr.imm = parseImm(op); break;
            case "a": {
                const addressSpec = op.split(/[()]/);
                if (addressSpec.length !== 3) {
                    return;
                }
                instr.imm = parseImm(addressSpec[0]);
                instr.rs1 = parseReg(addressSpec[1]);
            }
        }
    });

    return instr;
}
