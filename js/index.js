
import * as v       from "./virgule.js";
import {Controller} from "./controller.js";

class Output extends v.Device {
    constructor(...args) {
        super(...args);
        this.data = ""
    }

    localWrite(address, count, value) {
        this.data = String.fromCharCode(value & 0xFF);
    }

    hasData() {
        return this.data.length > 0;
    }

    getData() {
        const res = this.data;
        this.data = "";
        return res;
    }
}

class Input extends v.Memory {
    constructor(firstAddress) {
        super(firstAddress, 2);
    }

    onKeyDown(code) {
        // Data reg.
        this.localWrite(0, 1, code);
        // Status reg.
        this.localWrite(1, 1, this.localRead(1, 1) | 0x40);
    }

    irq() {
        const status = this.localRead(1, 1);
        return !!(status & 0x40) && !!(status & 0x80);
    }
}

window.addEventListener("load", evt => {
    const memSize = 1024;

    const bus = new v.Bus();
    const mem = new v.Memory(0, memSize);
    bus.addDevice(mem);
    const in_dev = new Input(0xB0000000);
    bus.addDevice(in_dev);
    const out_dev = new Output(0xC0000000, 4);
    bus.addDevice(out_dev);
    const cpu = new v.Virgule(16, bus);

    const ctrl = new Controller(cpu, mem, in_dev, out_dev);

    document.getElementById("hex-input").addEventListener("change", evt => {
        const file   = evt.target.files[0];
        const reader = new FileReader();
        reader.addEventListener("load", evt => ctrl.loadHex(reader.result));
        reader.readAsText(file);
    });

    document.getElementById("text-input").addEventListener("keydown", evt => {
        if (evt.key.length > 1) {
            return;
        }
        const code = evt.key.charCodeAt(0);
        if (code > 255) {
            return;
        }
        ctrl.onKeyDown(code);
    });

    document.getElementById("run-btn").addEventListener("click", evt => {
        if (ctrl.running) {
            ctrl.stop();
        }
        else {
            ctrl.run();
        }
    });

    document.getElementById("reset-btn").addEventListener("click", evt => ctrl.reset());
    document.getElementById("step-btn").addEventListener("click", evt => ctrl.run(true));
    document.getElementById("fetch-btn").addEventListener("click", evt => ctrl.traceFetch());
    document.getElementById("decode-btn").addEventListener("click", evt => ctrl.traceDecode());
    document.getElementById("alu-btn").addEventListener("click", evt => ctrl.traceALU());
    document.getElementById("branch-btn").addEventListener("click", evt => ctrl.traceBranch());
    document.getElementById("write-btn").addEventListener("click", evt => ctrl.traceWriteBack());
    document.getElementById("pc-btn").addEventListener("click", evt => ctrl.tracePC());
});
