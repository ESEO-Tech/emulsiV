
import * as v       from "./virgule.js";
import {Controller} from "./controller.js";
import {TextInput, TextOutput} from "./textio.js";
import {BitmapOutput} from "./bitmap.js";

window.addEventListener("load", evt => {
    const memSize = 4096;

    const bus = new v.Bus();
    const mem = new v.Memory(0, memSize);
    bus.addDevice(mem);
    const text_in = new TextInput(0xB0000000);
    bus.addDevice(text_in);
    const text_out = new TextOutput(0xC0000000, 4);
    bus.addDevice(text_out);
    const bitmap_out = new BitmapOutput(0x00000C00, 32, 32);
    bus.addDevice(bitmap_out);
    const cpu = new v.Virgule(16, bus);

    const ctrl = new Controller(cpu, mem, text_in, text_out, bitmap_out);

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
