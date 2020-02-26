
Virgulator
==========

Virgulator is a visual simulator for Virgule, a minimal CPU core implementation
based on the RISC-V architecture.
This simulator is intended to be used as a tool for teaching the basics of
computer architecture.

The user interface shows the structure of the datapath and animates the data
transfers between functional units.
The execution of a single instruction is decomposed into several steps (fetch,
decode, ALU, mem/reg, PC) for educational reasons, but the intent is not to
reflect a specific sequencer or pipeline implementation.
In fact, we don't plan to simulate a pipeline in more detail.

Running the simulator locally
-----------------------------

Due to the security policies in recent web browsers, some features will only work
if the simulator is served by a web server.
We provide facilities to automate the process.

Install `npm` and run the following command from the root of the source tree:

```
npm install
```

This command starts a local web server and opens the simulator in a web browser:

```
npm start
```

Development
-----------

Check the JavaScript source code:

```
npm run lint
```

This command starts a local web server and runs the unit tests from the `test` folder:

```
npm test
```

Known issues
------------

In the rightmost column of the memory view, in *ASCII* mode,
typing spaces can result in unexpected values.
