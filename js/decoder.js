
import * as i32 from "./i32.js";

// Base opcodes
const OP_LOAD   = 0x03;
const OP_IMM    = 0x13;
const OP_AUIPC  = 0x17;
const OP_STORE  = 0x23;
const OP_REG    = 0x33;
const OP_LUI    = 0x37;
const OP_BRANCH = 0x63;
const OP_JALR   = 0x67;
const OP_JAL    = 0x6F;
const OP_SYSTEM = 0x73;

// Funct3 opcodes
const F3_JALR = 0;
const F3_BEQ  = 0;
const F3_BNE  = 1;
const F3_BLT  = 4;
const F3_BGE  = 5;
const F3_BLTU = 6;
const F3_BGEU = 7;
const F3_B    = 0;
const F3_H    = 1;
const F3_W    = 2;
const F3_BU   = 4;
const F3_HU   = 5;
const F3_ADD  = 0;
const F3_SL   = 1;
const F3_SLT  = 2;
const F3_SLTU = 3;
const F3_XOR  = 4;
const F3_SR   = 5;
const F3_OR   = 6;
const F3_AND  = 7;
const F3_MRET = 0;
const F3_ANY  = -1;

// Funct7 opcodes
const F7_L    = 0;
const F7_A    = 32;
const F7_MRET = 24;
const F7_ANY  = -1;

// Rs2/rs1/rd opcodes
const RS2_MRET = 2;
const RS2_ANY  = -1;

const RS1_MRET = 0;
const RS1_ANY  = -1;

const RD_MRET  = 0;
const RD_ANY   = -1;

const DECODE_TABLE = {
    lui   : [OP_LUI,    F3_ANY,  F7_ANY,  RS2_ANY,  RS1_ANY,  RD_ANY ],
    auipc : [OP_AUIPC,  F3_ANY,  F7_ANY,  RS2_ANY,  RS1_ANY,  RD_ANY ],
    jal   : [OP_JAL,    F3_ANY,  F7_ANY,  RS2_ANY,  RS1_ANY,  RD_ANY ],
    jalr  : [OP_JALR,   F3_JALR, F7_ANY,  RS2_ANY,  RS1_ANY,  RD_ANY ],
    beq   : [OP_BRANCH, F3_BEQ,  F7_ANY,  RS2_ANY,  RS1_ANY,  RD_ANY ],
    bne   : [OP_BRANCH, F3_BNE,  F7_ANY,  RS2_ANY,  RS1_ANY,  RD_ANY ],
    blt   : [OP_BRANCH, F3_BLT,  F7_ANY,  RS2_ANY,  RS1_ANY,  RD_ANY ],
    bge   : [OP_BRANCH, F3_BGE,  F7_ANY,  RS2_ANY,  RS1_ANY,  RD_ANY ],
    bltu  : [OP_BRANCH, F3_BLTU, F7_ANY,  RS2_ANY,  RS1_ANY,  RD_ANY ],
    bgeu  : [OP_BRANCH, F3_BGEU, F7_ANY,  RS2_ANY,  RS1_ANY,  RD_ANY ],
    lb    : [OP_LOAD,   F3_B,    F7_ANY,  RS2_ANY,  RS1_ANY,  RD_ANY ],
    lh    : [OP_LOAD,   F3_H,    F7_ANY,  RS2_ANY,  RS1_ANY,  RD_ANY ],
    lw    : [OP_LOAD,   F3_W,    F7_ANY,  RS2_ANY,  RS1_ANY,  RD_ANY ],
    lbu   : [OP_LOAD,   F3_BU,   F7_ANY,  RS2_ANY,  RS1_ANY,  RD_ANY ],
    lhu   : [OP_LOAD,   F3_HU,   F7_ANY,  RS2_ANY,  RS1_ANY,  RD_ANY ],
    sb    : [OP_STORE,  F3_B,    F7_ANY,  RS2_ANY,  RS1_ANY,  RD_ANY ],
    sh    : [OP_STORE,  F3_H,    F7_ANY,  RS2_ANY,  RS1_ANY,  RD_ANY ],
    sw    : [OP_STORE,  F3_W,    F7_ANY,  RS2_ANY,  RS1_ANY,  RD_ANY ],
    addi  : [OP_IMM,    F3_ADD,  F7_ANY,  RS2_ANY,  RS1_ANY,  RD_ANY ],
    slli  : [OP_IMM,    F3_SL,   F7_L,    RS2_ANY,  RS1_ANY,  RD_ANY ],
    slti  : [OP_IMM,    F3_SLT,  F7_ANY,  RS2_ANY,  RS1_ANY,  RD_ANY ],
    sltiu : [OP_IMM,    F3_SLTU, F7_ANY,  RS2_ANY,  RS1_ANY,  RD_ANY ],
    xori  : [OP_IMM,    F3_XOR,  F7_ANY,  RS2_ANY,  RS1_ANY,  RD_ANY ],
    srli  : [OP_IMM,    F3_SR,   F7_L,    RS2_ANY,  RS1_ANY,  RD_ANY ],
    srai  : [OP_IMM,    F3_SR,   F7_A,    RS2_ANY,  RS1_ANY,  RD_ANY ],
    ori   : [OP_IMM,    F3_OR,   F7_ANY,  RS2_ANY,  RS1_ANY,  RD_ANY ],
    andi  : [OP_IMM,    F3_AND,  F7_ANY,  RS2_ANY,  RS1_ANY,  RD_ANY ],
    add   : [OP_REG,    F3_ADD,  F7_L,    RS2_ANY,  RS1_ANY,  RD_ANY ],
    sub   : [OP_REG,    F3_ADD,  F7_A,    RS2_ANY,  RS1_ANY,  RD_ANY ],
    sll   : [OP_REG,    F3_SL,   F7_L,    RS2_ANY,  RS1_ANY,  RD_ANY ],
    slt   : [OP_REG,    F3_SLT,  F7_L,    RS2_ANY,  RS1_ANY,  RD_ANY ],
    sltu  : [OP_REG,    F3_SLTU, F7_L,    RS2_ANY,  RS1_ANY,  RD_ANY ],
    xor   : [OP_REG,    F3_XOR,  F7_L,    RS2_ANY,  RS1_ANY,  RD_ANY ],
    srl   : [OP_REG,    F3_SR,   F7_L,    RS2_ANY,  RS1_ANY,  RD_ANY ],
    sra   : [OP_REG,    F3_SR,   F7_A,    RS2_ANY,  RS1_ANY,  RD_ANY ],
    or    : [OP_REG,    F3_OR,   F7_L,    RS2_ANY,  RS1_ANY,  RD_ANY ],
    and   : [OP_REG,    F3_ADD,  F7_L,    RS2_ANY,  RS1_ANY,  RD_ANY ],
    mret  : [OP_SYSTEM, F3_MRET, F7_MRET, RS2_MRET, RS1_MRET, RD_MRET]
};

const ACTION_TABLE = {
    //         a     b      r       x[rd]* branch
    //                              mem
    lui     : ["-",  "imm", "b",    "r",   "-"],
    auipc   : ["pc", "imm", "add",  "r",   "-"],
    jal     : ["pc", "imm", "add",  "pc+", "al"],
    jalr    : ["x1", "imm", "add",  "pc+", "al"],
    beq     : ["pc", "imm", "add",  "-",   "eq"],
    bne     : ["pc", "imm", "add",  "-",   "ne"],
    blt     : ["pc", "imm", "add",  "-",   "lt"],
    bge     : ["pc", "imm", "add",  "-",   "ge"],
    bltu    : ["pc", "imm", "add",  "-",   "ltu"],
    bgeu    : ["pc", "imm", "add",  "-",   "geu"],
    lb      : ["x1", "imm", "add",  "lb",  "-"],
    lh      : ["x1", "imm", "add",  "lh",  "-"],
    lw      : ["x1", "imm", "add",  "lw",  "-"],
    lbu     : ["x1", "imm", "add",  "lbu", "-"],
    lhu     : ["x1", "imm", "add",  "lhu", "-"],
    sb      : ["x1", "imm", "add",  "sb",  "-"],
    sh      : ["x1", "imm", "add",  "sh",  "-"],
    sw      : ["x1", "imm", "add",  "sw",  "-"],
    addi    : ["x1", "imm", "add",  "r",   "-"],
    slli    : ["x1", "imm", "sll",  "r",   "-"],
    slti    : ["x1", "imm", "slt",  "r",   "-"],
    sltiu   : ["x1", "imm", "sltu", "r",   "-"],
    xori    : ["x1", "imm", "xor",  "r",   "-"],
    srli    : ["x1", "imm", "srl",  "r",   "-"],
    srai    : ["x1", "imm", "sra",  "r",   "-"],
    ori     : ["x1", "imm", "or",   "r",   "-"],
    andi    : ["x1", "imm", "and",  "r",   "-"],
    add     : ["x1", "x2",  "add",  "r",   "-"],
    sub     : ["x1", "x2",  "sub",  "r",   "-"],
    sll     : ["x1", "x2",  "sll",  "r",   "-"],
    slt     : ["x1", "x2",  "slt",  "r",   "-"],
    sltu    : ["x1", "x2",  "sltu", "r",   "-"],
    xor     : ["x1", "x2",  "xor",  "r",   "-"],
    srl     : ["x1", "x2",  "srl",  "r",   "-"],
    sra     : ["x1", "x2",  "sra",  "r",   "-"],
    or      : ["x1", "x2",  "or",   "r",   "-"],
    and     : ["x1", "x2",  "and",  "r",   "-"],
    mret    : ["-",  "-",   "-",    "-",   "-"],
    invalid : ["-",  "-",   "-",    "-",   "-"]
};

export function getSlice(word, left, right, signed=false) {
    // Précondition : 0 <= right <= left < 32

    // Aligner le bit de gauche à conserver sur le bit 31.
    // Cette opération élimine les bits à gauche de left.
    const sl = 31 - left;
    word <<= sl;
    right += sl;
    // Aligner le bit de droite à conserver sur le bit 0.
    // Cette opération élimine les bits à droite de right.
    // Effectuer une extension de bit de signe si nécessaire.
    return signed ? i32.s(word >> right) : i32.u(word >>> right);
}

export function decode(word) {
    // Extraire les champs de l'instruction.
    const opcode = getSlice(word, 6,  0);
    const rd     = getSlice(word, 11, 7);
    const funct3 = getSlice(word, 14, 12);
    const rs1    = getSlice(word, 19, 15);
    const rs2    = getSlice(word, 24, 20);
    const funct7 = getSlice(word, 31, 25);

    // Recomposer la valeur immédiate.
    let imm = 0;

    switch (opcode) {
        // Format: I
        case OP_LOAD:
        case OP_IMM:
        case OP_JALR:
        case OP_SYSTEM:
            imm = getSlice(word, 31, 20, true);
            break;

        // Format: S
        case OP_STORE:
            imm = getSlice(word, 31, 25, true) << 5
                | getSlice(word, 11, 7);
            break;

        // Format: B
        case OP_BRANCH:
            imm = getSlice(word, 31, 31, true)  << 12
                | getSlice(word, 7,  7)         << 11
                | getSlice(word, 30, 25)        << 5
                | getSlice(word, 11, 8)         << 1;
            break;

        // Format: U
        case OP_AUIPC:
        case OP_LUI:
            imm = getSlice(word, 31, 12, true) << 12;
            break;

        // Format: J
        case OP_JAL:
            imm = getSlice(word, 31, 31, true) << 20
                | getSlice(word, 19, 12)       << 12
                | getSlice(word, 20, 20)       << 11
                | getSlice(word, 30, 21)       << 1;
    }

    // Trouver le nom de l'instruction.
    const row = [opcode, funct3, funct7, rs2, rs1, rd];
    const name = Object.keys(DECODE_TABLE).find(name =>
        DECODE_TABLE[name].every((v, i) => v < 0 || v === row[i])
    ) || "invalid";
    return {name, rd, rs1, rs2, imm, actions: ACTION_TABLE[name], raw: word};
}
