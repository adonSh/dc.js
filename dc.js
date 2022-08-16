//// //// Scaled Numbers //// ////

// A number with an associated scale factor
function ScaledNum(n=0) {
  this.value = Number(n);
  this.scale = ScaledNum.scaleOf(n);

  return this;
}

//// Static methods ////

ScaledNum.scaleOf = function(n) {
  const pieces = n.toString(10).split('.');

  if (pieces.length < 2)
    return 0;

  return pieces[1].length;
}

//// Instance methods ////

ScaledNum.prototype.setScale = function(scale) {
  const pieces = this.value.toString(10).split('.');

  if (pieces.length > 1 && scale > 0) {
    this.value = Number(pieces[0] + '.' + pieces[1].slice(0, scale));
  } else {
    this.value = Number(scale < 1 ? pieces[0] : pieces[0] + '.' + '0'.repeat(scale));
  }

  this.scale = scale;
}

ScaledNum.prototype.valueOf = function() {
  return this.value;
}

ScaledNum.prototype.toString = function(radix=10) {
  const pieces = this.value.toString(radix).split('.');
  let scale = this.scale;
  if (radix != 10 && this.scale != 0) {
    scale = (10 ** this.scale).toString(radix).length;
  }

  if (scale < 1)
    return pieces[0];
  if (pieces.length < 2)
    return [pieces[0], '0'.repeat(scale)].join('.');
  if (pieces[1].length > scale)
    return [pieces[0], pieces[1].slice(0, scale)].join('.');

  return pieces.join('.') + '0'.repeat(scale - pieces[1].length);
}

//// //// The dc Abstract Machine //// ////

// Interprets and executes dc programs
function Calculator(output) {
  // Storage
  this.stack = [];
  this.registers = {}
  this.arrays = {}

  // The program being read
  this.src = '';
  this.buf = null;
  this.pos = 0;
  this.lastchar = null;
  this.level = 0;

  // Scale factor and radix for interpreting and/or displaying numbers
  this.scale = 0;
  this.ibase = 10;
  this.obase = 10;

  // Generic output object
  this.display = output;

  // Operations and commands
  this.ops = {
    ' ' : this.nop.bind(this),
    '!' : this.notCompare.bind(this),
    '#' : this.comment.bind(this),
    '%' : this.mod.bind(this),
    '*' : this.mul.bind(this),
    '+' : this.add.bind(this),
    '-' : this.sub.bind(this),
    '.' : this.parseNumber.bind(this),
    '/' : this.div.bind(this),
    '0' : this.parseNumber.bind(this),
    '1' : this.parseNumber.bind(this),
    '2' : this.parseNumber.bind(this),
    '3' : this.parseNumber.bind(this),
    '4' : this.parseNumber.bind(this),
    '5' : this.parseNumber.bind(this),
    '6' : this.parseNumber.bind(this),
    '7' : this.parseNumber.bind(this),
    '8' : this.parseNumber.bind(this),
    '9' : this.parseNumber.bind(this),
    ':' : this.storeArray.bind(this),
    ';' : this.loadArray.bind(this),
    '<' : this.less.bind(this),
    '=' : this.equal.bind(this),
    '>' : this.greater.bind(this),
    'A' : this.parseNumber.bind(this),
    'B' : this.parseNumber.bind(this),
    'C' : this.parseNumber.bind(this),
    'D' : this.parseNumber.bind(this),
    'E' : this.parseNumber.bind(this),
    'F' : this.parseNumber.bind(this),
    'G' : this.equalNumbers.bind(this),
    'I' : this.getIbase.bind(this),
    'K' : this.getScale.bind(this),
    'L' : this.loadStack.bind(this),
    'N' : this.not.bind(this),
    'O' : this.getObase.bind(this),
    'P' : this.popPrint.bind(this),
    'R' : this.drop.bind(this),
    'S' : this.storeStack.bind(this),
    'X' : this.pushScale.bind(this),
    'Z' : this.numDigits.bind(this),
    '[' : this.pushLine.bind(this),
    '\f': this.nop.bind(this),
    '\n': this.nop.bind(this),
    '\r': this.nop.bind(this),
    '\t': this.nop.bind(this),
    '^' : this.exp.bind(this),
    '_' : this.parseNumber.bind(this),
    'a' : this.toASCII.bind(this),
    'c' : this.clearStack.bind(this),
    'd' : this.dup.bind(this),
    'f' : this.printStack.bind(this),
    'i' : this.setIbase.bind(this),
    'k' : this.setScale.bind(this),
    'l' : this.load.bind(this),
    'n' : this.popPrintn.bind(this),
    'o' : this.setObase.bind(this),
    'p' : this.printTOS.bind(this),
    'r' : this.swap.bind(this),
    's' : this.store.bind(this),
    'v' : this.sqrt.bind(this),
    'x' : this.evalTOS.bind(this),
    'z' : this.stackDepth.bind(this),
  };

  return this;
}

//// Stack functions ////

Calculator.prototype.popNumber = function() {
  if (this.stack.length < 1) {
    this.warn('stack empty');
    return null;
  }

  if (isNaN(this.stack[this.stack.length-1])) {
    this.warn('not a number');
    return null;
  }

  return this.stack.pop();
}

Calculator.prototype.pop = function() {
  if (this.stack.length < 1) {
    this.warn('stack empty');
    return null;
  }

  return this.stack.pop();
}

Calculator.prototype.push = function(val) {
  this.stack.push(val);
}

//// Program interpreter functions //// 

Calculator.prototype.warn = function(msg) {
  this.display.write(`dc: ${msg}`);
}

Calculator.prototype.readCh = function() {
  if (this.pos >= this.src.length) {
    this.lastchar = null;
  } else {
    this.lastchar = this.src[this.pos++];
  }

  return this.lastchar;
}

// Cannot unread once the program has terminated
Calculator.prototype.unreadCh = function() {
  if (this.pos > 0 && this.lastchar != null)
    this.lastchar = this.src[--this.pos];
}

Calculator.prototype.eval = function(src) {
  this.src = src.toString();
  this.pos = 0;

  // Continue parsing any string left in the buffer before evaluating anything
  if (this.buf != null)
    this.pushLine();

  for (;;) {
    const ch = this.readCh();
    if (ch === null) {
      break;
    }

    if (ch in this.ops) {
      this.ops[ch]();
      continue;
    }

    const oct = ch.charCodeAt(0).toString(8);
    this.warn(`'${ch}' (0${oct}) is unimplemented`);
  }
}

//// Functions for operations and commands ////

Calculator.prototype.compare = function(type, not) {
  const reg = this.readCh();
  const a = this.popNumber();
  if (a === null)
    return;
  const b = this.popNumber();
  if (b === null)
    return;

  let exec = false;
  switch (type) {
  case '<':
    exec = (a.valueOf() < b.valueOf());
    break;
  case '>':
    exec = (a.valueOf() > b.valueOf());
    break;
  case '=':
    exec = (a.valueOf() === b.valueOf());
    break;
  }

  if (not)
    exec = !exec;

  if (exec) {
    if (!(reg in this.registers))
      this.registers[reg] = [];
    const resume = this.src.slice(this.pos);
    const tos = this.registers[reg].length - 1;
    this.eval(tos < 0 ? '0' : this.registers[reg][tos].toString());
    this.eval(resume);
  }
}

Calculator.prototype.loadArray = function() {
  const reg = this.readCh();
  const idx = this.pop();
  if (idx === null)
    return;
  if (isNaN(idx)) {
    this.warn('array index must be a nonnegative integer');
    return;
  }
  if (idx < 0) {
    this.warn('array index must be a nonnegative integer');
    return;
  }

  if (!(reg in this.registers)) {
    this.registers[reg] = [];
    this.arrays[reg] = [];
  }

  const tos = this.arrays[reg].length - 1;
  if (tos < 0) {
    this.push(new ScaledNum(0));
    return;
  }
  if (!(idx in this.arrays[reg][tos])) {
    this.push(new ScaledNum(0));
    return;
  }

  this.push(this.arrays[reg][tos][idx]);
}

Calculator.prototype.storeArray = function() {
  const reg = this.readCh();
  const idx = this.pop();
  if (idx === null)
    return;
  if (isNaN(idx)) {
    this.warn('array index must be a nonnegative integer');
    return;
  }
  if (idx < 0) {
    this.warn('array index must be a nonnegative integer');
    return;
  }
  const val = this.pop();
  if (val === null)
    return;

  if (!(reg in this.registers)) {
    this.registers[reg] = [];
    this.arrays[reg] = [];
  }

  const tos = this.arrays[reg].length - 1;
  if (tos < 0) {
    this.arrays[reg].push([]);
    this.arrays[reg][0][idx] = val;
    return;
  }
  this.arrays[reg][tos][idx] = val;
}

Calculator.prototype.equal = function() {
  this.compare('=', false);
}

Calculator.prototype.greater = function() {
  this.compare('>', false);
}

Calculator.prototype.less = function() {
  this.compare('<', false);
}

Calculator.prototype.pushScale = function() {
  const val = this.pop();
  if (val === null)
    return;

  this.push(new ScaledNum(isNaN(val) ? 0 : val.scale));
}

Calculator.prototype.popPrintn = function() {
  const val = this.pop();
  if (val === null)
    return;

  this.display.newline = false;
  this.display.write(val);
  this.display.newline = true;
}

Calculator.prototype.popPrint = function() {
  const val = this.pop();
  if (val === null)
    return;

  this.display.newline = false;
  this.display.write(isNaN(val) ? val : String.fromCharCode(val));
  this.display.newline = true;
}

Calculator.prototype.not = function() {
  const a = this.popNumber();
  if (a === null)
    return;

  this.push(new ScaledNum(a.valueOf() === 0 ? 1 : 0));
}

Calculator.prototype.notCompare = function() {
  const peek = this.readCh();

  switch (peek) {
  case '<': case '>': case '=':
    this.compare(peek, true);
    break;
  default:
    this.unreadCh();
    this.warn('! command is not implemented');
    break;
  }
}

Calculator.prototype.equalNumbers = function() {
  const a = this.popNumber();
  if (a === null)
    return;
  const b = this.popNumber();
  if (b === null) {
    this.push(a);
    return;
  }

  this.push(new ScaledNum(a.valueOf() === b.valueOf() ? 1 : 0));
}

Calculator.prototype.mod = function() {
  const a = this.popNumber();
  if (a === null) {
    return;
  }
  const b = this.popNumber();
  if (b === null) {
    this.push(a);
    return;
  }

  if (a.valueOf() === 0) {
    this.warn('remainder by zero');
    this.push(b);
    this.push(a);
    return;
  }

  const c = new ScaledNum(b/a);
  c.setScale(this.scale);
  const r = new ScaledNum(b - c * a);
  r.setScale(Math.max(this.scale, a.scale, b.scale));

  this.push(r);
}

Calculator.prototype.loadStack = function() {
  const reg = this.readCh();

  if (!(reg in this.registers)) {
    this.registers[reg] = [];
    this.arrays[reg] = [];
  }
  if (this.registers[reg].length < 1) {
    if (reg === null) {
      this.warn('stack register 012 is empty');
    } else {
      const oct = reg.charCodeAt(0).toString(8);
      this.warn(`stack register '${reg}' (0${oct}) is empty`);
    }
    return;
  }

  this.push(this.registers[reg].pop());
  this.arrays[reg].pop();
}

Calculator.prototype.storeStack = function() {
  const reg = this.readCh();
  const val = this.pop();
  if (val === null)
    return;

  if (!(reg in this.registers)) {
    this.registers[reg] = [];
    this.arrays[reg] = [];
  }

  this.registers[reg].push(val);
  this.arrays[reg].push([]);
}

Calculator.prototype.load = function() {
  const reg = this.readCh();

  if (!(reg in this.registers)) {
    this.registers[reg] = [];
    this.arrays[reg] = [];
  }

  const tos = this.registers[reg].length - 1;
  if (tos < 0) {
    this.push(new ScaledNum(0));
  } else {
    this.push(this.registers[reg][tos]);
  }
}

Calculator.prototype.store = function() {
  const reg = this.readCh();
  const val = this.pop();
  if (val === null)
    return;

  if (!(reg in this.registers)) {
    this.registers[reg] = [val];
    this.arrays[reg] = [[]];
    return;
  }

  const tos = this.registers[reg].length - 1;
  if (tos < 0) {
    this.registers[reg][0] = val;
    return;
  }

  this.registers[reg][tos] = val;
}

Calculator.prototype.evalTOS = function() {
  const src = this.pop();
  if (src === null)
    return;

  const resume = this.src.slice(this.pos);
  this.eval(src.toString());
  this.eval(resume);
}

Calculator.prototype.pushLine = function() {
  let line = this.buf != null ? this.buf : '';
  this.level += this.buf != null ? 0 : 1;
  this.buf = null;

  for (;;) {
    const ch = this.readCh();
    if (ch === null) {
//    this.warn('unterminated string');
      this.buf = line + '\n';
      return;
    }

    if (ch === '[')
      this.level++;
    if (ch === ']') {
      if (--this.level === 0)
        break;
    }

    line += ch;
  }

  this.push(line);
}

Calculator.prototype.sqrt = function() {
  const n = this.popNumber();
  if (n === null)
    return;
  if (n < 0) {
    this.warn('square root of negative number');
    return;
  }

  const r = new ScaledNum(Math.sqrt(n));
  r.setScale(Math.max(n.scale, this.scale));
  this.push(r);
}

Calculator.prototype.swap = function() {
  const a = this.pop();
  if (a === null) {
    return;
  }
  const b = this.pop();
  if (b === null) {
    this.push(a);
    return;
  }

  this.push(a);
  this.push(b);
}

Calculator.prototype.dup = function() {
  if (this.stack.length < 1) {
    this.warn('stack empty');
    return;
  }

  const tos = this.stack[this.stack.length-1];
  if (isNaN(tos)) {
    this.push(tos);
    return;
  }

  this.push(new ScaledNum(tos.valueOf()));
}

Calculator.prototype.numDigits = function() {
  const val = this.popNumber();
  if (val === null)
    return;

  if (val.valueOf() === 0) {
    this.push(new ScaledNum(val.scale));
    return;
  }

  const pieces = val.toString().split('.');
  let n = 0;
  pieces.forEach((p) => n += p.length);
  this.push(new ScaledNum(n));
}

Calculator.prototype.exp = function() {
  const a = this.popNumber();
  if (a === null) {
    return;
  }
  const b = this.popNumber();
  if (b === null) {
    this.push(a);
    return;
  }

  const pow = parseInt(a);
  if (pow != a.valueOf())
    this.warn('Runtime warning: non-zero fractional part in exponent');

  const r = new ScaledNum(b**pow);
  if (pow < 0)
    r.setScale(this.scale);
  else
    r.setScale(Math.min(a.scale*b.scale, Math.max(this.scale, b.scale)));

  this.push(r);
}

Calculator.prototype.drop = function() {
  this.pop();
}

Calculator.prototype.setObase = function() {
  const base = this.popNumber();
  if (base === null)
    return;

  if (base < 2 || base > 36) {
    this.warn('output base must be an integer at least 2 and no greater than 36');
    return;
  }

  this.obase = Math.floor(base);
}

Calculator.prototype.getObase = function() {
  this.push(new ScaledNum(this.obase));
}

Calculator.prototype.setIbase = function() {
  const base = this.popNumber();
  if (base === null)
    return;

  if (base < 2 || base > 16) {
    this.warn('input base must be a number between 2 and 16 (inclusive)');
    return;
  }

  this.ibase = Math.floor(base);
}

Calculator.prototype.getIbase = function() {
  this.push(new ScaledNum(this.ibase));
}

Calculator.prototype.comment = function() {
  this.pos = this.src.length;
}

Calculator.prototype.stackDepth = function() {
  this.push(new ScaledNum(this.stack.length));
}

Calculator.prototype.getScale = function() {
  this.push(new ScaledNum(this.scale));
}

Calculator.prototype.setScale = function() {
  const n = this.popNumber();
  if (n === null) {
    return;
  }

  if (n < 0) {
    this.warn('scale must be a nonnegative number');
    return;
  }

  this.scale = Math.floor(n);
}

Calculator.prototype.toASCII = function() {
  const val = this.pop();
  if (val === null) {
    return;
  }

  this.push(isNaN(val) ? val : String.fromCharCode(val));
}

Calculator.prototype.printStack = function() {
  for (let i = this.stack.length - 1; i >= 0; i--) {
    this.display.write(this.stack[i].toString(this.obase));
  }
}

Calculator.prototype.div = function() {
  const a = this.popNumber();
  if (a === null) {
    return;
  }
  const b = this.popNumber();
  if (b === null) {
    this.push(a);
    return;
  }

  if (a.valueOf() === 0) {
    this.warn("divide by zero");
    this.push(b);
    this.push(a);
    return;
  }

  const r = new ScaledNum(b/a);
  r.setScale(this.scale);
  this.push(r);
}

Calculator.prototype.sub = function() {
  const a = this.popNumber();
  if (a === null) {
    return;
  }
  const b = this.popNumber();
  if (b === null) {
    this.push(a);
    return;
  }

  const r = new ScaledNum(b-a);
  r.setScale(Math.max(a.scale, b.scale));
  this.push(r);
}

Calculator.prototype.mul = function() {
  const a = this.popNumber();
  if (a === null) {
    return;
  }
  const b = this.popNumber();
  if (b === null) {
    this.push(a);
    return;
  }

  const r = new ScaledNum(b*a);
  r.setScale(Math.min(b.scale+a.scale, Math.max(b.scale, a.scale, this.scale)));
  this.push(r);
}

Calculator.prototype.clearStack = function() {
  this.stack = [];
}

Calculator.prototype.nop = function() {
}

Calculator.prototype.add = function() {
  const a = this.popNumber();
  if (a === null) {
    return;
  }
  const b = this.popNumber();
  if (b === null) {
    this.push(a);
    return;
  }

  const r = new ScaledNum(b+a);
  r.setScale(Math.max(a.scale, b.scale));
  this.push(r);
}

Calculator.prototype.printTOS = function() {
  if (this.stack.length < 1) {
    this.warn('stack empty');
    return;
  }

  this.display.write(this.stack[this.stack.length-1].toString(this.obase));
}

function isHexDigit(ch) {
  const A = 'A'.charCodeAt(0);
  const F = 'F'.charCodeAt(0);

  return (A <= ch.charCodeAt(0) && ch.charCodeAt(0) <= F);
}

Calculator.prototype.parseNumber = function() {
  const neg = this.lastchar === '_';
  let n = neg ? '' : this.lastchar;
  let seenDecimal = n === '.';

  for (;;) {
    const peek = this.readCh();
    if (peek === null)
      break;

    if (peek === '.') {
      if (seenDecimal) {
        this.unreadCh();
        break;
      }
      seenDecimal = true;
    } else if (isNaN(peek) || peek === ' ') {
      if (!isHexDigit(peek)) {
        this.unreadCh();
        break;
      }
    }

    n += peek;
  }

  if (n === '-' || n === '.' || n === '-.') {
    this.push(new ScaledNum(0));
    return;
  }

  let val = 0;
  const pieces = n.split('.');
  for (let i = 0; i < pieces[0].length; i++) {
    const scale = this.ibase ** (pieces[0].length - i - 1);
    val += parseInt(pieces[0][i], 16) * scale;
  }
  if (pieces.length < 2) {
    this.push(new ScaledNum(neg ? -val : val));
    return;
  }
  for (let i = 0; i < pieces[1].length; i++) {
    const scale = this.ibase ** -(i + 1);
    val += parseInt(pieces[1][i], 16) * scale;
  }

  const r = new ScaledNum(neg ? -val : val);
  r.setScale(pieces[1].length);
  this.push(r);
}

// Module exports for Node.js
// If using as script in HTML document, define an empty
// exports object before the <script> tag to avoid errors
exports.Calculator = Calculator;
