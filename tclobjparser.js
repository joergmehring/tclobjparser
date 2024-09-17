/**
 * Parser for Tcl lists and dictionaries
 * @param {String} str The string to be processed
 * @param {Array} types List of data types (list, dict and string) for the respective level
 *
 * Translatetd from George Peter Staplin's "A Mini Tcl Parser in Tcl.", version 5 (2003).
 *
 * Example::
 * @code
 * > parser = require("tclobjparser");
 * > parser("a 4711 b xyz c {This is a Test.} d {}", ["dict", "string"]);
 * { a: 4711, b: 'xyz', c: 'This is a Test.', d: null }
 * @endcode
 */
module.exports = function tclObjParser(str, type) {
  /**
   * Loading a token from the string
   * @param {String} str The string to be processed
   * @param {Object} params Parameter object (input and output) with the elements pos, token and type
   * @returns {Boolean} true = Parsing has worked, false: An error has occurred
   */
  getToken = function(str, params) {
    params.token = "";
    params.type = "unknown";
    let lastChar = null;
    let braceCount = 0, bracketCount = 0, quote = 0;

    while(params.pos < str.length) {
      let char = str.charAt(params.pos);

      if (braceCount > 0) {
        if (char === '{' && lastChar !== '\\') {
          braceCount++;
        } else if (char === '}' && lastChar !== '\\') {
          braceCount--;
        }
        if (braceCount === 0) {
          params.pos++;
          return true;
        }
        params.token += char;
      } else if (bracketCount > 0) {
        if (char === '[' && lastChar !== '\\') {
          bracketCount++;
        } else if (char === ']' && lastChar !== '\\') {
          bracketCount--;
        }
        if (bracketCount === 0) {
          params.pos++;
          return true;
        }
        params.token += char;
      } else if (quote > 0) {
        if (char === '"' && lastChar !== '\\') {
          params.pos++;
          return true;
        }
        params.token += char;
      } else {
        if (char === '{' && lastChar !== '\\') {
          params.type = "brace";
          braceCount++;
        } else if (char === '[' && lastChar !== '\\') {
          params.type = "bracket";
          bracketCount++;
        } else if (char === '"' && lastChar !== '\\') {
          params.type = "quote";
          quote = 1;
        } else if (char === ' ' || char === '\t') {
          if (params.token.length > 0) {
            return true;
          }
        } else if (char === '\n' || char === '\r' || char === ';') {
          if (params.token.length > 0) {
            return true;
          } else {
            params.type = "end";
            params.token = char;
            params.pos++;
            return true;
          }
        } else {
          params.token += char;
        }
      }
      lastChar = char;
      params.pos++
    }

    if (params.type !== "unknown") {
      console.log(`incomplete command: still in state of ${params.type}`);
      return false;
    }

    return (params.token.length > 0);
  };

  /**
   * Conversion of a value to zero, a number or a string
   * @param {String} value The value as a string
   * @returns null if the value is empty, a number if the value was a number or otherwise the string
   */
  getValue = function(value) {
    if (value.length === 0) {
      return null;
    }
    if (value.match(/^[1-9][0-9]*$/)) {
      return Number(value);
    }
    return value;
  };

  /**
   * Parsing a Tcl string that can contain lists, dictionaries and strings
   * @param {String} str The string to be processed
   * @param {Array} types List of data types (list, dict and string) for the respective level
   * @returns {Object} The object with the read-in values
   */
  parse = function(str, types, level = 0) {
    let params = {
      pos: 0,                     // Current position in the string
      token: "",                  // The recognized token
      type: ""                    // The recognized type: unknown, bracket, bracket, quote, end
    };
    let tokCount = 0;             // Number of tokens found
    let obj = null;               // Result object
    let key = null;               // Key value for dictionaries
    if (!types[level]) {
      throw new Error(`missing type at level ${level}`);
    }
    switch (types[level]) {
      case "list":
        obj = [];                 // Result is an Array
        break;
      case "dict":
        obj = {};                 // Result is an Objekt
        break;
      case "string":
        obj = "";                 // Result is a String
        break;
      default:
        throw new Error(`unknown type ${types[level]} at level ${level}`);
    }
    // For all tokens of the string ...
    while (this.getToken (str, params)) {
      switch (params.type) {
        case "end": {
          // console.log(level, "END");
          break;
        }
        case "bracket": {
          // console.log(level, "BRACKET");
          this.parse(token, types, level+1);
          break;
        }
        default: {
          // console.log(level, "TOKEN", params.token);
          switch (types[level]) {
            case "list": {
              if (types[level+1] === "string") {
                obj.push(this.getValue(params.token));
              } else {
                obj.push(this.parse(params.token, types, level+1));
              }
              break;
            }
            case "dict": {
              if (tokCount % 2 == 0) {
                key = params.token;
              } else {
                if (types[level+1] === "string") {
                  obj[key] = this.getValue(params.token);
                } else {
                  obj[key] = this.parse(params.token, types, level+1);
                }
              }
              break;
            }
            case "string": {
              obj = params.token;
              break;
            }
          }
          tokCount++;
        }
      }
    }
    // Return the created object
    return obj;
  };

  return this.parse(str, type, 0);
};
