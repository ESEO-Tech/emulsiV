
import {toHex, unsignedSlice} from "./int32.js";

export function parse(text, dest) {
    text = text.toLowerCase();

    let i = 0;
    let checksum;

    function assert(cond) {
        if (!cond) {
            throw `Error while parsing hex file. Found ${text[i]} at index ${i}.`;
        }
    }

    function parseHex() {
        const res = "0123456789abcdef".indexOf(text[i]);
        assert(res >= 0);
        i ++;
        return res;
    }

    function parseByte() {
        const res = (parseHex() << 4) | parseHex();
        checksum = (checksum + res) & 0xFF;
        return res;
    }

    function parseHalfWord() {
        return (parseByte() << 8) | parseByte();
    }

    function skipWhitespace() {
        while (" \t\r\n".indexOf(text[i]) >= 0) {
            i ++;
        }
    }

    let totalSize = 0;
    while (i < text.length) {
        assert(text[i] === ':');
        i ++;

        checksum = 0;

        const count      = parseByte();
        const address    = parseHalfWord();
        const recordType = parseByte();

        for (let n = 0; n < count; n ++) {
            const data = parseByte();
            if (recordType === 0) {
                dest.write(address + n, 1, data);
            }
        }

        parseByte();

        if (checksum) {
            throw `Checksum error. Found ${checksum}.`;
        }

        if (address + count > totalSize) {
            totalSize = address + count;
        }

        if (recordType === 1) {
            break;
        }

        skipWhitespace();
    }

    return totalSize;
}

export function generate(src, size, bytesPerLine=16) {
    let result = "";

    for (let lineAddr = 0; lineAddr < size; lineAddr += bytesPerLine) {
        // Compute the actual byte count for the current line.
        const count = Math.min(bytesPerLine, size - lineAddr);
        // Line header with ":", byte count, address and record type.
        let line = ":" + toHex(count, 2) + toHex(lineAddr, 4) + "00";
        // Initialize the checksum for this line.
        let checksum = count + (lineAddr >> 8) + (lineAddr & 0xFF);
        // This flag will be used to detect null lines.
        let hasData = false;

        for (let byteAddr = lineAddr; byteAddr < lineAddr + count; byteAddr ++) {
            const byte = src.read(byteAddr, 1);
            if (byte) {
                hasData = true;
            }
            checksum += byte;
            line += toHex(byte, 2);
        }

        // If the line contains non-zero data, append it to the result
        // with the final checksum byte.
        if (hasData) {
            result += line + toHex(unsignedSlice(-checksum, 7, 0), 2) + "\n";
        }
    }

    // Append the "end-of-file" record.
    return result + ":00000001FF";
}
