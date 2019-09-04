
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

// Funct7 opcodes
const F7_L    = 0;
const F7_A    = 32;
const F7_MRET = 24;

// Rs2/rs1/rd opcodes
const RS2_MRET = 2;
const RS1_MRET = 0;
const RD_MRET  = 0;

const FIELDS = {
    opcode : [6,  0],
    funct3 : [14, 12],
    funct7 : [31, 25],
    rs2    : [24, 20],
    rs1    : [19, 15],
    rd     : [11, 7],
};

const OPCODE_TO_FORMAT_TABLE = {
    [OP_LOAD]   : "I",
    [OP_IMM]    : "I",
    [OP_JALR]   : "I",
    [OP_SYSTEM] : "I",
    [OP_STORE]  : "S",
    [OP_BRANCH] : "B",
    [OP_AUIPC]  : "U",
    [OP_LUI]    : "U",
    [OP_JAL]    : "J",
};

const IMM_FORMAT_TABLE = {
    I : [[31, 20, 0 ]                                         ],
    S : [[31, 25, 5 ], [11, 7, 0  ]                           ],
    B : [[31, 31, 12], [7 , 7, 11 ], [30, 25, 5 ], [11, 8 , 1]],
    U : [[31, 12, 12]                                         ],
    J : [[31, 31, 20], [19, 12, 12], [20, 20, 11], [30, 21, 1]],
};

const DECODE_TABLE = {
    lui   : [OP_LUI],
    auipc : [OP_AUIPC],
    jal   : [OP_JAL],
    jalr  : [OP_JALR  , F3_JALR],
    beq   : [OP_BRANCH, F3_BEQ],
    bne   : [OP_BRANCH, F3_BNE],
    blt   : [OP_BRANCH, F3_BLT],
    bge   : [OP_BRANCH, F3_BGE],
    bltu  : [OP_BRANCH, F3_BLTU],
    bgeu  : [OP_BRANCH, F3_BGEU],
    lb    : [OP_LOAD  , F3_B],
    lh    : [OP_LOAD  , F3_H],
    lw    : [OP_LOAD  , F3_W],
    lbu   : [OP_LOAD  , F3_BU],
    lhu   : [OP_LOAD  , F3_HU],
    sb    : [OP_STORE , F3_B],
    sh    : [OP_STORE , F3_H],
    sw    : [OP_STORE , F3_W],
    addi  : [OP_IMM   , F3_ADD],
    slli  : [OP_IMM   , F3_SL  , F7_L],
    slti  : [OP_IMM   , F3_SLT],
    sltiu : [OP_IMM   , F3_SLTU],
    xori  : [OP_IMM   , F3_XOR],
    srli  : [OP_IMM   , F3_SR  , F7_L],
    srai  : [OP_IMM   , F3_SR  , F7_A],
    ori   : [OP_IMM   , F3_OR],
    andi  : [OP_IMM   , F3_AND],
    add   : [OP_REG   , F3_ADD , F7_L],
    sub   : [OP_REG   , F3_ADD , F7_A],
    sll   : [OP_REG   , F3_SL  , F7_L],
    slt   : [OP_REG   , F3_SLT , F7_L],
    sltu  : [OP_REG   , F3_SLTU, F7_L],
    xor   : [OP_REG   , F3_XOR , F7_L],
    srl   : [OP_REG   , F3_SR  , F7_L],
    sra   : [OP_REG   , F3_SR  , F7_A],
    or    : [OP_REG   , F3_OR  , F7_L],
    and   : [OP_REG   , F3_ADD , F7_L],
    mret  : [OP_SYSTEM, F3_MRET, F7_MRET, RS2_MRET, RS1_MRET, RD_MRET]
};

const ACTION_TABLE = {
    //         src1  src2   aluOp   wbMem  branch
    lui     : [    , "imm", "b"   , "r"  ,      ],
    auipc   : ["pc", "imm", "add" , "r"  ,      ],
    jal     : ["pc", "imm", "add" , "pc+", "al" ],
    jalr    : ["x1", "imm", "add" , "pc+", "al" ],
    beq     : ["pc", "imm", "add" ,      , "eq" ],
    bne     : ["pc", "imm", "add" ,      , "ne" ],
    blt     : ["pc", "imm", "add" ,      , "lt" ],
    bge     : ["pc", "imm", "add" ,      , "ge" ],
    bltu    : ["pc", "imm", "add" ,      , "ltu"],
    bgeu    : ["pc", "imm", "add" ,      , "geu"],
    lb      : ["x1", "imm", "add" , "lb" ,      ],
    lh      : ["x1", "imm", "add" , "lh" ,      ],
    lw      : ["x1", "imm", "add" , "lw" ,      ],
    lbu     : ["x1", "imm", "add" , "lbu",      ],
    lhu     : ["x1", "imm", "add" , "lhu",      ],
    sb      : ["x1", "imm", "add" , "sb" ,      ],
    sh      : ["x1", "imm", "add" , "sh" ,      ],
    sw      : ["x1", "imm", "add" , "sw" ,      ],
    addi    : ["x1", "imm", "add" , "r"  ,      ],
    slli    : ["x1", "imm", "sll" , "r"  ,      ],
    slti    : ["x1", "imm", "slt" , "r"  ,      ],
    sltiu   : ["x1", "imm", "sltu", "r"  ,      ],
    xori    : ["x1", "imm", "xor" , "r"  ,      ],
    srli    : ["x1", "imm", "srl" , "r"  ,      ],
    srai    : ["x1", "imm", "sra" , "r"  ,      ],
    ori     : ["x1", "imm", "or"  , "r"  ,      ],
    andi    : ["x1", "imm", "and" , "r"  ,      ],
    add     : ["x1", "x2" , "add" , "r"  ,      ],
    sub     : ["x1", "x2" , "sub" , "r"  ,      ],
    sll     : ["x1", "x2" , "sll" , "r"  ,      ],
    slt     : ["x1", "x2" , "slt" , "r"  ,      ],
    sltu    : ["x1", "x2" , "sltu", "r"  ,      ],
    xor     : ["x1", "x2" , "xor" , "r"  ,      ],
    srl     : ["x1", "x2" , "srl" , "r"  ,      ],
    sra     : ["x1", "x2" , "sra" , "r"  ,      ],
    or      : ["x1", "x2" , "or"  , "r"  ,      ],
    and     : ["x1", "x2" , "and" , "r"  ,      ],
    mret    : [    ,      ,       ,      ,      ],
    invalid : [    ,      ,       ,      ,      ],
};

function decodeFields(word) {
    const res = {};
    for (let [key, [left, right]] of Object.entries(FIELDS)) {
        res[key] = i32.getSlice(word, left, right);
    }
    return res;
}

function decodeImmediate(opcode, word) {
    if (!(opcode in OPCODE_TO_FORMAT_TABLE)) {
        return 0;
    }

    const fmt    = OPCODE_TO_FORMAT_TABLE[opcode];
    const slices = IMM_FORMAT_TABLE[fmt];

    let signed   = true;
    let res      = 0;
    for (let [left, right, pos] of slices) {
        res   |= i32.getSlice(word, left, right, pos, signed);
        signed = false;
    }

    return res;
}

function encodeImmediate(opcode, word) {
    if (!(opcode in OPCODE_TO_FORMAT_TABLE)) {
        return 0;
    }

    const fmt    = OPCODE_TO_FORMAT_TABLE[opcode];
    const slices = IMM_FORMAT_TABLE[fmt];

    let res = 0;
    for (let [left, right, pos] of slices) {
        res |= i32.getSlice(word, left - right + pos, pos, right);
    }

    return res;
}

const cache = {};

export function fromWord(word) {
    // if (word in cache) {
    //     return cache[word];
    // }

    // Extraire les champs de l'instruction.
    const {opcode, funct3, funct7, rs2, rs1, rd} = decodeFields(word);
    const imm = decodeImmediate(opcode, word);

    // Trouver le nom de l'instruction.
    const row = [opcode, funct3, funct7, rs2, rs1, rd];
    const name = Object.keys(DECODE_TABLE).find(name =>
            DECODE_TABLE[name].every((v, i) => v === row[i])
        ) || "invalid";

    // Trouver les actions associées à l'instruction.
    const [src1, src2, aluOp, wbMem, branch] = ACTION_TABLE[name];

    const res = {
        name, raw: word,
        rd, rs1, rs2, imm,
        src1, src2, aluOp, wbMem, branch
    };

    // cache[word] = res;

    return res;
}

export function toWord(instr) {
    let res = 0;
    const fields = DECODE_TABLE[instr.name] || [];
    Object.entries(FIELDS).forEach(([fieldName, [l, r]], i) => {
        const v = fields[i] || instr[fieldName] || 0;
        res |= i32.getSlice(v, l - r, 0, r);
    });
    if (fields.length) {
        res |= encodeImmediate(fields[0], instr.imm);
    }
    return res;
}
