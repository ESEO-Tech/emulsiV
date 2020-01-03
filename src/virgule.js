
import {decode} from "./binary.js";
import {signedSlice, unsignedSlice, signed, unsigned} from "./int32.js";

const ACTION_TABLE = {
    lui     : {            src2: "imm", aluOp: "b",    wbMem: "r"                 },
    auipc   : {src1: "pc", src2: "imm", aluOp: "add",  wbMem: "r"                 },
    jal     : {src1: "pc", src2: "imm", aluOp: "add",  wbMem: "pc+", branch: "al" },
    jalr    : {src1: "x1", src2: "imm", aluOp: "add",  wbMem: "pc+", branch: "al" },
    beq     : {src1: "pc", src2: "imm", aluOp: "add",                branch: "eq" },
    bne     : {src1: "pc", src2: "imm", aluOp: "add",                branch: "ne" },
    blt     : {src1: "pc", src2: "imm", aluOp: "add",                branch: "lt" },
    bge     : {src1: "pc", src2: "imm", aluOp: "add",                branch: "ge" },
    bltu    : {src1: "pc", src2: "imm", aluOp: "add",                branch: "ltu"},
    bgeu    : {src1: "pc", src2: "imm", aluOp: "add",                branch: "geu"},
    lb      : {src1: "x1", src2: "imm", aluOp: "add",  wbMem: "lb"                },
    lh      : {src1: "x1", src2: "imm", aluOp: "add",  wbMem: "lh"                },
    lw      : {src1: "x1", src2: "imm", aluOp: "add",  wbMem: "lw"                },
    lbu     : {src1: "x1", src2: "imm", aluOp: "add",  wbMem: "lbu"               },
    lhu     : {src1: "x1", src2: "imm", aluOp: "add",  wbMem: "lhu"               },
    sb      : {src1: "x1", src2: "imm", aluOp: "add",  wbMem: "sb"                },
    sh      : {src1: "x1", src2: "imm", aluOp: "add",  wbMem: "sh"                },
    sw      : {src1: "x1", src2: "imm", aluOp: "add",  wbMem: "sw"                },
    addi    : {src1: "x1", src2: "imm", aluOp: "add",  wbMem: "r"                 },
    slli    : {src1: "x1", src2: "imm", aluOp: "sll",  wbMem: "r"                 },
    slti    : {src1: "x1", src2: "imm", aluOp: "slt",  wbMem: "r"                 },
    sltiu   : {src1: "x1", src2: "imm", aluOp: "sltu", wbMem: "r"                 },
    xori    : {src1: "x1", src2: "imm", aluOp: "xor",  wbMem: "r"                 },
    srli    : {src1: "x1", src2: "imm", aluOp: "srl",  wbMem: "r"                 },
    srai    : {src1: "x1", src2: "imm", aluOp: "sra",  wbMem: "r"                 },
    ori     : {src1: "x1", src2: "imm", aluOp: "or",   wbMem: "r"                 },
    andi    : {src1: "x1", src2: "imm", aluOp: "and",  wbMem: "r"                 },
    add     : {src1: "x1", src2: "x2",  aluOp: "add",  wbMem: "r"                 },
    sub     : {src1: "x1", src2: "x2",  aluOp: "sub",  wbMem: "r"                 },
    sll     : {src1: "x1", src2: "x2",  aluOp: "sll",  wbMem: "r"                 },
    slt     : {src1: "x1", src2: "x2",  aluOp: "slt",  wbMem: "r"                 },
    sltu    : {src1: "x1", src2: "x2",  aluOp: "sltu", wbMem: "r"                 },
    xor     : {src1: "x1", src2: "x2",  aluOp: "xor",  wbMem: "r"                 },
    srl     : {src1: "x1", src2: "x2",  aluOp: "srl",  wbMem: "r"                 },
    sra     : {src1: "x1", src2: "x2",  aluOp: "sra",  wbMem: "r"                 },
    or      : {src1: "x1", src2: "x2",  aluOp: "or",   wbMem: "r"                 },
    and     : {src1: "x1", src2: "x2",  aluOp: "and",  wbMem: "r"                 },
    mret    : {},
    invalid : {},
};

export class Virgule {
    /*
     * Registres :
     *
     * x    : int32[]
     * pc   : uint32
     * mepc : uint32
     */

    constructor(nx, bus) {
        // Créer et initialiser la banque de registres.
        this.x = new Array(nx);
        this.bus = bus;
        this.reset();
    }

    reset() {
        for (let i = 0; i < this.x.length; i ++) {
            this.x[i] = 0;
        }

        this.pc   = 0;
        this.mepc = 0;
    }

    step() {
        const savedPc = this.pc;
        const incPc   = this.pc + 4;
        const irq     = this.bus.irq();

        // Fetch
        const word = this.bus.read(this.pc, 4, false);
        const fetchError = this.bus.error;

        // Decode
        const instr = decode(word);

        // Trouver les actions associées à l'instruction.
        const {src1, src2, aluOp, wbMem, branch} = ACTION_TABLE[instr.name];


        // Execute
        const x1 = this.getX(instr.rs1);
        const x2 = this.getX(instr.rs2);

        // ALU operand A
        let a = 0;
        switch (src1) {
            case "pc": a = this.pc; break;
            case "x1": a = x1;      break;
        }

        // ALU operand B
        let b = 0;
        switch (src2) {
            case "imm": b = instr.imm; break;
            case "x2":  b = x2;        break;
        }

        // ALU operation
        let r = 0;
        switch (aluOp) {
            case "b":    r = b;                                 break;
            case "add":  r = signed(a + b);                     break;
            case "sll":  r = a << unsignedSlice(b, 4, 0);       break;
            case "slt":  r = signed(a) < signed(b) ? 1 : 0;     break;
            case "sltu": r = unsigned(a) < unsigned(b) ? 1 : 0; break;
            case "xor":  r = a ^ b  ;                           break;
            case "srl":  r = a >>> unsignedSlice(b, 4, 0);      break;
            case "sra":  r = a >>  unsignedSlice(b, 4, 0);      break;
            case "or":   r = a | b;                             break;
            case "and":  r = a & b;                             break;
            case "sub":  r = signed(a - b);                     break;
        }

        // Branch condition
        let taken = false;
        switch (branch) {
            case "al":  taken = true;                   break;
            case "eq":  taken = x1 === x2;              break;
            case "ne":  taken = x1 !== x2;              break;
            case "lt":  taken = x1 <   x2;              break;
            case "ge":  taken = x1 >=  x2;              break;
            case "ltu": taken = unsigned(x1) <  unsigned(x2); break;
            case "geu": taken = unsigned(x1) >= unsigned(x2); break;
        }

        // Register/memory update
        let l = 0;
        switch (wbMem) {
            case "r":   this.setX(instr.rd, r);                                 break;
            case "pc+": this.setX(instr.rd, incPc);                             break;
            case "lb":  l = this.bus.read(r, 1, true);  this.setX(instr.rd, l); break;
            case "lh":  l = this.bus.read(r, 2, true);  this.setX(instr.rd, l); break;
            case "lw":  l = this.bus.read(r, 4, true);  this.setX(instr.rd, l); break;
            case "lbu": l = this.bus.read(r, 1, false); this.setX(instr.rd, l); break;
            case "lhu": l = this.bus.read(r, 2, false); this.setX(instr.rd, l); break;
            case "sb":  this.bus.write(r, 1, x2);                               break;
            case "sh":  this.bus.write(r, 2, x2);                               break;
            case "sw":  this.bus.write(r, 4, x2);                               break;
        }

        const loadStoreError = wbMem &&
                               (wbMem[0] === 'l' || wbMem[0] === 's') &&
                               this.bus.error;

        // Program counter update
        const enteringIrq = irq && !this.irqState;
        if (enteringIrq) {
            this.setPc(4);
            this.mepc = taken ? r : incPc;
            this.irqState = true;
        }
        else if (instr.name === "mret") {
            this.setPc(this.mepc);
            this.irqState = false;
        }
        else if (taken) {
            this.setPc(r);
        }
        else {
            this.setPc(incPc);
        }

        return {
            instr, src1, src2, aluOp, wbMem, branch,
            pc: savedPc, incPc, irq: enteringIrq,
            x1, x2, a, b, r, l, taken,
            fetchError, loadStoreError
        };
    }

    setX(index, value) {
        if (index > 0 && index < this.x.length) {
            this.x[index] = signed(value);
        }
    }

    getX(index) {
        if (index > 0 && index < this.x.length) {
            return this.x[index];
        }
        return 0;
    }

    setPc(value) {
        this.pc = unsigned(value & ~3);
    }
}

export class Bus {
    constructor() {
        this.devices = [];
        this.error = false;
    }

    reset() {
        for (let d of this.devices) {
            d.reset();
        }
    }

    addDevice(device) {
        this.devices.push(device);
    }

    getDevices(address, size) {
        address = unsigned(address);
        return this.devices.filter(dev => dev.accepts(address, size));
    }

    read(address, size, signed) {
        address = unsigned(address);
        const devices = this.getDevices(address, size);
        this.error = !devices.length;
        return this.error ? 0 : devices[0].read(address, size, signed);
    }

    write(address, size, value) {
        const devices = this.getDevices(address, size);
        this.error = !devices.length;
        for (let d of devices) {
            d.write(address, size, value);
        }
    }

    irq() {
        return this.devices.some(dev => dev.irq());
    }
}

export class Device {
    constructor(firstAddress, size) {
        this.size         = size;
        this.firstAddress = unsigned(firstAddress);
        this.lastAddress  = unsigned(firstAddress + size - 1);
    }

    reset() {
        // Abstract
    }

    accepts(address, size) {
        return address >= this.firstAddress && unsigned(address + size - 1) <= this.lastAddress;
    }

    read(address, size, signed) {
        const raw = this.localRead(unsigned(address - this.firstAddress), size);
        return signed ? signedSlice(raw, size * 8 - 1, 0) :
                        unsignedSlice(raw, size * 8 - 1, 0);
    }

    write(address, size, value) {
        this.localWrite(unsigned(address - this.firstAddress), size, value);
    }

    localRead(address, size) {
        // Abstract
        return 0;
    }

    localWrite(address, size, value) {
        // Abstract
    }

    hasData() {
        // Abstract
        return false;
    }

    getData() {
        // Abstract
        return 0;
    }

    irq() {
        return false;
    }
}

export class Memory extends Device {
    constructor(firstAddress, size) {
        super(firstAddress, size);
        this.data = new Uint8Array(size);
    }

    localRead(address, size) {
        let result = 0;
        for (let i = 0; i < size; i ++) {
            result |= this.data[address + i] << (8 * i);
        }
        return result;
    }

    localWrite(address, size, value) {
        for (let i = 0; i < size; i ++) {
            this.data[address + i] = unsignedSlice(value, 8 * i + 7, 8 * i);
        }
    }
}
