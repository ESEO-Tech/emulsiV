
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
