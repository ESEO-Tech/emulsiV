
import * as view    from "./view.js";
import * as hex     from "./hex.js";
import * as i32     from "./i32.js";
import {toAssembly} from "./disassembler.js";
import {decode}     from "./decoder.js";

const STEP_DELAY = 2500

export class Controller {
    constructor(cpu, mem, in_dev, out_dev) {
        this.cpu         = cpu;
        this.mem         = mem;
        this.in_dev      = in_dev;
        this.out_dev     = out_dev;
        this.running     = false;
        this.stepping    = false;
        this.stopRequest = false;
        view.init(mem.size);
        this.reset();
    }

    reset() {
        this.cpu.reset();

        view.reset();
        for (let i = 0; i < this.cpu.x.length; i ++) {
            view.simpleUpdate("x" + i, i32.toHex(this.cpu.x[i]));
        }
        view.simpleUpdate("pc", i32.toHex(this.cpu.pc));
        view.simpleUpdate("pc-i", i32.toHex(this.cpu.pc + 4));
        view.simpleUpdate("mepc", i32.toHex(this.cpu.mepc));
        view.simpleUpdate("addr", "-");
        view.simpleUpdate("data", "-");
        view.simpleUpdate("irq", "-");
        view.simpleUpdate("instr", i32.toHex(0));
        view.simpleUpdate("rs1", "-");
        view.simpleUpdate("rs2", "-");
        view.simpleUpdate("rd", "-");
        view.simpleUpdate("imm", "-");
        view.simpleUpdate("alu-op", "-");
        view.simpleUpdate("alu-a", "-");
        view.simpleUpdate("alu-b", "-");
        view.simpleUpdate("alu-r", "-");
        view.simpleUpdate("cmp-op", "-");
        view.simpleUpdate("cmp-a", "-");
        view.simpleUpdate("cmp-b", "-");
        view.simpleUpdate("cmp-taken", false);
        view.simpleUpdate("memc0000000", "-");
        for (let i = 0; i < 2; i ++) {
            view.simpleUpdate(`memb000000${i}`, "00");
        }

        view.highlightAsm(this.cpu.pc);
        this.setNextState("fetch");
    }

    loadHex(data) {
        // Clear memory
        for (let a = 0; a < this.mem.size; a += 4) {
            this.mem.write(a, 4, 0);
        }

        // Copy hex file to memory
        hex.parse(data, this.mem);

        // Update memory view
        for (let a = 0; a < this.mem.size; a ++) {
            view.simpleUpdate("mem" + i32.toHex(a), i32.toHex(this.mem.read(a, 1, false), 2))
        }

        // Update assembly view
        for (let a = 0; a < this.mem.size; a += 4) {
            const word = this.mem.read(a, 4, false);
            const instr = decode(word);
            view.simpleUpdate("asm" + i32.toHex(a), instr.name ? toAssembly(instr) : "&mdash;");
        }
    }

    stop () {
        view.setButtonLabel("run", "Please wait");
        this.stopRequest = true;
    }

    async run(once = false) {
        view.setButtonLabel("run", "Pause");

        this.running     = true;
        this.stopRequest = false;

        do {
            await this.trace();
        } while (!once && !this.stopRequest);

        this.running = false;

        view.setButtonLabel("run", "Run");
        view.enableButton(this.state);
        view.enableButton("step");
        view.enableButton("reset");
    }

    highlightCurrentState() {
        view.activateButton(this.state);
        view.enableButton(this.state, false);
        view.enableButton("step", false);
        view.enableButton("reset", false);
    }

    setNextState(name) {
        if (this.state) {
            view.activateButton(this.state, false);
        }
        view.enableButton(name, !this.running);
        view.enableButton("step", !this.running);
        view.enableButton("reset", !this.running);
        this.state = name;
    }

    async traceFetch() {
        this.highlightCurrentState();

        const savedIrq = this.in_dev.irq();
        this.traceData = this.cpu.step();
        this.traceData.irqChanged = this.in_dev.irq() !== savedIrq;

        view.simpleUpdate("addr", "-");
        view.simpleUpdate("data", "-");

        await view.move("pc", "addr", i32.toHex(this.traceData.pc));
        const irx = i32.toHex(this.traceData.instr.raw);
        await Promise.all([
            view.move("mem" + i32.toHex(this.traceData.pc + 0), "data0", irx.slice(6, 8), 0),
            view.move("mem" + i32.toHex(this.traceData.pc + 1), "data1", irx.slice(4, 6), 1),
            view.move("mem" + i32.toHex(this.traceData.pc + 2), "data2", irx.slice(2, 4), 2),
            view.move("mem" + i32.toHex(this.traceData.pc + 3), "data3", irx.slice(0, 2), 3)
        ]);
        view.update("data", irx);
        await view.waitUpdate();
        await view.move("data", "instr", irx);

        view.simpleUpdate("alu-op", "-");
        view.simpleUpdate("cmp-op", "-");
        view.simpleUpdate("fn", "-");
        view.simpleUpdate("rs1", "-");
        view.simpleUpdate("rs2", "-");
        view.simpleUpdate("imm", "-");
        view.simpleUpdate("rd", "-");
        view.simpleUpdate("alu-r", "-");
        view.simpleUpdate("cmp-taken", "-");
        view.simpleUpdate("alu-a", "-");
        view.simpleUpdate("alu-b", "-");
        view.simpleUpdate("cmp-a", "-");
        view.simpleUpdate("cmp-b", "-");

        this.setNextState("decode");
    }

    async traceDecode() {
        this.highlightCurrentState();

        view.update("fn",     this.traceData.instr.name);
        view.update("rs1",    this.traceData.instr.rs1);
        view.update("rs2",    this.traceData.instr.rs2);
        view.update("rd",     this.traceData.instr.rd);
        view.update("imm",    i32.toHex(this.traceData.instr.imm));
        view.update("alu-op", this.traceData.instr.actions[2]);
        view.update("cmp-op", this.traceData.instr.actions[4]);
        if (this.traceData.instr.actions[4] === "-" || this.traceData.instr.actions[4] === "al") {
            view.update("cmp-taken", this.traceData.taken);
        }
        await view.waitUpdate();

        if (this.traceData.instr.actions[2] !== "-") {
            this.setNextState("alu");
        }
        else {
            this.setNextState("pc");
        }
    }

    async traceALU() {
        this.highlightCurrentState();

        // ALU operand A
        switch (this.traceData.instr.actions[0]) {
            case "pc": await view.move("pc", "alu-a", i32.toHex(this.traceData.pc)); break
            case "x1": await view.move("x" + this.traceData.instr.rs1, "alu-a", i32.toHex(this.traceData.x1)); break;
        }

        // ALU operand B
        switch (this.traceData.instr.actions[1]) {
            case "imm": await view.move("imm", "alu-b", i32.toHex(this.traceData.instr.imm)); break
            case "x2":  await view.move("x" + this.traceData.instr.rs2, "alu-b", i32.toHex(this.traceData.x2)); break;
        }

        await view.delay(2 * STEP_DELAY);

        view.update("alu-r", i32.toHex(this.traceData.r));
        await view.waitUpdate();

        if (this.traceData.instr.actions[4] !== "-" && this.traceData.instr.actions[4] !== "al") {
            this.setNextState("branch");
        }
        else if (this.traceData.instr.actions[3] !== "r" && this.traceData.instr.actions[3] !== "pc+" || this.traceData.instr.rd) {
            this.setNextState("write");
        }
        else {
            this.setNextState("pc");
        }
    }

    async traceBranch() {
        this.highlightCurrentState();

        await view.move("x" + this.traceData.instr.rs1, "cmp-a", i32.toHex(this.traceData.x1));
        await view.move("x" + this.traceData.instr.rs2, "cmp-b", i32.toHex(this.traceData.x2));
        await view.delay(2 * STEP_DELAY);
        view.update("cmp-taken", this.traceData.taken);
        await view.waitUpdate();

        this.setNextState("pc");
    }

    async traceWriteBack() {
        this.highlightCurrentState();

        const x2x = i32.toHex(this.traceData.x2);
        const rx  = i32.toHex(this.traceData.r);
        const lx  = i32.toHex(this.traceData.l);
        const fmt = this.traceData.instr.actions[3].slice(1);
        switch (this.traceData.instr.actions[3]) {
            case "r":   if (this.traceData.instr.rd) await view.move("alu-r", "x" + this.traceData.instr.rd, rx); break;
            case "pc+": if (this.traceData.instr.rd) await view.move("pc-i", "x" + this.traceData.instr.rd, i32.toHex(this.traceData.incPc)); break;

            case "lb":
            case "lbu":
                await view.move("alu-r", "addr", rx);
                await view.move("mem" + rx, "data0", lx.slice(6, 8));
                view.update("data", lx);
                if (this.traceData.instr.rd) await view.move("data", "x" + this.traceData.instr.rd, lx);
                break;

            case "lh":
            case "lhu":
                await view.move("alu-r", "addr", rx);
                await Promise.all([
                    view.move("mem" + i32.toHex(this.traceData.r + 0), "data0", lx.slice(6, 8), 0),
                    view.move("mem" + i32.toHex(this.traceData.r + 1), "data1", lx.slice(4, 6), 1),
                ]);
                view.update("data", lx);
                if (this.traceData.instr.rd) await view.move("data", "x" + this.traceData.instr.rd, lx);
                break;

            case "lw":
                await view.move("alu-r", "addr", rx);
                await Promise.all([
                    view.move("mem" + i32.toHex(this.traceData.r + 0), "data0", lx.slice(6, 8), 0),
                    view.move("mem" + i32.toHex(this.traceData.r + 1), "data1", lx.slice(4, 6), 1),
                    view.move("mem" + i32.toHex(this.traceData.r + 2), "data2", lx.slice(2, 4), 2),
                    view.move("mem" + i32.toHex(this.traceData.r + 3), "data3", lx.slice(0, 2), 3)
                ]);
                view.update("data", lx);
                if (this.traceData.instr.rd) await view.move("data", "x" + this.traceData.instr.rd, lx);
                break;

            case "sb":
                await view.move("alu-r", "addr", rx);
                await view.move("x" + this.traceData.instr.rs2, "data", x2x);
                await view.move("data0", "mem" + rx, x2x.slice(6, 8));
                break;

            case "sh":
                await view.move("alu-r", "addr", rx);
                await view.move("x" + this.traceData.instr.rs2, "data", x2x);
                await Promise.all([
                    view.move("data0", "mem" + i32.toHex(this.traceData.r + 0), x2x.slice(6, 8), 0),
                    view.move("data1", "mem" + i32.toHex(this.traceData.r + 1), x2x.slice(4, 6), 1)
                ]);
                break;

            case "sw":
                await view.move("alu-r", "addr", rx);
                await view.move("x" + this.traceData.instr.rs2, "data", x2x);
                await Promise.all([
                    view.move("data0", "mem" + i32.toHex(this.traceData.r + 0), x2x.slice(6, 8), 0),
                    view.move("data1", "mem" + i32.toHex(this.traceData.r + 1), x2x.slice(4, 6), 1),
                    view.move("data2", "mem" + i32.toHex(this.traceData.r + 2), x2x.slice(2, 4), 2),
                    view.move("data3", "mem" + i32.toHex(this.traceData.r + 3), x2x.slice(0, 2), 3)
                ]);
                break;
        }

        // IRQ status
        if (this.traceData.irqChanged) {
            view.update("irq", this.in_dev.irq());
            await view.waitUpdate();
        }

        this.setNextState("pc");
    }

    async tracePC() {
        this.highlightCurrentState();

        const incPcx = i32.toHex(this.traceData.incPc);
        const rx     = i32.toHex(this.traceData.r);

        if (this.traceData.irq) {
            view.update("pc", i32.toHex(this.cpu.pc));
            await view.waitUpdate();
            if (this.traceData.taken) {
                await view.move("alu-r", "mepc", rx);
            }
            else {
                await view.move("pc-i", "mepc", incPcx);
            }
        }
        else if (this.traceData.instr.name === "mret") {
            await view.move("mepc", "pc", i32.toHex(this.cpu.mepc));
        }
        else if (this.traceData.taken) {
            await view.move("alu-r", "pc", rx);
        }
        else {
            await view.move("pc-i", "pc", incPcx);
        }

        view.highlightAsm(this.cpu.pc);

        // Program counter increment.
        view.update("pc-i", i32.toHex(this.cpu.pc + 4));
        await view.waitUpdate();

        if (this.out_dev.hasData()) {
            view.updateOutput(this.out_dev.getData());
        }

        this.setNextState("fetch");
    }

    async trace() {
        if (this.state === "fetch") {
            await this.traceFetch();
            if (this.stopRequest) {
                return;
            }
            else {
                await view.delay(STEP_DELAY);
            }
        }

        if (this.state === "decode") {
            await this.traceDecode();
            if (this.stopRequest) {
                return;
            }
            else {
                await view.delay(STEP_DELAY);
            }
        }

        if (this.state === "alu") {
            await this.traceALU();
            if (this.stopRequest) {
                return;
            }
            else {
                await view.delay(STEP_DELAY);
            }
        }

        if (this.state === "branch") {
            await this.traceBranch();
            if (this.stopRequest) {
                return;
            }
            else {
                await view.delay(STEP_DELAY);
            }
        }

        if (this.state === "write") {
            await this.traceWriteBack();
            if (this.stopRequest) {
                return;
            }
            else {
                await view.delay(STEP_DELAY);
            }
        }

        if (this.state === "pc") {
            await this.tracePC();
        }
    }

    onKeyDown(code) {
        this.in_dev.onKeyDown(code);
        view.update("memb0000000", i32.toHex(this.in_dev.localRead(0, 1), 2));
        view.update("memb0000001", i32.toHex(this.in_dev.localRead(1, 1), 2));
        view.update("irq", this.in_dev.irq());
    }
}
