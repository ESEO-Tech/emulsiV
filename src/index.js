
import {Bus, Memory, Processor}         from "./virgule.js";
import {Controller}                     from "./controller.js";
import {TextInput, TextInputView,
       TextOutput, TextOutputView}      from "./devices/text.js";
import {GPIO, GPIOConfig, GPIOView}     from "./devices/gpio.js";
import {BitmapOutput, BitmapOutputView} from "./devices/bitmap.js";
import {AsmOutput, AsmOutputView}       from "./devices/assembly.js";
import * as view                        from "./view.js";
import {toHex}                          from "./int32.js";
import * as url                         from "./url.js";
import * as hex                         from "./hex.js";

window.addEventListener("load", async () => {
    const memSize = 4096;

    const bus  = new Bus();
    const cpu  = new Processor(16, bus);
    const mem  = new Memory(0, memSize);
    const ctrl = new Controller(cpu, bus, mem);
    bus.addDevice(mem);

    const asmOut     = new AsmOutput(mem);
    const asmOutView = new AsmOutputView(asmOut, "asm", ctrl, false);
    bus.addDevice(asmOut);
    view.addDeviceView(asmOutView);

    const textIn = new TextInput(0xB0000000);
    const textInView = new TextInputView(textIn, "text-input", ctrl, true);
    bus.addDevice(textIn);
    view.addDeviceView(textInView);

    const textOut = new TextOutput(0xC0000000, 4);
    const textOutView = new TextOutputView(textOut, "text-output", ctrl, true);
    bus.addDevice(textOut);
    view.addDeviceView(textOutView);

    const gpio = new GPIO(0xD0000000, 20);
    const gpioView = new GPIOView(gpio, "gpio", ctrl, true);
    const gpioConfig = new GPIOConfig(memSize, 32, gpioView);
    bus.addDevice(gpio);
    bus.addDevice(gpioConfig);
    view.addDeviceView(gpioView);

    const bitmapOut = new BitmapOutput(0x00000C00, 32, 32);
    const bitmapOutView = new BitmapOutputView(bitmapOut, "bitmap-output", ctrl, true);
    bus.addDevice(bitmapOut);
    view.addDeviceView(bitmapOutView);

    view.init(mem.size);

    ctrl.reset();

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
        loadExample("hello-asm/hello.hex");
    }

    /* ---------------------------------------------------------------------- *
       Event handlers for toolbar elements.
     * ---------------------------------------------------------------------- */

    document.getElementById("examples-sel").addEventListener("change", async evt => {
        if (evt.target.value) {
            loadExample(evt.target.value);
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
                view.updateDeviceViews(true);
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
            if (elt.lastChild instanceof HTMLBRElement) {
                elt.removeChild(elt.lastChild);
            }
            ctrl.setAsm(addr, elt.innerText.replace(/\u00a0/g, " ").replace(/\ufffd/g, "\u0000"));
            changed = true;
        });

        blurOnEnter(elt);

        elt.addEventListener("blur", () => {
            if (changed) {
                // Update all devices that map to memory, inclding the assembly view.
                view.updateDeviceViews(true);
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
    document.getElementById("alt-mem-view-sel").addEventListener("change", evt => {
        asmOut.refresh();
        asmOutView.format = evt.target.value;
        asmOutView.update();
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
        const hash = url.encode(hex.generate(bus, mem.size + gpioConfig.size));
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
        const blob = new Blob([hex.generate(bus, mem.size + gpioConfig.size)], {type: "text/plain;charset=utf-8"});
        saveAs(blob, "program.hex");
    });

    document.getElementById("open-btn").addEventListener("click", () => {
        document.getElementById("hex-input").click();
    });

    /* ---------------------------------------------------------------------- *
       Event handlers for the canvas.
     * ---------------------------------------------------------------------- */

    document.getElementById(bitmapOutView.id).addEventListener("click", evt => {
        const {x, y} = bitmapOutView.getXY(evt.clientX, evt.clientY);
        const address = bitmapOut.firstAddress + x + y * bitmapOut.width;
        view.highlightMemoryCell("mem" + toHex(address));
    });

    console.log("Ready");
});
