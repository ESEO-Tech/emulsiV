
import {getSlice}     from "./decoder.js";
import * as i32       from "./i32.js";
import {TextOutput}   from "./devices/text.js";
import {BitmapOutput} from "./devices/bitmap.js";
import {AsmOutput}    from "./devices/asm.js";

const MEMORY_BYTES_PER_ROW = 4;
const MOVE_SPEED_MIN       = 30;      // Pixels/sec
const WRITE_DELAY_MAX      = 5000;    // ms
const ANIMATION_DELAY_MIN  = 1000/60; // ms
const MARGIN               = 10;      // px

function resize() {
    function resizeElt(elt, delta) {
        elt.style.height = (elt.clientHeight + delta) + "px";
    }

    let delta = window.innerHeight - document.getElementById("bitmap-output").getBoundingClientRect().bottom;
    resizeElt(document.querySelector("#col-memory .tbl-wrapper"), delta - MARGIN);

    const regBottom = document.querySelector("#col-x table:last-child").getBoundingClientRect().bottom;

    delta = regBottom - document.querySelector("#col-pc table:last-child").getBoundingClientRect().bottom;
    resizeElt(document.querySelector("#col-pc .spacer"), delta);

    delta = regBottom - document.querySelector("#col-alu table:last-child").getBoundingClientRect().bottom;
    resizeElt(document.querySelector("#col-alu .spacer"), delta);

    delta = regBottom - document.querySelector("#col-bus table:last-child").getBoundingClientRect().bottom;
    document.querySelector("#col-bus h1").style["padding-top"] = (delta / 2) + "px";

}

export function init(memSize) {
    const row = document.querySelector("#col-memory tr:nth-child(2)");
    for (let i = 0; i < Math.ceil(memSize / MEMORY_BYTES_PER_ROW); i ++) {
        let currentRow = row;
        if (i !== 0) {
            currentRow = row.cloneNode(true);
            row.parentNode.appendChild(currentRow);
        }

        const rowAddress = i * MEMORY_BYTES_PER_ROW;
        currentRow.querySelector("th").innerHTML = i32.toHex(rowAddress);
        currentRow.querySelectorAll("td").forEach((td, j) => {
            const prefix = j == 0 ? "asm" : "mem";
            const addr = j == 0 ? rowAddress : rowAddress + j - 1;
            td.setAttribute("id", prefix + i32.toHex(addr));
        });
    }

    document.getElementById("speed").addEventListener("change", evt => {
        const duration = WRITE_DELAY_MAX / evt.target.value;
        document.querySelectorAll(".datapath td").forEach(r => r.style.transition = `background-color ${duration}ms`);
    });

    window.addEventListener("resize", resize);

    const canvas = document.getElementById("bitmap-output");
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    resize();
}

export function reset() {
    document.querySelectorAll(".registers td").forEach(r => r.className = "");
    document.getElementById("text-output").innerHTML = "";
    document.querySelectorAll(".state-btn").forEach(elt => {
        elt.disabled = true;
        elt.classList.remove("active");
    });
}

export function enableInput(name, enable=true) {
    document.getElementById(name).disabled = !enable;
}

export function setButtonLabel(name, label) {
    document.getElementById(name + "-btn").value = label;
}

export function activateButton(name, active=true) {
    const elt = document.getElementById(name + "-btn");
    if (active) {
        elt.classList.add("active");
    }
    else {
        elt.classList.remove("active");
    }
}

export function animationsEnabled() {
    return document.getElementById("animate-cb").checked;
}

function scrollIntoView(elt) {
    const parent = elt.offsetParent.parentNode;
    if (elt.offsetTop < parent.scrollTop || elt.offsetTop + elt.offsetHeight >= parent.scrollTop + parent.clientHeight) {
        elt.scrollIntoView({behavior: "instant", block: "center"});
    }
}

export function highlightAsm(address) {
    document.querySelectorAll(".asm").forEach(e => e.classList.remove("active"));
    const cell = document.getElementById("asm" + i32.toHex(address));
    cell.classList.add("active");
    scrollIntoView(cell);
}

export function move(fromId, toId, value, slot=0) {
    if (!animationsEnabled()) {
        this.simpleUpdate(toId, value);
        return Promise.resolve();
    }

    const fromElt   = document.getElementById(fromId);
    const toElt     = document.getElementById(toId);

    scrollIntoView(fromElt);
    scrollIntoView(toElt);

    const fromRect  = fromElt.getBoundingClientRect();
    const toRect    = toElt.getBoundingClientRect();
    const movingElt = document.querySelectorAll(".moving-value")[slot];
    const speed     = MOVE_SPEED_MIN * document.getElementById("speed").value;

    movingElt.innerHTML = value;
    fromElt.className   = toElt.className = "selected";

    const dx = toRect.left - fromRect.left;
    const dy = toRect.top  - fromRect.top;
    const duration = Math.max(ANIMATION_DELAY_MIN, Math.sqrt(dx * dx + dy * dy) * 1000 / speed);

    return new Promise(resolve => {
        let start = -1;
        function step(timestamp) {
            if (start < 0) {
                start = timestamp;
            }
            const progress  = (timestamp - start) / duration;

            movingElt.style.left = (fromRect.left + dx * progress) + "px";
            movingElt.style.top  = (fromRect.top  + dy * progress) + "px";
            movingElt.style.display = "block";

            if (progress < 1) {
                requestAnimationFrame(step);
            }
            else {
                movingElt.style.display = "none";
                fromElt.className       = "";
                update(toId, value);
                resolve();
            }
        }

        requestAnimationFrame(step);
    });
}

export function delay(ms) {
    if (!animationsEnabled()) {
        ms = 0;
    }
    return new Promise(resolve => setTimeout(resolve, ms / document.getElementById("speed").value));
}

export function simpleUpdate(id, value) {
    if (value === "-") {
        value = "&mdash;";
    }
    const cell = document.getElementById(id);
    cell.innerHTML = value;
    return cell;
}

export function update(id, value) {
    const cell  = simpleUpdate(id, value);
    cell.className = "written";
    setTimeout(() => cell.className = "", WRITE_DELAY_MAX / document.getElementById("speed").value);
}

export function waitUpdate() {
    return delay(2 * WRITE_DELAY_MAX);
}

const deviceViews = [];

export function registerView(id, dev, always) {
    deviceViews.push({id, dev, always});
}

export function updateDevices(all) {
    for (let {id, dev, always} of deviceViews) {
        if (!dev.hasData() || (!all && !always)) {
            continue;
        }
        if (dev instanceof TextOutput) {
            updateTextOutput(id, dev);
        }
        else if (dev instanceof BitmapOutput) {
            updateBitmapOutput(id, dev);
        }
        else if (dev instanceof AsmOutput) {
            updateAsmOutput(id, dev);
        }
    }
}

function updateTextOutput(id, dev) {
    document.getElementById(id).innerHTML += dev.getData();
}

function updateBitmapOutput(id, dev) {
    const pixels = dev.getData();
    const canvas = document.getElementById(id);
    const scaleX = canvas.width / dev.width;
    const scaleY = canvas.height / dev.height;
    const ctx = canvas.getContext("2d");
    for (let p of pixels) {
        const red   = Math.floor(255 * getSlice(p.c, 7, 5) / 7);
        const green = Math.floor(255 * getSlice(p.c, 4, 2) / 7);
        const blue  = Math.floor(255 * getSlice(p.c, 1, 0) / 3);
        ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
        ctx.fillRect(p.x * scaleX, p.y * scaleY, scaleX, scaleY);
    }
}

function updateAsmOutput(id, dev) {
    const instrs = dev.getData();
    for (let [addr, asm] of Object.entries(instrs)) {
        simpleUpdate(id + addr, asm);
    }
}

export function enableBreakpoint(id) {
    document.getElementById(id).classList.add("break");
}

export function disableBreakpoint(id) {
    document.getElementById(id).classList.remove("break");
}
