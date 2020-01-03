
import {encode, decode} from "../src/binary.js"

function testInstruction({label, word, fields}) {
    it(`decodes instruction: ${label}`, () => {
        const result = decode(word);
        for (let key in fields) {
            chai.assert.strictEqual(result[key], fields[key]);
        }
    });
    if (fields.name !== "invalid") {
        it(`encodes instruction: ${label}`, () => {
            chai.assert.equal(encode(fields), word);
        });
    }
}

const testData = [
    {label: "lui x1, 0",                word: 0x000000b7, fields: {name: "lui",     rd: 1,                    imm: 0    }},
    {label: "lui x2, 0xfffff",          word: 0xfffff137, fields: {name: "lui",     rd: 2,                    imm: -4096}},
    {label: "auipc x3, 0",              word: 0x00000197, fields: {name: "auipc",   rd: 3,                    imm: 0    }},
    {label: "auipc x4, 0xfffff",        word: 0xfffff217, fields: {name: "auipc",   rd: 4,                    imm: -4096}},
    {label: "jal x5, 0",                word: 0x000002ef, fields: {name: "jal",     rd: 5,                    imm: 0    }},
    {label: "jal x6, -4",               word: 0xffdff36f, fields: {name: "jal",     rd: 6,                    imm: -4   }},
    {label: "jalr x7, x0, 0",           word: 0x000003e7, fields: {name: "jalr",    rd: 7,  rs1: 0,           imm: 0    }},
    {label: "jalr x8, x1, -4",          word: 0xffc08467, fields: {name: "jalr",    rd: 8,  rs1: 1,           imm: -4   }},
    {label: "beq x2, x1, 0",            word: 0x00110063, fields: {name: "beq",             rs1: 2,  rs2: 1,  imm: 0    }},
    {label: "bne x3, x2, -4",           word: 0xfe219ee3, fields: {name: "bne",             rs1: 3,  rs2: 2,  imm: -4   }},
    {label: "blt x4, x3, -8",           word: 0xfe324ce3, fields: {name: "blt",             rs1: 4,  rs2: 3,  imm: -8   }},
    {label: "bge x5, x4, -12",          word: 0xfe42dae3, fields: {name: "bge",             rs1: 5,  rs2: 4,  imm: -12  }},
    {label: "bltu x6, x5, -16",         word: 0xfe5368e3, fields: {name: "bltu",            rs1: 6,  rs2: 5,  imm: -16  }},
    {label: "bgeu x7, x6, -20",         word: 0xfe63f6e3, fields: {name: "bgeu",            rs1: 7,  rs2: 6,  imm: -20  }},
    {label: "lb x9, 0(x7)",             word: 0x00038483, fields: {name: "lb",      rd: 9,  rs1: 7,           imm: 0    }},
    {label: "lh x10, 2(x8)",            word: 0x00241503, fields: {name: "lh",      rd: 10, rs1: 8,           imm: 2    }},
    {label: "lw x11, 4(x9)",            word: 0x0044a583, fields: {name: "lw",      rd: 11, rs1: 9,           imm: 4    }},
    {label: "lbu x12, -1(x10)",         word: 0xfff54603, fields: {name: "lbu",     rd: 12, rs1: 10,          imm: -1   }},
    {label: "lhu x13, -2(x11)",         word: 0xffe5d683, fields: {name: "lhu",     rd: 13, rs1: 11,          imm: -2   }},
    {label: "sb x7, -4(x12)",           word: 0xfe760e23, fields: {name: "sb",              rs1: 12, rs2: 7,  imm: -4   }},
    {label: "sh x8, -6(x13)",           word: 0xfe869d23, fields: {name: "sh",              rs1: 13, rs2: 8,  imm: -6   }},
    {label: "sw x9, -8(x14)",           word: 0xfe972c23, fields: {name: "sw",              rs1: 14, rs2: 9,  imm: -8   }},
    {label: "addi x14, x15, 0",         word: 0x00078713, fields: {name: "addi",    rd: 14, rs1: 15,          imm: 0    }},
    {label: "addi x15, x0, -1",         word: 0xfff00793, fields: {name: "addi",    rd: 15, rs1: 0,           imm: -1   }},
    {label: "slli x1, x2, 0",           word: 0x00011093, fields: {name: "slli",    rd: 1,  rs1: 2,           imm: 0    }},
    {label: "slli x2, x3, 31",          word: 0x01f19113, fields: {name: "slli",    rd: 2,  rs1: 3,           imm: 31   }},
    {label: "slti x3, x4, 1",           word: 0x00122193, fields: {name: "slti",    rd: 3,  rs1: 4,           imm: 1    }},
    {label: "sltiu x4, x5, -2",         word: 0xffe2b213, fields: {name: "sltiu",   rd: 4,  rs1: 5,           imm: -2   }},
    {label: "xori x5, x6, 2",           word: 0x00234293, fields: {name: "xori",    rd: 5,  rs1: 6,           imm: 2    }},
    {label: "srli x6, x7, 0",           word: 0x0003d313, fields: {name: "srli",    rd: 6,  rs1: 7,           imm: 0    }},
    {label: "srli x7, x8, 31",          word: 0x01f45393, fields: {name: "srli",    rd: 7,  rs1: 8,           imm: 31   }},
    {label: "srai x8, x9, 0",           word: 0x4004d413, fields: {name: "srai",    rd: 8,  rs1: 9,           imm: 0  + 1024}},
    {label: "srai x9, x10, 31",         word: 0x41f55493, fields: {name: "srai",    rd: 9,  rs1: 10,          imm: 31 + 1024}},
    {label: "ori x10, x11, -3",         word: 0xffd5e513, fields: {name: "ori",     rd: 10, rs1: 11,          imm: -3   }},
    {label: "andi x11, x12, 3",         word: 0x00367593, fields: {name: "andi",    rd: 11, rs1: 12,          imm: 3    }},
    {label: "add x12, x13, x0",         word: 0x00068633, fields: {name: "add",     rd: 12, rs1: 13, rs2: 0             }},
    {label: "sub x13, x14, x1",         word: 0x401706b3, fields: {name: "sub",     rd: 13, rs1: 14, rs2: 1             }},
    {label: "sll x14, x15, x2",         word: 0x00279733, fields: {name: "sll",     rd: 14, rs1: 15, rs2: 2             }},
    {label: "slt x15, x0, x3",          word: 0x003027b3, fields: {name: "slt",     rd: 15, rs1: 0,  rs2: 3             }},
    {label: "sltu x0, x1, x4",          word: 0x0040b033, fields: {name: "sltu",    rd: 0,  rs1: 1,  rs2: 4             }},
    {label: "xor x1, x2, x5",           word: 0x005140b3, fields: {name: "xor",     rd: 1,  rs1: 2,  rs2: 5             }},
    {label: "srl x2, x3, x6",           word: 0x0061d133, fields: {name: "srl",     rd: 2,  rs1: 3,  rs2: 6             }},
    {label: "sra x3, x4, x7",           word: 0x407251b3, fields: {name: "sra",     rd: 3,  rs1: 4,  rs2: 7             }},
    {label: "or x4, x5, x8",            word: 0x0082e233, fields: {name: "or",      rd: 4,  rs1: 5,  rs2: 8             }},
    {label: "and x5, x6, x9",           word: 0x009372b3, fields: {name: "and",     rd: 5,  rs1: 6,  rs2: 9             }},
    {label: "mret",                     word: 0x30200073, fields: {name: "mret",    rd: 0,  rs1: 0,           imm: 0x302}},
    {label: "invalid (known opcode)",   word: 0x0000ff23, fields: {name: "invalid", rd: 30, rs1: 1,  rs2: 0,  imm: 30   }},
    {label: "invalid (unknown opcode)", word: 0x00000000, fields: {name: "invalid", rd: 0,  rs1: 0,  rs2: 0,  imm: 0    }},
];

// TODO test more instructions for better coverage of the instruction set.
describe("Module: binary", () => {
    for (let t of testData) {
        testInstruction(t);
    }
});
