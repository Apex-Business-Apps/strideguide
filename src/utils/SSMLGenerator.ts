/**
 * SSML (Speech Synthesis Markup Language) Generator for Enhanced TTS
 * Adds prosody, emphasis, pauses, and expressiveness to voice guidance
 */

export type SSMLEmphasis = 'strong' | 'moderate' | 'reduced' | 'none';
export type SSMLRate = 'x-slow' | 'slow' | 'medium' | 'fast' | 'x-fast';
export type SSMLPitch = 'x-low' | 'low' | 'medium' | 'high' | 'x-high';

interface SSMLOptions {
  emphasis?: SSMLEmphasis;
  rate?: SSMLRate;
  pitch?: SSMLPitch;
  volume?: 'silent' | 'x-soft' | 'soft' | 'medium' | 'loud' | 'x-loud';
  pauseBefore?: number; // milliseconds
  pauseAfter?: number; // milliseconds
}

export class SSMLGenerator {
  /**
   * Wrap text in SSML speak tag
   */
  static createDocument(content: string): string {
    return `<speak>${content}</speak>`;
  }

  /**
   * Add emphasis to text
   */
  static emphasize(text: string, level: SSMLEmphasis = 'strong'): string {
    if (level === 'none') return text;
    return `<emphasis level="${level}">${text}</emphasis>`;
  }

  /**
   * Add prosody (rate, pitch, volume) to text
   */
  static prosody(text: string, options: Omit<SSMLOptions, 'emphasis' | 'pauseBefore' | 'pauseAfter'>): string {
    const attributes: string[] = [];
    
    if (options.rate) attributes.push(`rate="${options.rate}"`);
    if (options.pitch) attributes.push(`pitch="${options.pitch}"`);
    if (options.volume) attributes.push(`volume="${options.volume}"`);

    if (attributes.length === 0) return text;

    return `<prosody ${attributes.join(' ')}>${text}</prosody>`;
  }

  /**
   * Add a pause (break) in speech
   */
  static pause(milliseconds: number): string {
    return `<break time="${milliseconds}ms"/>`;
  }

  /**
   * Add pause by strength
   */
  static breakStrength(strength: 'none' | 'x-weak' | 'weak' | 'medium' | 'strong' | 'x-strong'): string {
    return `<break strength="${strength}"/>`;
  }

  /**
   * Create an enhanced hazard alert with urgency
   */
  static hazardAlert(hazardType: string, description: string, severity: 'low' | 'medium' | 'high'): string {
    let rate: SSMLRate = 'medium';
    let emphasis: SSMLEmphasis = 'moderate';
    let pitch: SSMLPitch = 'medium';

    if (severity === 'high') {
      rate = 'fast';
      emphasis = 'strong';
      pitch = 'high';
    } else if (severity === 'medium') {
      rate = 'medium';
      emphasis = 'strong';
      pitch = 'medium';
    }

    const alert = this.emphasize('Alert', emphasis);
    const hazard = this.prosody(hazardType, { rate, pitch, volume: 'loud' });
    
    return this.createDocument(
      `${alert}${this.pause(200)}${hazard}${this.breakStrength('medium')}${description}`
    );
  }

  /**
   * Create navigation instruction with clear pacing
   */
  static navigationInstruction(instruction: string): string {
    // Split into segments for natural pauses
    const segments = instruction.split('.')
      .filter(s => s.trim())
      .map(s => s.trim());

    const enhanced = segments.map((segment, idx) => {
      // Add slight pause between instructions
      const pause = idx > 0 ? this.breakStrength('weak') : '';
      return `${pause}${segment}`;
    }).join('.');

    return this.createDocument(
      this.prosody(enhanced, { rate: 'medium', pitch: 'medium' })
    );
  }

  /**
   * Create encouraging feedback
   */
  static encouragement(message: string): string {
    return this.createDocument(
      this.prosody(message, { 
        rate: 'medium', 
        pitch: 'medium',
        volume: 'medium'
      })
    );
  }

  /**
   * Create item found announcement
   */
  static itemFound(itemName: string, location: string): string {
    const found = this.emphasize('Found', 'strong');
    const item = this.emphasize(itemName, 'moderate');
    
    return this.createDocument(
      `${found}${this.pause(200)}${item}${this.breakStrength('weak')}${location}`
    );
  }

  /**
   * Create critical SOS message
   */
  static sosMessage(message: string): string {
    return this.createDocument(
      this.prosody(
        this.emphasize(message, 'strong'),
        { rate: 'slow', pitch: 'low', volume: 'x-loud' }
      )
    );
  }

  /**
   * Create scene description with natural pacing
   */
  static sceneDescription(description: string): string {
    // Add natural pauses at commas and periods
    let enhanced = description
      .replace(/,/g, `,${this.breakStrength('x-weak')}`)
      .replace(/\./g, `.${this.breakStrength('weak')}`);

    return this.createDocument(
      this.prosody(enhanced, { rate: 'medium' })
    );
  }

  /**
   * Create distance/measurement announcement
   */
  static distance(value: number, unit: 'meters' | 'feet'): string {
    const distance = `${value} ${unit}`;
    return this.emphasize(distance, 'moderate');
  }

  /**
   * General purpose enhanced text with options
   */
  static enhance(text: string, options: SSMLOptions = {}): string {
    let enhanced = text;

    // Add pauses
    if (options.pauseBefore) {
      enhanced = `${this.pause(options.pauseBefore)}${enhanced}`;
    }

    // Add emphasis
    if (options.emphasis) {
      enhanced = this.emphasize(enhanced, options.emphasis);
    }

    // Add prosody
    const prosodyOptions: any = {};
    if (options.rate) prosodyOptions.rate = options.rate;
    if (options.pitch) prosodyOptions.pitch = options.pitch;
    if (options.volume) prosodyOptions.volume = options.volume;

    if (Object.keys(prosodyOptions).length > 0) {
      enhanced = this.prosody(enhanced, prosodyOptions);
    }

    // Add pause after
    if (options.pauseAfter) {
      enhanced = `${enhanced}${this.pause(options.pauseAfter)}`;
    }

    return this.createDocument(enhanced);
  }

  /**
   * Strip SSML tags (for display purposes)
   */
  static stripSSML(ssmlText: string): string {
    return ssmlText
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Check if browser supports SSML (basic check)
   */
  static isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    
    const synth = window.speechSynthesis;
    if (!synth) return false;

    // Create a test utterance with SSML
    const testSSML = '<speak>test</speak>';
    const utterance = new SpeechSynthesisUtterance(testSSML);
    
    // Most modern browsers support SSML in some capacity
    // This is a basic check - actual support varies
    return true;
  }
}

/**
 * Helper function to speak SSML text using Web Speech API
 */
export const speakSSML = (ssmlText: string, options: {
  voice?: SpeechSynthesisVoice;
  onEnd?: () => void;
  onError?: (error: Error) => void;
} = {}): void => {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    options.onError?.(new Error('Speech synthesis not supported'));
    return;
  }

  const synth = window.speechSynthesis;
  
  // Cancel any ongoing speech
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(ssmlText);
  
  if (options.voice) {
    utterance.voice = options.voice;
  }

  utterance.onend = () => {
    options.onEnd?.();
  };

  utterance.onerror = (event) => {
    options.onError?.(new Error(event.error));
  };

  synth.speak(utterance);
};
