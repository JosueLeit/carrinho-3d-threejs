import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DebugSystem } from './debug.js';
import { PhysicsWorld } from './physics.js';
import { TouchControls } from './TouchControls.js';
import { GamepadControls } from './GamepadControls.js';
import { ControlSettings } from './ControlSettings.js';

// Versão com física integrada gradualmente
class CarGame {
  constructor() {
    try {
      // Sistema de debug
      this.debug = new DebugSystem();
      this.debug.checkpoint('🚀 Iniciando CarGame com física');
      
      // Elementos DOM
      this.loadingScreen = document.getElementById('loadingScreen');
      this.uiOverlay = document.getElementById('ui-overlay');
      
      if (!this.loadingScreen) {
        throw new Error('Loading screen não encontrado no DOM');
      }
      
      // Configuração básica
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.controls = null;
      
      // Sistema de física
      this.physics = null;
      
      // Sistema de controles
      this.touchControls = null;
      this.gamepadControls = null;
      this.controlSettings = null;
      this.smoothedInput = { throttle: 0, steering: 0, brake: 0 };
      
      // Sistema de movimento aprimorado
      this.carMovement = {
        velocity: { x: 0, z: 0 },
        acceleration: 0.3,
        deceleration: 0.85,
        maxSpeed: 0.5,
        turnSpeed: 0.08,
        currentSpeed: 0,
        turnSmoothness: 0.1
      };
      
      // Objetos do jogo
      this.car = null;
      this.ground = null;
      this.physicsGround = null;
      this.physicsCar = null;
      
      // Sistema de mundo interativo
      this.worldObjects = {
        collectibles: [],
        obstacles: [],
        ramps: [],
        boundaries: []
      };
      this.score = 0;
      
      // Estado do jogo
      this.isLoaded = false;
      this.keys = {};
      this.clock = new THREE.Clock();
      this.showPhysicsDebug = true; // Toggle para visualização de debug (enabled by default)
      
      this.debug.checkpoint('Constructor finalizado, iniciando init()');
      this.init();
      
    } catch (error) {
      console.error('Erro no constructor:', error);
      // Fallback error display
      document.body.innerHTML = `
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                    background: red; color: white; padding: 20px; border-radius: 10px; 
                    text-align: center; z-index: 10000;">
          <h3>Erro Fatal na Inicialização</h3>
          <p>${error.message}</p>
          <p><small>Verifique o console para mais detalhes</small></p>
        </div>
      `;
    }
  }

  async init() {
    try {
      this.debug.checkpoint('Iniciando setup básico');
      
      // Renderer setup
      try {
        this.setupRenderer();
        this.debug.checkpoint('Renderer criado');
      } catch (error) {
        this.debug.error('Erro no renderer', error);
        throw error;
      }
      
      // Scene setup
      try {
        this.setupScene(); 
        this.debug.checkpoint('Scene criada');
      } catch (error) {
        this.debug.error('Erro na scene', error);
        throw error;
      }
      
      // Camera setup
      try {
        this.setupCamera();
        this.debug.checkpoint('Camera criada');
      } catch (error) {
        this.debug.error('Erro na camera', error);
        throw error;
      }
      
      // Controls setup
      try {
        this.setupControls();
        this.debug.checkpoint('Controls criados');
      } catch (error) {
        this.debug.error('Erro nos controls', error);
        throw error;
      }
      
      // Lights setup
      try {
        this.setupLights();
        this.debug.checkpoint('Luzes criadas');
      } catch (error) {
        this.debug.error('Erro nas luzes', error);
        throw error;
      }
      
      // Physics setup (temporarily disabled until sync is fixed)
      this.debug.checkpoint('Physics temporariamente desabilitado - debugging sync issue');
      this.physics = null;
      
      /*try {
        this.setupPhysics();
        this.debug.checkpoint('Physics criado');
      } catch (error) {
        this.debug.warning('Physics falhou, continuando sem física', error.message);
        this.physics = null;
      }*/
      
      // Touch controls setup (não crítico)
      try {
        this.setupTouchControls();
        this.debug.checkpoint('Touch controls criado');
      } catch (error) {
        this.debug.warning('Touch controls falhou', error.message);
      }
      
      // Gamepad controls setup (não crítico)
      try {
        this.setupGamepadControls();
        this.debug.checkpoint('Gamepad controls criado');
      } catch (error) {
        this.debug.warning('Gamepad controls falhou', error.message);
      }
      
      // Control settings setup (não crítico)
      try {
        this.setupControlSettings();
        this.debug.checkpoint('Control settings criado');
      } catch (error) {
        this.debug.warning('Control settings falhou', error.message);
      }
      
      // Ground creation
      try {
        this.createGround();
        this.debug.checkpoint('Ground criado');
      } catch (error) {
        this.debug.error('Erro ao criar chão', error);
        throw error;
      }
      
      // Car creation
      try {
        this.createCar();
        this.debug.checkpoint('Car criado');
      } catch (error) {
        this.debug.error('Erro ao criar carro', error);
        throw error;
      }
      
      // Interactive world creation
      try {
        this.createInteractiveWorld();
        this.debug.checkpoint('Mundo interativo criado');
      } catch (error) {
        this.debug.error('Erro ao criar mundo interativo', error);
        throw error;
      }
      
      // Debug visualization (não crítico)
      try {
        if (this.physics) {
          this.physics.createDebugVisualization(this.scene);
          this.debug.checkpoint('Debug visualization criado');
        }
      } catch (error) {
        this.debug.warning('Debug visualization falhou', error.message);
      }
      
      // Event listeners
      try {
        this.setupEventListeners();
        this.debug.checkpoint('Event listeners criados');
      } catch (error) {
        this.debug.error('Erro nos event listeners', error);
        throw error;
      }
      
      // Verificações finais
      this.debug.checkThreeJS(this.scene, this.camera, this.renderer);
      this.debug.checkScene(this.scene);
      this.debug.checkLights(this.scene);
      this.debug.checkCamera(this.camera);
      
      // Debug do carro
      const carInScene = this.scene.children.find(child => child === this.car);
      if (carInScene) {
        this.debug.checkpoint('Carro encontrado na cena', 'success', 
          `posição: ${this.car.position.x}, ${this.car.position.y}, ${this.car.position.z}`);
        this.debug.checkpoint('Carro visível?', this.car.visible ? 'success' : 'error', 
          `visible: ${this.car.visible}`);
        this.debug.checkpoint('Cor do carro', 'success', 
          `cor: #${this.car.material.color.getHexString()}`);
      } else {
        this.debug.error('Carro não encontrado na cena');
      }
      
      // Debug da cena - listar todos os objetos
      const sceneObjects = this.scene.children.map(child => 
        `${child.type}${child.name ? ` (${child.name})` : ''} pos:(${child.position.x.toFixed(1)},${child.position.y.toFixed(1)},${child.position.z.toFixed(1)})`
      );
      this.debug.checkpoint('Objetos na cena', 'success', 
        `Total: ${this.scene.children.length} - ${sceneObjects.join(', ')}`);
      
      // Debug da câmera
      this.debug.checkpoint('Posição da câmera', 'success', 
        `pos: (${this.camera.position.x}, ${this.camera.position.y}, ${this.camera.position.z})`);
      this.debug.checkpoint('Camera olhando para', 'success', 
        `target: (${this.controls.target.x}, ${this.controls.target.y}, ${this.controls.target.z})`);
      
      // Simula carregamento
      await this.simulateLoading();
      
      this.hideLoadingScreen();
      this.animate();
      
      this.debug.checkpoint('Jogo inicializado com sucesso!', 'success');
      
    } catch (error) {
      this.debug.error('Erro ao inicializar o jogo', error);
      console.error('Erro detalhado:', error);
      
      // Tentar mostrar uma mensagem de erro para o usuário
      this.showErrorMessage(error.message);
    }
  }

  setupRenderer() {
    this.debug.checkpoint('Criando WebGL Renderer');
    
    // Verificar se WebGL está disponível
    if (!window.WebGLRenderingContext && !window.WebGL2RenderingContext) {
      throw new Error('WebGL não está disponível neste navegador');
    }
    
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: "high-performance"
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Advanced shadow configuration
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Enhanced rendering settings
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    
    // Enable gamma correction for realistic colors
    this.renderer.useLegacyLights = false;
    
    // Adicionar canvas ao DOM IMEDIATAMENTE
    document.body.appendChild(this.renderer.domElement);
    this.debug.checkpoint('Canvas adicionado ao DOM');
    
    // Verificar se o canvas foi criado corretamente
    if (!this.renderer.domElement) {
      throw new Error('Canvas não foi criado pelo WebGL Renderer');
    }
    
    this.debug.checkpoint('WebGL Renderer configurado com sucesso');
  }

  setupScene() {
    this.debug.checkpoint('Criando Scene básica');
    this.scene = new THREE.Scene();
    // Background simples e visível
    this.scene.background = new THREE.Color(0x87CEEB); // Azul céu
  }

  setupCamera() {
    this.debug.checkpoint('Criando Camera');
    this.camera = new THREE.PerspectiveCamera(
      75, // FOV maior para ver melhor
      window.innerWidth / window.innerHeight,
      0.1, // Near
      1000 // Far
    );
    
    // Posição inicial da câmera - mais próxima para ver o carro
    this.camera.position.set(8, 6, 8);
    this.camera.lookAt(0, 2, 0); // Olhar para onde o carro está (y=2)
    this.debug.checkpoint('Camera posicionada', 'success', this.debug.vec3ToString(this.camera.position));
  }

  setupControls() {
    this.debug.checkpoint('Criando OrbitControls');
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 2, 0); // Olhar para onde o carro está
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.update();
    this.debug.checkpoint('OrbitControls configurados');
  }

  setupLights() {
    this.debug.checkpoint('🌟 Configurando sistema de iluminação avançado');
    
    // Ambient light - soft global illumination
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    this.scene.add(ambientLight);
    this.debug.checkpoint('Luz ambiente suave configurada', 'success', 'Intensidade: 0.3');

    // Directional light (sun) - main light source with shadows
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(50, 50, 25);
    directionalLight.target.position.set(0, 0, 0);
    
    // Configure shadow mapping
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    directionalLight.shadow.bias = -0.0001;
    
    this.scene.add(directionalLight);
    this.scene.add(directionalLight.target);
    this.debug.checkpoint('Luz direcional com sombras configurada', 'success', 'Resolução: 2048x2048');

    // Hemisphere light - sky/ground color variation
    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x8B4513, 0.4);
    hemisphereLight.position.set(0, 50, 0);
    this.scene.add(hemisphereLight);
    this.debug.checkpoint('Luz hemisférica configurada', 'success', 'Céu azul, terra marrom');

    // Point lights for accent lighting
    const pointLight1 = new THREE.PointLight(0xffffff, 0.5, 30);
    pointLight1.position.set(15, 8, 15);
    pointLight1.castShadow = true;
    pointLight1.shadow.mapSize.width = 512;
    pointLight1.shadow.mapSize.height = 512;
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xffffff, 0.5, 30);
    pointLight2.position.set(-15, 8, -15);
    pointLight2.castShadow = true;
    pointLight2.shadow.mapSize.width = 512;
    pointLight2.shadow.mapSize.height = 512;
    this.scene.add(pointLight2);
    
    this.debug.checkpoint('Luzes pontuais de acento adicionadas', 'success', '2 luzes com sombras');
    
    // Store lights for dynamic control
    this.lights = {
      ambient: ambientLight,
      directional: directionalLight,
      hemisphere: hemisphereLight,
      point1: pointLight1,
      point2: pointLight2
    };
    
    this.debug.checkpoint('Sistema de iluminação avançado configurado', 'success', '5 tipos de luz');
  }

  setupPhysics() {
    this.debug.checkpoint('🌍 Inicializando sistema de física');
    
    try {
      this.physics = new PhysicsWorld(this.debug);
      this.debug.checkpoint('PhysicsWorld criado com sucesso');
      
      if (!this.physics.isInitialized) {
        throw new Error('PhysicsWorld não foi inicializado corretamente');
      }
      
      this.debug.checkpoint('Sistema de física inicializado', 'success');
      
    } catch (error) {
      this.debug.error('Falha ao inicializar física', error);
      throw error;
    }
  }

  setupTouchControls() {
    this.debug.checkpoint('🤳 Inicializando controles touch');
    
    try {
      this.touchControls = new TouchControls(this.debug);
      this.debug.checkpoint('TouchControls criado com sucesso');
      
    } catch (error) {
      this.debug.error('Falha ao inicializar controles touch', error);
      // Não é crítico, continuar sem touch controls
      this.touchControls = null;
    }
  }

  setupGamepadControls() {
    this.debug.checkpoint('🎮 Inicializando controles gamepad');
    
    try {
      this.gamepadControls = new GamepadControls(this.debug);
      this.debug.checkpoint('GamepadControls criado com sucesso');
      
    } catch (error) {
      this.debug.error('Falha ao inicializar controles gamepad', error);
      // Não é crítico, continuar sem gamepad controls
      this.gamepadControls = null;
    }
  }

  setupControlSettings() {
    this.debug.checkpoint('⚙️ Inicializando configurações de controles');
    
    try {
      this.controlSettings = new ControlSettings(this.debug);
      this.debug.checkpoint('ControlSettings criado com sucesso');
      
    } catch (error) {
      this.debug.error('Falha ao inicializar configurações de controles', error);
      // Não é crítico, continuar sem control settings
      this.controlSettings = null;
    }
  }

  createGround() {
    this.debug.checkpoint('🌱 Criando chão com material PBR avançado');
    
    // Enhanced ground with PBR material
    const groundGeometry = new THREE.PlaneGeometry(100, 100, 10, 10);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x4a7c59,
      roughness: 0.8,
      metalness: 0.1,
      transparent: false
    });
    
    this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true; // Ground receives shadows
    this.scene.add(this.ground);
    this.debug.checkpoint('Chão PBR criado', 'success', 'Material Standard com sombras');
    
    // Chão físico
    if (this.physics) {
      this.physicsGround = this.physics.createGround();
      this.debug.checkpoint('Chão físico criado');
    }
  }



  createCar() {
    this.debug.checkpoint('Criando carrinho básico para teste');
    
    // Enhanced car with professional PBR material
    const carGeometry = new THREE.BoxGeometry(4, 2, 8);
    const carMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xff0000, // Red
      roughness: 0.3, // Slightly glossy car paint
      metalness: 0.8, // Metallic car body
      envMapIntensity: 1.0 // Environmental reflections
    });
    
    this.car = new THREE.Mesh(carGeometry, carMaterial);
    this.car.position.set(0, 2, 0);
    this.car.name = 'PlayerCar';
    this.car.visible = true;
    this.car.castShadow = true; // Car casts shadows
    this.car.receiveShadow = true; // Car receives shadows from other objects
    
    // Garantir que o carro seja adicionado à cena
    this.scene.add(this.car);
    this.debug.checkpoint('Carrinho básico criado', 'success', 'Cubo vermelho 4x2x8 na posição (0,2,0)');
    
    // Physics debugging enabled - physics wireframes will show collision shapes
    
    // Log para verificar se o car foi criado
    console.log('Car created:', this.car);
    console.log('Car position:', this.car.position);
    console.log('Car material color:', this.car.material.color.getHex());
    console.log('Car in scene:', this.scene.children.includes(this.car));
    
    // Criar físico se disponível
    if (this.physics) {
      try {
        this.physicsCar = this.physics.createVehicle({ x: 0, y: 2, z: 0 }); // Mesma posição do visual
        this.debug.checkpoint('Carro físico criado', 'success', 'Posição: (0,2,0)');
        
        // Debug: verificar se o carro físico foi criado corretamente
        if (this.physicsCar && this.physicsCar.chassis) {
          const pos = this.physicsCar.chassis.position;
          console.log('Physics car created at:', pos.x, pos.y, pos.z);
          this.debug.checkpoint('Posição do carro físico', 'success', `(${pos.x}, ${pos.y}, ${pos.z})`);
        } else {
          this.debug.error('Carro físico não foi criado corretamente');
        }
      } catch (error) {
        this.debug.warning('Falha ao criar carro físico', error.message);
        this.physicsCar = null;
      }
    } else {
      this.debug.checkpoint('Física desabilitada - usando apenas visual');
      this.physicsCar = null;
    }
  }



  setupEventListeners() {
    this.debug.checkpoint('Configurando event listeners');
    
    // Redimensionamento
    window.addEventListener('resize', () => this.onWindowResize());
    
    // Controles de teclado para o carrinho
    window.addEventListener('keydown', (event) => this.onKeyDown(event));
    window.addEventListener('keyup', (event) => this.onKeyUp(event));
    
    this.debug.checkpoint('Event listeners configurados (resize + keyboard)');
  }

  onKeyDown(event) {
    this.keys[event.code] = true;
    
    // Debug: mostrar tecla pressionada
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) {
      this.debug.checkpoint('Tecla pressionada', 'success', event.code);
    }
    
    // Toggle debug física com tecla 'P'
    if (event.code === 'KeyP') {
      this.showPhysicsDebug = !this.showPhysicsDebug;
      this.debug.checkpoint(`Debug física: ${this.showPhysicsDebug ? 'ON' : 'OFF'}`);
    }
    
    // Control presets
    if (this.controlSettings) {
      if (event.code === 'Digit1') {
        this.controlSettings.setPreset('casual');
        this.debug.checkpoint('Preset aplicado: Casual');
      } else if (event.code === 'Digit2') {
        this.controlSettings.setPreset('sport');
        this.debug.checkpoint('Preset aplicado: Sport');
      } else if (event.code === 'Digit3') {
        this.controlSettings.setPreset('precise');
        this.debug.checkpoint('Preset aplicado: Precise');
      } else if (event.code === 'Digit0') {
        this.controlSettings.resetToDefaults();
        this.debug.checkpoint('Configurações resetadas para padrão');
      }
    }
  }

  onKeyUp(event) {
    this.keys[event.code] = false;
  }

  createInteractiveWorld() {
    this.debug.checkpoint('🌍 Criando mundo interativo');
    
    // Create collectibles (golden coins)
    this.createCollectibles();
    
    // Create obstacles (red barriers)
    this.createObstacles();
    
    // Create ramps (blue ramps)
    this.createRamps();
    
    // Create boundaries (invisible walls)
    this.createBoundaries();
    
    this.debug.checkpoint('Mundo interativo criado', 'success', 
      `${this.worldObjects.collectibles.length} collectibles, ${this.worldObjects.obstacles.length} obstacles, ${this.worldObjects.ramps.length} ramps`);
  }

  createCollectibles() {
    const collectiblePositions = [
      { x: 10, z: 10 }, { x: -10, z: 10 }, { x: 15, z: -5 },
      { x: -15, z: -5 }, { x: 0, z: 20 }, { x: 8, z: -15 },
      { x: -12, z: 8 }, { x: 20, z: 0 }, { x: -8, z: -12 }
    ];
    
    collectiblePositions.forEach((pos, index) => {
      // Create rotating golden coin with PBR material
      const coinGeometry = new THREE.CylinderGeometry(0.8, 0.8, 0.2, 12);
      const coinMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffd700,
        roughness: 0.1, // Very shiny gold
        metalness: 1.0, // Pure metallic
        emissive: 0x332200, // Slight glow
        emissiveIntensity: 0.2
      });
      const coin = new THREE.Mesh(coinGeometry, coinMaterial);
      
      coin.position.set(pos.x, 1.5, pos.z);
      coin.rotation.x = Math.PI / 2;
      coin.name = `collectible_${index}`;
      coin.userData = { type: 'collectible', collected: false, rotationSpeed: 0.05 };
      coin.castShadow = true;
      coin.receiveShadow = true;
      
      this.scene.add(coin);
      this.worldObjects.collectibles.push(coin);
    });
    
    this.debug.checkpoint('Collectibles criados', 'success', `${collectiblePositions.length} moedas douradas`);
  }

  createObstacles() {
    const obstaclePositions = [
      { x: 5, z: 5 }, { x: -7, z: 3 }, { x: 12, z: -8 },
      { x: -5, z: -10 }, { x: 18, z: 6 }, { x: -15, z: 12 }
    ];
    
    obstaclePositions.forEach((pos, index) => {
      // Create red barrier with PBR material
      const obstacleGeometry = new THREE.BoxGeometry(1, 2, 1);
      const obstacleMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xff4444,
        roughness: 0.9, // Matte plastic/concrete
        metalness: 0.0, // Non-metallic
        emissive: 0x110000, // Slight red glow
        emissiveIntensity: 0.1
      });
      const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
      
      obstacle.position.set(pos.x, 1, pos.z);
      obstacle.name = `obstacle_${index}`;
      obstacle.userData = { type: 'obstacle' };
      obstacle.castShadow = true;
      obstacle.receiveShadow = true;
      
      this.scene.add(obstacle);
      this.worldObjects.obstacles.push(obstacle);
    });
    
    this.debug.checkpoint('Obstáculos criados', 'success', `${obstaclePositions.length} barreiras vermelhas`);
  }

  createRamps() {
    const rampPositions = [
      { x: 0, z: 15, rotation: 0 },
      { x: 15, z: 0, rotation: Math.PI / 2 },
      { x: -10, z: -15, rotation: Math.PI }
    ];
    
    rampPositions.forEach((pos, index) => {
      // Create blue ramp with PBR material
      const rampGeometry = new THREE.BoxGeometry(6, 1, 4);
      const rampMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x4444ff,
        roughness: 0.6, // Slightly rough concrete
        metalness: 0.1, // Minimal metallic content
        emissive: 0x000044, // Subtle blue glow
        emissiveIntensity: 0.05
      });
      const ramp = new THREE.Mesh(rampGeometry, rampMaterial);
      
      ramp.position.set(pos.x, 0.5, pos.z);
      ramp.rotation.y = pos.rotation;
      ramp.rotation.x = -Math.PI / 8; // Slight angle for ramp effect
      ramp.name = `ramp_${index}`;
      ramp.userData = { type: 'ramp' };
      ramp.castShadow = true;
      ramp.receiveShadow = true;
      
      this.scene.add(ramp);
      this.worldObjects.ramps.push(ramp);
    });
    
    this.debug.checkpoint('Rampas criadas', 'success', `${rampPositions.length} rampas azuis`);
  }

  createBoundaries() {
    const boundarySize = 25;
    const boundaryHeight = 3;
    
    // Create invisible walls around the world
    const boundaryPositions = [
      { x: 0, z: boundarySize, w: boundarySize * 2, h: boundaryHeight, d: 1 }, // North
      { x: 0, z: -boundarySize, w: boundarySize * 2, h: boundaryHeight, d: 1 }, // South
      { x: boundarySize, z: 0, w: 1, h: boundaryHeight, d: boundarySize * 2 }, // East
      { x: -boundarySize, z: 0, w: 1, h: boundaryHeight, d: boundarySize * 2 } // West
    ];
    
    boundaryPositions.forEach((pos, index) => {
      const boundaryGeometry = new THREE.BoxGeometry(pos.w, pos.h, pos.d);
      const boundaryMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x888888, 
        transparent: true, 
        opacity: 0.3,
        roughness: 0.5,
        metalness: 0.0
      });
      const boundary = new THREE.Mesh(boundaryGeometry, boundaryMaterial);
      
      boundary.position.set(pos.x, pos.h / 2, pos.z);
      boundary.name = `boundary_${index}`;
      boundary.userData = { type: 'boundary' };
      boundary.castShadow = true;
      boundary.receiveShadow = true;
      
      this.scene.add(boundary);
      this.worldObjects.boundaries.push(boundary);
    });
    
    this.debug.checkpoint('Boundaries criadas', 'success', `${boundaryPositions.length} paredes invisíveis`);
  }

  updateCar() {
    if (!this.car || !this.isLoaded) return;
    
    // Debug: mostrar posição atual do carro antes da atualização
    const currentPos = this.car.position.clone();

    // Obter input do teclado
    let keyboardInput = {
      throttle: 0,
      steering: 0,
      brake: 0
    };

    // W - Acelerar para frente
    if (this.keys['KeyW']) {
      keyboardInput.throttle = 1.0;
    }

    // S - Acelerar para trás ou freiar
    if (this.keys['KeyS']) {
      keyboardInput.throttle = -0.5; // Ré simples
    }

    // A - Girar esquerda
    if (this.keys['KeyA']) {
      keyboardInput.steering = -1.0;
    }

    // D - Girar direita
    if (this.keys['KeyD']) {
      keyboardInput.steering = 1.0;
    }

    // Obter input do touch (se disponível)
    let touchInput = this.touchControls ? this.touchControls.getGameInput() : { throttle: 0, steering: 0, brake: 0 };
    
    // Obter input do gamepad (se disponível)
    let gamepadInput = this.gamepadControls ? this.gamepadControls.getGameInput() : { throttle: 0, steering: 0, brake: 0 };

    // Aplicar configurações de sensibilidade
    if (this.controlSettings) {
      keyboardInput = this.controlSettings.applyKeyboardSensitivity(keyboardInput);
      touchInput = this.controlSettings.applyTouchSensitivity(touchInput);
      gamepadInput = this.controlSettings.applyGamepadSensitivity(gamepadInput);
    }

    // Combinar inputs (prioridade: gamepad > touch > keyboard)
    const rawInput = {
      throttle: gamepadInput.throttle || touchInput.throttle || keyboardInput.throttle,
      steering: gamepadInput.steering || touchInput.steering || keyboardInput.steering,
      brake: gamepadInput.brake || touchInput.brake || keyboardInput.brake
    };

    // Aplicar suavização
    const finalInput = this.controlSettings ? 
      this.controlSettings.smoothInput(this.smoothedInput, rawInput, this.lastDeltaTime || 0.016) : 
      rawInput;
    
    // Atualizar input suavizado
    this.smoothedInput = finalInput;

    // Se temos física, usar sistema físico
    if (this.physicsCar && this.physics) {
      // Aplicar input ao veículo através do sistema de física
      this.physics.updateVehicle(this.physicsCar, finalInput, this.lastDeltaTime || 0.016);
    
    } else {
      // Enhanced car movement with realistic acceleration and steering
      this.updateEnhancedCarMovement(finalInput, this.lastDeltaTime || 0.016);
    }
    
    // Debug: mostrar se a posição mudou
    if (!currentPos.equals(this.car.position)) {
      console.log(`Car moved from (${currentPos.x.toFixed(2)}, ${currentPos.y.toFixed(2)}, ${currentPos.z.toFixed(2)}) to (${this.car.position.x.toFixed(2)}, ${this.car.position.y.toFixed(2)}, ${this.car.position.z.toFixed(2)})`);
    }
  }

  updateEnhancedCarMovement(input, deltaTime) {
    const movement = this.carMovement;
    
    // Calculate target speed based on input
    let targetSpeed = 0;
    if (input.throttle > 0) {
      targetSpeed = input.throttle * movement.maxSpeed;
    } else if (input.throttle < 0) {
      targetSpeed = input.throttle * movement.maxSpeed * 0.6; // Reverse is slower
    }
    
    // Apply brake
    if (input.brake > 0) {
      targetSpeed *= (1 - input.brake * 0.8);
    }
    
    // Smooth acceleration/deceleration
    if (targetSpeed !== 0) {
      // Accelerating
      movement.currentSpeed += (targetSpeed - movement.currentSpeed) * movement.acceleration * deltaTime * 60;
    } else {
      // Coasting/decelerating
      movement.currentSpeed *= Math.pow(movement.deceleration, deltaTime * 60);
      if (Math.abs(movement.currentSpeed) < 0.01) {
        movement.currentSpeed = 0;
      }
    }
    
    // Apply movement
    if (movement.currentSpeed !== 0) {
      const moveX = Math.sin(this.car.rotation.y) * movement.currentSpeed;
      const moveZ = Math.cos(this.car.rotation.y) * movement.currentSpeed;
      
      this.car.position.x += moveX;
      this.car.position.z += moveZ;
    }
    
    // Enhanced steering - speed affects turn rate
    if (input.steering !== 0 && Math.abs(movement.currentSpeed) > 0.05) {
      const speedFactor = Math.min(Math.abs(movement.currentSpeed) / movement.maxSpeed, 1);
      const turnRate = movement.turnSpeed * speedFactor * input.steering;
      
      // Smooth steering
      this.car.rotation.y -= turnRate * deltaTime * 60;
    }
    
    // Debug: show speed occasionally
    if (Math.random() < 0.01) {
      console.log(`Speed: ${(movement.currentSpeed * 100).toFixed(1)}% | Target: ${(targetSpeed * 100).toFixed(1)}%`);
    }
  }

  updateInteractiveWorld() {
    // Animate collectibles (rotate)
    this.worldObjects.collectibles.forEach(coin => {
      if (!coin.userData.collected) {
        coin.rotation.y += coin.userData.rotationSpeed;
        coin.position.y = 1.5 + Math.sin(performance.now() * 0.003) * 0.2; // Floating effect
        
        // Check collision with car
        const distance = coin.position.distanceTo(this.car.position);
        if (distance < 2) {
          this.collectCoin(coin);
        }
      }
    });
    
    // Check collision with obstacles
    this.worldObjects.obstacles.forEach(obstacle => {
      const distance = obstacle.position.distanceTo(this.car.position);
      if (distance < 2) {
        this.hitObstacle(obstacle);
      }
    });
    
    // Check collision with boundaries
    this.worldObjects.boundaries.forEach(boundary => {
      const distance = boundary.position.distanceTo(this.car.position);
      if (distance < 3) {
        this.hitBoundary(boundary);
      }
    });
  }

  collectCoin(coin) {
    if (coin.userData.collected) return;
    
    coin.userData.collected = true;
    this.score += 10;
    
    // Visual effect - make coin disappear
    coin.scale.set(0.1, 0.1, 0.1);
    coin.material.transparent = true;
    coin.material.opacity = 0;
    
    // Remove from scene after animation
    setTimeout(() => {
      this.scene.remove(coin);
    }, 500);
    
    this.debug.checkpoint('Moeda coletada!', 'success', `Score: ${this.score}`);
    this.updateScoreDisplay();
  }

  hitObstacle(obstacle) {
    // Simple collision response - slow down the car
    this.carMovement.currentSpeed *= 0.5;
    
    // Visual feedback - flash red
    const originalColor = obstacle.material.color.clone();
    obstacle.material.color.setHex(0xff8888);
    
    setTimeout(() => {
      obstacle.material.color.copy(originalColor);
    }, 200);
    
    this.debug.checkpoint('Colidiu com obstáculo!', 'warning', 'Velocidade reduzida');
  }

  hitBoundary(boundary) {
    // Push car back towards center
    const pushForce = 0.3;
    const centerDirection = new THREE.Vector3(0, 0, 0).sub(this.car.position).normalize();
    
    this.car.position.add(centerDirection.multiplyScalar(pushForce));
    this.carMovement.currentSpeed *= 0.8;
    
    this.debug.checkpoint('Atingiu limite do mundo', 'warning', 'Empurrado para o centro');
  }

  updateScoreDisplay() {
    // Update score in the debug panel or create a score UI element
    const scoreElement = document.querySelector('.score-value');
    if (scoreElement) {
      scoreElement.textContent = this.score;
    }
  }

  updateSpeedometer() {
    const speedElement = document.querySelector('.speed-value');
    if (speedElement && this.carMovement) {
      // Convert internal speed to km/h (arbitrary scaling for visual effect)
      const kmh = Math.abs(this.carMovement.currentSpeed) * 200;
      speedElement.textContent = Math.round(kmh);
    }
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  async simulateLoading() {
    // Simula tempo de carregamento
    return new Promise(resolve => {
      setTimeout(resolve, 2000);
    });
  }

  hideLoadingScreen() {
    if (this.loadingScreen) {
      this.loadingScreen.classList.add('hidden');
      setTimeout(() => {
        if (this.loadingScreen) {
          this.loadingScreen.style.display = 'none';
        }
      }, 500);
    }
    this.isLoaded = true;
    this.debug.checkpoint('Loading screen oculta', 'success');
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    if (this.isLoaded) {
      const deltaTime = this.clock.getDelta();
      this.lastDeltaTime = deltaTime;
      
      // Atualizar movimento do carrinho (antes da física)
      this.updateCar();
      
      // Atualizar mundo interativo
      this.updateInteractiveWorld();
      
      // Atualizar física
      if (this.physics) {
        this.physics.step(deltaTime);
        
        // Sincronizar objetos Three.js com física
        if (this.physicsCar && this.physicsCar.chassis && this.car) {
          // Check if physics position is valid (not NaN, not too far from camera)
          const physicsPos = this.physicsCar.chassis.position;
          if (isNaN(physicsPos.x) || isNaN(physicsPos.y) || isNaN(physicsPos.z) || 
              physicsPos.y < -10 || Math.abs(physicsPos.x) > 100 || Math.abs(physicsPos.z) > 100) {
            console.warn('Physics position invalid:', physicsPos);
            // Reset physics car to safe position
            this.physicsCar.chassis.position.set(0, 2, 0);
            this.physicsCar.chassis.velocity.set(0, 0, 0);
            this.physicsCar.chassis.angularVelocity.set(0, 0, 0);
          }
          
          // Sync position and rotation from physics to visual
          this.car.position.copy(this.physicsCar.chassis.position);
          this.car.quaternion.copy(this.physicsCar.chassis.quaternion);
          
          // Debug occasionally
          if (Math.random() < 0.01) {
            console.log(`Physics car at: (${this.physicsCar.chassis.position.x.toFixed(2)}, ${this.physicsCar.chassis.position.y.toFixed(2)}, ${this.physicsCar.chassis.position.z.toFixed(2)})`);
          }
        } else {
          console.log('Physics sync failed - falling back to manual movement');
        }
        
        // Atualizar visualização de debug se ativa
        if (this.showPhysicsDebug) {
          this.physics.updateDebugVisualization(this.scene);
        }
      }
      
      // Atualizar controles da câmera
      this.controls.update();
      
      // Atualizar speedometer
      this.updateSpeedometer();
      
      // Debug: mostrar posição do carro a cada 2 segundos
      if (this.car && Math.floor(performance.now() / 2000) % 2 === 0) {
        const pos = this.car.position;
        this.debug.checkpoint('Posição do carro', 'success', 
          `x:${pos.x.toFixed(2)}, y:${pos.y.toFixed(2)}, z:${pos.z.toFixed(2)}`);
      }
    }

    // Renderizar a cena
    this.renderer.render(this.scene, this.camera);
  }

  showErrorMessage(message) {
    // Criar mensagem de erro visível para o usuário
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(255, 0, 0, 0.9);
      color: white;
      padding: 20px;
      border-radius: 10px;
      font-family: Arial, sans-serif;
      text-align: center;
      z-index: 10000;
      max-width: 400px;
    `;
    errorDiv.innerHTML = `
      <h3>Erro na Inicialização</h3>
      <p>${message}</p>
      <p><small>Verifique o console para mais detalhes</small></p>
      <button onclick="this.parentElement.remove()" style="background: white; color: black; border: none; padding: 5px 10px; margin-top: 10px; border-radius: 3px; cursor: pointer;">OK</button>
    `;
    
    document.body.appendChild(errorDiv);
    
    // Ocultar loading screen se ainda estiver visível
    if (this.loadingScreen) {
      this.loadingScreen.style.display = 'none';
    }
    
    console.error('Erro de inicialização:', message);
    
    // Remover após 15 segundos
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    }, 15000);
  }
}

// Inicializa o jogo quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
  new CarGame();
}); 