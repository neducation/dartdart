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
  spawnWarnings: [], // { x, y, timeLeft }
  obstacles: [], // { x, y, w, h }
  levelUpAnimation: 0, // Animation timer for level up
  waveCompleteAnimation: 0, // Animation timer for wave complete
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

  // Initialize perk levels if they don't exist
  if (!p.perkLevels) {
    p.perkLevels = {
      bulletSpeed: 0,
      fireRate: 0,
      bounce: 0,
      piercing: 0,
      split: 0,
      homing: 0,
      fire: 0,
      ice: 0,
      lightning: 0,
      poison: 0,
    };
  }

  // PROGRESSIVE UPGRADES (Can be upgraded multiple times)

  // Bullet Speed (unlimited)
  choices.push({
    icon: "⚡",
    title: `Bullet Speed +20% (Lv ${p.perkLevels.bulletSpeed + 1})`,
    description: "Faster bullets",
    apply: () => {
      p.projectileSpeed = Math.round(p.projectileSpeed * 1.2);
      p.perkLevels.bulletSpeed++;
      updateStatsPanel();
    },
  });

  // Fire Rate (unlimited)
  choices.push({
    icon: "🔫",
    title: `Fire Rate +15% (Lv ${p.perkLevels.fireRate + 1})`,
    description: "Shoot faster",
    apply: () => {
      p.fireRate = Math.max(0.15, +(p.fireRate * 0.85).toFixed(2));
      p.perkLevels.fireRate++;
      updateStatsPanel();
    },
  });

  // Pets (unlimited)
  choices.push({
    icon: "🐾",
    title: `+1 Pet Companion (${p.pets.length} pets)`,
    description: "Pet shoots with you",
    apply: () => {
      p.pets.push(new Pet(Math.random() * Math.PI * 2));
      updateStatsPanel();
    },
  });

  // Bounce (max 3 levels)
  if (p.perkLevels.bounce < 3) {
    choices.push({
      icon: "🪃",
      title: `Bounce ${p.perkLevels.bounce === 0 ? "" : "+"} (Lv ${
        p.perkLevels.bounce + 1
      })`,
      description:
        p.perkLevels.bounce === 0
          ? "Bullets bounce off walls"
          : `Bounce ${p.perkLevels.bounce + 1} more times`,
      apply: () => {
        p.perkBounce = true;
        p.perkLevels.bounce++;
        p.maxBounces = p.perkLevels.bounce;
        updateStatsPanel();
      },
    });
  }

  // Piercing (max 3 levels)
  if (p.perkLevels.piercing < 3) {
    choices.push({
      icon: "🎯",
      title: `Piercing ${p.perkLevels.piercing === 0 ? "" : "+"} (Lv ${
        p.perkLevels.piercing + 1
      })`,
      description:
        p.perkLevels.piercing === 0
          ? "Bullets pierce through enemies"
          : `Pierce ${p.perkLevels.piercing + 1} more enemies`,
      apply: () => {
        p.perkPiercing = true;
        p.perkLevels.piercing++;
        p.maxPierce = p.perkLevels.piercing;
        updateStatsPanel();
      },
    });
  }

  // ONE-TIME PERKS

  // Split (one-time)
  if (!p.perkSplit) {
    choices.push({
      icon: "�",
      title: `Split Shot`,
      description: "Bullets split into 2 on impact",
      apply: () => {
        p.perkSplit = true;
        p.perkLevels.split = 1;
        updateStatsPanel();
      },
    });
  }

  // Homing (one-time)
  if (!p.perkHoming) {
    choices.push({
      icon: "🧲",
      title: `Homing`,
      description: "Bullets track enemies",
      apply: () => {
        p.perkHoming = true;
        p.perkLevels.homing = 1;
        updateStatsPanel();
      },
    });
  }

  // ELEMENTAL PERKS (Progressive, max 2 levels each)

  // Fire
  if (p.perkLevels.fire === 0) {
    choices.push({
      icon: "🔥",
      title: `Fire I`,
      description: "Bullets burn enemies (2.5s, 4 DPS)",
      apply: () => {
        p.perkFire = true;
        p.perkLevels.fire = 1;
        updateStatsPanel();
      },
    });
  } else if (p.perkLevels.fire === 1) {
    choices.push({
      icon: "🔥",
      title: `Fire II`,
      description: "Stronger burn (4s, 7 DPS)",
      apply: () => {
        p.perkLevels.fire = 2;
        updateStatsPanel();
      },
    });
  }

  // Ice
  if (p.perkLevels.ice === 0) {
    choices.push({
      icon: "❄️",
      title: `Ice I`,
      description: "Bullets slow enemies (2.5s, 50% slow)",
      apply: () => {
        p.perkIce = true;
        p.perkLevels.ice = 1;
        updateStatsPanel();
      },
    });
  } else if (p.perkLevels.ice === 1) {
    choices.push({
      icon: "❄️",
      title: `Ice II`,
      description: "Stronger slow (4s, 70% slow)",
      apply: () => {
        p.perkLevels.ice = 2;
        updateStatsPanel();
      },
    });
  }

  // Lightning
  if (p.perkLevels.lightning === 0) {
    choices.push({
      icon: "⚡",
      title: `Lightning I`,
      description: "Bullets chain to 1 enemy (70% damage)",
      apply: () => {
        p.perkLightning = true;
        p.perkLevels.lightning = 1;
        updateStatsPanel();
      },
    });
  } else if (p.perkLevels.lightning === 1) {
    choices.push({
      icon: "⚡",
      title: `Lightning II`,
      description: "Chain to 2 enemies (85% damage)",
      apply: () => {
        p.perkLevels.lightning = 2;
        updateStatsPanel();
      },
    });
  }

  // Poison
  if (p.perkLevels.poison === 0) {
    choices.push({
      icon: "☠️",
      title: `Poison I`,
      description: "Bullets poison enemies (4s, 2 DPS)",
      apply: () => {
        p.perkPoison = true;
        p.perkLevels.poison = 1;
        updateStatsPanel();
      },
    });
  } else if (p.perkLevels.poison === 1) {
    choices.push({
      icon: "☠️",
      title: `Poison II`,
      description: "Stronger poison (6s, 4 DPS)",
      apply: () => {
        p.perkLevels.poison = 2;
        updateStatsPanel();
      },
    });
  }

  // Shuffle and return 3 random choices
  const shuffled = choices.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
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
      btn.innerHTML = `<span class="upgrade-icon">${c.icon}</span><span>${c.title}</span>`;
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
    world.levelUpAnimation = 1.0; // Start animation
    if (titleEl) titleEl.textContent = "Level Up! Choose an upgrade";
    chooseUpgrades();
  };
}

// --- Obstacle generation ---
function generateObstacles(waveIndex) {
  world.obstacles = [];

  // Only add obstacles starting from wave 3
  if (waveIndex < 3) return;

  // Probability increases with waves
  if (Math.random() > 0.6) return; // 40% chance to have obstacles

  const centerX = world.width / 2;
  const centerY = world.height / 2;
  const patterns = ["cross", "corners", "grid", "ring"];
  const pattern = patterns[Math.floor(Math.random() * patterns.length)];

  const obstacleSize = 60;
  const gap = 100; // Safe gap for player movement

  switch (pattern) {
    case "cross":
      // Symmetrical cross pattern
      world.obstacles.push(
        {
          x: centerX - obstacleSize / 2,
          y: centerY - gap - obstacleSize,
          w: obstacleSize,
          h: obstacleSize,
        },
        {
          x: centerX - obstacleSize / 2,
          y: centerY + gap,
          w: obstacleSize,
          h: obstacleSize,
        },
        {
          x: centerX - gap - obstacleSize,
          y: centerY - obstacleSize / 2,
          w: obstacleSize,
          h: obstacleSize,
        },
        {
          x: centerX + gap,
          y: centerY - obstacleSize / 2,
          w: obstacleSize,
          h: obstacleSize,
        }
      );
      break;

    case "corners":
      // Symmetrical corner obstacles
      const cornerPad = 120;
      world.obstacles.push(
        { x: cornerPad, y: cornerPad, w: obstacleSize, h: obstacleSize },
        {
          x: world.width - cornerPad - obstacleSize,
          y: cornerPad,
          w: obstacleSize,
          h: obstacleSize,
        },
        {
          x: cornerPad,
          y: world.height - cornerPad - obstacleSize,
          w: obstacleSize,
          h: obstacleSize,
        },
        {
          x: world.width - cornerPad - obstacleSize,
          y: world.height - cornerPad - obstacleSize,
          w: obstacleSize,
          h: obstacleSize,
        }
      );
      break;

    case "grid":
      // 2x2 symmetrical grid around center
      const gridGap = 140;
      world.obstacles.push(
        {
          x: centerX - gridGap,
          y: centerY - gridGap,
          w: obstacleSize,
          h: obstacleSize,
        },
        {
          x: centerX + gridGap - obstacleSize,
          y: centerY - gridGap,
          w: obstacleSize,
          h: obstacleSize,
        },
        {
          x: centerX - gridGap,
          y: centerY + gridGap - obstacleSize,
          w: obstacleSize,
          h: obstacleSize,
        },
        {
          x: centerX + gridGap - obstacleSize,
          y: centerY + gridGap - obstacleSize,
          w: obstacleSize,
          h: obstacleSize,
        }
      );
      break;

    case "ring":
      // Ring of 8 obstacles around center
      const ringRadius = 180;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        world.obstacles.push({
          x: centerX + Math.cos(angle) * ringRadius - obstacleSize / 2,
          y: centerY + Math.sin(angle) * ringRadius - obstacleSize / 2,
          w: obstacleSize,
          h: obstacleSize,
        });
      }
      break;
  }

  // Failsafe: ensure player starting position is clear
  const playerStartX = centerX;
  const playerStartY = centerY;
  world.obstacles = world.obstacles.filter((obs) => {
    const dx = Math.abs(obs.x + obs.w / 2 - playerStartX);
    const dy = Math.abs(obs.y + obs.h / 2 - playerStartY);
    return dx > 100 || dy > 100; // Keep obstacles at least 100px from center
  });
}

// --- Waves ---
function createWaveManager() {
  const m = {
    index: 0,
    time: 0,
    targetKills: 0,
    killsThisWave: 0,
    enemiesSpawned: 0, // Track how many enemies spawned this wave
    totalEnemies: 0, // Set number of enemies per wave
    spawnCooldown: 0,
    waveStartDelay: 0, // 1-second delay before spawning
    waveActive: false, // Whether wave is actively spawning
    startNext() {
      this.index += 1;
      this.killsThisWave = 0;
      this.enemiesSpawned = 0;
      this.totalEnemies = 8 + (this.index - 1) * 4; // Fixed count per wave
      this.targetKills = this.totalEnemies;
      this.spawnCooldown = 0;
      this.waveStartDelay = 1.0; // 1 second delay
      this.waveActive = false;

      // Generate obstacles for this wave
      generateObstacles(this.index);

      // Clear all projectiles on wave end
      for (const p of world.projectiles) {
        world.releaseProjectile(p);
      }
      world.projectiles = [];

      // Trigger wave complete animation
      world.waveCompleteAnimation = 1.5;

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
        btn.innerHTML = `<span class="upgrade-icon">${c.icon}</span><span>${c.title}</span>`;
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
      // Wave ends only when ALL enemies are killed
      if (
        this.killsThisWave >= this.targetKills &&
        this.enemiesSpawned >= this.totalEnemies
      ) {
        this.startNext();
      }
    },
    update(dt) {
      this.time += dt;

      // Handle wave start delay
      if (this.waveStartDelay > 0) {
        this.waveStartDelay -= dt;
        if (this.waveStartDelay <= 0) {
          this.waveActive = true;
        }
        return;
      }

      // Only spawn if we haven't reached total enemy count
      if (!this.waveActive || this.enemiesSpawned >= this.totalEnemies) return;

      this.spawnCooldown -= dt;
      if (this.spawnCooldown <= 0) {
        const toSpawn = Math.min(
          this.totalEnemies - this.enemiesSpawned,
          1 + Math.floor(Math.random() * 2)
        );

        for (let i = 0; i < toSpawn; i++) {
          const [x, y] = randomEdgeSpawn();

          // Add spawn warning marker (0.5 second warning)
          world.spawnWarnings.push({ x, y, timeLeft: 0.5 });

          // Schedule enemy spawn after warning
          setTimeout(() => {
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
          }, 500); // 0.5 second delay

          this.enemiesSpawned++;
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

  // Update spawn warnings
  for (const warning of world.spawnWarnings) {
    warning.timeLeft -= dt;
  }
  world.spawnWarnings = world.spawnWarnings.filter((w) => w.timeLeft > 0);

  // Decay animations
  if (world.levelUpAnimation > 0) {
    world.levelUpAnimation = Math.max(0, world.levelUpAnimation - dt * 2);
  }
  if (world.waveCompleteAnimation > 0) {
    world.waveCompleteAnimation = Math.max(0, world.waveCompleteAnimation - dt);
  }

  // Decay screen shake
  world.screenShake = Math.max(0, world.screenShake - dt * 15);
}

function render() {
  ctx.clearRect(0, 0, world.width, world.height);

  // Draw fancy backdrop with gradient and border
  ctx.save();

  // Radial gradient background
  const gradient = ctx.createRadialGradient(
    world.width / 2,
    world.height / 2,
    0,
    world.width / 2,
    world.height / 2,
    Math.max(world.width, world.height) / 2
  );
  gradient.addColorStop(0, "#1a1a2e");
  gradient.addColorStop(0.5, "#16213e");
  gradient.addColorStop(1, "#0f0f1e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, world.width, world.height);

  // Decorative border with glow
  const borderWidth = 8;
  ctx.shadowBlur = 15;
  ctx.shadowColor = "#3b82f6";
  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = borderWidth;
  ctx.strokeRect(
    borderWidth / 2,
    borderWidth / 2,
    world.width - borderWidth,
    world.height - borderWidth
  );

  // Inner border accent
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#60a5fa";
  ctx.lineWidth = 2;
  ctx.strokeRect(
    borderWidth + 4,
    borderWidth + 4,
    world.width - borderWidth * 2 - 8,
    world.height - borderWidth * 2 - 8
  );

  ctx.restore();

  // Apply screen shake
  ctx.save();
  if (world.screenShake > 0) {
    const shakeX = (Math.random() - 0.5) * world.screenShake;
    const shakeY = (Math.random() - 0.5) * world.screenShake;
    ctx.translate(shakeX, shakeY);
  }

  // Background grid (dimmer now)
  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = "#4b5563";
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

  // Draw obstacles
  for (const obs of world.obstacles) {
    ctx.save();

    // Obstacle shadow
    ctx.fillStyle = "#000000";
    ctx.globalAlpha = 0.3;
    ctx.fillRect(obs.x + 4, obs.y + 4, obs.w, obs.h);

    // Main obstacle with gradient
    ctx.globalAlpha = 1;
    const obsGradient = ctx.createLinearGradient(
      obs.x,
      obs.y,
      obs.x,
      obs.y + obs.h
    );
    obsGradient.addColorStop(0, "#475569");
    obsGradient.addColorStop(1, "#334155");
    ctx.fillStyle = obsGradient;
    ctx.fillRect(obs.x, obs.y, obs.w, obs.h);

    // Obstacle border
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 2;
    ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);

    // Highlight edge
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(obs.x, obs.y);
    ctx.lineTo(obs.x + obs.w, obs.y);
    ctx.lineTo(obs.x + obs.w, obs.y + 5);
    ctx.stroke();

    ctx.restore();
  }

  world.player.draw(ctx, world.sprites);
  for (const e of world.enemies) e.draw(ctx, world.sprites);
  for (const p of world.projectiles) p.draw(ctx, world.sprites);

  // Draw spawn warnings
  for (const warning of world.spawnWarnings) {
    const alpha = warning.timeLeft / 0.5; // Fade in from 0 to 1
    const pulse = 0.7 + 0.3 * Math.sin(warning.timeLeft * 20); // Pulse effect
    ctx.save();
    ctx.globalAlpha = alpha * 0.8;
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(warning.x, warning.y, 25 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = alpha * 0.4;
    ctx.fillStyle = "#ef4444";
    ctx.fill();
    ctx.restore();
  }

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

  // Level up animation overlay
  if (world.levelUpAnimation > 0) {
    const alpha = world.levelUpAnimation;
    const scale = 1 + (1 - alpha) * 0.3;
    ctx.save();
    ctx.globalAlpha = alpha * 0.3;
    ctx.fillStyle = "#fbbf24";
    ctx.fillRect(0, 0, world.width, world.height);

    // Radial burst effect
    ctx.globalAlpha = alpha * 0.5;
    const burstGradient = ctx.createRadialGradient(
      world.width / 2,
      world.height / 2,
      0,
      world.width / 2,
      world.height / 2,
      300 * scale
    );
    burstGradient.addColorStop(0, "#fbbf24");
    burstGradient.addColorStop(1, "transparent");
    ctx.fillStyle = burstGradient;
    ctx.fillRect(0, 0, world.width, world.height);
    ctx.restore();
  }

  // Wave complete animation overlay
  if (world.waveCompleteAnimation > 0) {
    const alpha = Math.min(1, world.waveCompleteAnimation);
    const progress = 1 - world.waveCompleteAnimation / 1.5;
    ctx.save();

    // Sweeping gradient effect
    const sweepGradient = ctx.createLinearGradient(
      0,
      0,
      world.width,
      world.height
    );
    sweepGradient.addColorStop(Math.max(0, progress - 0.3), "transparent");
    sweepGradient.addColorStop(progress, "#3b82f6");
    sweepGradient.addColorStop(Math.min(1, progress + 0.3), "transparent");
    ctx.globalAlpha = alpha * 0.4;
    ctx.fillStyle = sweepGradient;
    ctx.fillRect(0, 0, world.width, world.height);

    // Particle burst from center
    if (alpha > 0.7) {
      ctx.globalAlpha = alpha;
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 + progress * Math.PI;
        const dist = 100 + progress * 200;
        const x = world.width / 2 + Math.cos(angle) * dist;
        const y = world.height / 2 + Math.sin(angle) * dist;
        ctx.fillStyle = "#60a5fa";
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  ctx.restore(); // End screen shake

  world.input.draw(ctx);

  const hud = document.getElementById("hud");
  if (hud) {
    const p = world.player;
    const wave = world.wave?.index ?? 0;
    const pausedTxt = world.paused ? " | PAUSED" : "";
    const delayTxt =
      world.wave && world.wave.waveStartDelay > 0
        ? ` | Starting in ${Math.ceil(world.wave.waveStartDelay)}s`
        : "";
    hud.textContent = `dartdart  |  Wave ${wave}  |  Lv ${p.level}  XP ${p.xp}/${p.xpForNext}${pausedTxt}${delayTxt}`;
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
  const pad = 50; // More padding from edge
  let x, y;
  let attempts = 0;
  const maxAttempts = 10;

  // Try to find a position not inside an obstacle
  do {
    switch (edge) {
      case 0:
        x = Math.random() * world.width;
        y = pad;
        break;
      case 1:
        x = Math.random() * world.width;
        y = world.height - pad;
        break;
      case 2:
        x = pad;
        y = Math.random() * world.height;
        break;
      case 3:
        x = world.width - pad;
        y = Math.random() * world.height;
        break;
    }

    // Check if spawn point is inside an obstacle
    let insideObstacle = false;
    for (const obs of world.obstacles) {
      if (
        x > obs.x - 30 &&
        x < obs.x + obs.w + 30 &&
        y > obs.y - 30 &&
        y < obs.y + obs.h + 30
      ) {
        insideObstacle = true;
        break;
      }
    }

    if (!insideObstacle) break;
    attempts++;
  } while (attempts < maxAttempts);

  return [x, y];
}

// --- Stats Panel ---
function updateStatsPanel() {
  const statsContent = document.getElementById("stats-content");
  if (!statsContent) return;

  const p = world.player;
  if (!p) return;

  if (!p.perkLevels) return;

  let html = "<h3>Player Stats</h3>";
  html += `<div class="stat-row"><span class="stat-icon">⚡</span><span class="stat-label">Bullet Speed:</span><span class="stat-value">Lv ${p.perkLevels.bulletSpeed}</span></div>`;
  html += `<div class="stat-row"><span class="stat-icon">🔫</span><span class="stat-label">Fire Rate:</span><span class="stat-value">Lv ${p.perkLevels.fireRate}</span></div>`;
  html += `<div class="stat-row"><span class="stat-icon">🐾</span><span class="stat-label">Pets:</span><span class="stat-value">${p.pets.length}</span></div>`;

  html += "<h3>Active Perks</h3>";
  const perks = [];
  if (p.perkLevels.bounce > 0)
    perks.push({
      icon: "🪃",
      name: `Bounce Lv${p.perkLevels.bounce}`,
      level: p.perkLevels.bounce,
    });
  if (p.perkLevels.piercing > 0)
    perks.push({
      icon: "🎯",
      name: `Piercing Lv${p.perkLevels.piercing}`,
      level: p.perkLevels.piercing,
    });
  if (p.perkSplit) perks.push({ icon: "�", name: "Split Shot" });
  if (p.perkHoming) perks.push({ icon: "🧲", name: "Homing" });
  if (p.perkLevels.fire > 0)
    perks.push({
      icon: "🔥",
      name: `Fire ${p.perkLevels.fire === 1 ? "I" : "II"}`,
    });
  if (p.perkLevels.ice > 0)
    perks.push({
      icon: "❄️",
      name: `Ice ${p.perkLevels.ice === 1 ? "I" : "II"}`,
    });
  if (p.perkLevels.lightning > 0)
    perks.push({
      icon: "⚡",
      name: `Lightning ${p.perkLevels.lightning === 1 ? "I" : "II"}`,
    });
  if (p.perkLevels.poison > 0)
    perks.push({
      icon: "☠️",
      name: `Poison ${p.perkLevels.poison === 1 ? "I" : "II"}`,
    });

  if (perks.length === 0) {
    html += `<div class="stat-row"><span class="stat-label">No perks yet</span></div>`;
  } else {
    for (const perk of perks) {
      html += `<div class="stat-row"><span class="stat-icon">${perk.icon}</span><span class="stat-label">${perk.name}</span></div>`;
    }
  }

  statsContent.innerHTML = html;
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

  // Pause button and stats panel
  const pauseBtn = document.getElementById("pause-btn");
  const statsPanel = document.getElementById("stats-panel");
  if (pauseBtn) {
    pauseBtn.addEventListener("click", () => {
      world.paused = !world.paused;
      world.pauseReason = world.paused ? "manual" : "";
      pauseBtn.textContent = world.paused ? "Resume" : "Pause";

      // Show/hide stats panel
      if (statsPanel) {
        statsPanel.style.display = world.paused ? "flex" : "none";
        if (world.paused) {
          updateStatsPanel();
        }
      }
    });
  }

  const engine = new Engine(update, render);
  engine.start();
}

boot();
