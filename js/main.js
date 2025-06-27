import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DebugSystem } from './debug.js';

// Versão simplificada para debug - sem física, sem texturas complexas
class CarGame {
  constructor() {
    // Sistema de debug
    this.debug = new DebugSystem();
    this.debug.checkpoint('🚀 Iniciando CarGame');
    
    // Elementos DOM
    this.loadingScreen = document.getElementById('loadingScreen');
    this.uiOverlay = document.getElementById('ui-overlay');
    
    // Configuração básica
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    
    // Objetos do jogo (versão simples)
    this.car = null;
    this.ground = null;
    
    // Estado do jogo
    this.isLoaded = false;
    this.keys = {};
    
    this.init();
  }

  async init() {
    try {
      this.debug.checkpoint('Iniciando setup básico');
      
      this.setupRenderer();
      this.debug.checkpoint('Renderer criado');
      
      this.setupScene(); 
      this.debug.checkpoint('Scene criada');
      
      this.setupCamera();
      this.debug.checkpoint('Camera criada');
      
      this.setupControls();
      this.debug.checkpoint('Controls criados');
      
      this.setupLights();
      this.debug.checkpoint('Luzes criadas');
      
      this.createGround();
      this.debug.checkpoint('Ground criado');
      
      this.createCar();
      this.debug.checkpoint('Car criado');
      
      this.setupEventListeners();
      this.debug.checkpoint('Event listeners criados');
      
      // Verificação final do Three.js
      this.debug.checkThreeJS(this.scene, this.camera, this.renderer);
      this.debug.checkScene(this.scene);
      this.debug.checkLights(this.scene);
      this.debug.checkCamera(this.camera);
      
      // Simula carregamento
      await this.simulateLoading();
      
      this.hideLoadingScreen();
      this.animate();
      
    } catch (error) {
      this.debug.error('Erro ao inicializar o jogo', error);
    }
  }

  setupRenderer() {
    this.debug.checkpoint('Criando WebGL Renderer');
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Adicionar canvas ao DOM IMEDIATAMENTE
    document.body.appendChild(this.renderer.domElement);
    this.debug.checkpoint('Canvas adicionado ao DOM');
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
      45, // FOV similar ao exemplo que funcionou
      window.innerWidth / window.innerHeight,
      1, // Near
      1000 // Far
    );
    
    // Posição inicial da câmera (similar ao exemplo que funcionou)
    this.camera.position.set(10, 10, 10);
    this.camera.lookAt(0, 0, 0);
    this.debug.checkpoint('Camera posicionada', 'success', this.debug.vec3ToString(this.camera.position));
  }

  setupControls() {
    this.debug.checkpoint('Criando OrbitControls');
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.update();
    this.debug.checkpoint('OrbitControls configurados');
  }

  setupLights() {
    this.debug.checkpoint('Criando luzes básicas');
    
    // Luz ambiente forte (similar ao exemplo que funcionou)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    this.debug.checkpoint('Luz ambiente adicionada');

    // Luz direcional simples
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    this.scene.add(directionalLight);
    this.debug.checkpoint('Luz direcional adicionada');
  }

  createGround() {
    this.debug.checkpoint('Criando chão básico');
    
    // Chão simples e visível
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x4a7c59 // Verde simples
    });
    
    this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    this.ground.rotation.x = -Math.PI / 2;
    
    this.scene.add(this.ground);
    this.debug.checkpoint('Chão adicionado à cena');
  }



  createCar() {
    this.debug.checkpoint('Criando carrinho básico');
    
    // Carrinho super simples - apenas um cubo vermelho (como no exemplo que funcionou)
    const carGeometry = new THREE.BoxGeometry(2, 1, 4);
    const carMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 }); // Vermelho
    
    this.car = new THREE.Mesh(carGeometry, carMaterial);
    this.car.position.set(0, 0.5, 0); // Ligeiramente acima do chão
    
    this.scene.add(this.car);
    this.debug.checkpoint('Carrinho adicionado à cena', 'success', 'Cubo vermelho 2x1x4');
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
  }

  onKeyUp(event) {
    this.keys[event.code] = false;
  }

  updateCar() {
    if (!this.car || !this.isLoaded) return;

    const moveSpeed = 0.1;
    const rotateSpeed = 0.02;

    // W - Frente
    if (this.keys['KeyW']) {
      this.car.position.x += Math.sin(this.car.rotation.y) * moveSpeed;
      this.car.position.z += Math.cos(this.car.rotation.y) * moveSpeed;
    }

    // S - Trás  
    if (this.keys['KeyS']) {
      this.car.position.x -= Math.sin(this.car.rotation.y) * moveSpeed;
      this.car.position.z -= Math.cos(this.car.rotation.y) * moveSpeed;
    }

    // A - Girar esquerda
    if (this.keys['KeyA']) {
      this.car.rotation.y += rotateSpeed;
    }

    // D - Girar direita
    if (this.keys['KeyD']) {
      this.car.rotation.y -= rotateSpeed;
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
    this.loadingScreen.classList.add('hidden');
    setTimeout(() => {
      this.loadingScreen.style.display = 'none';
    }, 500);
    this.isLoaded = true;
  }

  animate() {
    this.debug.checkpoint('Frame renderizado');
    requestAnimationFrame(() => this.animate());

    if (this.isLoaded) {
      // Atualizar controles da câmera
      this.controls.update();
      
      // Atualizar movimento do carrinho
      this.updateCar();
    }

    // Renderizar a cena
    this.renderer.render(this.scene, this.camera);
  }
}

// Inicializa o jogo quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
  new CarGame();
}); 