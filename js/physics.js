import * as CANNON from 'cannon-es';
import * as THREE from 'three';

export class PhysicsWorld {
  constructor() {
    this.world = new CANNON.World();
    this.bodies = new Map(); // Mapeamento entre objetos Three.js e corpos Cannon.js
    this.setupWorld();
  }

  setupWorld() {
    // Configurações básicas do mundo físico
    this.world.gravity.set(0, -9.82, 0); // Gravidade terrestre
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 10;
    
    // Configurações de contato entre materiais
    this.setupMaterials();
  }

  setupMaterials() {
    // Material do chão
    this.groundMaterial = new CANNON.Material('ground');
    
    // Material das rodas
    this.wheelMaterial = new CANNON.Material('wheel');
    
    // Material da carroceria
    this.carMaterial = new CANNON.Material('car');
    
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
  }

  createGround(size = 200) {
    // Criar chão físico (plano infinito)
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({
      mass: 0, // Massa 0 = estático
      material: this.groundMaterial
    });
    
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    
    this.world.addBody(groundBody);
    return groundBody;
  }

  createVehicle(position = { x: 0, y: 2, z: 0 }) {
    // Criar carroceria do veículo
    const chassisShape = new CANNON.Box(new CANNON.Vec3(1.75, 0.4, 3.5));
    const chassisBody = new CANNON.Body({
      mass: 150, // Massa do carrinho em kg
      material: this.carMaterial
    });
    
    chassisBody.addShape(chassisShape);
    chassisBody.position.set(position.x, position.y, position.z);
    
    // Criar cabine
    const cabinShape = new CANNON.Box(new CANNON.Vec3(1.4, 0.5, 1.75));
    const cabinBody = new CANNON.Body({
      mass: 50
    });
    
    cabinBody.addShape(cabinShape);
    cabinBody.position.set(position.x, position.y + 1.2, position.z - 0.5);
    
    // Conectar cabine ao chassi
    const cabinConstraint = new CANNON.PointToPointConstraint(
      chassisBody,
      new CANNON.Vec3(0, 0.8, -0.5),
      cabinBody,
      new CANNON.Vec3(0, -0.5, 0)
    );
    
    this.world.addBody(chassisBody);
    this.world.addBody(cabinBody);
    this.world.addConstraint(cabinConstraint);

    // Criar rodas
    const wheels = this.createWheels(chassisBody, position);
    
    return {
      chassis: chassisBody,
      cabin: cabinBody,
      wheels: wheels,
      constraint: cabinConstraint
    };
  }

  createWheels(chassisBody, basePosition) {
    const wheels = [];
    const wheelPositions = [
      { x: -1.0, z: 1.5 },  // Frente esquerda
      { x: 1.0, z: 1.5 },   // Frente direita  
      { x: -1.0, z: -1.5 }, // Traseira esquerda
      { x: 1.0, z: -1.5 }   // Traseira direita
    ];

    wheelPositions.forEach((pos, index) => {
      // Formato da roda (cilindro)
      const wheelShape = new CANNON.Cylinder(0.5, 0.5, 0.3, 16);
      const wheelBody = new CANNON.Body({
        mass: 10,
        material: this.wheelMaterial
      });
      
      wheelBody.addShape(wheelShape);
      wheelBody.position.set(
        basePosition.x + pos.x,
        basePosition.y - 0.5,
        basePosition.z + pos.z
      );
      
      // Orientar a roda corretamente
      wheelBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), Math.PI / 2);
      
      this.world.addBody(wheelBody);
      
      // Conectar roda ao chassi com constraint
      const wheelConstraint = new CANNON.PointToPointConstraint(
        chassisBody,
        new CANNON.Vec3(pos.x, -0.9, pos.z),
        wheelBody,
        new CANNON.Vec3(0, 0, 0)
      );
      
      this.world.addConstraint(wheelConstraint);
      
      wheels.push({
        body: wheelBody,
        constraint: wheelConstraint,
        isFront: index < 2, // Primeiras duas são dianteiras
        position: pos
      });
    });

    return wheels;
  }

  applyEngineForce(vehicle, force) {
    // Aplicar força às rodas traseiras
    const forceVector = new CANNON.Vec3(0, 0, force);
    
    vehicle.wheels.forEach((wheel, index) => {
      if (!wheel.isFront) { // Apenas rodas traseiras
        // Aplicar força na direção que o chassi está apontando
        const worldForce = new CANNON.Vec3();
        vehicle.chassis.quaternion.vmult(forceVector, worldForce);
        wheel.body.applyImpulse(worldForce, wheel.body.position);
      }
    });
  }

  applySteering(vehicle, steerValue) {
    // Simular esterçamento através de força lateral nas rodas dianteiras
    const steerForce = new CANNON.Vec3(steerValue * 50, 0, 0);
    
    vehicle.wheels.forEach((wheel) => {
      if (wheel.isFront) { // Apenas rodas dianteiras
        const worldForce = new CANNON.Vec3();
        vehicle.chassis.quaternion.vmult(steerForce, worldForce);
        wheel.body.applyImpulse(worldForce, wheel.body.position);
      }
    });
  }

  applyBrakes(vehicle, brakeForce) {
    // Aplicar força de freio
    const currentVelocity = vehicle.chassis.velocity.clone();
    currentVelocity.scale(-brakeForce);
    
    vehicle.chassis.applyImpulse(currentVelocity, vehicle.chassis.position);
    
    // Reduzir velocidade das rodas
    vehicle.wheels.forEach((wheel) => {
      wheel.body.velocity.scale(0.95);
      wheel.body.angularVelocity.scale(0.9);
    });
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