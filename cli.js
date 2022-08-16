const libdc = require('./dc.js');
const readline = require('readline');

function ConsoleOutput() {
  this.newline = true;
}

ConsoleOutput.prototype.write = function(txt) {
  process.stdout.write(txt.toString());
  if (this.newline)
    process.stdout.write('\n');
}

const dc = new libdc.Calculator(new ConsoleOutput());
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
  });

rl.on('line', (line) => {
  dc.eval(line);
});
