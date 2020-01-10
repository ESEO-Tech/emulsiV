
import * as v                  from "./virgule.js";
import {Controller}            from "./controller.js";
import {TextInput, TextOutput} from "./devices/text.js";
import {BitmapOutput}          from "./devices/bitmap.js";
import {AsmOutput}             from "./devices/assembly.js";
import * as view               from "./view.js";
import {toHex}                 from "./int32.js";
import * as url                from "./url.js";
import * as hex                from "./hex.js";

window.addEventListener("load", async () => {
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

    view.init(mem.size);
    view.registerView("asm", asm_out, false);
    view.registerView("text-output", text_out, true);
    view.registerView("bitmap-output", bitmap_out, true);

    const ctrl = new Controller(cpu, bus, mem);

    window.addEventListener("resize", () => view.resize());

    function loadExample(name) {
        const xhr = new XMLHttpRequest();
        xhr.addEventListener("load", () => {
            ctrl.loadHex(xhr.responseText);
        });
        xhr.overrideMimeType("text/plain");
        xhr.open("GET", `examples/${name}`);
        xhr.send();
    }

    if (window.location.hash.length) {
        ctrl.loadHex(url.decode(window.location.hash));
    }
    else {
        await loadExample("hello-asm/hello.hex");
    }

    /* ---------------------------------------------------------------------- *
       Event handlers for toolbar elements.
     * ---------------------------------------------------------------------- */

    document.getElementById("examples-sel").addEventListener("change", async evt => {
        if (evt.target.value) {
            await loadExample(evt.target.value);
            evt.target.value = "";
        }
    });
    document.getElementById("hex-input").addEventListener("change", evt => {
        const file   = evt.target.files[0];
        const reader = new FileReader();
        reader.addEventListener("load", () => ctrl.loadHex(reader.result));
        reader.readAsText(file);
    });

    document.getElementById("speed").addEventListener("change", evt => view.setAnimationSpeed(evt.target.value));

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

    document.getElementById("run-btn").addEventListener("click", () => {
        if (ctrl.running) {
            ctrl.stop();
        }
        else {
            ctrl.run();
        }
    });

    async function stageTrace() {
        await ctrl.trace(true, true);
    }

    document.getElementById("reset-btn").addEventListener("click", () => ctrl.reset());
    document.getElementById("step-btn").addEventListener("click", () => ctrl.run(true));
    document.getElementById("fetch-btn").addEventListener("click", stageTrace);
    document.getElementById("decode-btn").addEventListener("click", stageTrace);
    document.getElementById("compute-btn").addEventListener("click", stageTrace);
    document.getElementById("compare-btn").addEventListener("click", stageTrace);
    document.getElementById("loadStoreWriteBack-btn").addEventListener("click", stageTrace);
    document.getElementById("updatePC-btn").addEventListener("click", stageTrace);

    document.getElementById("animate-cb").addEventListener("click", evt => {
        if (evt.target.checked && ctrl.running) {
            ctrl.forceUpdate();
        }
    });

    /* ---------------------------------------------------------------------- *
       Event handlers for content-editable elements.
     * ---------------------------------------------------------------------- */

     // Select all the text in the given element.
    function selectAll(elt) {
        const range = document.createRange();
        range.selectNodeContents(elt);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }

    function blurOnEnter(elt) {
        elt.addEventListener("keypress", evt => {
            if (evt.which === 13) {
                elt.blur();
                evt.preventDefault();
            }
        });
    }

    // Memory.
    document.querySelectorAll("#mem .reg").forEach(elt => {
        const addr = parseInt(elt.id.slice(3), 16);
        elt.addEventListener("focus", () => {
            selectAll(elt);
        });

        // Update the content of the current cell while typing.
        elt.addEventListener("input", () => {
            const value = parseInt(elt.innerText, 16);
            if (!isNaN(value)) {
                bus.write(addr, 1, value);
                view.updateDevices(true);
            }
        });

        blurOnEnter(elt);

        elt.addEventListener("blur", () => {
            // Accept the last content of the current cell.
            view.simpleUpdate(elt.id, toHex(bus.read(addr, 1), 2));
        });
    });

    // Assembly/user-friendly view.
    document.querySelectorAll(".asm").forEach(elt => {
        const addr = parseInt(elt.id.slice(3), 16);
        let changed = false;
        let saved;

        elt.addEventListener("focus", () => {
            // Save the original content of this cell.
            saved   = elt.innerHTML;
            changed = false;

            // Show the raw instruction in the current cell,
            // removing any markup.
            ctrl.showAsm(addr);

            // Select the text in the current cell.
            selectAll(elt);

            // Resize the view in case the instruction column width has changed.
            view.resize();
        });

        // Update the memory content while typing.
        elt.addEventListener("input", () => {
            ctrl.setAsm(addr, elt.innerText.replace(/\u00a0/g, " ").replace(/\ufffd/g, "\u0000"));
            changed = true;
        });

        blurOnEnter(elt);

        elt.addEventListener("blur", () => {
            if (changed) {
                // Update all devices that map to memory, inclding the assembly view.
                view.updateDevices(true);
            }
            else {
                // Restore the original content if no input occurred.
                elt.innerHTML = saved;
            }
            // Resize the view in case the instruction column width has changed.
            view.resize();
        });
    });

    // Alternative memory view format change
    document.getElementById("alt-mem-view-sel").addEventListener("change", () => {
        asm_out.refresh();
        view.updateDevices(true);
        view.resize();
    });

    // General-purpose registers.
    document.querySelectorAll("#x .reg").forEach(elt => {
        const addr = parseInt(elt.id.slice(1));
        elt.addEventListener("focus", () => selectAll(elt));

        // Update the content of the current register while typing.
        elt.addEventListener("input", () => {
            const value = parseInt(elt.innerText, 16);
            if (!isNaN(value)) {
                cpu.setX(addr, value);
            }
        });

        blurOnEnter(elt);

        elt.addEventListener("blur", () => {
            // Accept the last content of the current cell.
            view.simpleUpdate(elt.id, toHex(cpu.x[addr]));
        });
    });

    // Program counter.
    document.querySelectorAll("#pc").forEach(elt => {
        elt.addEventListener("focus", () => selectAll(elt));

        // Update the content of the register while typing.
        elt.addEventListener("input", () => {
            const value = parseInt(elt.innerText, 16);
            if (!isNaN(value)) {
                cpu.setPc(value);
                view.simpleUpdate("pc-i", toHex(cpu.pc + 4));
            }
        });

        blurOnEnter(elt);

        elt.addEventListener("blur", () => {
            // Accept the last content of the current cell.
            view.simpleUpdate(elt.id, toHex(cpu.pc));
            view.highlightAsm(cpu.pc);
        });
    });

    // Machine exception return address.
    document.querySelectorAll("#mepc").forEach(elt => {
        elt.addEventListener("focus", () => selectAll(elt));

        // Update the content of the register while typing.
        elt.addEventListener("input", () => {
            const value = parseInt(elt.innerText, 16);
            if (!isNaN(value)) {
                cpu.mepc = value;
            }
        });

        blurOnEnter(elt);

        elt.addEventListener("blur", () => {
            // Accept the last content of the current cell.
            view.simpleUpdate(elt.id, toHex(cpu.mepc));
        });
    });

    // Toggle breakpoints.
    document.querySelectorAll(".brk").forEach(elt => {
        const addr = parseInt(elt.id.slice(3), 16);
        elt.addEventListener("click", () => ctrl.toggleBreakpoint(addr));
    });

    /* ---------------------------------------------------------------------- *
       Event handlers for font size buttons.
     * ---------------------------------------------------------------------- */

    function updateFontSize(sel, factor) {
        const elt = document.querySelector(sel);
        const fontSizePx = parseFloat(window.getComputedStyle(elt)["font-size"].slice(0, -2));
        console.log(fontSizePx);
        elt.style["font-size"] = (fontSizePx * factor) + "px";
        view.resize();
    }

    document.getElementById("font-plus-btn").addEventListener("click", () => updateFontSize("body", 1.1));
    document.getElementById("font-minus-btn").addEventListener("click", () => updateFontSize("body", 1.0/1.1));

    /* ---------------------------------------------------------------------- *
       Event handlers for link generation and open/download buttons.
     * ---------------------------------------------------------------------- */

    const genLinkBtn = document.getElementById("gen-link-btn");
    if (!navigator.clipboard) {
        genLinkBtn.setAttribute("title", "Create a link to this program and copy the address into the browser's location bar.")
    }
    genLinkBtn.addEventListener("click", async () => {
        const hash = url.encode(hex.generate(bus, mem.size));
        genLinkBtn.classList.add("active");
        if (navigator.clipboard) {
            const a = document.createElement("a");
            a.href = window.location.toString();
            a.hash = hash;

            genLinkBtn.innerHTML = '<i class="far fa-clipboard"></i>';
            await navigator.clipboard.writeText(a.href);
        }
        else {
            window.location.hash = hash;
        }
        setTimeout(() => {
            genLinkBtn.classList.remove("active");
            genLinkBtn.innerHTML = '<i class="fas fa-link"></i>';
        }, 500);
    });

    document.getElementById("download-btn").addEventListener("click", () => {
        const blob = new Blob([hex.generate(bus, mem.size)], {type: "text/plain;charset=utf-8"});
        saveAs(blob, "program.hex");
    });

    document.getElementById("open-btn").addEventListener("click", () => {
        document.getElementById("hex-input").click();
    });

    /* ---------------------------------------------------------------------- *
       Event handlers for the canvas.
     * ---------------------------------------------------------------------- */

    document.getElementById("bitmap-output").addEventListener("click", evt => {
        const {x, y} = view.getBitmapOutputXY("bitmap-output", bitmap_out, evt.clientX, evt.clientY);
        const address = bitmap_out.firstAddress + x + y * bitmap_out.width;
        view.highlightMemoryCell("mem" + toHex(address));
    });

    console.log("Ready");
});
