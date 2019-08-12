
export function s(x) {
    return x | 0;
}

export function u(x) {
    return x >>> 0;
}

export function toHex(x, width=8) {
    return u(x).toString(16).padStart(width, "0");
}
