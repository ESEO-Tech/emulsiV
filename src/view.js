
import {toHex} from "./int32.js";

const MEMORY_BYTES_PER_ROW = 4;
const MOVE_SPEED_MIN       = 30;      // Pixels/sec
const WRITE_DELAY_MAX      = 5000;    // ms
const ANIMATION_DELAY_MIN  = 1000/60; // ms

export function resize() {
    function resizeElt(elt, delta) {
        elt.style.height = (elt.clientHeight + delta) + "px";
    }

    // Preserve the scrolling in the memory table wrapper.
    const tblWrapper = document.querySelector("#cell-memory .tbl-wrapper");
    const tblWrapperScrollTop = tblWrapper.scrollTop;

    // Reset the "register" cell to the top of the window.
    const regH1 = document.querySelector("#cell-x h1");
    regH1.style["padding-top"] = 0;

    // Reset all spacers.
    document.querySelectorAll(".spacer").forEach(elt => elt.style.height = "0px");

    // Set memory table height to its maximum in its parent grid cell.
    const memBottom = tblWrapper.getBoundingClientRect().bottom;
    const ioTop     = document.querySelector(".io").getBoundingClientRect().top;
    resizeElt(tblWrapper, ioTop - memBottom);

    // Restore the scrolling of the memory view.
    tblWrapper.scrollTop = tblWrapperScrollTop;

    // Center the contents of the "register" cell vertically.
    let delta = ioTop - document.querySelector("#cell-x table").getBoundingClientRect().bottom;
    regH1.style["padding-top"] = (delta / 2) + "px";

    // Resize the spacer in the "PC" cell to justify its contents vertically.
    delta = ioTop - document.querySelector("#cell-pc table:last-child").getBoundingClientRect().bottom - 10;
    resizeElt(document.querySelector("#cell-pc .spacer"), delta);

    // Resize the spacer in the "ALU" cell to justify its contents vertically.
    delta = ioTop - document.querySelector("#cell-alu table:last-child").getBoundingClientRect().bottom - 10;
    resizeElt(document.querySelector("#cell-alu .spacer"), delta);

    // TODO Move these to devices/text.js
    document.getElementById("text-input").style.width  =
    document.getElementById("text-output").style.width = tblWrapper.clientWidth + "px";

    // Center the contents of the "bus" cell vertically.
    const busH1 = document.querySelector("#cell-bus h1");
    busH1.style["padding-top"] = 0;
    delta = ioTop - document.querySelector("#cell-bus table").getBoundingClientRect().bottom;
    busH1.style["padding-top"] = (delta / 2) + "px";

    const xmXrs1 = resizePath("xrs1", "alu-a", {style: "bus2", fromWeight: 3, labelFrom: "x[rs1]"});
                   resizePath("xrs1", "cmp-a", {style: "bus2", xm: xmXrs1});

    const xmXrs2 = resizePath("xrs2",  "alu-b", {style: "bus1", labelFrom: "x[rs2]"});
                   resizePath("xrs2",  "cmp-b", {style: "bus1", xm: xmXrs2});
                   resizePath("xrs2",  "data",  {style: "bus1", xm: xmXrs2, toYOffset: -0.5});

    const xmAluR = resizePath("alu-r", "pc",   {style: "bus1", toYOffset: 0.5});
                   resizePath("alu-r", "mepc", {style: "bus1", xm: xmAluR});
                   resizePath("alu-r", "addr", {style: "bus1", xm: xmAluR, toYOffset: 0.5});
                   resizePath("alu-r", "xrd",  {style: "bus3", fromWeight: 2, toYOffset: -0.6, labelTo: "x[rd]"});

    const xmXrd = 2 * xmAluR - resizePath("pc", "alu-a", {style: "bus2", fromYOffset: -0.5, toWeight: 2});
                               resizePath("pc", "addr",  {style: "bus1", toYOffset: -0.5});

    resizePath("data", "xrd",   {style: "bus3", xm: xmXrd - (xmAluR - xmXrd), fromYOffset: 0.5, toYOffset: 0.6});
    resizePath("data", "instr", {style: "bus3", fromYOffset: 0.5});

    resizePath("pc-i", "xrd",   {style: "bus3", xm: xmXrd});
    resizePath("imm",  "alu-b", {style: "bus2", toWeight: 2});

    const xmMem = resizePath("data",  "mem",  {style: "bus1", horizontalFrom: true});
                  resizePath("mem",   "data", {style: "bus1", horizontalTo: true});

    resizePath("memb0000001", "irq", {style: "bus1", xm: xmMem});
}

function resizePath(fromId, toId, {fromYOffset=0, toYOffset=0, fromWeight=1, toWeight=1, xm, horizontalFrom=false, horizontalTo=false, style, labelFrom, labelTo} = {}) {
    const pathOffset = 9;

    let fromElt = document.getElementById(fromId);
    if (fromElt.tagName === "TD") {
        fromElt = fromElt.parentNode;
    }
    const fromRect = fromElt.getBoundingClientRect();

    let toElt = document.getElementById(toId);
    if (toElt.tagName === "TD") {
        toElt = toElt.parentNode;
    }
    const toRect   = toElt.getBoundingClientRect();

    let x1, x2;
    if (fromRect.right < toRect.left) {
        x1 = fromRect.right + pathOffset;
        x2 = toRect.left - pathOffset;
    }
    else {
        x1 = fromRect.left - pathOffset;
        x2 = toRect.right + pathOffset;
    }

    let y1 = (fromRect.top + fromRect.bottom) / 2 + fromYOffset * 10;
    let y2 = (toRect.top + toRect.bottom) / 2 + toYOffset * 10;
    if (horizontalFrom) {
        y2 = y1;
    }
    else if (horizontalTo) {
        y1 = y2;
    }

    if (xm === undefined) {
        xm = (x1 * fromWeight + x2 * toWeight) / (fromWeight + toWeight);
    }

    function getSVGElement(id, tag, onCreate) {
        let elt = document.getElementById(id);
        if (!elt) {
            elt = document.createElementNS("http://www.w3.org/2000/svg", tag);
            elt.setAttribute("id", id);
            if (onCreate) {
                onCreate(elt);
            }
            document.querySelector("svg").appendChild(elt);
        }
        return elt;
    }

    const pathElt  = getSVGElement(`${fromId}-${toId}-path`, "path");
    pathElt.setAttribute("d", `M${x1} ${y1} L${xm} ${y1} L${xm} ${y2} L${x2} ${y2}`);

    if (style) {
        pathElt.classList.add(style);
    }

    if (labelFrom) {
        const textElt = getSVGElement(`${fromId}-${toId}-from-label`, "text", e => e.innerHTML = labelFrom);
        textElt.setAttribute("x", x1);
        textElt.setAttribute("y", y1 - 6);
        textElt.style = x1 < x2 ? "text-anchor: start;" :  "text-anchor: end;";
    }

    if (labelTo) {
        const textElt = getSVGElement(`${fromId}-${toId}-to-label`, "text", e => e.innerHTML = labelTo);
        textElt.setAttribute("x", x2);
        textElt.setAttribute("y", y2 - 6);
        textElt.style = x2 < x1 ? "text-anchor: start;" :  "text-anchor: end;";
    }

    return xm;
}

export function clearPaths() {
    document.querySelectorAll("path").forEach(e => e.classList.remove("active"));
}

export function init(memSize) {
    const row = document.querySelector("#cell-memory tr:nth-child(2)");
    for (let i = 0; i < Math.ceil(memSize / MEMORY_BYTES_PER_ROW); i ++) {
        let currentRow = row;
        if (i !== 0) {
            currentRow = row.cloneNode(true);
            row.parentNode.appendChild(currentRow);
        }

        const rowAddress = i * MEMORY_BYTES_PER_ROW;
        const rowAddressX = toHex(rowAddress);
        currentRow.querySelector("th").innerHTML = rowAddressX;
        currentRow.querySelectorAll("td.reg").forEach((td, j) => {
            td.setAttribute("id", "mem" + toHex(rowAddress + j));
        });
        currentRow.querySelector("td.brk").setAttribute("id", "brk" + rowAddressX);
        currentRow.querySelector("td.asm").setAttribute("id", "asm" + rowAddressX);
    }

    // Make registers and assembly view editable.
    // Omit the instruction register and the device registers.
    document.querySelectorAll(".reg, .asm").forEach(elt => {
        if (elt.id !== "instr" && (!elt.id.startsWith("mem") || elt.id < "mem" + toHex(memSize))) {
            elt.setAttribute("contenteditable", "true");
            elt.setAttribute("spellcheck",      "false");
        }
    });

    clearDeviceViews();

    resize();
}

export function setAnimationSpeed(speed) {
    const duration = WRITE_DELAY_MAX / speed;
    document.querySelectorAll(".reg, .bus").forEach(elt => elt.style.transition = `background-color ${duration}ms`);
}

export function reset() {
    document.querySelectorAll(".registers td").forEach(r => r.className = "reg");
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
    const cell = document.getElementById("asm" + toHex(address));
    if (cell) {
        cell.classList.add("active");
        scrollIntoView(cell);
    }
}

function highlightPath(pathPrefix) {
    clearPaths();
    const pathElt  = document.getElementById(pathPrefix + "-path");
    if (pathElt) {
        pathElt.classList.add("active");
        pathElt.parentNode.appendChild(pathElt);
    }
}

export function move(fromId, toId, value, {slot=0, path=`${fromId}-${toId}`} = {}) {
    if (!animationsEnabled()) {
        this.update(toId, value);
        return Promise.resolve();
    }

    if (!slot) {
        highlightPath(path);
    }

    const fromElt = document.getElementById(fromId);
    const toElt   = document.getElementById(toId);

    scrollIntoView(fromElt);
    scrollIntoView(toElt);

    const fromRect  = fromElt.getBoundingClientRect();
    const toRect    = toElt.getBoundingClientRect();
    const movingElt = document.querySelectorAll(".moving-value")[slot];
    const speed     = MOVE_SPEED_MIN * document.getElementById("speed").value;

    movingElt.innerHTML = value;
    fromElt.classList.add("selected");
    toElt.classList.add("selected");

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
                fromElt.classList.remove("selected");
                toElt.classList.remove("selected");
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

export function simpleUpdate(id, value="-") {
    if (value === "-") {
        value = "&mdash;";
    }
    const cell = document.getElementById(id);
    cell.innerHTML = value;
    return cell;
}

export function update(id, value) {
    const cell  = simpleUpdate(id, value);
    cell.classList.add("written");
    setTimeout(() => cell.classList.remove("written"), WRITE_DELAY_MAX / document.getElementById("speed").value);
}

export function waitUpdate() {
    return delay(2 * WRITE_DELAY_MAX);
}

export class DeviceView {
    constructor(dev, id, always) {
        this.device = dev;
        this.id     = id;
        this.always = always;
    }

    update() {
        // Abstract
    }

    clear() {
        // Abstract
    }
}
const deviceViews = [];

export function addDeviceView(v) {
    deviceViews.push(v);
}

export function updateDeviceViews(all) {
    for (let v of deviceViews) {
        if (v.device.hasData() && (all || v.always)) {
            v.update();
        }
    }
}

export function clearDeviceViews() {
    for (let v of deviceViews) {
        v.clear();
    }
}

export function enableBreakpoint(id) {
    document.getElementById(id).classList.add("enabled");
}

export function disableBreakpoint(id) {
    document.getElementById(id).classList.remove("enabled");
}

let highlightedCell = null;

export function highlightMemoryCell(id) {
    if (highlightedCell) {
        highlightedCell.classList.remove("overview");
    }
    highlightedCell = document.getElementById(id);
    scrollIntoView(highlightedCell);
    highlightedCell.classList.add("overview");
}
