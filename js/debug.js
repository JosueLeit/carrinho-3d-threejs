export class DebugSystem {
  constructor() {
    this.checkpoints = [];
    this.errors = [];
    this.warnings = [];
    this.debugMode = true; // Ativar debug por padrão
    
    this.createDebugPanel();
  }

  createDebugPanel() {
    // Criar painel de debug no DOM
    const debugPanel = document.createElement('div');
    debugPanel.id = 'debug-panel';
    debugPanel.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 300px;
      max-height: 400px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 10px;
      font-family: monospace;
      font-size: 12px;
      border-radius: 5px;
      z-index: 1000;
      overflow-y: auto;
      border: 1px solid #333;
    `;
    
    debugPanel.innerHTML = `
      <h3 style="margin: 0 0 10px 0; color: #4fc3f7;">🔍 Debug System</h3>
      <div id="debug-content"></div>
      <button id="toggle-debug" style="margin-top: 10px; padding: 5px; background: #4fc3f7; color: black; border: none; border-radius: 3px; cursor: pointer;">Ocultar Debug</button>
    `;
    
    document.body.appendChild(debugPanel);
    
    // Toggle debug panel
    document.getElementById('toggle-debug').addEventListener('click', () => {
      const content = document.getElementById('debug-content');
      const button = document.getElementById('toggle-debug');
      
      if (content.style.display === 'none') {
        content.style.display = 'block';
        button.textContent = 'Ocultar Debug';
      } else {
        content.style.display = 'none';
        button.textContent = 'Mostrar Debug';
      }
    });
    
    this.debugContent = document.getElementById('debug-content');
  }

  checkpoint(name, status = 'success', details = '') {
    const timestamp = new Date().toLocaleTimeString();
    const checkpoint = {
      name,
      status,
      details,
      timestamp
    };
    
    this.checkpoints.push(checkpoint);
    this.updateDebugPanel();
    
    // Log no console também
    const icon = status === 'success' ? '✅' : status === 'warning' ? '⚠️' : '❌';
    console.log(`${icon} [${timestamp}] ${name}${details ? ': ' + details : ''}`);
    
    return checkpoint;
  }

  error(message, error = null) {
    const timestamp = new Date().toLocaleTimeString();
    const errorObj = {
      message,
      error: error ? error.message : null,
      stack: error ? error.stack : null,
      timestamp
    };
    
    this.errors.push(errorObj);
    this.checkpoint(message, 'error', error ? error.message : '');
    
    console.error(`❌ [${timestamp}] ${message}`, error);
    return errorObj;
  }

  warning(message, details = '') {
    const timestamp = new Date().toLocaleTimeString();
    const warningObj = {
      message,
      details,
      timestamp
    };
    
    this.warnings.push(warningObj);
    this.checkpoint(message, 'warning', details);
    
    console.warn(`⚠️ [${timestamp}] ${message}${details ? ': ' + details : ''}`);
    return warningObj;
  }

  updateDebugPanel() {
    if (!this.debugContent) return;
    
    const recent = this.checkpoints.slice(-10); // Mostrar últimos 10
    
    this.debugContent.innerHTML = recent.map(cp => {
      const icon = cp.status === 'success' ? '✅' : cp.status === 'warning' ? '⚠️' : '❌';
      const color = cp.status === 'success' ? '#4caf50' : cp.status === 'warning' ? '#ff9800' : '#f44336';
      
      return `
        <div style="margin-bottom: 5px; padding: 3px; border-left: 3px solid ${color}; padding-left: 8px;">
          <div style="font-weight: bold;">${icon} ${cp.name}</div>
          ${cp.details ? `<div style="color: #ccc; font-size: 10px;">${cp.details}</div>` : ''}
          <div style="color: #999; font-size: 10px;">${cp.timestamp}</div>
        </div>
      `;
    }).join('');
    
    // Scroll automático para baixo
    this.debugContent.scrollTop = this.debugContent.scrollHeight;
  }

  // Verificações específicas para Three.js
  checkThreeJS(scene, camera, renderer) {
    this.checkpoint('Iniciando verificação Three.js');
    
    // Verificar Scene
    if (!scene) {
      this.error('Scene não encontrada');
      return false;
    }
    this.checkpoint('Scene criada', 'success', `${scene.children.length} objetos`);
    
    // Verificar Camera
    if (!camera) {
      this.error('Camera não encontrada');
      return false;
    }
    this.checkpoint('Camera criada', 'success', `Posição: ${this.vec3ToString(camera.position)}`);
    
    // Verificar Renderer
    if (!renderer) {
      this.error('Renderer não encontrado');
      return false;
    }
    this.checkpoint('Renderer criado', 'success', `${renderer.domElement.width}x${renderer.domElement.height}`);
    
    // Verificar se o canvas está adicionado ao DOM
    if (!document.body.contains(renderer.domElement)) {
      this.error('Canvas não foi adicionado ao DOM');
      return false;
    }
    this.checkpoint('Canvas adicionado ao DOM');
    
    return true;
  }

  checkCamera(camera) {
    const distance = camera.position.length();
    if (distance > 1000) {
      this.warning('Câmera muito distante', `Distância: ${distance.toFixed(2)}`);
    }
    if (distance < 0.1) {
      this.warning('Câmera muito próxima da origem', `Distância: ${distance.toFixed(2)}`);
    }
    
    this.checkpoint('Posição da câmera verificada', 'success', 
      `Pos: ${this.vec3ToString(camera.position)}`);
  }

  checkScene(scene) {
    const childCount = scene.children.length;
    
    if (childCount === 0) {
      this.warning('Scene está vazia', 'Nenhum objeto adicionado');
      return;
    }
    
    const objects = scene.children.map(child => {
      if (child.type === 'Mesh') return `Mesh(${child.geometry.type})`;
      if (child.type === 'Group') return `Group(${child.children.length} filhos)`;
      if (child.type.includes('Light')) return child.type;
      return child.type;
    });
    
    this.checkpoint('Objetos na cena', 'success', objects.join(', '));
    
    const meshes = scene.children.filter(child => 
      child.type === 'Mesh' || (child.type === 'Group' && child.children.some(c => c.type === 'Mesh'))
    );
    
    if (meshes.length === 0) {
      this.warning('Nenhum mesh encontrado na cena');
    }
  }

  checkLights(scene) {
    const lights = scene.children.filter(child => child.type.includes('Light'));
    
    if (lights.length === 0) {
      this.warning('Nenhuma luz encontrada', 'Objetos podem ficar pretos');
      return;
    }
    
    this.checkpoint('Luzes verificadas', 'success', 
      `${lights.length} luzes: ${lights.map(l => l.type).join(', ')}`);
  }

  vec3ToString(vec3) {
    return `(${vec3.x.toFixed(1)}, ${vec3.y.toFixed(1)}, ${vec3.z.toFixed(1)})`;
  }

  getSummary() {
    const total = this.checkpoints.length;
    const errors = this.checkpoints.filter(cp => cp.status === 'error').length;
    const warnings = this.checkpoints.filter(cp => cp.status === 'warning').length;
    const success = total - errors - warnings;
    
    return { total, success, warnings, errors };
  }
}