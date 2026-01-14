/**
 * Calculator Page
 */

const CalculatorPage = {
  calcValue: '0',
  calcPrevValue: '',
  calcOperator: '',
  calcNewNumber: true,

  async render() {
    const content = document.getElementById('page-content');
    
    content.innerHTML = `
      <div class="page-header">
        <div class="page-header-content">
          <h1 class="page-title">Calculator</h1>
          <p class="page-subtitle">Quick calculations for accounting (keyboard supported)</p>
        </div>
      </div>
      
      <div class="card">
        <div class="card-body">
          <div style="max-width: 360px;">
            <input type="text" id="calc-display" class="form-input" 
                   style="font-size: 32px; text-align: right; font-family: monospace; font-weight: 700; margin-bottom: 16px; background: #f3f4f6; height: 60px;" 
                   value="0" readonly>
            <div id="calc-history" style="font-size: 14px; color: #6b7280; min-height: 24px; font-weight: 600; margin-bottom: 16px; text-align: right;"></div>
            <div class="calc-buttons" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
              <button class="btn calc-btn" data-val="C" style="background: #fee2e2; font-size: 18px;">C</button>
              <button class="btn calc-btn" data-val="←" style="font-size: 18px;">←</button>
              <button class="btn calc-btn" data-val="%" style="font-size: 18px;">%</button>
              <button class="btn calc-btn calc-op" data-val="/" style="font-size: 18px;">÷</button>
              
              <button class="btn calc-btn" data-val="7" style="font-size: 18px;">7</button>
              <button class="btn calc-btn" data-val="8" style="font-size: 18px;">8</button>
              <button class="btn calc-btn" data-val="9" style="font-size: 18px;">9</button>
              <button class="btn calc-btn calc-op" data-val="*" style="font-size: 18px;">×</button>
              
              <button class="btn calc-btn" data-val="4" style="font-size: 18px;">4</button>
              <button class="btn calc-btn" data-val="5" style="font-size: 18px;">5</button>
              <button class="btn calc-btn" data-val="6" style="font-size: 18px;">6</button>
              <button class="btn calc-btn calc-op" data-val="-" style="font-size: 18px;">−</button>
              
              <button class="btn calc-btn" data-val="1" style="font-size: 18px;">1</button>
              <button class="btn calc-btn" data-val="2" style="font-size: 18px;">2</button>
              <button class="btn calc-btn" data-val="3" style="font-size: 18px;">3</button>
              <button class="btn calc-btn calc-op" data-val="+" style="font-size: 18px;">+</button>
              
              <button class="btn calc-btn" data-val="00" style="font-size: 18px;">00</button>
              <button class="btn calc-btn" data-val="0" style="font-size: 18px;">0</button>
              <button class="btn calc-btn" data-val="." style="font-size: 18px;">.</button>
              <button class="btn btn-primary calc-btn" data-val="=" style="font-size: 18px;">=</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.bindEvents();
  },

  bindEvents() {
    // Reset state
    this.calcValue = '0';
    this.calcPrevValue = '';
    this.calcOperator = '';
    this.calcNewNumber = true;
    
    // Button clicks
    document.querySelectorAll('.calc-btn').forEach(btn => {
      btn.addEventListener('click', () => this.handleInput(btn.dataset.val));
    });

    // Keyboard support
    this.keyHandler = (e) => {
      const key = e.key;
      
      if (/^[0-9]$/.test(key)) {
        e.preventDefault();
        this.handleInput(key);
      } else if (['+', '-', '*', '/', '%'].includes(key)) {
        e.preventDefault();
        this.handleInput(key);
      } else if (key === '.' || key === ',') {
        e.preventDefault();
        this.handleInput('.');
      } else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        this.handleInput('=');
      } else if (key === 'Backspace') {
        e.preventDefault();
        this.handleInput('←');
      } else if (key === 'Escape' || key === 'Delete') {
        e.preventDefault();
        this.handleInput('C');
      }
    };
    
    document.addEventListener('keydown', this.keyHandler);
  },

  handleInput(val) {
    const display = document.getElementById('calc-display');
    const history = document.getElementById('calc-history');
    
    if (!display) return;
    
    if (val === 'C') {
      this.calcValue = '0';
      this.calcPrevValue = '';
      this.calcOperator = '';
      this.calcNewNumber = true;
      history.textContent = '';
    } else if (val === '←') {
      if (this.calcValue.length > 1) {
        this.calcValue = this.calcValue.slice(0, -1);
      } else {
        this.calcValue = '0';
      }
    } else if (['+', '-', '*', '/', '%'].includes(val)) {
      if (this.calcPrevValue && this.calcOperator && !this.calcNewNumber) {
        this.calcValue = this.calculate();
      }
      this.calcPrevValue = this.calcValue;
      this.calcOperator = val;
      this.calcNewNumber = true;
      history.textContent = `${this.formatNumber(this.calcPrevValue)} ${this.getOpSymbol(val)}`;
    } else if (val === '=') {
      if (this.calcPrevValue && this.calcOperator) {
        const result = this.calculate();
        history.textContent = `${this.formatNumber(this.calcPrevValue)} ${this.getOpSymbol(this.calcOperator)} ${this.formatNumber(this.calcValue)} =`;
        this.calcValue = result;
        this.calcPrevValue = '';
        this.calcOperator = '';
        this.calcNewNumber = true;
      }
    } else {
      if (this.calcNewNumber) {
        this.calcValue = val === '.' ? '0.' : val;
        this.calcNewNumber = false;
      } else {
        if (val === '.' && this.calcValue.includes('.')) return;
        if (this.calcValue === '0' && val !== '.') {
          this.calcValue = val;
        } else {
          this.calcValue += val;
        }
      }
    }
    
    display.value = this.formatNumber(this.calcValue);
  },

  calculate() {
    const prev = parseFloat(this.calcPrevValue);
    const curr = parseFloat(this.calcValue);
    let result = 0;
    
    switch (this.calcOperator) {
      case '+': result = prev + curr; break;
      case '-': result = prev - curr; break;
      case '*': result = prev * curr; break;
      case '/': result = curr !== 0 ? prev / curr : 0; break;
      case '%': result = prev * (curr / 100); break;
    }
    
    return String(Math.round(result * 100) / 100);
  },

  formatNumber(num) {
    const n = parseFloat(num);
    if (isNaN(n)) return '0';
    return Math.round(n).toLocaleString('en-US');
  },

  getOpSymbol(op) {
    const symbols = { '+': '+', '-': '−', '*': '×', '/': '÷', '%': '%' };
    return symbols[op] || op;
  },

  cleanup() {
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler);
    }
  }
};

export default CalculatorPage;
