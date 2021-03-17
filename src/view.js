
import {toHex} from "./int32.js";

const MEMORY_BYTES_PER_ROW = 4;
const MOVE_SPEED_MIN       = 30;      // Pixels/sec
const WRITE_DELAY_MAX      = 5000;    // ms
const ANIMATION_DELAY_MIN  = 1000/60; // ms

function resizeElt(elt, delta) {
    elt.style.height = (elt.clientHeight + delta) + "px";
}

export function moveDivider(delta) {
    resizeElt(document.querySelector(".main"), delta);
    resizeElt(document.querySelector(".io"),  -delta);
    for (const elt of document.querySelectorAll(".io .cell")) {
        resizeElt(elt, -delta);
    }
}

export function resize() {
    // Preserve the scrolling in the memory and register table wrappers
    // (this will not work if the font size changes).
    const memWrapper   = document.querySelector("#cell-memory .tbl-wrapper");
    const memScrollTop = memWrapper.scrollTop;
    const xWrapper     = document.querySelector("#cell-x .tbl-wrapper");
    const xScrollTop   = xWrapper.scrollTop;

    // Reset the "register" cell to the top of the window.
    const regH1 = document.querySelector("#cell-x h1");
    regH1.style["padding-top"] = 0;

    // Reset all spacers.
    document.querySelectorAll(".spacer").forEach(elt => elt.style.height = "0px");

    // Make sure the divider is visible
    const dividerBottom = document.querySelector(".divider").getBoundingClientRect().bottom;
    let delta = window.innerHeight - dividerBottom;
    if (delta < 0) {
        moveDivider(delta);
    }

    // Set memory table height to its maximum in its parent grid cell.
    const memBottom  = memWrapper.getBoundingClientRect().bottom;
    const mainBottom = document.querySelector(".divider").getBoundingClientRect().top;
    resizeElt(memWrapper, mainBottom - memBottom);

    // Set register table height to its maximum in its parent grid cell.
    const xBottom = xWrapper.getBoundingClientRect().bottom;
    resizeElt(xWrapper, mainBottom - xBottom);

    // Restore the scrolling of the memory view and register views.
    memWrapper.scrollTop = memScrollTop;
    xWrapper.scrollTop   = xScrollTop;

    // Center the contents of the "register" cell vertically.
    delta = mainBottom - document.querySelector("#cell-x table").getBoundingClientRect().bottom;
    regH1.style["padding-top"] = (delta / 2) + "px";

    // Resize the spacer in the "PC" cell to justify its contents vertically.
    delta = mainBottom - document.querySelector("#cell-pc table:last-child").getBoundingClientRect().bottom - 10;
    resizeElt(document.querySelector("#cell-pc .spacer"), delta);

    // Resize the spacer in the "ALU" cell to justify its contents vertically.
    delta = mainBottom - document.querySelector("#cell-alu table:last-child").getBoundingClientRect().bottom - 10;
    resizeElt(document.querySelector("#cell-alu .spacer"), delta);

    // TODO Move these to devices/text.js
    document.getElementById("text-input").style.width  =
    document.getElementById("text-output").style.width = memWrapper.clientWidth + "px";

    // Center the contents of the "bus" cell vertically.
    const busH1 = document.querySelector("#cell-bus h1");
    busH1.style["padding-top"] = 0;
    delta = mainBottom - document.querySelector("#cell-bus table").getBoundingClientRect().bottom;
    busH1.style["padding-top"] = (delta / 2) + "px";

    resizePath("x", "alu-a", {style: "bus2", fromYId: "alu-a", labelFrom: "x[rs1]"});
    resizePath("x", "cmp-a", {style: "bus2", fromYId: "alu-a"});

    const xmXrs2 = resizePath("x",  "alu-b", {style: "bus1", fromYId: "alu-b", fromWeight: 2, labelFrom: "x[rs2]"});
                   resizePath("x",  "cmp-b", {style: "bus1", fromYId: "alu-b", xm: xmXrs2});
                   resizePath("x",  "data",  {style: "bus1", fromYId: "alu-b", xm: xmXrs2, toYOffset: -0.5});

    const xmAluR = resizePath("alu-r", "pc",   {style: "bus1", toYOffset: 0.5});
                   resizePath("alu-r", "mepc", {style: "bus1", xm: xmAluR});
                   resizePath("alu-r", "addr", {style: "bus1", xm: xmAluR, toYOffset: 0.5});
                   resizePath("alu-r", "x",    {style: "bus3", fromWeight: 2, toYId: "irq", toYOffset: -0.6, labelTo: "x[rd]"});

    const xmPc = resizePath("pc", "alu-a", {style: "bus2", fromYOffset: -0.5, toWeight: 2});
                 resizePath("pc", "addr",  {style: "bus1", toYOffset: -0.5});

    const xmData = resizePath("data", "instr", {style: "bus3", fromYOffset: 0.5});
                   resizePath("data", "x",     {style: "bus3", toYId: "irq", xm: xmData, fromYOffset: 0.5, toYOffset: 0.6});

    resizePath("pc-i", "x",     {style: "bus3", toYId: "irq", xm: 2 * xmAluR - xmPc});
    resizePath("imm",  "alu-b", {style: "bus2", toWeight: 2});

    const xmMem = resizePath("data",  "mem",  {style: "bus1", fromYId: "data"});
                  resizePath("mem",   "data", {style: "bus1", toYId:   "mem"});

    resizePath("memb0000001", "irq", {style: "bus1", xm: xmMem});
}

function resizePath(fromId, toId, {fromYOffset=0, toYOffset=0, fromYId=fromId, toYId=toId, fromWeight=1, toWeight=1, xm, style, labelFrom, labelTo} = {}) {
    const pathOffset = 9;

    function rect(id) {
        let elt = document.getElementById(id);
        if (elt.tagName === "TD") {
            elt = elt.parentNode;
        }
        return elt.getBoundingClientRect();
    }

    const fromRect  = rect(fromId);
    const fromYRect = rect(fromYId);
    const toRect    = rect(toId);
    const toYRect   = rect(toYId);

    let x1, x2;
    if (fromRect.right < toRect.left) {
        x1 = fromRect.right + pathOffset;
        x2 = toRect.left    - pathOffset;
    }
    else {
        x1 = fromRect.left - pathOffset;
        x2 = toRect.right  + pathOffset;
    }

    const y1 = Math.round((fromYRect.top + fromYRect.bottom) / 2 + fromYOffset * 10);
    const y2 = Math.round((toYRect.top   + toYRect.bottom)   / 2 + toYOffset   * 10);

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
    const row = document.querySelector("#cell-memory tbody tr");
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
    for (let e of document.querySelectorAll(".asm")) {
        e.classList.remove("active");
    }
    const cell = document.getElementById("asm" + toHex(address));
    if (cell) {
        cell.classList.add("active");
        scrollIntoView(cell);
    }
}

function highlightPath(pathPrefix) {
    clearPaths();
    const pathElt = document.getElementById(pathPrefix + "-path");
    if (pathElt) {
        pathElt.classList.add("active");
        pathElt.parentNode.appendChild(pathElt);
    }
}

function selectAll(evt) {
    const range = document.createRange();
    range.selectNodeContents(evt.target);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
}

export function setupRegister(id, {onInput, onBlur}) {
    const elt = document.getElementById(id);

    elt.setAttribute("contenteditable", "true");
    elt.setAttribute("spellcheck",      "false");

    elt.addEventListener("focus", selectAll);

    let changed = false;

    elt.addEventListener("keypress", evt => {
        if (evt.which === 13) {
            changed = true;
            evt.target.blur();
            evt.preventDefault();
        }
    });

    elt.addEventListener("blur", () => {
        const value = parseInt(elt.innerText, 16);
        if (changed && !isNaN(value)) {
            if (onBlur) {
                onBlur(value);
            }
            changed = false;
        }
    });

    elt.addEventListener("input", () => {
        changed = true;
        const value = parseInt(elt.innerText, 16);
        if (onInput && !isNaN(value)) {
            onInput(value);
        }
    });
}

export function setupEditable(id, {onFocus, onInput, onBlur}) {
    const elt = document.getElementById(id);

    elt.setAttribute("contenteditable", "true");
    elt.setAttribute("spellcheck",      "false");

    function removeTrailingLineBreak() {
        if (elt.lastChild instanceof HTMLBRElement) {
            elt.removeChild(elt.lastChild);
        }
    }

    let changed = false;
    let saved;

    elt.addEventListener("keypress", evt => {
        if (evt.which === 13) {
            evt.target.blur();
            evt.preventDefault();
        }
    });

    elt.addEventListener("focus", evt => {
        // Save the original content of this cell.
        saved   = elt.innerHTML;
        changed = false;
        if (onFocus) {
            onFocus();
        }
        // Select the text in the current cell.
        selectAll(evt);
        // Resize the view in case the instruction column width has changed.
        resize();
    });

    if (onInput) {
        elt.addEventListener("input", () => {
            removeTrailingLineBreak();
            onInput(elt.innerText);
            changed = true;
        });
    }

    elt.addEventListener("blur", () => {
        if (!changed) {
            // Restore the original content if no input occurred.
            elt.innerHTML = saved;
        }
        else if (onBlur) {
            removeTrailingLineBreak();
            onBlur(elt.innerText);
        }
        // Resize the view in case the instruction column width has changed.
        resize();
    });
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
    constructor(dev, id, ctrl, always) {
        this.device     = dev;
        this.id         = id;
        this.controller = ctrl;
        this.always     = always;
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
