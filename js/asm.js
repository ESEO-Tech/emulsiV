
import * as i32 from "./i32.js";

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

const PSEUDO_TABLE = {
    nop:    {name: "addi",  rd:  0, rs1: 0, imm: 0},
    li:     {name: "addi",  rs1: 0},
    mv:     {name: "addi",  imm: 0},
    not:    {name: "xori",  imm: -1},
    neg:    {name: "sub",   rs1: 0},
    seqz:   {name: "sltiu", imm: 1},
    snez:   {name: "sltu",  rs1: 0},
    sgtz:   {name: "slt",   rs1: 0},
    sltz:   {name: "slt",   rs2: 0},
    beqz:   {name: "beq",   rs2: 0},
    bnez:   {name: "bne",   rs2: 0},
    blez:   {name: "bge",   rs1: 0},
    bgez:   {name: "bge",   rs2: 0},
    bltz:   {name: "blt",   rs2: 0},
    bgtz:   {name: "blt",   rs1: 0},
    j:      {name: "jal",   rd:  0},
    jal$1:  {name: "jal",   rd:  1},
    ret:    {name: "jalr",  rd:  0, rs1: 1, imm: 0},
    jr:     {name: "jalr",  rd:  0, imm: 0},
    jalr$1: {name: "jalr",  rd:  1, imm: 0},
}

export function toString({name, rd, rs1, rs2, imm}, address) {
    if (!(name in ASM_TABLE)) {
        return "-";
    }

    const reg = (n) => "x" + n;

    const operands = ASM_TABLE[name].split("").map(c => {
        switch (c) {
            case "d": return reg(rd);
            case "1": return reg(rs1);
            case "2": return reg(rs2);
            case "i": return Math.abs(imm) > 32768 ? `0x${i32.toHex(imm)}` : i32.s(imm);
            case "p": return `0x${i32.toHex(imm + address)} &lt;pc${imm >= 0 ? "+" : ""}${imm}>`;
            case "a": return `${imm}(${reg(rs1)})`;
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

export function pseudoToString(instr, address) {
    for (let [pname, pinstr] of Object.entries(PSEUDO_TABLE)) {
        if (Object.entries(pinstr).every(([key, value]) => instr[key] === value)) {
            instr.name = pname;
            return toString(instr, address);
        }
    }
    return null;
}


export function fromString(str, address) {
    const fragments = str.trim().split(/\s+|\s*,\s*/);
    if (!fragments.length) {
        return null;
    }

    // TODO also match pseudo-instructions.
    const [name, ...operands] = fragments;
    if (!(name in ASM_TABLE)) {
        return null;
    }

    const syntax = ASM_TABLE[name];
    if (operands.length !== syntax.length) {
        return null;
    }

    const reg = op => {
        const m = /x([0-9]+)/.exec(op);
        if (!m) {
            return null;
        }
        return parseInt(m[1]);
    }

    const instr = {name};
    operands.forEach((op, i) => {
        switch (syntax[i]) {
            case "d": instr.rd  = reg(op);      if (!instr.rd)        return null; break;
            case "1": instr.rs1 = reg(op);      if (!instr.rs1)       return null; break;
            case "2": instr.rs2 = reg(op);      if (!instr.rs2)       return null; break;
            case "i": instr.imm = parseInt(op); if (isNaN(instr.imm)) return null; break;
            case "p":
                const target = parseInt(op);
                if (isNaN(target)) return null;
                instr.imm = target - address;
                break;
            case "a":
                const addressSpec = op.split(/[()]/);
                if (addressSpec.length !== 3) {
                    return null;
                }
                instr.imm = parseInt(addressSpec[0] || "0");
                if (isNaN(instr.imm)) return null;
                instr.rs1 = reg(addressSpec[1]);
                if (!instr.rs1) return null;
                break;
        }
    });

    return instr;
}

console.log(fromString("addi x5, x4, 12"));
console.log(fromString("blt x5, x4, 0x400c", 0x4000));
console.log(fromString("lb x5, 8(x4)"));
console.log(fromString("sb x5, (x4)"));
