export class GamepadControls {
  constructor(debugSystem = null) {
    this.debug = debugSystem;
    this.isEnabled = false;
    this.gamepadIndex = -1;
    this.gamepad = null;
    
    // Gamepad input state
    this.gamepadInput = {
      throttle: 0,      // 0 to 1
      steering: 0,      // -1 to 1
      brake: 0         // 0 to 1
    };
    
    // Gamepad mapping (Xbox/PlayStation style)
    this.buttonMapping = {
      throttle: 7,      // Right trigger (RT/R2)
      brake: 6,         // Left trigger (LT/L2)
      handbrake: 0,     // A/X button
      reset: 3          // Y/Triangle button
    };
    
    this.axisMapping = {
      steering: 0,      // Left stick X-axis
      throttleAlt: 3,   // Right stick Y-axis (alternative)
      cameraX: 2,       // Right stick X-axis
      cameraY: 3        // Right stick Y-axis
    };
    
    // Dead zone for analog sticks
    this.deadZone = 0.1;
    
    // Update interval
    this.updateInterval = null;
    
    this.init();
  }
  
  init() {
    try {
      this.debug?.checkpoint('🎮 Inicializando controles gamepad');
      
      // Verificar suporte a gamepad
      if (!navigator.getGamepads) {
        this.debug?.warning('Gamepad API não suportada');
        return;
      }
      
      // Configurar event listeners
      this.setupEventListeners();
      
      // Verificar gamepads já conectados
      this.checkConnectedGamepads();
      
      this.debug?.checkpoint('Controles gamepad inicializados', 'success');
      
    } catch (error) {
      this.debug?.error('Erro ao inicializar controles gamepad', error);
    }
  }
  
  setupEventListeners() {
    // Gamepad connection events
    window.addEventListener('gamepadconnected', (e) => this.onGamepadConnected(e));
    window.addEventListener('gamepaddisconnected', (e) => this.onGamepadDisconnected(e));
    
    this.debug?.checkpoint('Event listeners gamepad configurados');
  }
  
  onGamepadConnected(event) {
    const gamepad = event.gamepad;
    
    this.debug?.checkpoint('Gamepad conectado', 'success', 
      `${gamepad.id} (índice: ${gamepad.index})`);
    
    // Usar o primeiro gamepad conectado
    if (this.gamepadIndex === -1) {
      this.gamepadIndex = gamepad.index;
      this.enable();
    }
  }
  
  onGamepadDisconnected(event) {
    const gamepad = event.gamepad;
    
    this.debug?.checkpoint('Gamepad desconectado', 'warning', 
      `${gamepad.id} (índice: ${gamepad.index})`);
    
    // Se era o gamepad que estávamos usando
    if (this.gamepadIndex === gamepad.index) {
      this.disable();
      this.gamepadIndex = -1;
      
      // Tentar encontrar outro gamepad
      setTimeout(() => this.checkConnectedGamepads(), 100);
    }
  }
  
  checkConnectedGamepads() {
    const gamepads = navigator.getGamepads();
    
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) {
        this.gamepadIndex = i;
        this.enable();
        this.debug?.checkpoint('Gamepad detectado', 'success', 
          `${gamepads[i].id} (índice: ${i})`);
        break;
      }
    }
  }
  
  enable() {
    this.isEnabled = true;
    
    // Iniciar loop de atualização
    this.startUpdateLoop();
    
    this.debug?.checkpoint('Controles gamepad habilitados');
  }
  
  disable() {
    this.isEnabled = false;
    
    // Parar loop de atualização
    this.stopUpdateLoop();
    
    // Resetar input
    this.gamepadInput.throttle = 0;
    this.gamepadInput.steering = 0;
    this.gamepadInput.brake = 0;
    
    this.debug?.checkpoint('Controles gamepad desabilitados');
  }
  
  startUpdateLoop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    // Atualizar a 60 FPS
    this.updateInterval = setInterval(() => this.update(), 16);
  }
  
  stopUpdateLoop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
  
  update() {
    if (!this.isEnabled || this.gamepadIndex === -1) return;
    
    // Obter gamepad atual
    const gamepads = navigator.getGamepads();
    this.gamepad = gamepads[this.gamepadIndex];
    
    if (!this.gamepad) {
      this.disable();
      return;
    }
    
    // Atualizar input
    this.updateInput();
  }
  
  updateInput() {
    if (!this.gamepad) return;
    
    // Steering (left stick X-axis)
    const steeringRaw = this.gamepad.axes[this.axisMapping.steering] || 0;
    this.gamepadInput.steering = this.applyDeadZone(steeringRaw);
    
    // Throttle (right trigger)
    const throttleRaw = this.gamepad.buttons[this.buttonMapping.throttle]?.value || 0;
    this.gamepadInput.throttle = throttleRaw;
    
    // Brake (left trigger)
    const brakeRaw = this.gamepad.buttons[this.buttonMapping.brake]?.value || 0;
    this.gamepadInput.brake = brakeRaw;
    
    // Debug: mostrar input a cada segundo
    if (Math.floor(Date.now() / 1000) % 2 === 0) {
      const hasInput = Math.abs(this.gamepadInput.steering) > 0.1 || 
                      this.gamepadInput.throttle > 0.1 || 
                      this.gamepadInput.brake > 0.1;
      
      if (hasInput) {
        this.debug?.checkpoint('Gamepad input', 'success', 
          `S:${this.gamepadInput.steering.toFixed(2)}, T:${this.gamepadInput.throttle.toFixed(2)}, B:${this.gamepadInput.brake.toFixed(2)}`);
      }
    }
  }
  
  applyDeadZone(value) {
    // Aplicar dead zone para evitar drift
    if (Math.abs(value) < this.deadZone) {
      return 0;
    }
    
    // Remapear para range completo
    const sign = Math.sign(value);
    const normalizedValue = (Math.abs(value) - this.deadZone) / (1 - this.deadZone);
    
    return sign * normalizedValue;
  }
  
  isButtonPressed(buttonIndex) {
    if (!this.gamepad || !this.gamepad.buttons[buttonIndex]) return false;
    return this.gamepad.buttons[buttonIndex].pressed;
  }
  
  getButtonValue(buttonIndex) {
    if (!this.gamepad || !this.gamepad.buttons[buttonIndex]) return 0;
    return this.gamepad.buttons[buttonIndex].value;
  }
  
  getAxisValue(axisIndex) {
    if (!this.gamepad || !this.gamepad.axes[axisIndex]) return 0;
    return this.applyDeadZone(this.gamepad.axes[axisIndex]);
  }
  
  getInput() {
    return this.isEnabled ? { ...this.gamepadInput } : { throttle: 0, steering: 0, brake: 0 };
  }
  
  // Converter gamepad input para formato do jogo
  getGameInput() {
    if (!this.isEnabled) {
      return { throttle: 0, steering: 0, brake: 0 };
    }
    
    return {
      throttle: this.gamepadInput.throttle,
      steering: this.gamepadInput.steering,
      brake: this.gamepadInput.brake
    };
  }
  
  // Informações do gamepad
  getGamepadInfo() {
    if (!this.gamepad) return null;
    
    return {
      id: this.gamepad.id,
      index: this.gamepad.index,
      connected: this.gamepad.connected,
      buttonsCount: this.gamepad.buttons.length,
      axesCount: this.gamepad.axes.length,
      timestamp: this.gamepad.timestamp
    };
  }
}