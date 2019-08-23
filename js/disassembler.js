
import * as i32 from "./i32.js";

const ASM_TABLE = {
    lui   : "di",
    auipc : "di",
    jal   : "di",
    jalr  : "d1i",
    beq   : "12i",
    bne   : "12i",
    blt   : "12i",
    bge   : "12i",
    bltu  : "12i",
    bgeu  : "12i",
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
    nop   : "",
    li    : "di",
    mv    : "d1",
    not   : "d1",
    neg   : "d2",
    seqz  : "d1",
    snez  : "d2",
    sltz  : "d1",
    sgtz  : "d2",
    beqz  : "1i",
    bnez  : "1i",
    blez  : "2i",
    bgez  : "1i",
    bltz  : "1i",
    bgtz  : "2i",
    j     : "i",
    _jal  : "i",
    jr    : "1",
    _jalr : "1",
    ret   : "",
};

const PSEUDO_TABLE = {
    nop:   {name: "addi",  rd:  0, rs1: 0, imm: 0},
    li:    {name: "addi",  rs1: 0},
    mv:    {name: "addi",  imm: 0},
    not:   {name: "xori",  imm: -1},
    neg:   {name: "sub",   rs1: 0},
    seqz:  {name: "sltiu", imm: 1},
    snez:  {name: "sltu",  rs1: 0},
    sgtz:  {name: "slt",   rs1: 0},
    sltz:  {name: "slt",   rs2: 0},
    beqz:  {name: "beq",   rs2: 0},
    bnez:  {name: "bne",   rs2: 0},
    blez:  {name: "bge",   rs1: 0},
    bgez:  {name: "bge",   rs2: 0},
    bltz:  {name: "blt",   rs2: 0},
    bgtz:  {name: "blt",   rs1: 0},
    j:     {name: "jal",   rd:  0},
    _jal:  {name: "jal",   rd:  1},
    ret:   {name: "jalr",  rd:  0, rs1: 1, imm: 0},
    jr:    {name: "jalr",  rd:  0, imm: 0},
    _jalr: {name: "jalr",  rd:  1, imm: 0},
}

export function toAssembly({name, rd, rs1, rs2, imm}) {
    if (!(name in ASM_TABLE)) {
        return "-";
    }

    const reg = (n) => "x" + n;

    // TODO In branch instructions, convert PC-relative offsets to addresses.
    const ival = Math.abs(imm) > 32768 ? `0x${i32.toHex(imm)}` : i32.s(imm);

    const operands = ASM_TABLE[name].split("").map(c => {
        switch (c) {
            case "d": return reg(rd);
            case "1": return reg(rs1);
            case "2": return reg(rs2);
            case "i": return ival;
            case "a": return `${imm}(${reg(rs1)})`;
        }
    });
    // An '_' indicates a pseudo-instruction that has the same name as
    // a regular instruction.
    if (name[0] === '_') {
        name = name.slice(1);
    }
    if (operands.length) {
        return name + " " + operands.join(", ");
    }
    return name;
}

export function toPseudoAssembly(instr) {
    for (let [pname, pinstr] of Object.entries(PSEUDO_TABLE)) {
        if (Object.entries(pinstr).every(([key, value]) => instr[key] === value)) {
            instr.name = pname;
            return toAssembly(instr);
        }
    }
    return null;
}
