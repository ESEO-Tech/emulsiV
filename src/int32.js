
export function signed(x) {
    return x | 0;
}

export function unsigned(x) {
    return x >>> 0;
}

export function toHex(x, width=8) {
    return unsigned(x).toString(16).padStart(width, "0");
}

export function signedSlice(word, left, right, pos=0) {
    // Précondition : 0 <= right <= left < 32

    // Aligner le bit de gauche à conserver sur le bit 31.
    // Cette opération élimine les bits à gauche de left.
    const sl = 31 - left;
    word <<= sl;
    // Aligner le bit de droite à conserver sur le bit 0.
    // Cette opération élimine les bits à droite de right
    // et effectuer une extension de bit de signe.
    word >>= right + sl;
    // Décaler à nouveau vers la gauche pour amener le résultat
    // à la position souhaitée.
    return word << pos;
}

export function unsignedSlice(word, left, right, pos=0) {
    // Précondition : 0 <= right <= left < 32

    // Aligner le bit de gauche à conserver sur le bit 31.
    // Cette opération élimine les bits à gauche de left.
    const sl = 31 - left;
    word <<= sl;
    // Aligner le bit de droite à conserver sur le bit 0.
    // Cette opération élimine les bits à droite de right.
    word >>>= right + sl;
    // Décaler à nouveau vers la gauche pour amener le résultat
    // à la position souhaitée.
    return word << pos;
}
