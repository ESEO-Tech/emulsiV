
export function s(x) {
    return x | 0;
}

export function u(x) {
    return x >>> 0;
}

export function toHex(x, width=8) {
    return u(x).toString(16).padStart(width, "0");
}

export function getSlice(word, left, right, signed=false) {
    // Précondition : 0 <= right <= left < 32

    // Aligner le bit de gauche à conserver sur le bit 31.
    // Cette opération élimine les bits à gauche de left.
    const sl = 31 - left;
    word <<= sl;
    right += sl;
    // Aligner le bit de droite à conserver sur le bit 0.
    // Cette opération élimine les bits à droite de right.
    // Effectuer une extension de bit de signe si nécessaire.
    return signed ? s(word >> right) : u(word >>> right);
}
