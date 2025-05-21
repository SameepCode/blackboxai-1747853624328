"use strict";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const ammoEl = document.getElementById("ammo");
const reloadBtn = document.getElementById("reloadBtn");
const gameOverEl = document.getElementById("gameOver");

const canvasWidth = canvas.width;
const canvasHeight = canvas.height;

let score = 0;
let ammo = 10;
const maxAmmo = 10;
let gameOver = false;

const targets = [];
const bullets = [];
const targetRadius = 20;
const targetSpeed = 2;
const spawnInterval = 1500; // ms
const bulletSpeed = 10;

// Utility function to get random integer between min and max inclusive
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Target class
class Target {
  constructor(x, y, speed) {
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.radius = targetRadius;
    this.hit = false;
  }

  update() {
    this.y += this.speed;
    if (this.y - this.radius > canvasHeight) {
      this.hit = true; // mark for removal if off screen
    }
  }

  draw() {
    ctx.beginPath();
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

class Bullet {
  constructor(x, y, targetX, targetY) {
    this.x = x;
    this.y = y;
    this.radius = 5;
    const dx = targetX - x;
    const dy = targetY - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    this.velocityX = (dx / dist) * bulletSpeed;
    this.velocityY = (dy / dist) * bulletSpeed;
    this.hit = false;
  }

  update() {
    this.x += this.velocityX;
    this.y += this.velocityY;
    // Remove bullet if out of canvas bounds
    if (
      this.x < 0 ||
      this.x > canvasWidth ||
      this.y < 0 ||
      this.y > canvasHeight
    ) {
      this.hit = true;
    }
  }

  draw() {
    ctx.beginPath();
    ctx.fillStyle = "#f00";
    ctx.shadowColor = "#f00";
    ctx.shadowBlur = 10;
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function spawnTarget() {
  const x = getRandomInt(targetRadius, canvasWidth - targetRadius);
  const y = -targetRadius;
  const speed = targetSpeed + Math.random(); // slight speed variation
  targets.push(new Target(x, y, speed));
}

function drawGun() {
  const gunWidth = 20;
  const gunHeight = 60;
  const gunX = canvasWidth / 2 - gunWidth / 2;
  const gunY = canvasHeight - gunHeight - 10;

  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.fillRect(gunX, gunY, gunWidth, gunHeight);
  ctx.strokeRect(gunX, gunY, gunWidth, gunHeight);

  // Gun barrel
  ctx.beginPath();
  ctx.moveTo(gunX + gunWidth / 2, gunY);
  ctx.lineTo(gunX + gunWidth / 2, gunY - 30);
  ctx.lineWidth = 6;
  ctx.stroke();
}

function updateGame() {
  if (gameOver) return;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  drawGun();

  // Draw targets and update
  for (let i = targets.length - 1; i >= 0; i--) {
    const target = targets[i];
    target.update();
    if (target.hit) {
      targets.splice(i, 1);
      // If target escaped, game over
      gameOver = true;
      gameOverEl.classList.remove("hidden");
      reloadBtn.disabled = false;
      return;
    } else {
      target.draw();
    }
  }

  // Draw bullets and update
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    bullet.update();
    if (bullet.hit) {
      bullets.splice(i, 1);
      continue;
    }
    bullet.draw();

    // Check collision with targets
    for (let j = targets.length - 1; j >= 0; j--) {
      const target = targets[j];
      const dx = bullet.x - target.x;
      const dy = bullet.y - target.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < bullet.radius + target.radius) {
        // Hit
        score++;
        scoreEl.textContent = score;
        targets.splice(j, 1);
        bullets.splice(i, 1);
        break;
      }
    }
  }

  requestAnimationFrame(updateGame);
}

function shoot(x, y) {
  if (gameOver) return;
  if (ammo <= 0) return;

  ammo--;
  ammoEl.textContent = ammo;

  // Create a bullet from gun barrel tip to click position
  const gunWidth = 20;
  const gunHeight = 60;
  const gunX = canvasWidth / 2 - gunWidth / 2;
  const gunY = canvasHeight - gunHeight - 10;
  const bulletStartX = gunX + gunWidth / 2;
  const bulletStartY = gunY;
  bullets.push(new Bullet(bulletStartX, bulletStartY, x, y));
}

function reload() {
  if (!gameOver) return;
  ammo = maxAmmo;
  ammoEl.textContent = ammo;
  score = 0;
  scoreEl.textContent = score;
  targets.length = 0;
  bullets.length = 0;
  gameOver = false;
  gameOverEl.classList.add("hidden");
  reloadBtn.disabled = true;
  startSpawning();
  updateGame();
}

function startSpawning() {
  spawnTarget();
  spawnIntervalId = setInterval(() => {
    if (!gameOver) {
      spawnTarget();
    } else {
      clearInterval(spawnIntervalId);
    }
  }, spawnInterval);
}

canvas.addEventListener("click", (e) => {
  if (gameOver) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  shoot(x, y);
});

reloadBtn.addEventListener("click", reload);

reloadBtn.disabled = true;
let spawnIntervalId = null;
startSpawning();
updateGame();
