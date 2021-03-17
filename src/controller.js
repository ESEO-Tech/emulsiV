
import * as view from "./view.js";
import * as hex  from "./hex.js";
import {toHex, unsignedSlice}  from "./int32.js";
import {encode, decode}        from "./binary.js";
import {assemble, disassemble} from "./assembly.js";

const STEP_DELAY = 2500;
const THROTTLING_TIME_MS = 20;

export class Controller {
    constructor(cpu, bus, mem) {
        this.cpu              = cpu;
        this.bus              = bus;
        this.mem              = mem;
        this.running          = false;
        this.stepping         = false;
        this.stopRequest      = false;
        this.breakpoints      = {};
        this.lastTraceTime    = -1;
        this.savedIrq         = false;
        setInterval(() => this.updateIrq(), THROTTLING_TIME_MS);
    }

    reset(resetBus=true) {
        this.cpu.reset();
        this.bus.reset();
        view.clearDeviceViews();
        this.forceUpdate();
        view.resize();
        this.prepareNextState();
    }

    forceUpdate() {
        view.reset();
        for (let i = 0; i < this.cpu.x.length; i ++) {
            view.simpleUpdate("x" + i, toHex(this.cpu.x[i]));
        }
        view.simpleUpdate("pc",        toHex(this.cpu.pc));
        view.simpleUpdate("pc-i",      toHex(this.cpu.pcNext));
        view.simpleUpdate("mepc",      toHex(this.cpu.mepc));
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
            view.simpleUpdate("mem" + toHex(a), toHex(this.bus.read(a, 1, false), 2))
        }

        // Update text input register view.
        // TODO move this to text.js
        for (let i = 0; i < 2; i ++) {
            view.simpleUpdate(`memb000000${i}`, toHex(this.bus.read(0xB0000000 + i, 1, false), 2));
        }

        // Update text output register view.
        // TODO move this to text.js
        view.simpleUpdate("memc0000000", toHex(this.bus.read(0xc0000000, 1, false), 2));

        // Update GPIO register view.
        // TODO move this to gpio.js
        for (let a = 0xd0000000; a < 0xd0000014; a ++) {
            view.simpleUpdate("mem" + toHex(a), toHex(this.bus.read(a, 1, false), 2));
        }

        view.updateDeviceViews(true);

        view.highlightAsm(this.cpu.pc);
    }

    setAsm(addr, str) {
        function intListToWord(str, width) {
            return str.trim().split(/\s+|\s*,\s*/).slice(0, 32 / width).reduce((res, s,  i) => {
                let v = parseInt(s);
                if (isNaN(v)) {
                    v = 0;
                }
                return res | unsignedSlice(v, width - 1, 0, i * width);
            }, 0);
        }

        const format = document.getElementById("alt-mem-view-sel").value;
        let word = null;
        switch (format) {
            case "asm":
            case "pseudo": {
                const instr = assemble(str);
                if (instr) {
                    word = encode(instr);
                }
                break;
            }

            case "ascii":
                word = str.slice(0, 4).split("").reduce((res, s, i) => {
                    const v = s.charCodeAt(0);
                    return res | unsignedSlice(v, 7, 0, i * 8);
                }, 0);
                break;

            case "int32":
            case "uint32": word = intListToWord(str, 32); break;
            case "int16":
            case "uint16": word = intListToWord(str, 16); break;
            case "int8":
            case "uint8": word = intListToWord(str, 8); break;
        }

        if (word !== null) {
            this.bus.write(addr, 4, word);
            for (let a = addr; a < addr + 4; a ++) {
                view.simpleUpdate("mem" + toHex(a), toHex(this.bus.read(a, 1, false), 2));
            }
            view.updateDeviceViews(false);
        }
    }

    showAsm(addr) {
        const format = document.getElementById("alt-mem-view-sel").value;
        if (format === "asm" || format === "pseudo") {
            const str = disassemble(decode(this.bus.read(addr, 4)));
            view.simpleUpdate("asm" + toHex(addr), str);
        }
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
        this.reset();

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
        const key = toHex(addr);
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
        view.enableInput("open-btn",  false);
        view.enableInput("hex-input", false);
        view.enableInput("step-btn",  false);
        view.enableInput("reset-btn", false);

        this.running     = true;
        this.stopRequest = false;

        const startTime = Date.now();

        do {
            await this.trace(single, false);
        } while (!this.stopRequest &&
                 !(single && this.cpu.state === "fetch") &&
                 !(this.breakpoints[toHex(this.cpu.pc)] && this.cpu.state === "fetch"));

        const stopTime = Date.now();

        console.log(`Execution time: ${stopTime - startTime} ms`);

        if (!single && !view.animationsEnabled()) {
            this.forceUpdate();
        }

        view.setButtonLabel("run", "Run");
        view.enableInput(this.cpu.state + "-btn");
        view.enableInput("open-btn");
        view.enableInput("hex-input");
        view.enableInput("step-btn");
        view.enableInput("reset-btn");

        this.running = false;
    }

    highlightState(name) {
        view.activateButton(name);
        view.enableInput(name + "-btn", false);
        view.enableInput("open-btn",    false);
        view.enableInput("hex-input",   false);
        view.enableInput("step-btn",    false);
        view.enableInput("reset-btn",   false);
    }

    prepareNextState(name) {
        if (name) {
            view.activateButton(name, false);
        }
        view.enableInput(this.cpu.state + "-btn", !this.running);
        view.enableInput("open-btn",              !this.running);
        view.enableInput("hex-input",             !this.running);
        view.enableInput("step-btn",              !this.running);
        view.enableInput("reset-btn",             !this.running);
    }

    async traceFetch() {
        view.simpleUpdate("addr", "-");
        view.simpleUpdate("data", "-");

        await view.move("pc", "addr", toHex(this.cpu.pc));

        const irx = toHex(this.cpu.fetchData);
        if (!this.cpu.fetchError) { // TODO Add error indicator
            await Promise.all([
                view.move("mem" + toHex(this.cpu.pc + 0), "data0", irx.slice(6, 8), {slot: 0, path: "mem-data"}),
                view.move("mem" + toHex(this.cpu.pc + 1), "data1", irx.slice(4, 6), {slot: 1}),
                view.move("mem" + toHex(this.cpu.pc + 2), "data2", irx.slice(2, 4), {slot: 2}),
                view.move("mem" + toHex(this.cpu.pc + 3), "data3", irx.slice(0, 2), {slot: 3})
            ]);
        }
        view.update("data", irx);
        await view.waitUpdate();

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
    }

    async traceDecode() {
        const fmt = this.cpu.instr.format;
        const isMret = this.cpu.instr.name === "mret";
        const hasRs1 = fmt !== "U" && fmt !== "J" && !isMret;
        const hasRs2 = hasRs1      && fmt !== "I";
        const hasRd  = fmt !== "S" && fmt !== "B" && !isMret;
        const hasImm = fmt !== "R"                && !isMret;
        view.update("fn",     this.cpu.instr.name);
        view.update("rs1",    hasRs1 ? this.cpu.instr.rs1        : "-");
        view.update("rs2",    hasRs2 ? this.cpu.instr.rs2        : "-");
        view.update("rd",     hasRd  ? this.cpu.instr.rd         : "-");
        view.update("imm",    hasImm ? toHex(this.cpu.instr.imm) : "-");
        view.update("alu-op", this.cpu.datapath.aluOp);
        view.update("cmp-op", this.cpu.datapath.branch);
        if (!this.cpu.datapath.branch || this.cpu.datapath.branch === "al") {
            view.update("cmp-taken", this.cpu.branchTaken);
        }
        await view.waitUpdate();
    }

    async traceCompute() {
        // ALU operand A
        switch (this.cpu.datapath.src1) {
            case "pc":
                await view.move("pc", "alu-a", toHex(this.cpu.pc));
                break;
            case "x1":
                await view.move("x" + this.cpu.instr.rs1, "alu-a", toHex(this.cpu.x1), {path: "x-alu-a"});
                break;
        }

        // ALU operand B
        switch (this.cpu.datapath.src2) {
            case "imm":
                await view.move("imm", "alu-b", toHex(this.cpu.instr.imm));
                break
            case "x2":
                await view.move("x" + this.cpu.instr.rs2, "alu-b", toHex(this.cpu.x2), {path: "x-alu-b"});
                break;
        }

        view.clearPaths();
        await view.delay(2 * STEP_DELAY);

        view.update("alu-r", toHex(this.cpu.aluResult));
        await view.waitUpdate();
    }

    async traceCompare() {
        await view.move("x" + this.cpu.instr.rs1, "cmp-a", toHex(this.cpu.x1), {path: "x-cmp-a"});
        await view.move("x" + this.cpu.instr.rs2, "cmp-b", toHex(this.cpu.x2), {path: "x-cmp-b"});
        view.clearPaths();
        await view.delay(2 * STEP_DELAY);
        view.update("cmp-taken", this.cpu.branchTaken);
        await view.waitUpdate();
    }

    async traceLoadStoreWriteBack() {
        const x2x   = toHex(this.cpu.x2);
        const rx    = toHex(this.cpu.aluResult);
        const lx    = toHex(this.cpu.loadData);

        switch (this.cpu.datapath.wbMem) {
            case "r":
                if (this.cpu.instr.rd) {
                    await view.move("alu-r", "x" + this.cpu.instr.rd, rx, {path: "alu-r-x"});
                }
                break;

            case "pc+":
                if (this.cpu.instr.rd) {
                    await view.move("pc-i",  "x" + this.cpu.instr.rd, toHex(this.cpu.pcNext), {path: "pc-i-x"});
                }
                break;

            case "lb":
            case "lbu":
                await view.move("alu-r", "addr", rx);
                if (!this.cpu.loadStoreError) { // TODO Add error indicator
                    await view.move("mem" + rx, "data0", lx.slice(6, 8), {path: "mem-data"});
                }
                view.update("data", lx);
                if (this.cpu.instr.rd) {
                    await view.move("data", "x" + this.cpu.instr.rd, lx, {path: "data-x"});
                }
                break;

            case "lh":
            case "lhu":
                await view.move("alu-r", "addr", rx);
                if (!this.cpu.loadStoreError) { // TODO Add error indicator
                    await Promise.all([
                        view.move("mem" + toHex(this.cpu.aluResult + 0), "data0", lx.slice(6, 8), {slot: 0, path: "mem-data"}),
                        view.move("mem" + toHex(this.cpu.aluResult + 1), "data1", lx.slice(4, 6), {slot: 1}),
                    ]);
                }
                view.update("data", lx);
                if (this.cpu.instr.rd) {
                    await view.move("data", "x" + this.cpu.instr.rd, lx, {path: "data-x"});
                }
                break;

            case "lw":
                await view.move("alu-r", "addr", rx);
                if (!this.cpu.loadStoreError) { // TODO Add error indicator
                    await Promise.all([
                        view.move("mem" + toHex(this.cpu.aluResult + 0), "data0", lx.slice(6, 8), {slot: 0, path: "mem-data"}),
                        view.move("mem" + toHex(this.cpu.aluResult + 1), "data1", lx.slice(4, 6), {slot: 1}),
                        view.move("mem" + toHex(this.cpu.aluResult + 2), "data2", lx.slice(2, 4), {slot: 2}),
                        view.move("mem" + toHex(this.cpu.aluResult + 3), "data3", lx.slice(0, 2), {slot: 3})
                    ]);
                }
                view.update("data", lx);
                if (this.cpu.instr.rd) {
                    await view.move("data", "x" + this.cpu.instr.rd, lx, {path: "data-x"});
                }
                break;

            case "sb":
                await view.move("alu-r", "addr", rx);
                await view.move("x" + this.cpu.instr.rs2, "data", x2x, {path: "x-data"});
                if (!this.cpu.loadStoreError) { // TODO Add error indicator
                    await view.move("data0", "mem" + rx, x2x.slice(6, 8), {path: "data-mem"});
                }
                break;

            case "sh":
                await view.move("alu-r", "addr", rx);
                await view.move("x" + this.cpu.instr.rs2, "data", x2x, {path: "x-data"});
                if (!this.cpu.loadStoreError) { // TODO Add error indicator
                    await Promise.all([
                        view.move("data0", "mem" + toHex(this.cpu.aluResult + 0), x2x.slice(6, 8), {slot: 0, path: "data-mem"}),
                        view.move("data1", "mem" + toHex(this.cpu.aluResult + 1), x2x.slice(4, 6), {slot: 1})
                    ]);
                }
                break;

            case "sw":
                await view.move("alu-r", "addr", rx);
                await view.move("x" + this.cpu.instr.rs2, "data", x2x, {path: "x-data"});
                if (!this.cpu.loadStoreError) { // TODO Add error indicator
                    await Promise.all([
                        view.move("data0", "mem" + toHex(this.cpu.aluResult + 0), x2x.slice(6, 8), {slot: 0, path: "data-mem"}),
                        view.move("data1", "mem" + toHex(this.cpu.aluResult + 1), x2x.slice(4, 6), {slot: 1}),
                        view.move("data2", "mem" + toHex(this.cpu.aluResult + 2), x2x.slice(2, 4), {slot: 2}),
                        view.move("data3", "mem" + toHex(this.cpu.aluResult + 3), x2x.slice(0, 2), {slot: 3})
                    ]);
                }
                break;
        }

        view.clearPaths();

        view.updateDeviceViews(true);
    }

    async traceUpdatePC() {
        const pcx = toHex(this.cpu.pc);

        if (this.cpu.acceptingIrq) {
            // TODO Move from CSR to PC
            view.update("pc", pcx);
            await view.waitUpdate();
            await view.move(this.cpu.branchTaken ? "alu-r" : "pc-i", "mepc", toHex(this.cpu.mepc));
        }
        else {
            const src = this.cpu.instr.name === "mret" ? "mepc"  :
                        this.cpu.branchTaken           ? "alu-r" :
                                                         "pc-i";
            await view.move(src, "pc", pcx);
        }

        view.clearPaths();

        view.highlightAsm(this.cpu.pc);

        // Program counter increment.
        view.update("pc-i", toHex(this.cpu.pcNext));
        await view.waitUpdate();
    }

    async trace(single, oneStage) {
        const state = this.cpu.state;
        this.cpu.step();

        if (single || view.animationsEnabled()) {
            this.highlightState(state);

            switch (state) {
                case "fetch":              await this.traceFetch();              break;
                case "decode":             await this.traceDecode();             break;
                case "compute":            await this.traceCompute();            break;
                case "compare":            await this.traceCompare();            break;
                case "loadStoreWriteBack": await this.traceLoadStoreWriteBack(); break;
                case "updatePC":           await this.traceUpdatePC();           break;
            }

            this.prepareNextState(state);
        }
        else if (this.cpu.state === "fetch") {
            view.updateDeviceViews(false);
        }

        // For performance reasons, when running the program in continuous
        // (non-single) mode, we will update the view only every THROTTLING_TIME_MS.
        const traceTime = performance.now();
        const enableViewDelay = traceTime - this.lastTraceTime >= THROTTLING_TIME_MS;
        if (enableViewDelay) {
            this.lastTraceTime = traceTime;
        }

        // Terminate immediately when:
        // * running in one-stage mode,
        // * an instruction has just terminated in single-step mode,
        // * a stop request has been received,
        // * running in continuous mode with animations disabled if the view has been updated recently.
        if (oneStage || single && this.cpu.state === "fetch" || this.stopRequest ||
            !single && !view.animationsEnabled() && !enableViewDelay) {
            return;
        }

        // When running in single-step mode, or in continuous mode
        // with animations enabled, wait a small time between stages.
        // When running in continuous mode with animations disabled,
        // this will introduce 0 delays every THROTTLING_TIME_MS to allow
        // updating the view.
        await view.delay(STEP_DELAY);
    }

    updateIrq() {
        // Update the IRQ input view if it has changed.
        const irq = this.bus.irq();
        if (irq !== this.savedIrq) {
            view.update("irq", irq);
            this.savedIrq = irq;
        }
    }
}
