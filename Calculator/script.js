// Elements
const displayEl = document.getElementById('display');
const expressionEl = document.getElementById('expression');
const buttons = document.getElementById('buttons');
const themeToggle = document.getElementById('themeToggle');

// State
let expression = "";       // full expression string used for small expression line
let current = "";          // current number being typed (string)
let tokens = [];           // tokens built from inputs (numbers/operators)

// Initialize theme (dual-mode)
const savedTheme = localStorage.getItem('calc-theme') || 'light';
setTheme(savedTheme === 'dark');
themeToggle.checked = savedTheme === 'dark';
themeToggle.addEventListener('change', () => {
  setTheme(themeToggle.checked);
});

function setTheme(dark) {
  if (dark) document.documentElement.setAttribute('data-theme', 'dark');
  else document.documentElement.removeAttribute('data-theme');
  localStorage.setItem('calc-theme', dark ? 'dark' : 'light');
}

// Utility: update the visible display(s)
function refreshDisplay() {
  displayEl.value = current || (tokens.length ? tokens.join(' ') : '0');
  expressionEl.textContent = tokens.join(' ');
  autoResizeDisplay();
}

// Auto-resize display font when number is long
function autoResizeDisplay() {
  const el = displayEl;
  el.style.fontSize = ''; // reset
  const max = 36; // px base
  el.style.fontSize = max + 'px';
  // if overflow, reduce
  while (el.scrollWidth > el.clientWidth && parseInt(el.style.fontSize) > 12) {
    el.style.fontSize = (parseInt(el.style.fontSize) - 2) + 'px';
  }
}

// Input helpers & validation
function pushOperator(op) {
  // prevent two operators in a row (except minus when starting a negative number)
  if (!current && tokens.length === 0 && op === '-') {
    current = '-';
    refreshDisplay();
    return;
  }
  if (!current && /[+\-*/]/.test(tokens[tokens.length - 1])) {
    // replace last operator
    tokens[tokens.length - 1] = op;
  } else {
    if (current) {
      tokens.push(current);
      current = "";
    }
    tokens.push(op);
  }
  refreshDisplay();
}

function pushNumber(n) {
  // prevent multiple decimals
  if (n === '.' && current.includes('.')) return;
  // If current is '-' only and user presses '.', allow "-."
  if (current === '-.' && n === '.') return;
  current += n;
  refreshDisplay();
}

function clearAll() {
  tokens = [];
  current = "";
  refreshDisplay();
}

function deleteLast() {
  if (current) {
    current = current.slice(0, -1);
  } else if (tokens.length) {
    tokens.pop();
  }
  refreshDisplay();
}

// Add ripple on button clicks
buttons.addEventListener('pointerdown', e => {
  const btn = e.target.closest('.btn');
  if (!btn) return;
  const rect = btn.getBoundingClientRect();
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  const size = Math.max(rect.width, rect.height);
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
  ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 650);
});

// Button handling (delegation)
buttons.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn');
  if (!btn) return;

  const val = btn.getAttribute('data-value');
  const action = btn.getAttribute('data-action');

  if (action === 'clear') {
    clearAll();
    return;
  }
  if (action === 'delete') {
    deleteLast();
    return;
  }
  if (action === 'calculate') {
    if (current) tokens.push(current);
    current = "";
    try {
      const result = evaluateTokens(tokens.slice()); // pass a copy
      tokens = [formatResult(result)];
      refreshDisplay();
    } catch (err) {
      tokens = [];
      current = "";
      displayEl.value = 'Error';
      console.error(err);
      setTimeout(refreshDisplay, 900);
    }
    return;
  }

  if (val) {
    if (/[0-9.]/.test(val)) {
      pushNumber(val);
      return;
    }
    if (/[+\-*/%]/.test(val)) {
      // percent is handled as operator here (postfix)
      if (val === '%') {
        // apply percent to current number if exists, else if tokens exist, we append a percent token
        if (current) {
          current = current + '%';
          refreshDisplay();
        } else if (tokens.length && !/[+\-*/%]/.test(tokens[tokens.length - 1])) {
          // if last token is number, convert it to percent
          tokens[tokens.length - 1] = tokens[tokens.length - 1] + '%';
          refreshDisplay();
        }
        return;
      } else {
        pushOperator(val);
        return;
      }
    }
  }
});

// Keyboard support
window.addEventListener('keydown', (e) => {
  const key = e.key;
  if ((key >= '0' && key <= '9') || key === '.') {
    e.preventDefault();
    pushNumber(key);
    return;
  }
  if (key === 'Backspace') { e.preventDefault(); deleteLast(); return; }
  if (key === 'Escape') { e.preventDefault(); clearAll(); return; }
  if (key === 'Enter' || key === '=') {
    e.preventDefault();
    if (current) tokens.push(current);
    current = "";
    try {
      const result = evaluateTokens(tokens.slice());
      tokens = [formatResult(result)];
      refreshDisplay();
    } catch (err) {
      tokens = []; current = "";
      displayEl.value = 'Error';
      setTimeout(refreshDisplay, 900);
    }
    return;
  }
  if (['+', '-', '*', '/', '%'].includes(key)) {
    e.preventDefault();
    if (key === '%') {
      if (current) { current = current + '%'; refreshDisplay(); }
      else if (tokens.length && !/[+\-*/%]/.test(tokens[tokens.length - 1])) {
        tokens[tokens.length - 1] = tokens[tokens.length - 1] + '%';
        refreshDisplay();
      }
    } else {
      pushOperator(key);
    }
    return;
  }
});

// Format a result (avoid long floats)
function formatResult(n) {
  if (!isFinite(n)) throw new Error('Non-finite result');
  // limit to 10 significant digits
  const s = Number.isInteger(n) ? n.toString() : n.toPrecision(12);
  // remove trailing zeros
  return parseFloat(s).toString();
}

/*
  Evaluator: handles tokens like:
    ["200", "+", "10%"] or ["50%"] or ["200", "*", "10%"]
  Percentage rules implemented:
    - If operator is + or -, then a op b% => a op (a * b/100)
    - If operator is * or /, then a op b% => a op (b/100)
    - Standalone "x%" => x / 100
  This evaluator does:
    1. Normalize tokens: ensure numbers and operators are separated; numbers can have trailing %
    2. Process percent tokens left->right applying transformation relative to left number for +/-
    3. Evaluate * and / left-to-right
    4. Evaluate + and - left-to-right
*/
function evaluateTokens(inputTokens) {
  if (!inputTokens.length) return 0;

  // Normalize: ensure tokens alternate properly; collapse stray operators
  // If expression ends with operator, remove it
  while (inputTokens.length && /[+\-*/%]$/.test(inputTokens[inputTokens.length - 1])) {
    inputTokens.pop();
  }
  if (!inputTokens.length) return 0;

  // Convert string tokens to objects: {type:'num'|'op', value: number|string, percent: bool}
  const parsed = inputTokens.map(t => {
    if (/[+\-*/]/.test(t)) return { type: 'op', value: t };
    // number possibly with trailing %
    if (String(t).endsWith('%')) {
      const num = parseFloat(String(t).slice(0, -1));
      if (Number.isNaN(num)) throw new Error('Invalid number with %');
      return { type: 'num', value: num, percent: true };
    } else {
      const num = parseFloat(t);
      if (Number.isNaN(num)) throw new Error('Invalid number');
      return { type: 'num', value: num, percent: false };
    }
  });

  // If expression starts with operator '-' as unary negative, convert to leading negative number
  if (parsed.length >= 2 && parsed[0].type === 'op' && parsed[0].value === '-' && parsed[1].type === 'num') {
    parsed[1].value = -parsed[1].value;
    parsed.shift(); // remove leading '-'
  }

  // Apply percent transformation left-to-right
  // For each pattern: num (op + or -) num[%]  => convert right num to (left * right/100)
  // For op * or / : convert right num% to (right/100)
  for (let i = 0; i < parsed.length; i++) {
    const node = parsed[i];
    if (node.type === 'num' && node.percent) {
      // find operator to left and left number
      const leftIndex = i - 1;
      const opIndex = i - 2;
      if (leftIndex >= 0 && parsed[leftIndex].type === 'op' && opIndex >= 0 && parsed[opIndex].type === 'num') {
        const op = parsed[leftIndex].value;
        const leftNum = parsed[opIndex].value;
        const rightPct = node.value;
        if (op === '+' || op === '-') {
          // replace current percent node with computed number (leftNum * rightPct / 100)
          parsed[i] = { type: 'num', value: (leftNum * rightPct / 100), percent: false };
        } else if (op === '*' || op === '/') {
          parsed[i] = { type: 'num', value: (rightPct / 100), percent: false };
        } else {
          // fallback: treat as simple percent
          parsed[i] = { type: 'num', value: (node.value / 100), percent: false };
        }
      } else {
        // standalone or no left numeric context -> convert to x/100
        parsed[i] = { type: 'num', value: (node.value / 100), percent: false };
      }
    }
  }

  // Now we have only ops and numbers (no percent flags)
  // Evaluate * and / left-to-right
  let stack = [];
  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i];
    if (item.type === 'num') {
      stack.push(item.value);
    } else if (item.type === 'op') {
      const op = item.value;
      if (op === '*' || op === '/') {
        // perform immediately with previous number and next number
        const left = stack.length ? stack.pop() : 0;
        // look ahead for next numeric
        const nextNode = parsed[++i];
        if (!nextNode || nextNode.type !== 'num') throw new Error('Missing operand');
        const right = nextNode.value;
        let res;
        if (op === '*') res = left * right;
        else {
          if (right === 0) throw new Error('Division by zero');
          res = left / right;
        }
        stack.push(res);
      } else {
        // + or - push operator marker and continue
        stack.push(op);
      }
    }
  }

  // Now stack has numbers and + / - operators in sequence; evaluate left-to-right
  let result = stack[0];
  if (result === undefined) result = 0;
  for (let i = 1; i < stack.length; i += 2) {
    const op = stack[i];
    const right = stack[i + 1];
    if (typeof right === 'undefined') throw new Error('Missing operand in final eval');
    if (op === '+') result = result + right;
    else if (op === '-') result = result - right;
    else throw new Error('Unknown operator during final eval');
  }

  return result;
}
