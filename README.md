# tclobjparser

### Parser for Tcl lists and dictionaries

Example:

    parser = require("tclParser");
    parser("a 4711 b xyz c {This is a Test.} d {}", ["dict", "string"]);
    { a: 4711, b: 'xyz', c: 'This is a Test.', d: null }

