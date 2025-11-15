/**
 * Accessibility Manager - WCAG 2.2 AA Compliance for Seniors & Visually Impaired
 * Enterprise-grade accessibility features with screen reader optimization
 */

interface AccessibilityState {
  screenReaderActive: boolean;
  highContrastMode: boolean;
  largeTextMode: boolean;
  keyboardNavigationMode: boolean;
  voiceNavigationActive: boolean;
  motorAssistanceLevel: 'none' | 'low' | 'medium' | 'high';
}

export class AccessibilityManager {
  private state: AccessibilityState = {
    screenReaderActive: false,
    highContrastMode: false,
    largeTextMode: false,
    keyboardNavigationMode: false,
    voiceNavigationActive: false,
    motorAssistanceLevel: 'none'
  };

  private announcements: string[] = [];
  private liveRegion: HTMLElement | null = null;
  private focusHistory: HTMLElement[] = [];

  constructor() {
    this.initialize();
  }

  /**
   * Initialize accessibility features
   */
  private initialize(): void {
    this.detectScreenReader();
    this.createLiveRegion();
    this.setupKeyboardNavigation();
    this.setupFocusManagement();
    this.enhanceFormAccessibility();
  }

  /**
   * Detect if screen reader is active
   */
  private detectScreenReader(): void {
    // Check for screen reader indicators
    const hasReducedMotion = typeof window !== 'undefined' && 
      window.matchMedia && 
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    const hasScreenReader = 
      'speechSynthesis' in window ||
      navigator.userAgent.includes('NVDA') ||
      navigator.userAgent.includes('JAWS') ||
      navigator.userAgent.includes('VoiceOver') ||
      hasReducedMotion;

    this.state.screenReaderActive = hasScreenReader;
  }

  /**
   * Create ARIA live region for announcements
   */
  private createLiveRegion(): void {
    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.setAttribute('role', 'status');
    this.liveRegion.className = 'sr-only';
    this.liveRegion.style.cssText = `
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    `;
    document.body.appendChild(this.liveRegion);
  }

  /**
   * Setup enhanced keyboard navigation
   */
  private setupKeyboardNavigation(): void {
    document.addEventListener('keydown', this.handleKeyboardNavigation.bind(this));
    
    // Add skip links
    this.addSkipLinks();
    
    // Enhance focus indicators
    this.enhanceFocusIndicators();
  }

  /**
   * Handle keyboard navigation patterns
   */
  private handleKeyboardNavigation(event: KeyboardEvent): void {
    const { key, ctrlKey, altKey } = event;
    
    // Custom shortcuts for seniors/visually impaired
    if (ctrlKey && altKey) {
      switch (key) {
        case 'h': // Go to home/main content
          this.focusMainContent();
          event.preventDefault();
          break;
        case 'n': // Next interactive element
          this.focusNextInteractive();
          event.preventDefault();
          break;
        case 'p': // Previous interactive element
          this.focusPreviousInteractive();
          event.preventDefault();
          break;
        case 's': // Speak current element
          this.speakCurrentElement();
          event.preventDefault();
          break;
        case 'e': // Emergency mode
          this.triggerEmergencyMode();
          event.preventDefault();
          break;
      }
    }
    
    // Escape key handling
    if (key === 'Escape') {
      this.handleEscapeKey();
    }
    
    // Tab navigation enhancement
    if (key === 'Tab') {
      this.trackFocusHistory();
    }
  }

  /**
   * Add skip navigation links
   */
  private addSkipLinks(): void {
    const skipNav = document.createElement('nav');
    skipNav.className = 'skip-navigation';
    skipNav.setAttribute('aria-label', 'Skip navigation');
    
    const skipLinks = [
      { href: '#main-content', text: 'Skip to main content' },
      { href: '#emergency-button', text: 'Skip to emergency button' },
      { href: '#settings', text: 'Skip to settings' },
    ];
    
    skipLinks.forEach(link => {
      const skipLink = document.createElement('a');
      skipLink.href = link.href;
      skipLink.textContent = link.text;
      skipLink.className = 'skip-link';
      skipLink.style.cssText = `
        position: absolute;
        top: -40px;
        left: 6px;
        background: #000;
        color: #fff;
        padding: 8px;
        text-decoration: none;
        border-radius: 4px;
        z-index: 10000;
        transition: top 0.3s;
      `;
      
      skipLink.addEventListener('focus', () => {
        skipLink.style.top = '6px';
      });
      
      skipLink.addEventListener('blur', () => {
        skipLink.style.top = '-40px';
      });
      
      skipNav.appendChild(skipLink);
    });
    
    document.body.insertBefore(skipNav, document.body.firstChild);
  }

  /**
   * Enhance focus indicators for better visibility
   */
  private enhanceFocusIndicators(): void {
    const style = document.createElement('style');
    style.textContent = `
      .accessibility-enhanced *:focus {
        outline: 3px solid #4A90E2 !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 0 5px rgba(74, 144, 226, 0.3) !important;
      }
      
      .high-contrast *:focus {
        outline: 4px solid #FFFF00 !important;
        background-color: #000000 !important;
        color: #FFFFFF !important;
      }
      
      .large-text-mode {
        font-size: 1.2em !important;
        line-height: 1.6 !important;
      }
      
      .large-text-mode button,
      .large-text-mode input,
      .large-text-mode select {
        min-height: 48px !important;
        min-width: 48px !important;
        font-size: 1.1em !important;
        padding: 12px !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Setup focus management
   */
  private setupFocusManagement(): void {
    document.addEventListener('focusin', (event) => {
      const target = event.target as HTMLElement;
      this.announceElement(target);
    });
  }

  /**
   * Enhance form accessibility
   */
  private enhanceFormAccessibility(): void {
    // Auto-enhance all forms
    document.querySelectorAll('form').forEach(form => {
      this.makeFormAccessible(form as HTMLFormElement);
    });
    
    // Watch for dynamically added forms
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            const forms = element.querySelectorAll('form');
            forms.forEach(form => this.makeFormAccessible(form as HTMLFormElement));
          }
        });
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
  }

  /**
   * Make individual form accessible
   */
  private makeFormAccessible(form: HTMLFormElement): void {
    // Add form landmark
    if (!form.getAttribute('role')) {
      form.setAttribute('role', 'form');
    }
    
    // Enhance form fields
    form.querySelectorAll('input, select, textarea').forEach(field => {
      this.enhanceFormField(field as HTMLInputElement);
    });
    
    // Add required field indicators
    form.querySelectorAll('[required]').forEach(field => {
      this.addRequiredIndicator(field as HTMLInputElement);
    });
    
    // Enhance error handling
    this.enhanceErrorHandling(form);
  }

  /**
   * Enhance individual form field
   */
  private enhanceFormField(field: HTMLInputElement): void {
    const fieldId = field.id || `field-${Math.random().toString(36).substr(2, 9)}`;
    field.id = fieldId;
    
    // Ensure label association
    let label = document.querySelector(`label[for="${fieldId}"]`) as HTMLLabelElement;
    if (!label) {
      label = field.closest('label') as HTMLLabelElement;
      if (label) {
        label.setAttribute('for', fieldId);
      }
    }
    
    // Add describedby for hints
    const hint = field.parentElement?.querySelector('.field-hint');
    if (hint && !hint.id) {
      hint.id = `${fieldId}-hint`;
      const describedBy = field.getAttribute('aria-describedby') || '';
      field.setAttribute('aria-describedby', `${describedBy} ${hint.id}`.trim());
    }
    
    // Enhance input announcements
    field.addEventListener('focus', () => {
      this.announceFieldContext(field);
    });
  }

  /**
   * Add required field indicator
   */
  private addRequiredIndicator(field: HTMLInputElement): void {
    field.setAttribute('aria-required', 'true');
    
    const label = document.querySelector(`label[for="${field.id}"]`);
    if (label && !label.querySelector('.required-indicator')) {
      const indicator = document.createElement('span');
      indicator.className = 'required-indicator';
      indicator.textContent = ' (required)';
      indicator.setAttribute('aria-label', 'required field');
      label.appendChild(indicator);
    }
  }

  /**
   * Enhance error handling
   */
  private enhanceErrorHandling(form: HTMLFormElement): void {
    form.addEventListener('submit', (event) => {
      const errors = this.validateFormAccessibly(form);
      if (errors.length > 0) {
        event.preventDefault();
        this.showAccessibleErrors(errors);
      }
    });
  }

  /**
   * Public Methods
   */

  /**
   * Announce message to screen readers
   */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (this.liveRegion) {
      this.liveRegion.setAttribute('aria-live', priority);
      this.liveRegion.textContent = message;
      
      // Clear after announcement
      setTimeout(() => {
        if (this.liveRegion) {
          this.liveRegion.textContent = '';
        }
      }, 1000);
    }
    
    this.announcements.push(message);
  }

  /**
   * Enable high contrast mode
   */
  enableHighContrast(): void {
    document.body.classList.add('high-contrast');
    this.state.highContrastMode = true;
    this.announce('High contrast mode enabled');
  }

  /**
   * Enable large text mode
   */
  enableLargeText(): void {
    document.body.classList.add('large-text-mode');
    this.state.largeTextMode = true;
    this.announce('Large text mode enabled');
  }

  /**
   * Enable voice navigation
   */
  enableVoiceNavigation(): void {
    this.state.voiceNavigationActive = true;
    this.announce('Voice navigation activated. Say "help" for commands.');
  }

  /**
   * Set motor assistance level
   */
  setMotorAssistance(level: AccessibilityState['motorAssistanceLevel']): void {
    this.state.motorAssistanceLevel = level;
    
    // Adjust UI based on motor assistance needs
    const adjustments = {
      none: {},
      low: { clickDelay: 100, hoverExtension: 500 },
      medium: { clickDelay: 300, hoverExtension: 1000, largerTargets: true },
      high: { clickDelay: 500, hoverExtension: 2000, largerTargets: true, autoFocus: true }
    };
    
    this.applyMotorAssistance(adjustments[level]);
    this.announce(`Motor assistance set to ${level} level`);
  }

  /**
   * Get accessibility state
   */
  getState(): AccessibilityState {
    return { ...this.state };
  }

  /**
   * Emergency accessibility mode
   */
  triggerEmergencyMode(): void {
    this.announce('Emergency mode activated', 'assertive');
    
    // Focus emergency button
    const emergencyButton = document.querySelector('#emergency-button, [data-emergency]') as HTMLElement;
    if (emergencyButton) {
      emergencyButton.focus();
      emergencyButton.style.outline = '5px solid red';
      emergencyButton.style.backgroundColor = 'red';
      emergencyButton.style.color = 'white';
    }
  }

  /**
   * Private helper methods
   */
  private focusMainContent(): void {
    const main = document.querySelector('main, #main-content, [role="main"]') as HTMLElement;
    if (main) {
      main.focus();
      this.announce('Focused on main content');
    }
  }

  private focusNextInteractive(): void {
    const interactives = Array.from(document.querySelectorAll('button, a, input, select, textarea, [tabindex="0"]'));
    const current = document.activeElement;
    const currentIndex = interactives.indexOf(current as Element);
    const next = interactives[currentIndex + 1] as HTMLElement;
    
    if (next) {
      next.focus();
    }
  }

  private focusPreviousInteractive(): void {
    const interactives = Array.from(document.querySelectorAll('button, a, input, select, textarea, [tabindex="0"]'));
    const current = document.activeElement;
    const currentIndex = interactives.indexOf(current as Element);
    const previous = interactives[currentIndex - 1] as HTMLElement;
    
    if (previous) {
      previous.focus();
    }
  }

  private speakCurrentElement(): void {
    const element = document.activeElement as HTMLElement;
    if (element) {
      const text = this.getElementDescription(element);
      this.announce(text, 'assertive');
    }
  }

  private handleEscapeKey(): void {
    // Close any open modals/dialogs
    const modal = document.querySelector('[role="dialog"][aria-hidden="false"]') as HTMLElement;
    if (modal) {
      const closeButton = modal.querySelector('[aria-label*="close"], .close') as HTMLElement;
      if (closeButton) {
        closeButton.click();
      }
    }
    
    // Return focus to previous element
    if (this.focusHistory.length > 0) {
      const previous = this.focusHistory.pop();
      if (previous && document.contains(previous)) {
        previous.focus();
      }
    }
  }

  private trackFocusHistory(): void {
    const current = document.activeElement as HTMLElement;
    if (current && current !== document.body) {
      this.focusHistory.push(current);
      
      // Keep history manageable
      if (this.focusHistory.length > 10) {
        this.focusHistory.shift();
      }
    }
  }

  private announceElement(element: HTMLElement): void {
    if (this.state.screenReaderActive) {
      const description = this.getElementDescription(element);
      if (description) {
        this.announce(description);
      }
    }
  }

  private getElementDescription(element: HTMLElement): string {
    const tag = element.tagName.toLowerCase();
    const role = element.getAttribute('role');
    const label = element.getAttribute('aria-label') || 
                  element.getAttribute('title') ||
                  (element as HTMLInputElement).placeholder ||
                  element.textContent?.trim();
    
    let description = '';
    
    if (role) {
      description += `${role} `;
    } else {
      switch (tag) {
        case 'button':
          description += 'button ';
          break;
        case 'input': {
          const type = (element as HTMLInputElement).type;
          description += `${type} input `;
          break;
        }
        case 'select':
          description += 'dropdown ';
          break;
        case 'textarea':
          description += 'text area ';
          break;
        case 'a':
          description += 'link ';
          break;
      }
    }
    
    if (label) {
      description += label;
    }
    
    if (element.hasAttribute('aria-expanded')) {
      const expanded = element.getAttribute('aria-expanded') === 'true';
      description += expanded ? ' expanded' : ' collapsed';
    }
    
    if (element.hasAttribute('required')) {
      description += ' required';
    }
    
    return description.trim();
  }

  private announceFieldContext(field: HTMLInputElement): void {
    const label = document.querySelector(`label[for="${field.id}"]`)?.textContent || '';
    const hint = document.getElementById(`${field.id}-hint`)?.textContent || '';
    const error = document.getElementById(`${field.id}-error`)?.textContent || '';
    
    let announcement = label;
    if (hint) announcement += `. ${hint}`;
    if (error) announcement += `. Error: ${error}`;
    
    this.announce(announcement);
  }

  private validateFormAccessibly(form: HTMLFormElement): Array<{field: HTMLElement, message: string}> {
    const errors: Array<{field: HTMLElement, message: string}> = [];
    
    form.querySelectorAll('[required]').forEach(field => {
      const input = field as HTMLInputElement;
      if (!input.value.trim()) {
        const label = document.querySelector(`label[for="${input.id}"]`)?.textContent || 'Field';
        errors.push({
          field: input,
          message: `${label} is required`
        });
      }
    });
    
    return errors;
  }

  private showAccessibleErrors(errors: Array<{field: HTMLElement, message: string}>): void {
    // Focus first error field
    if (errors.length > 0) {
      errors[0].field.focus();
    }
    
    // Announce error summary
    const summary = `${errors.length} error${errors.length > 1 ? 's' : ''} found. ${errors.map(e => e.message).join('. ')}`;
    this.announce(summary, 'assertive');
  }

  private applyMotorAssistance(settings: { largerTargets?: boolean; stickyFocus?: boolean; reducedMotion?: boolean; clickDelay?: number; hoverExtension?: number; autoFocus?: boolean }): void {
    if (settings.largerTargets) {
      document.body.classList.add('large-targets');
    }
    
    if (settings.clickDelay) {
      // Add click delay for accidental clicks
      document.addEventListener('click', (event) => {
        event.preventDefault();
        setTimeout(() => {
          (event.target as HTMLElement).click();
        }, settings.clickDelay);
      }, { once: true });
    }
  }
}

// Export singleton
export const accessibilityManager = new AccessibilityManager();
