
import * as view from "./view.js";
import * as hex  from "./hex.js";
import {toHex, unsignedSlice}  from "./int32.js";
import {encode, decode}        from "./binary.js";
import {assemble, disassemble} from "./assembly.js";

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
        view.resize();
    }

    forceUpdate() {
        view.reset();
        for (let i = 0; i < this.cpu.x.length; i ++) {
            view.simpleUpdate("x" + i, toHex(this.cpu.x[i]));
        }
        view.simpleUpdate("pc",        toHex(this.cpu.pc));
        view.simpleUpdate("pc-i",      toHex(this.cpu.pc + 4));
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
        for (let i = 0; i < 2; i ++) {
            view.simpleUpdate(`memb000000${i}`, toHex(this.bus.read(0xB0000000 + i, 1, false), 2));
        }

        // Update text output register view.
        view.simpleUpdate("memc0000000", "-");

        view.updateDevices(true);

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
                view.simpleUpdate("mem" + toHex(a), toHex(this.bus.read(a, 1, false), 2))
            }
            view.updateDevices(false);
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
        view.enableInput("hex-input", false);
        view.enableInput("step-btn", false);
        view.enableInput("reset-btn", false);

        this.running     = true;
        this.stopRequest = false;

        const startTime = Date.now();

        do {
            await this.trace(single, false);
        } while (!this.stopRequest &&
                 !(single && this.state === "fetch") &&
                 !(this.breakpoints[toHex(this.cpu.pc)] && this.state === "fetch"));

         const stopTime = Date.now();

        console.log(`Execution time: ${stopTime - startTime} ms`);

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

        await view.move("pc", "addr", toHex(this.traceData.pc));

        const irx = toHex(this.traceData.instr.word);
        if (!this.traceData.fetchError) { // TODO Add error indicator
            await Promise.all([
                view.move("mem" + toHex(this.traceData.pc + 0), "data0", irx.slice(6, 8), {slot: 0, path: "mem-data"}),
                view.move("mem" + toHex(this.traceData.pc + 1), "data1", irx.slice(4, 6), {slot: 1}),
                view.move("mem" + toHex(this.traceData.pc + 2), "data2", irx.slice(2, 4), {slot: 2}),
                view.move("mem" + toHex(this.traceData.pc + 3), "data3", irx.slice(0, 2), {slot: 3})
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

        this.setNextState("decode");
    }

    async traceDecode() {
        this.highlightCurrentState();

        view.update("fn",     this.traceData.instr.name);
        view.update("rs1",    this.traceData.instr.rs1);
        view.update("rs2",    this.traceData.instr.rs2);
        view.update("rd",     this.traceData.instr.rd);
        view.update("imm",    toHex(this.traceData.instr.imm));
        view.update("alu-op", this.traceData.aluOp);
        view.update("cmp-op", this.traceData.branch);
        if (!this.traceData.branch || this.traceData.branch === "al") {
            view.update("cmp-taken", this.traceData.taken);
        }
        await view.waitUpdate();

        if (this.traceData.aluOp) {
            this.setNextState("alu");
        }
        else {
            this.setNextState("pc");
        }
    }

    async traceALU() {
        this.highlightCurrentState();

        // ALU operand A
        switch (this.traceData.src1) {
            case "pc":
                await view.move("pc", "alu-a", toHex(this.traceData.pc));
                break
            case "x1":
                await view.move("x" + this.traceData.instr.rs1, "alu-a", toHex(this.traceData.x1), {path: "xrs1-alu-a"});
                break;
        }

        // ALU operand B
        switch (this.traceData.src2) {
            case "imm":
                await view.move("imm", "alu-b", toHex(this.traceData.instr.imm));
                break
            case "x2":
                await view.move("x" + this.traceData.instr.rs2, "alu-b", toHex(this.traceData.x2), {path: "xrs2-alu-b"});
                break;
        }

        view.clearPaths();
        await view.delay(2 * STEP_DELAY);

        view.update("alu-r", toHex(this.traceData.r));
        await view.waitUpdate();

        if (this.traceData.branch && this.traceData.branch !== "al") {
            this.setNextState("branch");
        }
        else if (this.traceData.wbMem !== "r" && this.traceData.wbMem !== "pc+" || this.traceData.instr.rd) {
            this.setNextState("write");
        }
        else {
            this.setNextState("pc");
        }
    }

    async traceBranch() {
        this.highlightCurrentState();

        await view.move("x" + this.traceData.instr.rs1, "cmp-a", toHex(this.traceData.x1), {path: "xrs1-cmp-a"});
        await view.move("x" + this.traceData.instr.rs2, "cmp-b", toHex(this.traceData.x2), {path: "xrs2-cmp-b"});
        view.clearPaths();
        await view.delay(2 * STEP_DELAY);
        view.update("cmp-taken", this.traceData.taken);
        await view.waitUpdate();

        this.setNextState("pc");
    }

    async traceWriteBack() {
        this.highlightCurrentState();

        const x2x   = toHex(this.traceData.x2);
        const rx    = toHex(this.traceData.r);
        const lx    = toHex(this.traceData.l);

        switch (this.traceData.wbMem) {
            case "r":
                if (this.traceData.instr.rd) {
                    await view.move("alu-r", "x" + this.traceData.instr.rd, rx, {path: "alu-r-xrd"});
                }
                break;

            case "pc+":
                if (this.traceData.instr.rd) {
                    await view.move("pc-i",  "x" + this.traceData.instr.rd, toHex(this.traceData.incPc), {path: "pc-i-xrd"});
                }
                break;

            case "lb":
            case "lbu":
                await view.move("alu-r", "addr", rx);
                if (!this.traceData.loadStoreError) { // TODO Add error indicator
                    await view.move("mem" + rx, "data0", lx.slice(6, 8), {path: "mem-data"});
                }
                view.update("data", lx);
                if (this.traceData.instr.rd) {
                    await view.move("data", "x" + this.traceData.instr.rd, lx, {path: "data-xrd"});
                }
                break;

            case "lh":
            case "lhu":
                await view.move("alu-r", "addr", rx);
                if (!this.traceData.loadStoreError) { // TODO Add error indicator
                    await Promise.all([
                        view.move("mem" + toHex(this.traceData.r + 0), "data0", lx.slice(6, 8), {slot: 0, path: "mem-data"}),
                        view.move("mem" + toHex(this.traceData.r + 1), "data1", lx.slice(4, 6), {slot: 1}),
                    ]);
                }
                view.update("data", lx);
                if (this.traceData.instr.rd) {
                    await view.move("data", "x" + this.traceData.instr.rd, lx, {path: "data-xrd"});
                }
                break;

            case "lw":
                await view.move("alu-r", "addr", rx);
                if (!this.traceData.loadStoreError) { // TODO Add error indicator
                    await Promise.all([
                        view.move("mem" + toHex(this.traceData.r + 0), "data0", lx.slice(6, 8), {slot: 0, path: "mem-data"}),
                        view.move("mem" + toHex(this.traceData.r + 1), "data1", lx.slice(4, 6), {slot: 1}),
                        view.move("mem" + toHex(this.traceData.r + 2), "data2", lx.slice(2, 4), {slot: 2}),
                        view.move("mem" + toHex(this.traceData.r + 3), "data3", lx.slice(0, 2), {slot: 3})
                    ]);
                }
                view.update("data", lx);
                if (this.traceData.instr.rd) {
                    await view.move("data", "x" + this.traceData.instr.rd, lx, {path: "data-xrd"});
                }
                break;

            case "sb":
                await view.move("alu-r", "addr", rx);
                await view.move("x" + this.traceData.instr.rs2, "data", x2x, {path: "xrs2-data"});
                if (!this.traceData.loadStoreError) { // TODO Add error indicator
                    await view.move("data0", "mem" + rx, x2x.slice(6, 8), {path: "data-mem"});
                }
                break;

            case "sh":
                await view.move("alu-r", "addr", rx);
                await view.move("x" + this.traceData.instr.rs2, "data", x2x, {path: "xrs2-data"});
                if (!this.traceData.loadStoreError) { // TODO Add error indicator
                    await Promise.all([
                        view.move("data0", "mem" + toHex(this.traceData.r + 0), x2x.slice(6, 8), {slot: 0, path: "data-mem"}),
                        view.move("data1", "mem" + toHex(this.traceData.r + 1), x2x.slice(4, 6), {slot: 1})
                    ]);
                }
                break;

            case "sw":
                await view.move("alu-r", "addr", rx);
                await view.move("x" + this.traceData.instr.rs2, "data", x2x, {path: "xrs2-data"});
                if (!this.traceData.loadStoreError) { // TODO Add error indicator
                    await Promise.all([
                        view.move("data0", "mem" + toHex(this.traceData.r + 0), x2x.slice(6, 8), {slot: 0, path: "data-mem"}),
                        view.move("data1", "mem" + toHex(this.traceData.r + 1), x2x.slice(4, 6), {slot: 1}),
                        view.move("data2", "mem" + toHex(this.traceData.r + 2), x2x.slice(2, 4), {slot: 2}),
                        view.move("data3", "mem" + toHex(this.traceData.r + 3), x2x.slice(0, 2), {slot: 3})
                    ]);
                }
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

        const incPcx = toHex(this.traceData.incPc);
        const rx     = toHex(this.traceData.r);

        if (this.traceData.irq) {
            view.update("pc", toHex(this.cpu.pc));
            await view.waitUpdate();
            if (this.traceData.taken) {
                await view.move("alu-r", "mepc", rx);
            }
            else {
                await view.move("pc-i", "mepc", incPcx);
            }
        }
        else if (this.traceData.instr.name === "mret") {
            await view.move("mepc", "pc", toHex(this.cpu.mepc));
        }
        else if (this.traceData.taken) {
            await view.move("alu-r", "pc", rx);
        }
        else {
            await view.move("pc-i", "pc", incPcx);
        }

        view.clearPaths();

        view.highlightAsm(this.cpu.pc);

        // Program counter increment.
        view.update("pc-i", toHex(this.cpu.pc + 4));
        await view.waitUpdate();

        this.setNextState("fetch");
    }

    async trace(single, oneStage) {
        switch (this.state) {
            case "fetch": {
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
            }

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
        view.update("mem" + toHex(dev.firstAddress),     toHex(dev.localRead(0, 1), 2));
        view.update("mem" + toHex(dev.firstAddress + 1), toHex(dev.localRead(1, 1), 2));
        view.update("irq", this.bus.irq());
    }
}
