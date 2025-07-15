export class ControlSettings {
  constructor(debugSystem = null) {
    this.debug = debugSystem;
    
    // Default sensitivity settings
    this.settings = {
      keyboard: {
        throttleSensitivity: 1.0,
        steeringSensitivity: 1.0,
        brakeSensitivity: 1.0
      },
      touch: {
        throttleSensitivity: 1.0,
        steeringSensitivity: 0.8,
        brakeSensitivity: 1.0,
        joystickSensitivity: 1.0
      },
      gamepad: {
        throttleSensitivity: 1.0,
        steeringSensitivity: 0.9,
        brakeSensitivity: 1.0,
        deadZone: 0.1,
        triggerDeadZone: 0.05
      },
      general: {
        invertSteering: false,
        smoothing: 0.1,
        responseTime: 0.2
      }
    };
    
    // Load saved settings
    this.loadSettings();
    
    this.debug?.checkpoint('⚙️ ControlSettings inicializado');
  }
  
  loadSettings() {
    try {
      const savedSettings = localStorage.getItem('carrinho3d-controls');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        
        // Merge with defaults to ensure all properties exist
        this.settings = this.mergeSettings(this.settings, parsed);
        
        this.debug?.checkpoint('Configurações carregadas do localStorage');
      }
    } catch (error) {
      this.debug?.warning('Erro ao carregar configurações', error.message);
    }
  }
  
  saveSettings() {
    try {
      localStorage.setItem('carrinho3d-controls', JSON.stringify(this.settings));
      this.debug?.checkpoint('Configurações salvas no localStorage');
    } catch (error) {
      this.debug?.error('Erro ao salvar configurações', error);
    }
  }
  
  mergeSettings(defaults, saved) {
    const merged = { ...defaults };
    
    for (const category in saved) {
      if (merged[category]) {
        merged[category] = { ...merged[category], ...saved[category] };
      }
    }
    
    return merged;
  }
  
  // Apply sensitivity to input values
  applyKeyboardSensitivity(input) {
    const settings = this.settings.keyboard;
    const general = this.settings.general;
    
    return {
      throttle: input.throttle * settings.throttleSensitivity,
      steering: input.steering * settings.steeringSensitivity * (general.invertSteering ? -1 : 1),
      brake: input.brake * settings.brakeSensitivity
    };
  }
  
  applyTouchSensitivity(input) {
    const settings = this.settings.touch;
    const general = this.settings.general;
    
    return {
      throttle: input.throttle * settings.throttleSensitivity,
      steering: input.steering * settings.steeringSensitivity * (general.invertSteering ? -1 : 1),
      brake: input.brake * settings.brakeSensitivity
    };
  }
  
  applyGamepadSensitivity(input) {
    const settings = this.settings.gamepad;
    const general = this.settings.general;
    
    return {
      throttle: this.applyDeadZone(input.throttle, settings.triggerDeadZone) * settings.throttleSensitivity,
      steering: this.applyDeadZone(input.steering, settings.deadZone) * settings.steeringSensitivity * (general.invertSteering ? -1 : 1),
      brake: this.applyDeadZone(input.brake, settings.triggerDeadZone) * settings.brakeSensitivity
    };
  }
  
  applyDeadZone(value, deadZone) {
    if (Math.abs(value) < deadZone) {
      return 0;
    }
    
    const sign = Math.sign(value);
    const normalizedValue = (Math.abs(value) - deadZone) / (1 - deadZone);
    
    return sign * normalizedValue;
  }
  
  // Smooth input changes
  smoothInput(currentInput, targetInput, deltaTime) {
    const smoothingFactor = this.settings.general.smoothing;
    const responseTime = this.settings.general.responseTime;
    
    const smoothSpeed = 1 / Math.max(responseTime, 0.01);
    const factor = Math.min(smoothSpeed * deltaTime, 1);
    
    return {
      throttle: this.lerp(currentInput.throttle, targetInput.throttle, factor),
      steering: this.lerp(currentInput.steering, targetInput.steering, factor),
      brake: this.lerp(currentInput.brake, targetInput.brake, factor)
    };
  }
  
  lerp(a, b, t) {
    return a + (b - a) * t;
  }
  
  // Getters for individual settings
  getKeyboardSensitivity() {
    return this.settings.keyboard;
  }
  
  getTouchSensitivity() {
    return this.settings.touch;
  }
  
  getGamepadSensitivity() {
    return this.settings.gamepad;
  }
  
  getGeneralSettings() {
    return this.settings.general;
  }
  
  // Setters for individual settings
  setKeyboardSensitivity(settings) {
    this.settings.keyboard = { ...this.settings.keyboard, ...settings };
    this.saveSettings();
    this.debug?.checkpoint('Sensibilidade do teclado atualizada');
  }
  
  setTouchSensitivity(settings) {
    this.settings.touch = { ...this.settings.touch, ...settings };
    this.saveSettings();
    this.debug?.checkpoint('Sensibilidade do touch atualizada');
  }
  
  setGamepadSensitivity(settings) {
    this.settings.gamepad = { ...this.settings.gamepad, ...settings };
    this.saveSettings();
    this.debug?.checkpoint('Sensibilidade do gamepad atualizada');
  }
  
  setGeneralSettings(settings) {
    this.settings.general = { ...this.settings.general, ...settings };
    this.saveSettings();
    this.debug?.checkpoint('Configurações gerais atualizadas');
  }
  
  // Reset to defaults
  resetToDefaults() {
    this.settings = {
      keyboard: {
        throttleSensitivity: 1.0,
        steeringSensitivity: 1.0,
        brakeSensitivity: 1.0
      },
      touch: {
        throttleSensitivity: 1.0,
        steeringSensitivity: 0.8,
        brakeSensitivity: 1.0,
        joystickSensitivity: 1.0
      },
      gamepad: {
        throttleSensitivity: 1.0,
        steeringSensitivity: 0.9,
        brakeSensitivity: 1.0,
        deadZone: 0.1,
        triggerDeadZone: 0.05
      },
      general: {
        invertSteering: false,
        smoothing: 0.1,
        responseTime: 0.2
      }
    };
    
    this.saveSettings();
    this.debug?.checkpoint('Configurações resetadas para padrão');
  }
  
  // Quick presets
  setPreset(presetName) {
    const presets = {
      casual: {
        keyboard: { throttleSensitivity: 0.8, steeringSensitivity: 0.7, brakeSensitivity: 0.8 },
        touch: { throttleSensitivity: 0.8, steeringSensitivity: 0.6, brakeSensitivity: 0.8 },
        gamepad: { throttleSensitivity: 0.8, steeringSensitivity: 0.7, brakeSensitivity: 0.8 },
        general: { smoothing: 0.2, responseTime: 0.3 }
      },
      
      sport: {
        keyboard: { throttleSensitivity: 1.2, steeringSensitivity: 1.1, brakeSensitivity: 1.0 },
        touch: { throttleSensitivity: 1.1, steeringSensitivity: 0.9, brakeSensitivity: 1.0 },
        gamepad: { throttleSensitivity: 1.1, steeringSensitivity: 1.0, brakeSensitivity: 1.0 },
        general: { smoothing: 0.05, responseTime: 0.1 }
      },
      
      precise: {
        keyboard: { throttleSensitivity: 0.6, steeringSensitivity: 0.5, brakeSensitivity: 0.7 },
        touch: { throttleSensitivity: 0.6, steeringSensitivity: 0.4, brakeSensitivity: 0.7 },
        gamepad: { throttleSensitivity: 0.6, steeringSensitivity: 0.5, brakeSensitivity: 0.7 },
        general: { smoothing: 0.3, responseTime: 0.4 }
      }
    };
    
    const preset = presets[presetName];
    if (preset) {
      for (const category in preset) {
        this.settings[category] = { ...this.settings[category], ...preset[category] };
      }
      
      this.saveSettings();
      this.debug?.checkpoint(`Preset '${presetName}' aplicado`);
    } else {
      this.debug?.warning(`Preset '${presetName}' não encontrado`);
    }
  }
  
  // Get all settings
  getAllSettings() {
    return { ...this.settings };
  }
}