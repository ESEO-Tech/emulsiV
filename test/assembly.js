
import {assemble, disassemble, disassemblePseudo} from "./src/assembly.js"

function testInstruction({asm, fields, dis=true, pseudo=false}) {
    if (!pseudo) {
        it(`assembles instruction: ${asm}`, () => {
            const result = assemble(asm);
            for (let key in fields) {
                chai.assert.strictEqual(result[key], fields[key]);
            }
        });
    }

    if (dis) {
        if (!pseudo) {
            it(`disassembles instruction: ${asm}`, () => {
                chai.assert.equal(disassemble(fields), asm);
            });
        }
        else {
            it(`disassembles pseudo-instruction: ${asm}`, () => {
                chai.assert.equal(disassemblePseudo(fields), asm);
            });
        }
    }
}

const testData = [
    {asm: "lui x1, 0",                fields: {name: "lui",     rd: 1,                    imm: 0    }},
    {asm: "lui x2, -4096",            fields: {name: "lui",     rd: 2,                    imm: -4096}},
    {asm: "auipc x3, 0",              fields: {name: "auipc",   rd: 3,                    imm: 0    }},
    {asm: "auipc x4, -4096",          fields: {name: "auipc",   rd: 4,                    imm: -4096}},
    {asm: "jal x5, 0",                fields: {name: "jal",     rd: 5,                    imm: 0    }},
    {asm: "jal x6, -4",               fields: {name: "jal",     rd: 6,                    imm: -4   }},
    {asm: "jalr x7, x0, 0",           fields: {name: "jalr",    rd: 7,  rs1: 0,           imm: 0    }},
    {asm: "jalr x8, x1, -4",          fields: {name: "jalr",    rd: 8,  rs1: 1,           imm: -4   }},
    {asm: "beq x2, x1, 0",            fields: {name: "beq",             rs1: 2,  rs2: 1,  imm: 0    }},
    {asm: "bne x3, x2, -4",           fields: {name: "bne",             rs1: 3,  rs2: 2,  imm: -4   }},
    {asm: "blt x4, x3, -8",           fields: {name: "blt",             rs1: 4,  rs2: 3,  imm: -8   }},
    {asm: "bge x5, x4, -12",          fields: {name: "bge",             rs1: 5,  rs2: 4,  imm: -12  }},
    {asm: "bltu x6, x5, -16",         fields: {name: "bltu",            rs1: 6,  rs2: 5,  imm: -16  }},
    {asm: "bgeu x7, x6, -20",         fields: {name: "bgeu",            rs1: 7,  rs2: 6,  imm: -20  }},
    {asm: "lb x9, 0(x7)",             fields: {name: "lb",      rd: 9,  rs1: 7,           imm: 0    }},
    {asm: "lh x10, 2(x8)",            fields: {name: "lh",      rd: 10, rs1: 8,           imm: 2    }},
    {asm: "lw x11, 4(x9)",            fields: {name: "lw",      rd: 11, rs1: 9,           imm: 4    }},
    {asm: "lbu x12, -1(x10)",         fields: {name: "lbu",     rd: 12, rs1: 10,          imm: -1   }},
    {asm: "lhu x13, -2(x11)",         fields: {name: "lhu",     rd: 13, rs1: 11,          imm: -2   }},
    {asm: "sb x7, -4(x12)",           fields: {name: "sb",              rs1: 12, rs2: 7,  imm: -4   }},
    {asm: "sh x8, -6(x13)",           fields: {name: "sh",              rs1: 13, rs2: 8,  imm: -6   }},
    {asm: "sw x9, -8(x14)",           fields: {name: "sw",              rs1: 14, rs2: 9,  imm: -8   }},
    {asm: "addi x14, x15, 0",         fields: {name: "addi",    rd: 14, rs1: 15,          imm: 0    }},
    {asm: "addi x15, x0, -1",         fields: {name: "addi",    rd: 15, rs1: 0,           imm: -1   }},
    {asm: "slli x1, x2, 0",           fields: {name: "slli",    rd: 1,  rs1: 2,           imm: 0    }},
    {asm: "slli x2, x3, 31",          fields: {name: "slli",    rd: 2,  rs1: 3,           imm: 31   }},
    {asm: "slti x3, x4, 1",           fields: {name: "slti",    rd: 3,  rs1: 4,           imm: 1    }},
    {asm: "sltiu x4, x5, -2",         fields: {name: "sltiu",   rd: 4,  rs1: 5,           imm: -2   }},
    {asm: "xori x5, x6, 2",           fields: {name: "xori",    rd: 5,  rs1: 6,           imm: 2    }},
    {asm: "srli x6, x7, 0",           fields: {name: "srli",    rd: 6,  rs1: 7,           imm: 0    }},
    {asm: "srli x7, x8, 31",          fields: {name: "srli",    rd: 7,  rs1: 8,           imm: 31   }},
    {asm: "srai x8, x9, 0",           fields: {name: "srai",    rd: 8,  rs1: 9,           imm: 0    }},
    {asm: "srai x9, x10, 31",         fields: {name: "srai",    rd: 9,  rs1: 10,          imm: 31   }},
    {asm: "ori x10, x11, -3",         fields: {name: "ori",     rd: 10, rs1: 11,          imm: -3   }},
    {asm: "andi x11, x12, 3",         fields: {name: "andi",    rd: 11, rs1: 12,          imm: 3    }},
    {asm: "add x12, x13, x0",         fields: {name: "add",     rd: 12, rs1: 13, rs2: 0             }},
    {asm: "sub x13, x14, x1",         fields: {name: "sub",     rd: 13, rs1: 14, rs2: 1             }},
    {asm: "sll x14, x15, x2",         fields: {name: "sll",     rd: 14, rs1: 15, rs2: 2             }},
    {asm: "slt x15, x0, x3",          fields: {name: "slt",     rd: 15, rs1: 0,  rs2: 3             }},
    {asm: "sltu x0, x1, x4",          fields: {name: "sltu",    rd: 0,  rs1: 1,  rs2: 4             }},
    {asm: "xor x1, x2, x5",           fields: {name: "xor",     rd: 1,  rs1: 2,  rs2: 5             }},
    {asm: "srl x2, x3, x6",           fields: {name: "srl",     rd: 2,  rs1: 3,  rs2: 6             }},
    {asm: "sra x3, x4, x7",           fields: {name: "sra",     rd: 3,  rs1: 4,  rs2: 7             }},
    {asm: "or x4, x5, x8",            fields: {name: "or",      rd: 4,  rs1: 5,  rs2: 8             }},
    {asm: "and x5, x6, x9",           fields: {name: "and",     rd: 5,  rs1: 6,  rs2: 9             }},
    {asm: "mret",                     fields: {name: "mret"                                         }},
    // Partial or invalid instructions are assembled with default fields.
    {asm: "lui",                      fields: {name: "lui",     rd: 0,                    imm: 0    }, dis: false},
    {asm: "lui x1, x2",               fields: {name: "lui",     rd: 1,                    imm: 0    }, dis: false},
    {asm: "jalr",                     fields: {name: "jalr",    rd: 0,  rs1: 0,           imm: 0    }, dis: false},
    {asm: "jalr x8, x1",              fields: {name: "jalr",    rd: 8,  rs1: 1,           imm: 0    }, dis: false},
    {asm: "jalr x8, x1, x4",          fields: {name: "jalr",    rd: 8,  rs1: 1,           imm: 0    }, dis: false},
    {asm: "lb",                       fields: {name: "lb",      rd: 0,  rs1: 0,           imm: 0    }, dis: false},
    {asm: "lb x9",                    fields: {name: "lb",      rd: 9,  rs1: 0,           imm: 0    }, dis: false},
    {asm: "lb x9, (x7)",              fields: {name: "lb",      rd: 9,  rs1: 7,           imm: 0    }, dis: false},
    {asm: "sb",                       fields: {name: "sb",              rs1: 0,  rs2: 0,  imm: 0    }, dis: false},
    {asm: "sb x9",                    fields: {name: "sb",              rs1: 0,  rs2: 9,  imm: 0    }, dis: false},
    {asm: "sb x9, (x7)",              fields: {name: "sb",              rs1: 7,  rs2: 9,  imm: 0    }, dis: false},
    {asm: "mret x1, 2",               fields: {name: "mret"                                         }, dis: false},
    {asm: "invalid",                  fields: {name: "invalid", rd: 0,  rs1: 0,  rs2: 0,  imm: 0    }, dis: false},
    // Pseudo-instructions.
    {asm: "nop",                      fields: {name: "addi",    rd: 0,  rs1: 0,           imm: 0    }, pseudo: true},
    {asm: "li x3, -1",                fields: {name: "addi",    rd: 3,  rs1: 0,           imm: -1   }, pseudo: true},
    {asm: "mv x4, x5",                fields: {name: "addi",    rd: 4,  rs1: 5,           imm: 0    }, pseudo: true},
    {asm: "not x5, x6",               fields: {name: "xori",    rd: 5,  rs1: 6,           imm: -1   }, pseudo: true},
    {asm: "neg x6, x7",               fields: {name: "sub",     rd: 6,  rs1: 0,  rs2: 7             }, pseudo: true},
    {asm: "seqz x7, x8",              fields: {name: "sltiu",   rd: 7,  rs1: 8,           imm: 1    }, pseudo: true},
    {asm: "snez x8, x9",              fields: {name: "sltu",    rd: 8,  rs1: 0,  rs2: 9              }, pseudo: true},
    {asm: "sgtz x9, x10",             fields: {name: "slt",     rd: 9,  rs1: 0,  rs2: 10             }, pseudo: true},
    {asm: "sltz x10, x11",            fields: {name: "slt",     rd: 10, rs1: 11, rs2: 0              }, pseudo: true},
    {asm: "beqz x12, -4",             fields: {name: "beq",             rs1: 12, rs2: 0,  imm: -4    }, pseudo: true},
    {asm: "bnez x13, +4",             fields: {name: "bne",             rs1: 13, rs2: 0,  imm: 4     }, pseudo: true},
    {asm: "blez x11, -8",             fields: {name: "bge",             rs1: 0,  rs2: 11, imm: -8    }, pseudo: true},
    {asm: "bltz x12, +8",             fields: {name: "blt",             rs1: 12, rs2: 0,  imm: 8     }, pseudo: true},
    {asm: "bgtz x12, -16",            fields: {name: "blt",             rs1: 0,  rs2: 12, imm: -16   }, pseudo: true},
    {asm: "j +16",                    fields: {name: "jal",     rd: 0,                    imm: 16    }, pseudo: true},
    {asm: "jal -20",                  fields: {name: "jal",     rd: 1,                    imm: -20   }, pseudo: true},
    {asm: "ret",                      fields: {name: "jalr",    rd: 0,  rs1: 1,           imm: 0     }, pseudo: true},
    {asm: "jr x13",                   fields: {name: "jalr",    rd: 0,  rs1: 13,          imm: 0     }, pseudo: true},
    {asm: "jalr x14",                 fields: {name: "jalr",    rd: 1,  rs1: 14,          imm: 0     }, pseudo: true},
];

describe("Module: assembly", () => {
    // Nominal case
    for (let t of testData) {
        testInstruction(t);
    }

    // Replace commas with spaces
    for (let t of testData) {
        const u = Object.create(t);
        u.asm = u.asm.replace(/\s*,\s*/g, " ");
        u.dis = false;
        testInstruction(u);
    }

    // Insert spaces
    for (let t of testData) {
        const u = Object.create(t);
        u.asm = "  " + u.asm.replace(/\s*([,()])\s*/g, "  $1  ") + "  ";
        u.dis = false;
        testInstruction(u);
    }
});
