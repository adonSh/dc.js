// Implements the display interface for dc
function HtmlOutput(elem) {
  this.elem = elem;
  this.newline = true;

  // A second newline switch is necessary due to the use of HTML
  // <p> tags rather than actual newlines making the logic backward.
  // (The newlines are effectively at the beginning of the line not the end.)
  this.sameP = !this.newline;

  return this;
}

// If newline is set to false before calling write() then sameP will be true
// the next time write() is called. At the end of every call, newline is reset
// to true and sameP is set to newline's complement (before newline is reset).
HtmlOutput.prototype.write = function(txt) {
  const p = this.sameP ? this.elem.lastChild : document.createElement('p');
  const lines = txt.toString().split('\n');

  for (let i = 0; i < lines.length; i++) {
    p.appendChild(document.createTextNode(lines[i]));
    if (i < lines.length-1)
      p.appendChild(document.createElement('br'));
  }

  if (!this.sameP)
    this.elem.appendChild(p);

  this.sameP = !this.newline;
  this.newline = true;
}

HtmlOutput.prototype.clear = function() {
  this.elem.replaceChildren();
}

//// Main Loop ////

function registerInputEvents(dc, input, enter) {
  const history = [];
  let   histIdx = 0;
  const eval = () => {
    // Remember each line
    history.push(input.value);
    histIdx = history.length;

    // Echo each line
    dc.display.write(input.value);

    // Evaluate each line
    dc.eval(input.value);

    // Reset
    input.value = '';
  }

  input.addEventListener('keypress', (evt) => {
    if (evt.key != 'Enter') {
      return;
    }
    eval();
  });
  enter.addEventListener('click', (evt) => {
    eval();
  });

  // Up/Down arrow keys for browsing history
  input.addEventListener('keydown', (evt) => {
    if (evt.key === 'ArrowUp') {
      if (histIdx > 0) {
        input.value = history[--histIdx];
      }
    }
    if (evt.key === 'ArrowDown') {
      if (histIdx < history.length - 1) {
        input.value = history[++histIdx];
      } else {
        histIdx = history.length;
        input.value = '';
      }
    }
  });
}
