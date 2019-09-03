
import * as v                  from "./virgule.js";
import {Controller}            from "./controller.js";
import {TextInput, TextOutput} from "./devices/text.js";
import {BitmapOutput}          from "./devices/bitmap.js";
import {AsmOutput}             from "./devices/asm.js";
import * as view               from "./view.js";

window.addEventListener("load", evt => {
    const memSize = 4096;

    const bus = new v.Bus();
    const mem = new v.Memory(0, memSize);
    bus.addDevice(mem);
    const asm_out = new AsmOutput(mem);
    bus.addDevice(asm_out);
    const text_in = new TextInput(0xB0000000);
    bus.addDevice(text_in);
    const text_out = new TextOutput(0xC0000000, 4);
    bus.addDevice(text_out);
    const bitmap_out = new BitmapOutput(0x00000C00, 32, 32);
    bus.addDevice(bitmap_out);
    const cpu = new v.Virgule(16, bus);

    view.registerView("asm", asm_out, false);
    view.registerView("text-output", text_out, true);
    view.registerView("bitmap-output", bitmap_out, true);

    const ctrl = new Controller(cpu, bus, mem);

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
        ctrl.onKeyDown(text_in, code);
    });

    document.getElementById("run-btn").addEventListener("click", evt => {
        if (ctrl.running) {
            ctrl.stop();
        }
        else {
            ctrl.run();
        }
    });

    async function stageTrace(evt) {
        await ctrl.trace(true, true);
    }

    document.getElementById("reset-btn").addEventListener("click", evt => ctrl.reset());
    document.getElementById("step-btn").addEventListener("click", evt => ctrl.run(true));
    document.getElementById("fetch-btn").addEventListener("click", stageTrace);
    document.getElementById("decode-btn").addEventListener("click", stageTrace);
    document.getElementById("alu-btn").addEventListener("click", stageTrace);
    document.getElementById("branch-btn").addEventListener("click", stageTrace);
    document.getElementById("write-btn").addEventListener("click", stageTrace);
    document.getElementById("pc-btn").addEventListener("click", stageTrace);

    document.getElementById("animate-cb").addEventListener("click", evt => {
        if (evt.target.checked && ctrl.running) {
            ctrl.forceUpdate();
        }
    });

    document.querySelectorAll(".brk").forEach(elt => {
        const addr = parseInt(elt.id.slice(3), 16);
        elt.addEventListener("click", evt => ctrl.toggleBreakpoint(addr));
    });

    document.querySelectorAll(".asm").forEach(elt => {
        const addr = parseInt(elt.id.slice(3), 16);
        elt.addEventListener("focus", evt => {
            ctrl.showAsm(addr);

            const range = document.createRange();
            range.selectNodeContents(elt);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        });
        elt.addEventListener("input", evt => ctrl.setAsm(addr, elt.innerHTML));
        elt.addEventListener("blur", evt => {
            ctrl.setAsm(addr, elt.innerHTML);
            view.updateDevices(true);
        });
    })
});
