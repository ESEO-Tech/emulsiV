
import {toHex} from "./int32.js";

export function encode(hex) {
    return "#" + hex.trim().split(/\s+/).map(l => {
        let buffer = "";
        for (let i = 1; i < l.length; i += 2) {
            buffer += String.fromCharCode(parseInt(l.slice(i, i + 2), 16));
        }
        return btoa(buffer);
    }).join(":");
}

export function decode(hash) {
    return hash.slice(1).split(":").map(l => {
        return ":" + atob(l).split("").map(b => toHex(b.charCodeAt(0), 2)).join("");
    }).join("\n");
}
