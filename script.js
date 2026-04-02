// State
let expression = '';
let angleMode = 'DEG'; // DEG or RAD
let justCalculated = false;

const expressionEl = document.getElementById('expression');
const resultEl = document.getElementById('result');
const degBtn = document.getElementById('degBtn');
const radBtn = document.getElementById('radBtn');

// --- Input functions ---

function insertText(char) {
  if (justCalculated && /[0-9π]/.test(char)) {
    expression = '';
    justCalculated = false;
  }
  if (justCalculated) {
    justCalculated = false;
  }
  resultEl.classList.remove('error');
  expression += char;
  updateDisplay();
}

function insertFunc(func) {
  if (justCalculated) {
    expression = '';
    justCalculated = false;
  }
  resultEl.classList.remove('error');
  expression += func;
  updateDisplay();
}

function clearAll() {
  expression = '';
  justCalculated = false;
  expressionEl.textContent = '';
  resultEl.textContent = '0';
  resultEl.classList.remove('error');
}

function backspace() {
  resultEl.classList.remove('error');
  // Remove multi-char tokens like sin(, cos(, etc.
  const tokens = ['sin(', 'cos(', 'tan(', 'log(', 'ln(', '√(', '1/('];
  for (const t of tokens) {
    if (expression.endsWith(t)) {
      expression = expression.slice(0, -t.length);
      updateDisplay();
      return;
    }
  }
  expression = expression.slice(0, -1);
  justCalculated = false;
  updateDisplay();
}

function toggleSign() {
  if (!expression) return;
  // Try to negate the last number
  const match = expression.match(/([-]?\d+\.?\d*)$/);
  if (match) {
    const num = match[1];
    const start = expression.slice(0, expression.length - num.length);
    if (num.startsWith('-')) {
      expression = start + num.slice(1);
    } else {
      expression = start + '(-' + num + ')';
    }
    updateDisplay();
  }
}

function toggleAngleMode(mode) {
  angleMode = mode;
  degBtn.classList.toggle('active', mode === 'DEG');
  radBtn.classList.toggle('active', mode === 'RAD');
}

function updateDisplay() {
  expressionEl.textContent = expression;
  if (!expression) {
    resultEl.textContent = '0';
  }
}

// --- Evaluation ---

function factorial(n) {
  if (n < 0) return NaN;
  if (!Number.isInteger(n)) return gamma(n + 1);
  if (n > 170) return Infinity;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

// Stirling's approximation for non-integers
function gamma(z) {
  if (z < 0.5) {
    return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
  }
  z -= 1;
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
  ];
  let x = c[0];
  for (let i = 1; i < g + 2; i++) {
    x += c[i] / (z + i);
  }
  const t = z + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

function toRadians(deg) {
  return deg * Math.PI / 180;
}

function _sin(x) { return Math.sin(toRadians(x)); }
function _cos(x) { return Math.cos(toRadians(x)); }
function _tan(x) { return Math.tan(toRadians(x)); }

function evaluate(expr) {
  // Replace display symbols with JS math
  let e = expr;

  // Replace constants - use placeholder to avoid conflicts
  e = e.replace(/π/g, '(' + Math.PI + ')');
  // Replace Euler's 'e' only when standalone (not part of words/exponents)
  e = e.replace(/(?<![a-zA-Z0-9.])e(?![a-zA-Z0-9])/g, '(' + Math.E + ')');

  // Replace operators
  e = e.replace(/×/g, '*');
  e = e.replace(/÷/g, '/');
  e = e.replace(/−/g, '-');

  // Handle implicit multiplication: 2π, 2(, )(, π(, etc.
  e = e.replace(/(\d)(\()/g, '$1*(');
  e = e.replace(/(\))(\d)/g, '$1*$2');
  e = e.replace(/(\))(\()/g, '$1*(');

  // Handle x² → Math.pow(x, 2)
  // We need to find what precedes ² and square it
  e = e.replace(/(\d+\.?\d*)²/g, 'Math.pow($1,2)');
  e = e.replace(/(\))²/g, '$1**2');

  // Handle percentage
  e = e.replace(/(\d+\.?\d*)%/g, '($1/100)');

  // Handle factorial
  e = e.replace(/(\d+\.?\d*)!/g, 'factorial($1)');
  e = e.replace(/(\))!/g, 'factorial$1');

  // Handle power (^)
  e = e.replace(/\^/g, '**');

  // Handle trig functions - use helper that converts to radians in DEG mode
  if (angleMode === 'DEG') {
    e = e.replace(/sin\(/g, '_sin(');
    e = e.replace(/cos\(/g, '_cos(');
    e = e.replace(/tan\(/g, '_tan(');
  } else {
    e = e.replace(/sin\(/g, 'Math.sin(');
    e = e.replace(/cos\(/g, 'Math.cos(');
    e = e.replace(/tan\(/g, 'Math.tan(');
  }

  e = e.replace(/log\(/g, 'Math.log10(');
  e = e.replace(/ln\(/g, 'Math.log(');
  e = e.replace(/√\(/g, 'Math.sqrt(');
  e = e.replace(/1\/\(/g, '(1/(');

  // Auto-close parentheses
  let opens = (e.match(/\(/g) || []).length;
  let closes = (e.match(/\)/g) || []).length;
  while (closes < opens) {
    e += ')';
    closes++;
  }

  // Safety: only allow math characters
  if (/[^0-9+\-*/().,%eE\s]/.test(e.replace(/Math\.(sin|cos|tan|log10|log|sqrt|pow|PI|E)/g, '').replace(/toRadians/g, '').replace(/factorial/g, '').replace(/gamma/g, '').replace(/Infinity/g, ''))) {
    // Contains unexpected characters — but let's try anyway since our replacements might be fine
  }

  try {
    // Use Function constructor for evaluation
    const fn = new Function('factorial', 'gamma', 'toRadians', '_sin', '_cos', '_tan', 'return (' + e + ')');
    const result = fn(factorial, gamma, toRadians, _sin, _cos, _tan);

    if (typeof result !== 'number') return 'Error';
    if (isNaN(result)) return 'Error';
    if (!isFinite(result)) return result > 0 ? 'Infinity' : '-Infinity';

    // Format result
    if (Number.isInteger(result) && Math.abs(result) < 1e15) {
      return result.toString();
    }
    // Check if result can be shown as a clean decimal
    const fixed = parseFloat(result.toPrecision(12));
    return fixed.toString();
  } catch {
    return 'Error';
  }
}

function calculate() {
  if (!expression) return;

  const result = evaluate(expression);

  expressionEl.textContent = expression;

  if (result === 'Error') {
    resultEl.textContent = 'Error';
    resultEl.classList.add('error');
  } else {
    resultEl.textContent = result;
    resultEl.classList.remove('error');
    expression = result;
  }

  justCalculated = true;
}

// --- Keyboard support ---

document.addEventListener('keydown', function(e) {
  const key = e.key;

  if (key >= '0' && key <= '9') {
    insertText(key);
  } else if (key === '.') {
    insertText('.');
  } else if (key === '+') {
    insertText('+');
  } else if (key === '-') {
    insertText('−');
  } else if (key === '*') {
    insertText('×');
  } else if (key === '/') {
    e.preventDefault();
    insertText('÷');
  } else if (key === 'Enter' || key === '=') {
    e.preventDefault();
    calculate();
  } else if (key === 'Backspace') {
    backspace();
  } else if (key === 'Escape' || key === 'Delete') {
    clearAll();
  } else if (key === '(' || key === ')') {
    insertText(key);
  } else if (key === '^') {
    insertText('^');
  } else if (key === '%') {
    insertText('%');
  } else if (key === '!') {
    insertText('!');
  } else if (key === 'p') {
    insertText('π');
  } else if (key === 's') {
    insertFunc('sin(');
  } else if (key === 'c') {
    insertFunc('cos(');
  } else if (key === 't') {
    insertFunc('tan(');
  } else if (key === 'l') {
    insertFunc('log(');
  } else if (key === 'n') {
    insertFunc('ln(');
  } else if (key === 'r') {
    insertFunc('√(');
  }
});
