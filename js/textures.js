import * as THREE from 'three';

/**
 * Cria textura para a frente e traseira do carrinho
 */
export function getCarFrontTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 32;
  const context = canvas.getContext("2d");

  // Fundo branco do carrinho
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, 64, 32);

  // Para-brisa
  context.fillStyle = "#4a90e2";
  context.fillRect(8, 6, 48, 20);

  // Detalhes das luzes
  context.fillStyle = "#ffeb3b";
  context.fillRect(4, 22, 8, 6);
  context.fillRect(52, 22, 8, 6);

  // Grade frontal
  context.fillStyle = "#333333";
  context.fillRect(20, 24, 24, 4);

  return new THREE.CanvasTexture(canvas);
}

/**
 * Cria textura para traseira do carrinho
 */
export function getCarBackTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 32;
  const context = canvas.getContext("2d");

  // Fundo branco do carrinho
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, 64, 32);

  // Vidro traseiro
  context.fillStyle = "#4a90e2";
  context.fillRect(8, 6, 48, 20);

  // Lanternas traseiras
  context.fillStyle = "#e74c3c";
  context.fillRect(4, 22, 8, 6);
  context.fillRect(52, 22, 8, 6);

  // Placa
  context.fillStyle = "#333333";
  context.fillRect(24, 24, 16, 4);

  return new THREE.CanvasTexture(canvas);
}

/**
 * Cria textura para lateral direita do carrinho
 */
export function getCarSideTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 32;
  const context = canvas.getContext("2d");

  // Fundo branco do carrinho
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, 128, 32);

  // Janela dianteira
  context.fillStyle = "#4a90e2";
  context.fillRect(10, 6, 38, 20);

  // Janela traseira
  context.fillStyle = "#4a90e2";
  context.fillRect(58, 6, 36, 20);

  // Separador entre janelas (pilar)
  context.fillStyle = "#333333";
  context.fillRect(48, 6, 10, 20);

  // Maçaneta da porta
  context.fillStyle = "#666666";
  context.fillRect(80, 16, 4, 2);

  // Detalhes da carroceria
  context.fillStyle = "#dddddd";
  context.fillRect(0, 26, 128, 2);

  return new THREE.CanvasTexture(canvas);
}

/**
 * Cria textura para lateral esquerda (espelhada)
 */
export function getCarLeftSideTexture() {
  const texture = getCarSideTexture();
  
  // Configurações para espelhar a textura
  texture.center = new THREE.Vector2(0.5, 0.5);
  texture.rotation = Math.PI;
  texture.flipY = false;
  
  return texture;
}

/**
 * Cria textura para o teto do carrinho
 */
export function getCarTopTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 128;
  const context = canvas.getContext("2d");

  // Teto metálico
  context.fillStyle = "#f0f0f0";
  context.fillRect(0, 0, 64, 128);

  // Teto solar
  context.fillStyle = "#4a90e2";
  context.fillRect(8, 20, 48, 60);

  // Antena
  context.fillStyle = "#333333";
  context.fillRect(30, 10, 4, 10);

  return new THREE.CanvasTexture(canvas);
}

/**
 * Cria textura para o chassi/parte inferior
 */
export function getCarBottomTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 128;
  const context = canvas.getContext("2d");

  // Chassi escuro
  context.fillStyle = "#222222";
  context.fillRect(0, 0, 64, 128);

  // Detalhes do chassi
  context.fillStyle = "#444444";
  context.fillRect(8, 20, 48, 8);
  context.fillRect(8, 40, 48, 8);
  context.fillRect(8, 80, 48, 8);
  context.fillRect(8, 100, 48, 8);

  return new THREE.CanvasTexture(canvas);
}

/**
 * Cria textura para as rodas
 */
export function getWheelTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const context = canvas.getContext("2d");

  // Pneu preto
  context.fillStyle = "#1a1a1a";
  context.fillRect(0, 0, 32, 32);

  // Aro interno
  context.fillStyle = "#666666";
  context.fillRect(6, 6, 20, 20);

  // Centro da roda
  context.fillStyle = "#888888";
  context.fillRect(12, 12, 8, 8);

  // Detalhes do aro
  context.fillStyle = "#aaaaaa";
  context.fillRect(14, 8, 4, 16);
  context.fillRect(8, 14, 16, 4);

  return new THREE.CanvasTexture(canvas);
}

/**
 * Cria textura para o ground/chão com padrão de asfalto
 */
export function getGroundTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");

  // Base do asfalto
  context.fillStyle = "#444444";
  context.fillRect(0, 0, 256, 256);

  // Textura de asfalto com pontos
  for (let i = 0; i < 500; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const size = Math.random() * 2;
    
    context.fillStyle = Math.random() > 0.5 ? "#555555" : "#333333";
    context.fillRect(x, y, size, size);
  }

  // Linha central amarela
  context.fillStyle = "#ffeb3b";
  context.fillRect(120, 0, 16, 256);
  
  // Linhas tracejadas
  context.fillStyle = "#444444";
  for (let i = 0; i < 256; i += 40) {
    context.fillRect(124, i, 8, 20);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  
  return texture;
} 