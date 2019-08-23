
import * as view from "./view.js";
import * as hex  from "./hex.js";
import * as i32  from "./i32.js";

const STEP_DELAY = 2500

export class Controller {
    constructor(cpu, bus, mem) {
        this.cpu         = cpu;
        this.bus         = bus;
        this.mem         = mem;
        this.running     = false;
        this.stepping    = false;
        this.stopRequest = false;
        this.breakpoints = {};
        view.init(mem.size);
        this.reset();
    }

    reset(resetBus=true) {
        this.cpu.reset();
        if (resetBus) {
            this.bus.reset();
        }
        view.clearDevices();
        this.traceData = null;
        this.forceUpdate();
        this.setNextState("fetch");
    }

    forceUpdate() {
        view.reset();
        for (let i = 0; i < this.cpu.x.length; i ++) {
            view.simpleUpdate("x" + i, i32.toHex(this.cpu.x[i]));
        }
        view.simpleUpdate("pc",        i32.toHex(this.cpu.pc));
        view.simpleUpdate("pc-i",      i32.toHex(this.cpu.pc + 4));
        view.simpleUpdate("mepc",      i32.toHex(this.cpu.mepc));
        view.simpleUpdate("addr",      "-");
        view.simpleUpdate("data",      "-");
        view.simpleUpdate("irq",       this.bus.irq());
        view.simpleUpdate("instr",     "-");
        view.simpleUpdate("fn",        "-");
        view.simpleUpdate("rs1",       "-");
        view.simpleUpdate("rs2",       "-");
        view.simpleUpdate("rd",        "-");
        view.simpleUpdate("imm",       "-");
        view.simpleUpdate("alu-op",    "-");
        view.simpleUpdate("alu-a",     "-");
        view.simpleUpdate("alu-b",     "-");
        view.simpleUpdate("alu-r",     "-");
        view.simpleUpdate("cmp-op",    "-");
        view.simpleUpdate("cmp-a",     "-");
        view.simpleUpdate("cmp-b",     "-");
        view.simpleUpdate("cmp-taken", "-");

        // Update memory view.
        for (let a = 0; a < this.mem.size; a ++) {
            view.simpleUpdate("mem" + i32.toHex(a), i32.toHex(this.bus.read(a, 1, false), 2))
        }

        // Update text input register view.
        for (let i = 0; i < 2; i ++) {
            view.simpleUpdate(`memb000000${i}`, i32.toHex(this.bus.read(0xB0000000 + i, 1, false), 2));
        }

        // Update text output register view.
        view.simpleUpdate("memc0000000", "-");

        view.updateDevices(true);

        view.highlightAsm(this.cpu.pc);
    }

    async loadHex(data) {
        if (this.running) {
            this.stop();
            while (this.running) {
                await view.delay(0);
            }
        }

        // Clear memory
        for (let a = 0; a < this.mem.size; a += 4) {
            this.bus.write(a, 4, 0);
        }

        // Copy hex file to memory
        hex.parse(data, this.bus);

        // Reset processor and device views.
        this.reset(false);

        // Disable all breakpoints.
        for (let [key, enabled] of Object.entries(this.breakpoints)) {
            if (enabled) {
                view.disableBreakpoint("brk" + key);
            }
        }
        this.breakpoints = {};

        // The assembly view may have changed size.
        view.resize();
    }

    stop() {
        view.setButtonLabel("run", "Please wait");
        this.stopRequest = true;
    }

    toggleBreakpoint(addr) {
        const key = i32.toHex(addr);
        if (this.breakpoints[key]) {
            this.breakpoints[key] = false;
            view.disableBreakpoint("brk" + key);
        }
        else {
            this.breakpoints[key] = true;
            view.enableBreakpoint("brk" + key);
        }
    }

    async run(single = false) {
        view.setButtonLabel("run", "Pause");
        view.enableInput("hex-input", false);
        view.enableInput("step-btn", false);
        view.enableInput("reset-btn", false);

        this.running     = true;
        this.stopRequest = false;

        do {
            await this.trace(single, false);
        } while (!this.stopRequest &&
                 !(single && this.state === "fetch") &&
                 !(this.breakpoints[i32.toHex(this.cpu.pc)] && this.state === "fetch"));

        if (!single && !view.animationsEnabled()) {
            this.forceUpdate();
        }

        view.setButtonLabel("run", "Run");
        view.enableInput(this.state + "-btn");
        view.enableInput("hex-input");
        view.enableInput("step-btn");
        view.enableInput("reset-btn");

        this.running = false;
    }

    highlightCurrentState() {
        view.activateButton(this.state);
        view.enableInput(this.state + "-btn", false);
        view.enableInput("hex-input",         false);
        view.enableInput("step-btn",          false);
        view.enableInput("reset-btn",         false);
    }

    setNextState(name) {
        if (this.state) {
            view.activateButton(this.state, false);
        }
        view.enableInput(name + "-btn", !this.running);
        view.enableInput("hex-input",   !this.running);
        view.enableInput("step-btn",    !this.running);
        view.enableInput("reset-btn",   !this.running);
        this.state = name;
    }

    async traceFetch() {
        this.highlightCurrentState();

        view.simpleUpdate("addr", "-");
        view.simpleUpdate("data", "-");

        view.highlightPath("pc", "addr");
        await view.move("pc", "addr", i32.toHex(this.traceData.pc));

        view.highlightPath("mem", "data");
        const irx = i32.toHex(this.traceData.instr.raw);
        await Promise.all([
            view.move("mem" + i32.toHex(this.traceData.pc + 0), "data0", irx.slice(6, 8), 0),
            view.move("mem" + i32.toHex(this.traceData.pc + 1), "data1", irx.slice(4, 6), 1),
            view.move("mem" + i32.toHex(this.traceData.pc + 2), "data2", irx.slice(2, 4), 2),
            view.move("mem" + i32.toHex(this.traceData.pc + 3), "data3", irx.slice(0, 2), 3)
        ]);
        view.update("data", irx);
        await view.waitUpdate();

        view.highlightPath("data", "instr");
        await view.move("data", "instr", irx);
        view.clearPaths();

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
            case "pc":
                view.highlightPath("pc", "alu-a");
                await view.move("pc", "alu-a", i32.toHex(this.traceData.pc));
                break
            case "x1":
                view.highlightPath("xrs", "alu-a");
                await view.move("x" + this.traceData.instr.rs1, "alu-a", i32.toHex(this.traceData.x1));
                break;
        }

        // ALU operand B
        switch (this.traceData.instr.actions[1]) {
            case "imm":
                view.highlightPath("imm", "alu-b");
                await view.move("imm", "alu-b", i32.toHex(this.traceData.instr.imm));
                break
            case "x2":
                view.highlightPath("xrs", "alu-b");
                await view.move("x" + this.traceData.instr.rs2, "alu-b", i32.toHex(this.traceData.x2));
                break;
        }

        view.clearPaths();
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

        view.highlightPath("xrs", "cmp-a");
        await view.move("x" + this.traceData.instr.rs1, "cmp-a", i32.toHex(this.traceData.x1));
        view.highlightPath("xrs", "cmp-b");
        await view.move("x" + this.traceData.instr.rs2, "cmp-b", i32.toHex(this.traceData.x2));
        view.clearPaths();
        await view.delay(2 * STEP_DELAY);
        view.update("cmp-taken", this.traceData.taken);
        await view.waitUpdate();

        this.setNextState("pc");
    }

    async traceWriteBack() {
        this.highlightCurrentState();

        const x2x   = i32.toHex(this.traceData.x2);
        const rx    = i32.toHex(this.traceData.r);
        const lx    = i32.toHex(this.traceData.l);
        const fmt   = this.traceData.instr.actions[3].slice(1);
        switch (this.traceData.instr.actions[3]) {
            case "r":
                if (this.traceData.instr.rd) {
                    view.highlightPath("alu-r", "xrd");
                    await view.move("alu-r", "x" + this.traceData.instr.rd, rx);
                }
                break;

            case "pc+":
                if (this.traceData.instr.rd) {
                    view.highlightPath("pc-i", "xrd");
                    await view.move("pc-i",  "x" + this.traceData.instr.rd, i32.toHex(this.traceData.incPc));
                }
                break;

            case "lb":
            case "lbu":
                view.highlightPath("alu-r", "addr");
                await view.move("alu-r", "addr", rx);
                view.highlightPath("mem", "data");
                await view.move("mem" + rx, "data0", lx.slice(6, 8));
                view.update("data", lx);
                if (this.traceData.instr.rd) {
                    view.highlightPath("data", "xrd");
                    await view.move("data", "x" + this.traceData.instr.rd, lx);
                }
                break;

            case "lh":
            case "lhu":
                view.highlightPath("alu-r", "addr");
                await view.move("alu-r", "addr", rx);
                view.highlightPath("mem", "data");
                await Promise.all([
                    view.move("mem" + i32.toHex(this.traceData.r + 0), "data0", lx.slice(6, 8), 0),
                    view.move("mem" + i32.toHex(this.traceData.r + 1), "data1", lx.slice(4, 6), 1),
                ]);
                view.update("data", lx);
                if (this.traceData.instr.rd) {
                    view.highlightPath("data", "xrd");
                    await view.move("data", "x" + this.traceData.instr.rd, lx);
                }
                break;

            case "lw":
                view.highlightPath("alu-r", "addr");
                await view.move("alu-r", "addr", rx);
                view.highlightPath("mem", "data");
                await Promise.all([
                    view.move("mem" + i32.toHex(this.traceData.r + 0), "data0", lx.slice(6, 8), 0),
                    view.move("mem" + i32.toHex(this.traceData.r + 1), "data1", lx.slice(4, 6), 1),
                    view.move("mem" + i32.toHex(this.traceData.r + 2), "data2", lx.slice(2, 4), 2),
                    view.move("mem" + i32.toHex(this.traceData.r + 3), "data3", lx.slice(0, 2), 3)
                ]);
                view.update("data", lx);
                if (this.traceData.instr.rd) {
                    view.highlightPath("data", "xrd");
                    await view.move("data", "x" + this.traceData.instr.rd, lx);
                }
                break;

            case "sb":
                view.highlightPath("alu-r", "addr");
                await view.move("alu-r", "addr", rx);
                view.highlightPath("xrs", "data");
                await view.move("x" + this.traceData.instr.rs2, "data", x2x);
                view.highlightPath("data", "mem");
                await view.move("data0", "mem" + rx, x2x.slice(6, 8));
                break;

            case "sh":
                view.highlightPath("alu-r", "addr");
                await view.move("alu-r", "addr", rx);
                view.highlightPath("xrs", "data");
                await view.move("x" + this.traceData.instr.rs2, "data", x2x);
                view.highlightPath("data", "mem");
                await Promise.all([
                    view.move("data0", "mem" + i32.toHex(this.traceData.r + 0), x2x.slice(6, 8), 0),
                    view.move("data1", "mem" + i32.toHex(this.traceData.r + 1), x2x.slice(4, 6), 1)
                ]);
                break;

            case "sw":
                view.highlightPath("alu-r", "addr");
                await view.move("alu-r", "addr", rx);
                view.highlightPath("xrs", "data");
                await view.move("x" + this.traceData.instr.rs2, "data", x2x);
                view.highlightPath("data", "mem");
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
            view.update("irq", this.bus.irq());
            await view.waitUpdate();
        }

        view.clearPaths();

        view.updateDevices(true);

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
                view.highlightPath("alu-r", "mepc");
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
            view.highlightPath("alu-r", "pc");
            await view.move("alu-r", "pc", rx);
        }
        else {
            await view.move("pc-i", "pc", incPcx);
        }

        view.clearPaths();

        view.highlightAsm(this.cpu.pc);

        // Program counter increment.
        view.update("pc-i", i32.toHex(this.cpu.pc + 4));
        await view.waitUpdate();

        this.setNextState("fetch");
    }

    async trace(single, oneStage) {
        switch (this.state) {
            case "fetch":
                const savedIrq = this.bus.irq();
                this.traceData = this.cpu.step();
                this.traceData.irqChanged = this.bus.irq() !== savedIrq;

                if (single || view.animationsEnabled()) {
                    await this.traceFetch();
                }
                else {
                    view.updateDevices(false);
                }
                break;

            case "decode":
                await this.traceDecode();
                break;

            case "alu":
                await this.traceALU();
                break;

            case "branch":
                await this.traceBranch();
                break;

            case "write":
                await this.traceWriteBack();
                break;

            case "pc":
                await this.tracePC();
        }

        if (!oneStage && !this.stopRequest && !(single && this.state === "fetch")) {
            await view.delay(STEP_DELAY);
        }
    }

    onKeyDown(dev, code) {
        dev.onKeyDown(code);
        view.update("mem" + i32.toHex(dev.firstAddress),     i32.toHex(dev.localRead(0, 1), 2));
        view.update("mem" + i32.toHex(dev.firstAddress + 1), i32.toHex(dev.localRead(1, 1), 2));
        view.update("irq", this.bus.irq());
    }
}
