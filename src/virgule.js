
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
    mret    : {                                                                   },
    invalid : {                                                                   },
};

export class Processor {
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

        this.pc             = 0;
        this.mepc           = 0;
        this.fetchData      = 0;
        this.fetchError     = false;
        this.decode();
        this.x1             = 0;
        this.x2             = 0;
        this.aluResult      = 0;
        this.branchTaken    = false;
        this.loadData       = 0;
        this.loadStoreError = false;
        this.state          = "fetch";
    }

    fetch() {
        this.fetchData  = this.bus.read(this.pc, 4, false);
        this.fetchError = this.bus.error;
        this.state      = "decode";
    }

    decode() {
        this.instr    = decode(this.fetchData);
        this.datapath = ACTION_TABLE[this.instr.name];
        this.state    = this.datapath.aluOp ? "compute" : "updatePC";
    }

    compute() {
        // Read registers.
        this.x1 = this.getX(this.instr.rs1);
        this.x2 = this.getX(this.instr.rs2);

        // Select ALU operand A
        let a = 0;
        switch (this.datapath.src1) {
            case "pc": a = this.pc; break;
            case "x1": a = this.x1; break;
        }

        // Select ALU operand B
        let b = 0;
        switch (this.datapath.src2) {
            case "imm": b = this.instr.imm; break;
            case "x2":  b = this.x2;        break;
        }

        // Perform ALU operation
        this.aluResult = 0;
        switch (this.datapath.aluOp) {
            case "b":    this.aluResult = b;                                 break;
            case "add":  this.aluResult = signed(a + b);                     break;
            case "sll":  this.aluResult = a << unsignedSlice(b, 4, 0);       break;
            case "slt":  this.aluResult = signed(a) < signed(b) ? 1 : 0;     break;
            case "sltu": this.aluResult = unsigned(a) < unsigned(b) ? 1 : 0; break;
            case "xor":  this.aluResult = a ^ b  ;                           break;
            case "srl":  this.aluResult = a >>> unsignedSlice(b, 4, 0);      break;
            case "sra":  this.aluResult = a >>  unsignedSlice(b, 4, 0);      break;
            case "or":   this.aluResult = a | b;                             break;
            case "and":  this.aluResult = a & b;                             break;
            case "sub":  this.aluResult = signed(a - b);                     break;
        }

        this.branchTaken = this.datapath.branch && this.datapath.branch === "al";

        if (this.datapath.branch && this.datapath.branch !== "al") {
            this.state = "compare";
        }
        else if (this.datapath.wbMem !== "r" && this.datapath.wbMem !== "pc+" || this.instr.rd) {
            this.state = "loadStoreWriteBack";
        }
        else {
            this.state = "updatePC";
        }
    }

    compare() {
        switch (this.datapath.branch) {
            case "eq":  this.branchTaken = this.x1 === this.x2;                    break;
            case "ne":  this.branchTaken = this.x1 !== this.x2;                    break;
            case "lt":  this.branchTaken = this.x1 <   this.x2;                    break;
            case "ge":  this.branchTaken = this.x1 >=  this.x2;                    break;
            case "ltu": this.branchTaken = unsigned(this.x1) <  unsigned(this.x2); break;
            case "geu": this.branchTaken = unsigned(this.x1) >= unsigned(this.x2); break;
            default   : this.branchTaken = false;
        }

        this.state = "updatePC";
    }

    loadStoreWriteBack() {
        this.loadData = 0;
        switch (this.datapath.wbMem) {
            case "r":   this.setX(this.instr.rd, this.aluResult);                                                         break;
            case "pc+": this.setX(this.instr.rd, this.pcNext);                                                            break;
            case "lb":  this.loadData = this.bus.read(this.aluResult, 1, true);  this.setX(this.instr.rd, this.loadData); break;
            case "lh":  this.loadData = this.bus.read(this.aluResult, 2, true);  this.setX(this.instr.rd, this.loadData); break;
            case "lw":  this.loadData = this.bus.read(this.aluResult, 4, true);  this.setX(this.instr.rd, this.loadData); break;
            case "lbu": this.loadData = this.bus.read(this.aluResult, 1, false); this.setX(this.instr.rd, this.loadData); break;
            case "lhu": this.loadData = this.bus.read(this.aluResult, 2, false); this.setX(this.instr.rd, this.loadData); break;
            case "sb":  this.bus.write(this.aluResult, 1, this.x2);                                                       break;
            case "sh":  this.bus.write(this.aluResult, 2, this.x2);                                                       break;
            case "sw":  this.bus.write(this.aluResult, 4, this.x2);                                                       break;
        }

        this.loadStoreError = this.datapath.wbMem                                                &&
                              (this.datapath.wbMem[0] === 'l' || this.datapath.wbMem[0] === 's') &&
                              this.bus.error;
        this.state = "updatePC";
    }

    get pcNext() {
        return unsigned(this.pc + 4);
    }

    updatePC() {
        this.acceptingIrq = this.bus.irq() && !this.irqState;
        if (this.acceptingIrq) {
            this.mepc = this.branchTaken ? this.aluResult : this.pcNext;
            this.setPc(4);
            this.irqState = true;
        }
        else if (this.instr.name === "mret") {
            this.setPc(this.mepc);
            this.irqState = false;
        }
        else if (this.branchTaken) {
            this.setPc(this.aluResult);
        }
        else {
            this.setPc(this.pcNext);
        }

        this.state  = "fetch";
    }

    step() {
        this[this.state]();
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
