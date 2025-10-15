import { Engine } from "./engine.js";
import { VirtualJoystick } from "./input.js";
import { loadSpriteSheet } from "./sprites.js";
import {
  Player,
  Enemy,
  Pet,
  FastEnemy,
  TankEnemy,
  SplitterEnemy,
} from "./entities.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// Global world state used by entities
const world = {
  width: 0,
  height: 0,
  input: null,
  sprites: null,
  player: null,
  enemies: [],
  projectiles: [],
  effects: [],
  particles: [], // New: particle effects
  screenShake: 0, // New: screen shake intensity
  paused: false,
  pauseReason: "",
  wave: null,
  // Projectile pool
  _projectilePool: [],
  getProjectile() {
    return this._projectilePool.length ? this._projectilePool.pop() : null;
  },
  spawnProjectile(p) {
    this.projectiles.push(p);
  },
  releaseProjectile(p) {
    this._projectilePool.push(p);
  },
};

// Handle DPR and resize
function resize() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const w = Math.floor(window.innerWidth);
  const h = Math.floor(window.innerHeight);
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels
  world.width = w;
  world.height = h;
}
window.addEventListener("resize", resize);
resize();

// --- Upgrades ---
function generateUpgrades() {
  const p = world.player;
  const choices = [];
  choices.push({
    title: `Bullet Speed +20% (now ${Math.round(p.projectileSpeed * 1.2)})`,
    apply: () => {
      p.projectileSpeed = Math.round(p.projectileSpeed * 1.2);
    },
  });
  choices.push({
    title: `Fire Rate +15% (faster)`,
    apply: () => {
      p.fireRate = Math.max(0.2, +(p.fireRate * 0.85).toFixed(2));
    },
  });
  choices.push({
    title: `+1 Pet Companion`,
    apply: () => {
      p.pets.push(new Pet(Math.random() * Math.PI * 2));
    },
  });
  // New bullet perks
  choices.push({
    title: `Bullets Split on Impact`,
    apply: () => (p.perkSplit = true),
  });
  choices.push({
    title: `Bullets Track Enemies`,
    apply: () => (p.perkHoming = true),
  });
  choices.push({
    title: `Bullets Ricochet`,
    apply: () => (p.perkRicochet = true),
  });
  // Elemental perks
  choices.push({
    title: `Bullets inflict FIRE (burn)`,
    apply: () => (p.perkFire = true),
  });
  choices.push({
    title: `Bullets inflict ICE (slow)`,
    apply: () => (p.perkIce = true),
  });
  choices.push({
    title: `Bullets inflict LIGHTNING (chain)`,
    apply: () => (p.perkLightning = true),
  });
  choices.push({
    title: `Bullets inflict POISON (DoT)`,
    apply: () => (p.perkPoison = true),
  });
  // Debug: grant all
  choices.push({
    title: `DEBUG: Grant ALL Perks`,
    apply: () => {
      p.perkSplit = true;
      p.perkHoming = true;
      p.perkRicochet = true;
      p.perkFire = true;
      p.perkIce = true;
      p.perkLightning = true;
      p.perkPoison = true;
    },
  });
  return choices;
}

// --- Leveling overlay ---
function setupLeveling() {
  const p = world.player;
  const overlay = document.getElementById("upgrade");
  const optsEl = document.getElementById("upgrade-opts");
  const titleEl = document.getElementById("upgrade-title");

  function showOverlay(choices) {
    if (!overlay || !optsEl) return;
    optsEl.innerHTML = "";
    for (const c of choices) {
      const btn = document.createElement("button");
      btn.textContent = c.title;
      btn.addEventListener(
        "click",
        () => {
          c.apply();
          overlay.style.display = "none";
          if (world.pauseReason === "levelup" || world.pauseReason === "wave") {
            world.paused = false;
            world.pauseReason = "";
            const pauseBtn = document.getElementById("pause-btn");
            if (pauseBtn) pauseBtn.textContent = "Pause";
          }
        },
        { once: true }
      );
      optsEl.appendChild(btn);
    }
    overlay.style.display = "flex";
  }

  function chooseUpgrades() {
    const choices = generateUpgrades();
    showOverlay(choices);
  }

  p.onLevelUp = () => {
    p.xpForNext = Math.floor(p.xpForNext * 1.25);
    world.paused = true;
    world.pauseReason = "levelup";
    if (titleEl) titleEl.textContent = "Level Up! Choose an upgrade";
    chooseUpgrades();
  };
}

// --- Waves ---
function createWaveManager() {
  const m = {
    index: 0,
    time: 0,
    targetKills: 0,
    killsThisWave: 0,
    aliveCap: 0,
    spawnCooldown: 0,
    startNext() {
      this.index += 1;
      this.killsThisWave = 0;
      this.targetKills = 6 + (this.index - 1) * 3;
      this.aliveCap = Math.min(10, 3 + Math.floor(this.index / 2));
      this.spawnCooldown = 0;
      // Pause for wave upgrade
      world.paused = true;
      world.pauseReason = "wave";
      const overlay = document.getElementById("upgrade");
      const titleEl = document.getElementById("upgrade-title");
      if (titleEl)
        titleEl.textContent = `Wave ${this.index} Reached! Pick a bonus`;
      const choices = generateUpgrades();
      const optsEl = document.getElementById("upgrade-opts");
      if (!overlay || !optsEl) return;
      optsEl.innerHTML = "";
      for (const c of choices) {
        const btn = document.createElement("button");
        btn.textContent = c.title;
        btn.addEventListener(
          "click",
          () => {
            c.apply();
            overlay.style.display = "none";
            if (world.pauseReason === "wave") {
              world.paused = false;
              world.pauseReason = "";
              const pauseBtn = document.getElementById("pause-btn");
              if (pauseBtn) pauseBtn.textContent = "Pause";
            }
          },
          { once: true }
        );
        optsEl.appendChild(btn);
      }
      overlay.style.display = "flex";
    },
    onEnemyKilled() {
      this.killsThisWave += 1;
      if (this.killsThisWave >= this.targetKills) {
        this.startNext();
      }
    },
    update(dt) {
      this.time += dt;
      // keep spawning until alive reaches cap
      this.spawnCooldown -= dt;
      const alive = world.enemies.length;
      if (alive < this.aliveCap && this.spawnCooldown <= 0) {
        const toSpawn = Math.min(
          this.aliveCap - alive,
          1 + Math.floor(Math.random() * 2)
        );
        for (let i = 0; i < toSpawn; i++) {
          const [x, y] = randomEdgeSpawn();
          // Spawn different enemy types based on wave
          const rand = Math.random();
          let enemy;
          if (this.index >= 5 && rand < 0.15) {
            enemy = new TankEnemy(x, y);
          } else if (this.index >= 3 && rand < 0.35) {
            enemy = new FastEnemy(x, y);
          } else if (this.index >= 4 && rand < 0.55) {
            enemy = new SplitterEnemy(x, y);
          } else {
            enemy = new Enemy(x, y);
          }
          world.enemies.push(enemy);
        }
        this.spawnCooldown = Math.max(0.5, 1.6 - this.index * 0.08);
      }
    },
  };
  return m;
}

// --- Update & Render ---
function update(dt) {
  if (world.paused) return;

  world.player.update(dt, world);

  for (const e of world.enemies) e.update(dt, world);

  // Handle enemy deaths and splitters
  const newEnemies = [];
  world.enemies = world.enemies.filter((e) => {
    if (e.dead) {
      // Spawn particles on death
      spawnParticles(e.x, e.y, 8, "#ef4444");
      world.screenShake = Math.max(world.screenShake, 3);

      // Splitter enemies split into 2 smaller ones
      if (e.enemyType === "splitter" && !e.isSplit) {
        for (let i = 0; i < 2; i++) {
          const angle = Math.random() * Math.PI * 2;
          const offset = 20;
          newEnemies.push(
            new SplitterEnemy(
              e.x + Math.cos(angle) * offset,
              e.y + Math.sin(angle) * offset,
              true
            )
          );
        }
      }
      return false;
    }
    return true;
  });
  world.enemies.push(...newEnemies);

  if (world.wave) world.wave.update(dt);

  for (const p of world.projectiles) p.update(dt, world);
  world.projectiles = world.projectiles.filter((p) => {
    if (p.dead) {
      world.releaseProjectile(p);
      return false;
    }
    return true;
  });

  for (const fx of world.effects) fx.t -= dt;
  world.effects = world.effects.filter((fx) => fx.t > 0);

  // Update particles
  for (const particle of world.particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt;
  }
  world.particles = world.particles.filter((p) => p.life > 0);

  // Decay screen shake
  world.screenShake = Math.max(0, world.screenShake - dt * 15);
}

function render() {
  ctx.clearRect(0, 0, world.width, world.height);

  // Apply screen shake
  ctx.save();
  if (world.screenShake > 0) {
    const shakeX = (Math.random() - 0.5) * world.screenShake;
    const shakeY = (Math.random() - 0.5) * world.screenShake;
    ctx.translate(shakeX, shakeY);
  }

  // background grid
  ctx.globalAlpha = 0.15;
  ctx.strokeStyle = "#1f2937";
  for (let x = 0; x < world.width; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, world.height);
    ctx.stroke();
  }
  for (let y = 0; y < world.height; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(world.width, y + 0.5);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  world.player.draw(ctx, world.sprites);
  for (const e of world.enemies) e.draw(ctx, world.sprites);
  for (const p of world.projectiles) p.draw(ctx, world.sprites);

  // Draw particles
  for (const particle of world.particles) {
    const alpha = Math.max(0, particle.life / 0.5);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x - 2, particle.y - 2, 4, 4);
    ctx.restore();
  }

  for (const fx of world.effects) {
    const alpha = Math.max(0, Math.min(1, fx.t / 0.08));
    ctx.save();
    ctx.globalAlpha = alpha;
    world.sprites.draw(ctx, "muzzle", fx.x, fx.y, 20);
    ctx.restore();
  }

  ctx.restore(); // End screen shake

  world.input.draw(ctx);

  const hud = document.getElementById("hud");
  if (hud) {
    const p = world.player;
    const wave = world.wave?.index ?? 0;
    const pausedTxt = world.paused ? " | PAUSED" : "";
    hud.textContent = `dartdart  |  Wave ${wave}  |  Lv ${p.level}  XP ${p.xp}/${p.xpForNext}${pausedTxt}`;
  }
}

function spawnParticles(x, y, count, color) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 120;
    world.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.3 + Math.random() * 0.4,
      color,
    });
  }
}

function randomEdgeSpawn() {
  const edge = Math.floor(Math.random() * 4);
  const pad = 40;
  switch (edge) {
    case 0:
      return [Math.random() * world.width, pad];
    case 1:
      return [Math.random() * world.width, world.height - pad];
    case 2:
      return [pad, Math.random() * world.height];
    case 3:
      return [world.width - pad, Math.random() * world.height];
  }
}

// --- Boot ---
async function boot() {
  world.input = new VirtualJoystick(canvas);
  world.sprites = await loadSpriteSheet("./assets/sprites.svg");
  world.player = new Player(
    Math.floor(world.width / 2),
    Math.floor(world.height / 2)
  );

  setupLeveling();
  world.wave = createWaveManager();
  world.wave.startNext();

  // Pause button if present
  const pauseBtn = document.getElementById("pause-btn");
  if (pauseBtn) {
    pauseBtn.addEventListener("click", () => {
      world.paused = !world.paused;
      world.pauseReason = world.paused ? "manual" : "";
      pauseBtn.textContent = world.paused ? "Resume" : "Pause";
    });
  }

  const engine = new Engine(update, render);
  engine.start();
}

boot();
