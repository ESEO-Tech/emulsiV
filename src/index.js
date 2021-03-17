
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
    const cpu  = new Processor(32, bus);
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
       Event handlers for the divider.
     * ---------------------------------------------------------------------- */

    const divider = document.querySelector("hr.divider");

    divider.addEventListener("mousedown", evt => {
        if (evt.button !== 0) {
            return;
        }

        let lastY = evt.clientY;

        document.querySelector(".io").classList.add("resizing");

        function dividerDrag(evt) {
            view.moveDivider(evt.clientY - lastY)
            lastY = evt.clientY;
        }

        document.documentElement.addEventListener("mousemove", dividerDrag);

        document.documentElement.addEventListener("mouseup", evt => {
            if (evt.button === 0) {
                document.documentElement.removeEventListener("mousemove", dividerDrag);
                document.querySelector(".io").classList.remove("resizing");
                view.resize();
            }
        });
    });

    window.addEventListener("resize", view.resize);

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

    // Memory.
    for (let elt of document.querySelectorAll("#mem .reg")) {
        const addr = parseInt(elt.id.slice(3), 16);
        view.setupRegister(elt.id, {
            onInput(value) {
                // Update the content of the current cell while typing.
                bus.write(addr, 1, value);
                // Update the device views that are mapped to memory.
                view.updateDeviceViews(true);
            },
            onBlur() {
                // Accept and format the last content of the current cell.
                view.simpleUpdate(elt.id, toHex(bus.read(addr, 1), 2));
            }
        });
    }

    // Assembly/user-friendly view.
    for (let elt of document.querySelectorAll(".asm")) {
        const addr = parseInt(elt.id.slice(3), 16);
        view.setupEditable(elt.id, {
            onFocus() {
                // Show the raw instruction in the current cell, removing any markup.
                ctrl.showAsm(addr);
            },
            onInput(text) {
                // Update the memory content while typing.
                ctrl.setAsm(addr, text.replace(/\u00a0/g, " ").replace(/\ufffd/g, "\u0000"));
            },
            onBlur(text) {
                // Update all devices that map to memory, inclding the assembly view.
                view.updateDeviceViews(true);
            }
        });
    }

    // Alternative memory view format change
    document.getElementById("alt-mem-view-sel").addEventListener("change", evt => {
        asmOut.refresh();
        asmOutView.format = evt.target.value;
        asmOutView.update();
        view.resize();
    });

    // General-purpose registers.
    for (let elt of document.querySelectorAll("#x .reg")) {
        const addr = parseInt(elt.id.slice(1));
        view.setupRegister(elt.id, {
            onBlur(value) {
                cpu.setX(addr, value);
                view.simpleUpdate(elt.id, toHex(cpu.x[addr]));
            }
        });
    }

    // Program counter.
    view.setupRegister("pc", {
        onInput(value) {
            // Update the the "next PC" value while typing.
            view.simpleUpdate("pc-i", toHex(value + 4));
        },
        onBlur(value) {
            // Accept and format the content of the current cell.
            cpu.setPc(value);
            view.simpleUpdate("pc", toHex(cpu.pc));
            // Highlight the row corresponding to the current instruction
            // in the memory view.
            view.highlightAsm(cpu.pc);
        }
    });

    // Machine exception return address.
    view.setupRegister("mepc", {
        onBlur(value) {
            cpu.mepc = value;
            view.simpleUpdate("mepc", toHex(cpu.mepc));
        }
    });

    // Toggle breakpoints.
    for (let elt of document.querySelectorAll(".brk")) {
        const addr = parseInt(elt.id.slice(3), 16);
        elt.addEventListener("click", () => ctrl.toggleBreakpoint(addr));
    }

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
        const hexInput = document.getElementById("hex-input");
        hexInput.value = "";
        hexInput.click();
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
