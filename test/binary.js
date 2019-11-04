
import * as bin from "../src/binary.js"

function testInstruction(label, word, fields) {
    it(`decodes instruction: ${label}`, () => {
        const result = bin.decode(word);
        for (let key in fields) {
            chai.assert.strictEqual(result[key], fields[key]);
        }
    });
    if (fields.name !== "invalid") {
        it(`encodes instruction: ${label}`, () => {
            chai.assert.equal(bin.encode(fields), word);
        });
    }
}

// TODO test more instructions for better coverage of the instruction set.
describe("Module: binary", () => {
    testInstruction("mret", 0x030200073, {
        name  : "mret",
        rd    : 0,
        rs1   : 0,
        imm   : 0x302
    });

    testInstruction("andi x3, x1, 31", 0x01f0f193, {
        name : "andi",
        rd   : 3,
        rs1  : 1,
        imm  : 31
    });

    testInstruction("add x4, x5, x6", 0x00628233, {
        name : "add",
        rd   : 4,
        rs1  : 5,
        rs2  : 6
    });

    testInstruction("blt x1, x2, -48", 0xfc20c8e3, {
        name : "blt",
        rs1  : 1,
        rs2  : 2,
        imm  : -48
    });

    testInstruction("sw x7, 8(x2)", 0x00712423, {
        name : "sw",
        rs1  : 2,
        rs2  : 7,
        imm  : 8
    });

    testInstruction("invalid (known opcode)", 0x0000ff23, {
        name : "invalid",
        rd   : 30,
        rs1  : 1,
        rs2  : 0,
        imm  : 30
    });

    testInstruction("invalid (unknown opcode)", 0, {
        name : "invalid",
        rd   : 0,
        rs1  : 0,
        rs2  : 0,
        imm  : 0
    });
});
