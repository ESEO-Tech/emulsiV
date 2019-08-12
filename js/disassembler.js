
import * as i32     from "./i32.js";

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
};

export function toAssembly({name, rd, rs1, rs2, imm}) {
    const reg = (n) => "x" + n;
    const ival = Math.abs(imm) > 32768 ? `0x${i32.toHex(imm)}` : i32.s(imm);

    const operands = ASM_TABLE[name].split("").map(c => {
        switch (c) {
            case "d": return reg(rd);
            case "1": return reg(rs1);
            case "2": return reg(rs2);
            case "i": return ival;
            case "a": return `${imm}(${reg(rs1)})`;
        }
    })
    if (operands.length) {
        return name + " " + operands.join(", ");
    }
    return name;
}
