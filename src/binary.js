
import {signedSlice, unsignedSlice, unsigned} from "./int32.js";

// Base opcodes.
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

// Funct3 opcodes.
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

// Funct7 opcodes.
const F7_L    = 0;
const F7_A    = 32;
const F7_MRET = 24;

// Rs2/Rs1/Rd fixed values.
const RS2_MRET = 2;
const RS1_MRET = 0;
const RD_MRET  = 0;

// Instruction field definitions.
// Keep them in this order for compatibility with INSTR_NAME_TO_FIELDS.
const FIELD_NAME_TO_SLICE = {
    opcode : [6,  0],
    funct3 : [14, 12],
    funct7 : [31, 25],
    rs2    : [24, 20],
    rs1    : [19, 15],
    rd     : [11, 7],
};

function decodeFields(word) {
    const res = {};
    for (let [key, [left, right]] of Object.entries(FIELD_NAME_TO_SLICE)) {
        res[key] = unsignedSlice(word, left, right);
    }
    return res;
}

// Instruction immediate format for each base opcode.
const OPCODE_TO_FORMAT = {
    [OP_REG]    : "R",
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

// Slices of the instruction word for each immediate format.
// Format H corresponds to immediate shift instructions.
const FORMAT_TO_IMM_SLICES = {
    I : [[31, 20, 0 ]                                         ],
    S : [[31, 25, 5 ], [11, 7, 0  ]                           ],
    B : [[31, 31, 12], [7 , 7, 11 ], [30, 25, 5 ], [11, 8 , 1]],
    U : [[31, 12, 12]                                         ],
    J : [[31, 31, 20], [19, 12, 12], [20, 20, 11], [30, 21, 1]],
};

function decodeImmediate({opcode, format, funct3, rs2, word}) {
    if (opcode === OP_IMM && (funct3 === F3_SL || funct3 === F3_SR)) {
        return rs2;
    }

    if (!(format in FORMAT_TO_IMM_SLICES)) {
        return 0;
    }

    const slices = FORMAT_TO_IMM_SLICES[format];

    let slicer = signedSlice;
    let res    = 0;
    for (let [left, right, pos] of slices) {
        res   |= slicer(word, left, right, pos);
        slicer = unsignedSlice;
    }

    return res;
}

function encodeImmediate(opcode, word) {
    if (!(opcode in OPCODE_TO_FORMAT)) {
        return 0;
    }

    const fmt    = OPCODE_TO_FORMAT[opcode];
    if (!(fmt in FORMAT_TO_IMM_SLICES)) {
        return 0;
    }

    const slices = FORMAT_TO_IMM_SLICES[fmt];

    let res = 0;
    for (let [left, right, pos] of slices) {
        res |= unsignedSlice(word, left - right + pos, pos, right);
    }

    return res;
}

// Map instruction names to fixed field values.
const INSTR_NAME_TO_FIELDS = {
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
    and   : [OP_REG   , F3_AND , F7_L],
    mret  : [OP_SYSTEM, F3_MRET, F7_MRET, RS2_MRET, RS1_MRET, RD_MRET]
};

// Reverse INSTR_NAME_TO_FIELDS into a tree to decode field values.
// Use hash maps instead of plain objects to avoid converting numeric keys
// to strings.
function addToTree(tree, name, path, index) {
    const fieldValue = path[index];
    if (index === path.length - 1) {
        tree.set(fieldValue, name);
    }
    else {
        if (!tree.has(fieldValue)) {
            tree.set(fieldValue, new Map());
        }
        addToTree(tree.get(fieldValue), name, path, index + 1);
    }
}

const FIELDS_TO_INSTR_NAME = new Map();
for (let [name, path] of Object.entries(INSTR_NAME_TO_FIELDS)) {
    addToTree(FIELDS_TO_INSTR_NAME, name, path, 0);
}

export function decode(word) {
    const fields = decodeFields(word);

    let tree = FIELDS_TO_INSTR_NAME;
    for (let fieldValue of Object.values(fields)) {
        tree = tree.get(fieldValue) || "invalid";
        if (!(tree instanceof Map)) {
            break;
        }
    }

    fields.name   = tree;
    fields.word   = word;
    fields.format = OPCODE_TO_FORMAT[fields.opcode] || "";
    fields.imm    = decodeImmediate(fields);
    return fields;
}

export function encode(instr) {
    let res = 0;
    const fields = INSTR_NAME_TO_FIELDS[instr.name] || [];
    Object.entries(FIELD_NAME_TO_SLICE).forEach(([fieldName, [left, right]], index) => {
        const fieldValue = fields[index] || instr[fieldName] || 0;
        res |= unsignedSlice(fieldValue, left - right, 0, right);
    });
    if (fields.length) {
        res |= encodeImmediate(fields[0], instr.imm);
    }
    return unsigned(res);
}
