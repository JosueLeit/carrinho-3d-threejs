import * as CANNON from 'cannon-es';
import * as THREE from 'three';

export class PhysicsWorld {
  constructor(debugSystem = null) {
    this.debug = debugSystem;
    this.world = null;
    this.bodies = new Map(); // Mapeamento entre objetos Three.js e corpos Cannon.js
    this.isInitialized = false;
    
    this.setupWorld();
  }

  setupWorld() {
    try {
      this.debug?.checkpoint('🌍 Iniciando PhysicsWorld');
      
      // Configurações básicas do mundo físico
      this.world = new CANNON.World();
      this.debug?.checkpoint('Cannon.World criado');
      
      this.world.gravity.set(0, -9.82, 0); // Gravidade terrestre
      this.debug?.checkpoint('Gravidade configurada', 'success', '-9.82 m/s²');
      
      this.world.broadphase = new CANNON.NaiveBroadphase();
      this.debug?.checkpoint('Broadphase configurado');
      
      this.world.solver.iterations = 10;
      this.debug?.checkpoint('Solver configurado', 'success', '10 iterações');
      
      // Configurações de contato entre materiais
      this.setupMaterials();
      
      this.isInitialized = true;
      this.debug?.checkpoint('PhysicsWorld inicializado', 'success');
      
    } catch (error) {
      this.debug?.error('Erro ao inicializar PhysicsWorld', error);
      throw error;
    }
  }

  setupMaterials() {
    try {
      this.debug?.checkpoint('🎨 Configurando materiais físicos');
      
      // Material do chão
      this.groundMaterial = new CANNON.Material('ground');
      this.debug?.checkpoint('Material do chão criado');
      
      // Material das rodas
      this.wheelMaterial = new CANNON.Material('wheel');
      this.debug?.checkpoint('Material das rodas criado');
      
      // Material da carroceria
      this.carMaterial = new CANNON.Material('car');
      this.debug?.checkpoint('Material da carroceria criado');
      
      // Configurações de contato entre roda e chão
      const wheelGroundContact = new CANNON.ContactMaterial(
        this.wheelMaterial,
        this.groundMaterial,
        {
          friction: 0.8, // Aderência das rodas
          restitution: 0.1, // Pouco bounce
          contactEquationStiffness: 1000
        }
      );
      
      // Configurações de contato entre carroceria e chão
      const carGroundContact = new CANNON.ContactMaterial(
        this.carMaterial,
        this.groundMaterial,
        {
          friction: 0.6,
          restitution: 0.2
        }
      );
      
      this.world.addContactMaterial(wheelGroundContact);
      this.world.addContactMaterial(carGroundContact);
      
      this.debug?.checkpoint('Materiais físicos configurados', 'success', '3 materiais, 2 contatos');
      
    } catch (error) {
      this.debug?.error('Erro ao configurar materiais', error);
      throw error;
    }
  }

  createGround(size = 200) {
    try {
      this.debug?.checkpoint('🌱 Criando chão físico');
      
      // Criar chão físico (plano infinito)
      const groundShape = new CANNON.Plane();
      this.debug?.checkpoint('Plane shape criado');
      
      const groundBody = new CANNON.Body({
        mass: 0, // Massa 0 = estático
        material: this.groundMaterial
      });
      this.debug?.checkpoint('Ground body criado', 'success', 'massa: 0 (estático)');
      
      groundBody.addShape(groundShape);
      groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
      this.debug?.checkpoint('Ground rotacionado -90°');
      
      this.world.addBody(groundBody);
      this.debug?.checkpoint('Ground adicionado ao mundo físico', 'success');
      
      return groundBody;
      
    } catch (error) {
      this.debug?.error('Erro ao criar chão físico', error);
      throw error;
    }
  }

  createVehicle(position = { x: 0, y: 2, z: 0 }) {
    try {
      this.debug?.checkpoint('🚗 Criando veículo físico avançado');
      
      // Criar carroceria do veículo com dimensões que combinam com o visual (4x2x8)
      const chassisShape = new CANNON.Box(new CANNON.Vec3(2, 1, 4)); // Half extents: 4x2x8
      this.debug?.checkpoint('Chassis shape criado', 'success', '4x2x8 units (matching visual)');
      
      const chassisBody = new CANNON.Body({
        mass: 1000, // Massa apropriada para o tamanho
        material: this.carMaterial
      });
      
      // Adicionar shape sem offset para manter centro de massa natural
      chassisBody.addShape(chassisShape);
      chassisBody.position.set(position.x, position.y, position.z);
      this.debug?.checkpoint('Chassis configurado', 'success', 'massa: 1000kg, centro natural');
      
      // Adicionar resistência ao ar (linear damping)
      chassisBody.linearDamping = 0.4;
      chassisBody.angularDamping = 0.4;
      this.debug?.checkpoint('Damping configurado', 'success', 'linear: 0.4, angular: 0.4');
      
      this.world.addBody(chassisBody);
      this.debug?.checkpoint('Chassis adicionado ao mundo físico');
      
      // Criar rodas com física individual
      const wheels = this.createWheels(chassisBody, position);
      this.debug?.checkpoint('Rodas criadas', 'success', `${wheels.length} rodas`);
      
      // Armazenar referência para sincronização
      this.bodies.set('car', chassisBody);
      
      this.debug?.checkpoint('Veículo físico avançado criado', 'success');
      
      return {
        chassis: chassisBody,
        wheels: wheels,
        position: position,
        // Propriedades de condução
        engineForce: 0,
        steerAngle: 0,
        brakeForce: 0,
        maxEngineForce: 2000,
        maxSteerAngle: 0.5,
        maxBrakeForce: 1000,
        isDrifting: false
      };
      
    } catch (error) {
      this.debug?.error('Erro ao criar veículo físico', error);
      throw error;
    }
  }

  createWheels(chassisBody, basePosition) {
    try {
      this.debug?.checkpoint('🛞 Criando rodas individuais');
      
      const wheels = [];
      const wheelPositions = [
        { x: -0.8, z: 1.2, name: 'FL' },  // Frente esquerda
        { x: 0.8, z: 1.2, name: 'FR' },   // Frente direita  
        { x: -0.8, z: -1.2, name: 'RL' }, // Traseira esquerda
        { x: 0.8, z: -1.2, name: 'RR' }   // Traseira direita
      ];

      wheelPositions.forEach((pos, index) => {
        // Formato da roda (cilindro com dimensões realistas)
        const wheelShape = new CANNON.Cylinder(0.35, 0.35, 0.2, 16);
        const wheelBody = new CANNON.Body({
          mass: 25, // Massa realista de uma roda
          material: this.wheelMaterial
        });
        
        wheelBody.addShape(wheelShape);
        wheelBody.position.set(
          basePosition.x + pos.x,
          basePosition.y - 0.4,
          basePosition.z + pos.z
        );
        
        // Orientar a roda corretamente
        wheelBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), Math.PI / 2);
        
        // Adicionar damping para suavizar movimento
        wheelBody.linearDamping = 0.1;
        wheelBody.angularDamping = 0.1;
        
        this.world.addBody(wheelBody);
        
        // Conectar roda ao chassi com constraint mais flexível (simula suspensão)
        const wheelConstraint = new CANNON.PointToPointConstraint(
          chassisBody,
          new CANNON.Vec3(pos.x, -0.6, pos.z),
          wheelBody,
          new CANNON.Vec3(0, 0, 0)
        );
        
        this.world.addConstraint(wheelConstraint);
        
        // Adicionar sistema de suspensão básico
        this.createSuspension(chassisBody, wheelBody, pos, index);
        
        wheels.push({
          body: wheelBody,
          constraint: wheelConstraint,
          isFront: index < 2, // Primeiras duas são dianteiras
          position: pos,
          name: pos.name,
          // Propriedades da roda
          steerAngle: 0,
          rpm: 0,
          maxSteerAngle: index < 2 ? 0.6 : 0 // Apenas rodas dianteiras esterçam
        });
        
        this.debug?.checkpoint(`Roda ${pos.name} criada`, 'success', `${pos.x}, ${pos.z}`);
      });

      this.debug?.checkpoint('Todas as rodas criadas', 'success', `${wheels.length} rodas`);
      return wheels;
      
    } catch (error) {
      this.debug?.error('Erro ao criar rodas', error);
      throw error;
    }
  }

  // Métodos aprimorados para movimento do veículo
  updateVehicle(vehicle, input, deltaTime) {
    try {
      // Verificar se o veículo tem as propriedades necessárias
      if (!vehicle || !vehicle.chassis || !vehicle.wheels) {
        throw new Error('Veículo inválido ou incompleto');
      }
      
      // Modo básico: aplicar forças diretamente ao chassis
      const forceMultiplier = 100;
      
      // Throttle
      if (input.throttle !== 0) {
        const forceVector = new CANNON.Vec3(0, 0, input.throttle * forceMultiplier);
        const worldForce = new CANNON.Vec3();
        vehicle.chassis.quaternion.vmult(forceVector, worldForce);
        vehicle.chassis.applyImpulse(worldForce, vehicle.chassis.position);
      }
      
      // Steering
      if (input.steering !== 0) {
        const torque = new CANNON.Vec3(0, input.steering * 50, 0);
        vehicle.chassis.applyImpulse(torque, vehicle.chassis.position);
      }
      
      // Brake
      if (input.brake !== 0) {
        const velocity = vehicle.chassis.velocity.clone();
        velocity.scale(-input.brake * 0.1);
        vehicle.chassis.applyImpulse(velocity, vehicle.chassis.position);
      }
      
    } catch (error) {
      this.debug?.error('Erro ao atualizar veículo', error);
      console.error('Detalhes do erro:', error);
      console.error('Vehicle:', vehicle);
      console.error('Input:', input);
      console.error('DeltaTime:', deltaTime);
    }
  }

  applyEngineForce(vehicle, throttleInput, deltaTime) {
    // Curva de aceleração realista
    const targetForce = throttleInput * vehicle.maxEngineForce;
    const acceleration = 3000; // Força de aceleração
    
    // Interpolação suave da força do motor
    const forceDiff = targetForce - vehicle.engineForce;
    const forceChange = Math.sign(forceDiff) * Math.min(Math.abs(forceDiff), acceleration * deltaTime);
    vehicle.engineForce += forceChange;
    
    // Aplicar força às rodas traseiras (tração traseira)
    const forcePerWheel = vehicle.engineForce / 2; // Dividir entre 2 rodas traseiras
    
    vehicle.wheels.forEach((wheel) => {
      if (!wheel.isFront) { // Apenas rodas traseiras
        // Aplicar força na direção que o chassi está apontando
        const forceVector = new CANNON.Vec3(0, 0, forcePerWheel);
        const worldForce = new CANNON.Vec3();
        vehicle.chassis.quaternion.vmult(forceVector, worldForce);
        
        // Aplicar impulso baseado no deltaTime
        const impulse = worldForce.clone().scale(deltaTime);
        wheel.body.applyImpulse(impulse, wheel.body.position);
        
        // Atualizar RPM da roda
        wheel.rpm = Math.abs(forcePerWheel) / 100;
      }
    });
  }

  applySteering(vehicle, steerInput, deltaTime) {
    // Curva de esterçamento suave
    const targetSteer = steerInput * vehicle.maxSteerAngle;
    const steerSpeed = 2.0; // Velocidade de esterçamento
    
    // Interpolação suave do ângulo de esterçamento
    const steerDiff = targetSteer - vehicle.steerAngle;
    const steerChange = Math.sign(steerDiff) * Math.min(Math.abs(steerDiff), steerSpeed * deltaTime);
    vehicle.steerAngle += steerChange;
    
    // Aplicar esterçamento às rodas dianteiras
    vehicle.wheels.forEach((wheel) => {
      if (wheel.isFront) {
        wheel.steerAngle = vehicle.steerAngle;
        
        // Aplicar força lateral baseada no esterçamento
        const lateralForce = vehicle.steerAngle * 500;
        const forceVector = new CANNON.Vec3(lateralForce, 0, 0);
        const worldForce = new CANNON.Vec3();
        vehicle.chassis.quaternion.vmult(forceVector, worldForce);
        
        const impulse = worldForce.clone().scale(deltaTime);
        wheel.body.applyImpulse(impulse, wheel.body.position);
      }
    });
  }

  applyBrakes(vehicle, brakeInput, deltaTime) {
    // Curva de frenagem realista
    const targetBrakeForce = brakeInput * vehicle.maxBrakeForce;
    const brakeAcceleration = 4000; // Força de frenagem
    
    // Interpolação suave da força de freio
    const brakeDiff = targetBrakeForce - vehicle.brakeForce;
    const brakeChange = Math.sign(brakeDiff) * Math.min(Math.abs(brakeDiff), brakeAcceleration * deltaTime);
    vehicle.brakeForce += brakeChange;
    
    // Aplicar freio a todas as rodas
    vehicle.wheels.forEach((wheel) => {
      // Reduzir velocidade da roda proporcionalmente
      const brakeFactor = 1 - (vehicle.brakeForce / vehicle.maxBrakeForce) * 0.1 * deltaTime;
      wheel.body.velocity.scale(brakeFactor);
      wheel.body.angularVelocity.scale(brakeFactor);
    });
    
    // Aplicar resistência ao chassi
    const chassisVelocity = vehicle.chassis.velocity.clone();
    const brakeResistance = chassisVelocity.clone().scale(-vehicle.brakeForce * deltaTime * 0.001);
    vehicle.chassis.applyImpulse(brakeResistance, vehicle.chassis.position);
  }

  updateVehicleProperties(vehicle, deltaTime) {
    // Calcular velocidade atual
    const velocity = vehicle.chassis.velocity.length();
    
    // Resistência do ar proporcional à velocidade
    if (velocity > 0.1) {
      const airResistance = velocity * velocity * 0.1;
      const resistanceVector = vehicle.chassis.velocity.clone().normalize();
      resistanceVector.scale(-airResistance * deltaTime);
      vehicle.chassis.applyImpulse(resistanceVector, vehicle.chassis.position);
    }
    
    // Decay das forças quando não há input
    vehicle.engineForce *= 0.95;
    vehicle.brakeForce *= 0.9;
    vehicle.steerAngle *= 0.9;
    
    // Aplicar tração e drift
    this.applyTraction(vehicle, deltaTime);
  }

  createSuspension(chassisBody, wheelBody, position, index) {
    try {
      // Sistema de suspensão básico usando spring constraint
      const suspensionStiffness = 50000; // Rigidez da suspensão
      const suspensionDamping = 2000; // Amortecimento
      const suspensionRestLength = 0.4; // Comprimento de repouso
      
      // Criar spring constraint entre chassis e roda
      const springConstraint = new CANNON.DistanceConstraint(
        chassisBody,
        wheelBody,
        suspensionRestLength,
        1e6 // Força máxima
      );
      
      // Configurar propriedades da mola
      springConstraint.stiffness = suspensionStiffness;
      springConstraint.damping = suspensionDamping;
      
      this.world.addConstraint(springConstraint);
      
      this.debug?.checkpoint(`Suspensão criada para roda ${index}`, 'success', 
        `stiffness: ${suspensionStiffness}, damping: ${suspensionDamping}`);
      
      return springConstraint;
      
    } catch (error) {
      this.debug?.error(`Erro ao criar suspensão para roda ${index}`, error);
      return null;
    }
  }

  applyTraction(vehicle, deltaTime) {
    try {
      // Calcular velocidade lateral para detectar derrapagem
      const chassisVelocity = vehicle.chassis.velocity.clone();
      const forwardDirection = new CANNON.Vec3(0, 0, 1);
      const rightDirection = new CANNON.Vec3(1, 0, 0);
      
      // Transformar direções para o sistema de coordenadas do chassi
      const worldForward = new CANNON.Vec3();
      const worldRight = new CANNON.Vec3();
      vehicle.chassis.quaternion.vmult(forwardDirection, worldForward);
      vehicle.chassis.quaternion.vmult(rightDirection, worldRight);
      
      // Calcular componentes de velocidade
      const forwardVelocity = chassisVelocity.dot(worldForward);
      const lateralVelocity = chassisVelocity.dot(worldRight);
      
      // Aplicar tração para reduzir velocidade lateral (simula aderência do pneu)
      const tractionForce = 0.8; // Força de tração
      const maxTraction = 1000; // Força máxima de tração
      
      const lateralResistance = Math.min(
        Math.abs(lateralVelocity) * tractionForce * vehicle.chassis.mass,
        maxTraction
      );
      
      if (Math.abs(lateralVelocity) > 0.1) {
        const tractionVector = worldRight.clone();
        tractionVector.scale(-Math.sign(lateralVelocity) * lateralResistance * deltaTime);
        vehicle.chassis.applyImpulse(tractionVector, vehicle.chassis.position);
      }
      
      // Detectar drift baseado na velocidade lateral
      const isDrifting = Math.abs(lateralVelocity) > 2.0;
      vehicle.isDrifting = isDrifting;
      
      if (isDrifting) {
        this.debug?.checkpoint('Drift detectado', 'warning', 
          `velocidade lateral: ${lateralVelocity.toFixed(2)}`);
      }
      
    } catch (error) {
      this.debug?.error('Erro ao aplicar tração', error);
    }
  }

  syncThreeJSObject(threeObject, cannonBody) {
    // Sincronizar posição e rotação entre Three.js e Cannon.js
    threeObject.position.copy(cannonBody.position);
    threeObject.quaternion.copy(cannonBody.quaternion);
  }

  addBody(body) {
    this.world.addBody(body);
  }

  removeBody(body) {
    this.world.removeBody(body);
  }

  step(deltaTime) {
    // Atualizar simulação física
    this.world.step(deltaTime);
  }

  // Debug visualization methods
  createDebugVisualization(scene) {
    this.debug?.checkpoint('🔍 Criando visualização de debug da física');
    
    this.debugMeshes = [];
    this.debugMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00, 
      wireframe: true,
      transparent: true,
      opacity: 0.5
    });
    
    this.debug?.checkpoint('Material de debug criado');
    return this.debugMeshes;
  }

  updateDebugVisualization(scene) {
    if (!this.debugMeshes) return;
    
    // Limpar meshes antigos
    this.debugMeshes.forEach(mesh => {
      scene.remove(mesh);
    });
    this.debugMeshes = [];
    
    // Criar novos meshes para cada corpo físico
    this.world.bodies.forEach(body => {
      body.shapes.forEach(shape => {
        let geometry;
        
        if (shape instanceof CANNON.Box) {
          geometry = new THREE.BoxGeometry(
            shape.halfExtents.x * 2,
            shape.halfExtents.y * 2,
            shape.halfExtents.z * 2
          );
        } else if (shape instanceof CANNON.Plane) {
          geometry = new THREE.PlaneGeometry(100, 100);
        } else if (shape instanceof CANNON.Cylinder) {
          geometry = new THREE.CylinderGeometry(
            shape.radiusTop,
            shape.radiusBottom,
            shape.height,
            shape.numSegments
          );
        }
        
        if (geometry) {
          const mesh = new THREE.Mesh(geometry, this.debugMaterial);
          mesh.position.copy(body.position);
          mesh.quaternion.copy(body.quaternion);
          
          scene.add(mesh);
          this.debugMeshes.push(mesh);
        }
      });
    });
  }

  // Método para criar obstáculos simples
  createBox(position, size, mass = 1) {
    const shape = new CANNON.Box(new CANNON.Vec3(size.x/2, size.y/2, size.z/2));
    const body = new CANNON.Body({ mass });
    
    body.addShape(shape);
    body.position.set(position.x, position.y, position.z);
    
    this.world.addBody(body);
    return body;
  }

  // Método para criar rampas
  createRamp(position, size, rotation) {
    const shape = new CANNON.Box(new CANNON.Vec3(size.x/2, size.y/2, size.z/2));
    const body = new CANNON.Body({ mass: 0 }); // Estático
    
    body.addShape(shape);
    body.position.set(position.x, position.y, position.z);
    
    if (rotation) {
      body.quaternion.setFromAxisAngle(
        new CANNON.Vec3(rotation.axis.x, rotation.axis.y, rotation.axis.z),
        rotation.angle
      );
    }
    
    this.world.addBody(body);
    return body;
  }
} 