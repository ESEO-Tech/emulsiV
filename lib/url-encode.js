#!/usr/bin/env node

const fs = require("fs");

const hex = fs.readFileSync(process.argv[2], {encoding: "ascii"});

const result = hex.trim().split(/\s+/)
    .map(l => {
        const buffer = Buffer.alloc((l.length - 1) / 2);
        for (let i = 1; i < l.length; i += 2) {
            buffer[(i - 1) / 2] = parseInt(l.slice(i, i + 2), 16);
        }
        return buffer.toString("base64");
    })
    .join(":");

process.stdout.write(result);
