
import {decode} from "./binary.js";
import * as int32 from "./int32.js";

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
        const [src1, src2, aluOp, wbMem, branch] = ACTION_TABLE[instr.name];


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
            case "b":    r = b;                           break;
            case "add":  r = int32.signed(a + b);                break;
            case "sll":  r = a << b;                      break;
            case "slt":  r = int32.signed(a) < int32.signed(b) ? 1 : 0; break;
            case "sltu": r = int32.unsigned(a) < int32.unsigned(b) ? 1 : 0; break;
            case "xor":  r = a ^   b;                     break;
            case "srl":  r = a >>> b;                     break;
            case "sra":  r = a >>  b;                     break;
            case "or":   r = a |   b;                     break;
            case "and":  r = a &   b;                     break;
            case "sub":  r = int32.signed(a - b);                break;
        }

        // Branch condition
        let taken = false;
        switch (branch) {
            case "al":  taken = true;                   break;
            case "eq":  taken = x1 === x2;              break;
            case "ne":  taken = x1 !== x2;              break;
            case "lt":  taken = x1 <   x2;              break;
            case "ge":  taken = x1 >=  x2;              break;
            case "ltu": taken = int32.unsigned(x1) <  int32.unsigned(x2); break;
            case "geu": taken = int32.unsigned(x1) >= int32.unsigned(x2); break;
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
            this.x[index] = int32.signed(value);
        }
    }

    getX(index) {
        if (index > 0 && index < this.x.length) {
            return this.x[index];
        }
        return 0;
    }

    setPc(value) {
        this.pc = int32.unsigned(value & ~3);
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
        address = int32.unsigned(address);
        return this.devices.filter(dev => dev.accepts(address, size));
    }

    read(address, size, signed) {
        address = int32.unsigned(address);
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
        this.firstAddress = int32.unsigned(firstAddress);
        this.lastAddress  = int32.unsigned(firstAddress + size - 1);
    }

    reset() {
        // Abstract
    }

    accepts(address, size) {
        return address >= this.firstAddress && int32.unsigned(address + size - 1) <= this.lastAddress;
    }

    read(address, size, signed) {
        const raw = this.localRead(int32.unsigned(address - this.firstAddress), size);
        return signed ? int32.signedSlice(raw, size * 8 - 1, 0) :
                        int32.unsignedSlice(raw, size * 8 - 1, 0);
    }

    write(address, size, value) {
        this.localWrite(int32.unsigned(address - this.firstAddress), size, value);
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
            this.data[address + i] = int32.unsignedSlice(value, 8 * i + 7, 8 * i);
        }
    }
}
