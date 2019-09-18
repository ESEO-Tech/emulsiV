
import {toHex} from "./i32.js";

export function encode(hex) {
    return hex.trim().split(/\s+/).map(l => {
        const buffer = new UInt8Array((l.length - 1) / 2);
        for (let i = 1; i < l.length; i += 2) {
            buffer[(i - 1) / 2] = parseInt(l.slice(i, i + 2), 16);
        }
        return btoa(buffer);
    }).join(":");
}

export function decode(hash) {
    return hash.slice(1).split(":").map(l => {
        return ":" + atob(l).split("").map(b => toHex(b.charCodeAt(0), 2)).join("");
    }).join("\n");
}
