export class TouchControls {
  constructor(debugSystem = null) {
    this.debug = debugSystem;
    this.isEnabled = false;
    this.isMobile = false;
    
    // Touch state
    this.touchInput = {
      steering: 0,      // -1 to 1
      throttle: 0,      // 0 to 1
      brake: 0         // 0 to 1
    };
    
    // DOM elements
    this.joystick = null;
    this.joystickKnob = null;
    this.touchButtons = null;
    this.accelerateButton = null;
    this.brakeButton = null;
    
    // Touch tracking
    this.joystickCenter = { x: 0, y: 0 };
    this.joystickRadius = 40;
    this.currentTouch = null;
    
    this.init();
  }
  
  init() {
    try {
      this.debug?.checkpoint('🤳 Inicializando controles touch');
      
      // Detectar se é mobile
      this.detectMobile();
      
      // Obter elementos DOM
      this.setupElements();
      
      // Configurar event listeners
      this.setupEventListeners();
      
      // Ativar controles se for mobile
      if (this.isMobile) {
        this.enable();
      }
      
      this.debug?.checkpoint('Controles touch inicializados', 'success', 
        `Mobile: ${this.isMobile}, Enabled: ${this.isEnabled}`);
        
    } catch (error) {
      this.debug?.error('Erro ao inicializar controles touch', error);
    }
  }
  
  detectMobile() {
    // Detectar dispositivo mobile
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth <= 768;
    const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    
    this.isMobile = isTouchDevice && (isSmallScreen || isCoarsePointer);
    
    this.debug?.checkpoint('Detecção mobile', 'success', 
      `Touch: ${isTouchDevice}, Small: ${isSmallScreen}, Coarse: ${isCoarsePointer}`);
  }
  
  setupElements() {
    // Obter elementos DOM
    this.joystick = document.getElementById('touch-joystick');
    this.joystickKnob = document.getElementById('touch-joystick-knob');
    this.touchButtons = document.getElementById('touch-buttons');
    this.accelerateButton = document.getElementById('touch-accelerate');
    this.brakeButton = document.getElementById('touch-brake');
    
    if (!this.joystick || !this.joystickKnob) {
      this.debug?.warning('Elementos do joystick não encontrados, desabilitando touch controls');
      this.isEnabled = false;
      return;
    }
    
    if (!this.accelerateButton || !this.brakeButton) {
      this.debug?.warning('Botões touch não encontrados, desabilitando touch controls');
      this.isEnabled = false;
      return;
    }
    
    // Calcular centro do joystick
    this.updateJoystickCenter();
    
    this.debug?.checkpoint('Elementos touch configurados');
  }
  
  setupEventListeners() {
    if (!this.isEnabled) return;
    
    // Joystick events
    if (this.joystick) {
      this.joystick.addEventListener('touchstart', (e) => this.onJoystickTouchStart(e));
      this.joystick.addEventListener('touchmove', (e) => this.onJoystickTouchMove(e));
      this.joystick.addEventListener('touchend', (e) => this.onJoystickTouchEnd(e));
    }
    
    // Button events
    if (this.accelerateButton) {
      this.accelerateButton.addEventListener('touchstart', (e) => this.onButtonTouchStart(e, 'throttle'));
      this.accelerateButton.addEventListener('touchend', (e) => this.onButtonTouchEnd(e, 'throttle'));
    }
    
    if (this.brakeButton) {
      this.brakeButton.addEventListener('touchstart', (e) => this.onButtonTouchStart(e, 'brake'));
      this.brakeButton.addEventListener('touchend', (e) => this.onButtonTouchEnd(e, 'brake'));
    }
    
    // Resize listener
    window.addEventListener('resize', () => this.updateJoystickCenter());
    
    this.debug?.checkpoint('Event listeners touch configurados');
  }
  
  updateJoystickCenter() {
    if (!this.joystick) return;
    
    const rect = this.joystick.getBoundingClientRect();
    this.joystickCenter.x = rect.left + rect.width / 2;
    this.joystickCenter.y = rect.top + rect.height / 2;
    this.joystickRadius = rect.width / 2 - 20; // Margem para o knob
  }
  
  onJoystickTouchStart(event) {
    event.preventDefault();
    const touch = event.touches[0];
    this.currentTouch = touch.identifier;
    this.updateJoystickPosition(touch);
    
    this.debug?.checkpoint('Joystick touch start');
  }
  
  onJoystickTouchMove(event) {
    event.preventDefault();
    
    // Encontrar o touch correto
    const touch = Array.from(event.touches).find(t => t.identifier === this.currentTouch);
    if (!touch) return;
    
    this.updateJoystickPosition(touch);
  }
  
  onJoystickTouchEnd(event) {
    event.preventDefault();
    this.currentTouch = null;
    
    // Resetar posição do joystick
    this.touchInput.steering = 0;
    this.updateJoystickVisual();
    
    this.debug?.checkpoint('Joystick touch end');
  }
  
  updateJoystickPosition(touch) {
    this.updateJoystickCenter();
    
    // Calcular posição relativa ao centro
    const deltaX = touch.clientX - this.joystickCenter.x;
    const deltaY = touch.clientY - this.joystickCenter.y;
    
    // Calcular distância e ângulo
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const clampedDistance = Math.min(distance, this.joystickRadius);
    
    // Normalizar para -1 a 1
    this.touchInput.steering = clampedDistance > 0 ? (deltaX / this.joystickRadius) : 0;
    this.touchInput.steering = Math.max(-1, Math.min(1, this.touchInput.steering));
    
    // Atualizar visual
    this.updateJoystickVisual();
  }
  
  updateJoystickVisual() {
    if (!this.joystickKnob) return;
    
    const offsetX = this.touchInput.steering * this.joystickRadius;
    const offsetY = 0; // Apenas movimento horizontal
    
    this.joystickKnob.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
  }
  
  onButtonTouchStart(event, buttonType) {
    event.preventDefault();
    
    this.touchInput[buttonType] = 1.0;
    
    // Feedback visual
    event.target.classList.add('pressed');
    
    this.debug?.checkpoint(`Botão ${buttonType} pressionado`);
  }
  
  onButtonTouchEnd(event, buttonType) {
    event.preventDefault();
    
    this.touchInput[buttonType] = 0.0;
    
    // Remover feedback visual
    event.target.classList.remove('pressed');
    
    this.debug?.checkpoint(`Botão ${buttonType} solto`);
  }
  
  enable() {
    this.isEnabled = true;
    
    // Mostrar controles
    const touchControls = document.getElementById('touch-controls');
    const touchButtons = document.getElementById('touch-buttons');
    
    if (touchControls) touchControls.classList.add('mobile');
    if (touchButtons) touchButtons.classList.add('mobile');
    
    this.debug?.checkpoint('Controles touch habilitados');
  }
  
  disable() {
    this.isEnabled = false;
    
    // Ocultar controles
    const touchControls = document.getElementById('touch-controls');
    const touchButtons = document.getElementById('touch-buttons');
    
    if (touchControls) touchControls.classList.remove('mobile');
    if (touchButtons) touchButtons.classList.remove('mobile');
    
    // Resetar input
    this.touchInput.steering = 0;
    this.touchInput.throttle = 0;
    this.touchInput.brake = 0;
    
    this.debug?.checkpoint('Controles touch desabilitados');
  }
  
  getInput() {
    return this.isEnabled ? { ...this.touchInput } : { steering: 0, throttle: 0, brake: 0 };
  }
  
  // Converter touch input para formato do jogo
  getGameInput() {
    if (!this.isEnabled) {
      return { throttle: 0, steering: 0, brake: 0 };
    }
    
    return {
      throttle: this.touchInput.throttle,
      steering: this.touchInput.steering,
      brake: this.touchInput.brake
    };
  }
}