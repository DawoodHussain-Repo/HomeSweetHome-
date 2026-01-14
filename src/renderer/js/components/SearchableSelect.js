/**
 * Searchable Select Component
 * Creates a searchable dropdown for account selection
 */
class SearchableSelect {
  constructor(inputId, options, onSelect) {
    this.inputId = inputId;
    this.options = options || [];
    this.onSelect = onSelect;
    this.filteredOptions = [...this.options];
    this.selectedIndex = -1;
    this.isOpen = false;
    this.dropdownId = `${this.inputId}-dropdown`;
    
    console.log(`[SearchableSelect] Initializing for ${inputId} with ${this.options.length} options`);
    
    this.init();
  }
  
  init() {
    const input = document.getElementById(this.inputId);
    if (!input) {
      console.error(`[SearchableSelect] Input not found: ${this.inputId}`);
      return;
    }
    
    console.log(`[SearchableSelect] Initializing ${this.inputId} with ${this.options.length} options`);
    
    // Store reference on input
    input.searchableSelect = this;
    
    // Ensure parent has relative positioning
    const parent = input.parentElement;
    if (parent) {
      const currentPosition = window.getComputedStyle(parent).position;
      if (currentPosition === 'static') {
        parent.style.position = 'relative';
      }
    }
    
    // Create dropdown container if it doesn't exist
    let dropdown = document.getElementById(this.dropdownId);
    if (!dropdown) {
      dropdown = document.createElement('div');
      dropdown.className = 'searchable-select-dropdown';
      dropdown.id = this.dropdownId;
      parent.appendChild(dropdown);
      console.log(`[SearchableSelect] Created dropdown: ${this.dropdownId}`);
    }
    
    // Remove any existing event listeners by cloning
    const newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);
    newInput.searchableSelect = this;
    
    // Bind events to new input
    newInput.addEventListener('input', (e) => this.handleInput(e));
    newInput.addEventListener('focus', (e) => this.handleFocus(e));
    newInput.addEventListener('click', (e) => {
      e.stopPropagation();
      this.open();
    });
    newInput.addEventListener('keydown', (e) => this.handleKeydown(e));
    
    // Close on outside click
    const closeHandler = (e) => {
      const input = document.getElementById(this.inputId);
      const dropdown = document.getElementById(this.dropdownId);
      if (input && dropdown && !input.contains(e.target) && !dropdown.contains(e.target)) {
        this.close();
      }
    };
    
    // Remove old listener if exists
    if (this.closeHandler) {
      document.removeEventListener('click', this.closeHandler);
    }
    this.closeHandler = closeHandler;
    document.addEventListener('click', closeHandler);
    
    console.log(`[SearchableSelect] Successfully initialized ${this.inputId}`);
  }
  
  handleFocus(e) {
    // Show all options on focus
    this.filteredOptions = [...this.options];
    this.selectedIndex = -1;
    this.open();
  }
  
  handleInput(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    if (!searchTerm) {
      this.filteredOptions = [...this.options];
    } else {
      this.filteredOptions = this.options.filter(opt => 
        opt.label.toLowerCase().includes(searchTerm)
      );
    }
    
    this.selectedIndex = -1;
    this.render();
    this.open();
  }
  
  handleKeydown(e) {
    if (!this.isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        this.open();
        e.preventDefault();
      }
      return;
    }
    
    switch(e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredOptions.length - 1);
        this.render();
        this.scrollToSelected();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
        this.render();
        this.scrollToSelected();
        break;
      case 'Enter':
        e.preventDefault();
        if (this.selectedIndex >= 0 && this.filteredOptions[this.selectedIndex]) {
          this.selectOption(this.filteredOptions[this.selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        this.close();
        break;
      case 'Tab':
        this.close();
        break;
    }
  }
  
  open() {
    console.log(`[SearchableSelect] Opening ${this.inputId}, options: ${this.filteredOptions.length}`);
    this.isOpen = true;
    const dropdown = document.getElementById(this.dropdownId);
    if (dropdown) {
      dropdown.classList.add('active');
      this.render();
      console.log(`[SearchableSelect] Dropdown ${this.dropdownId} opened`);
    } else {
      console.error(`[SearchableSelect] Dropdown not found: ${this.dropdownId}`);
    }
  }
  
  close() {
    this.isOpen = false;
    const dropdown = document.getElementById(this.dropdownId);
    if (dropdown) {
      dropdown.classList.remove('active');
    }
  }
  
  selectOption(option) {
    const input = document.getElementById(this.inputId);
    if (input) {
      input.value = option.label;
      input.dataset.value = option.value;
      input.dataset.accountId = option.value; // Also set accountId for compatibility
    }
    if (this.onSelect) {
      this.onSelect(option);
    }
    this.close();
  }
  
  render() {
    const dropdown = document.getElementById(this.dropdownId);
    if (!dropdown) return;
    
    if (this.filteredOptions.length === 0) {
      dropdown.innerHTML = '<div class="searchable-select-empty">No accounts found</div>';
      return;
    }
    
    const optionsHTML = this.filteredOptions.map((opt, index) => {
      const isHighlighted = index === this.selectedIndex;
      return `
        <div class="searchable-select-option ${isHighlighted ? 'highlighted' : ''}" 
             data-value="${opt.value}"
             data-index="${index}">
          ${this.escapeHtml(opt.label)}
        </div>
      `;
    }).join('');
    
    dropdown.innerHTML = optionsHTML;
    
    // Add click handlers to options
    dropdown.querySelectorAll('.searchable-select-option').forEach((el, index) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const option = this.filteredOptions[index];
        if (option) {
          this.selectOption(option);
        }
      });
    });
  }
  
  scrollToSelected() {
    const dropdown = document.getElementById(this.dropdownId);
    if (!dropdown) return;
    
    const selected = dropdown.querySelector('.highlighted');
    if (selected) {
      selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  destroy() {
    if (this.closeHandler) {
      document.removeEventListener('click', this.closeHandler);
    }
    const dropdown = document.getElementById(this.dropdownId);
    if (dropdown) {
      dropdown.remove();
    }
  }
}

// Make it globally available
window.SearchableSelect = SearchableSelect;
