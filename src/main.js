import { Engine } from "./engine.js";
import { VirtualJoystick } from "./input.js";
import { loadSpriteSheet } from "./sprites.js";
import { Player, Enemy, Pet } from "./entities.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

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

const world = {
  width: 0,
  height: 0,
  input: null,
  sprites: null,
  player: null,
  enemies: [],
  projectiles: [],
  effects: [],
  wave: null,
  paused: false,
  pauseReason: "",
  spawnProjectile(p) {
    this.projectiles.push(p);
  },
};

async function boot() {
  resize();
  world.input = new VirtualJoystick(canvas);
  world.sprites = await loadSpriteSheet("./assets/sprites.svg");
  world.player = new Player(world.width / 2, world.height / 2);
  setupLeveling();

  // start waves
  world.wave = createWaveManager();
  world.wave.startNext();

  const engine = new Engine(update, render);
  engine.start();

  // Pause/Resume button
  const pauseBtn = document.getElementById("pause-btn");
  const updatePauseLabel = () => {
    pauseBtn.textContent = world.paused ? "Resume" : "Pause";
  };
  pauseBtn.addEventListener("click", () => {
    // manual toggle only when not overlay-paused
    world.paused = !world.paused;
    world.pauseReason = world.paused ? "manual" : "";
    updatePauseLabel();
  });
  updatePauseLabel();
}

function update(dt) {
  if (world.paused) return; // global pause
  // update player
  world.player.update(dt, world);

  // update enemies
  for (const e of world.enemies) e.update(dt, world);
  // prune dead (wave manager can re-spawn as needed)
  world.enemies = world.enemies.filter((e) => !e.dead);

  // update wave spawner
  if (world.wave) world.wave.update(dt);

  // projectiles
  for (const p of world.projectiles) p.update(dt, world);
  world.projectiles = world.projectiles.filter((p) => !p.dead);

  // effects
  for (const fx of world.effects) fx.t -= dt;
  world.effects = world.effects.filter((fx) => fx.t > 0);
}

function render() {
  ctx.clearRect(0, 0, world.width, world.height);

  // background grid
  ctx.save();
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
  ctx.restore();

  // draw entities
  world.player.draw(ctx, world.sprites);
  for (const e of world.enemies) e.draw(ctx, world.sprites);
  for (const p of world.projectiles) p.draw(ctx, world.sprites);

  // muzzle flashes
  for (const fx of world.effects) {
    const alpha = Math.max(0, Math.min(1, fx.t / 0.08));
    ctx.save();
    ctx.globalAlpha = alpha;
    world.sprites.draw(ctx, "muzzle", fx.x, fx.y, 20);
    ctx.restore();
  }

  // joystick
  world.input.draw(ctx);

  // HUD: display Level/XP/Wave
  const hud = document.getElementById("hud");
  if (hud) {
    const p = world.player;
    const wave = world.wave?.index ?? 0;
    const pausedTxt = world.paused ? " | PAUSED" : "";
    hud.textContent = `dartdart  |  Wave ${wave}  |  Lv ${p.level}  XP ${p.xp}/${p.xpForNext}${pausedTxt}`;
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

boot();

// --- Upgrades & Leveling ---
function setupLeveling() {
  const p = world.player;
  const overlay = document.getElementById("upgrade");
  const optsEl = document.getElementById("upgrade-opts");
  const titleEl = document.getElementById("upgrade-title");
  const showOverlay = (choices) => {
    // clear
    optsEl.innerHTML = "";
    for (const c of choices) {
      const btn = document.createElement("button");
      btn.textContent = c.title;
      btn.addEventListener(
        "click",
        () => {
          c.apply();
          overlay.style.display = "none";
          // resume if paused for overlay
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
  };

  const chooseUpgrades = () => {
    const choices = generateUpgrades();
    showOverlay(choices);
  };

  p.onLevelUp = () => {
    // increase requirement progressively (linear for now)
    p.xpForNext = Math.floor(p.xpForNext * 1.25);
    // pause and show overlay
    world.paused = true;
    world.pauseReason = "levelup";
    if (titleEl) titleEl.textContent = "Level Up! Choose an upgrade";
    chooseUpgrades();
  };
}

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
  return choices;
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
      // Basic scaling: more kills and slightly higher cap each wave
      this.targetKills = 6 + (this.index - 1) * 3;
      this.aliveCap = Math.min(10, 3 + Math.floor(this.index / 2));
      this.spawnCooldown = 0;
      // On every wave start, pause and grant a random upgrade automatically
      world.paused = true;
      world.pauseReason = "wave";
      const overlay = document.getElementById("upgrade");
      const titleEl = document.getElementById("upgrade-title");
      if (titleEl)
        titleEl.textContent = `Wave ${this.index} Reached! Pick a bonus`;
      const choices = generateUpgrades();
      // Show overlay with random 3 (already 3); user must pick to resume
      const optsEl = document.getElementById("upgrade-opts");
      if (optsEl) optsEl.innerHTML = "";
      // reuse setup in setupLeveling
      const buttons = choices.map((c) => c);
      const show = () => {
        const overlayEl = document.getElementById("upgrade");
        const opts = document.getElementById("upgrade-opts");
        if (!overlayEl || !opts) return;
        opts.innerHTML = "";
        for (const c of buttons) {
          const btn = document.createElement("button");
          btn.textContent = c.title;
          btn.addEventListener(
            "click",
            () => {
              c.apply();
              overlayEl.style.display = "none";
              if (world.pauseReason === "wave") {
                world.paused = false;
                world.pauseReason = "";
                const pauseBtn = document.getElementById("pause-btn");
                if (pauseBtn) pauseBtn.textContent = "Pause";
              }
            },
            { once: true }
          );
          opts.appendChild(btn);
        }
        overlayEl.style.display = "flex";
      };
      show();
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
        // spawn burst of 1-2 enemies
        const toSpawn = Math.min(
          this.aliveCap - alive,
          1 + Math.floor(Math.random() * 2)
        );
        for (let i = 0; i < toSpawn; i++) {
          const [x, y] = randomEdgeSpawn();
          world.enemies.push(new Enemy(x, y));
        }
        // spawn delay shrinks slightly with wave index
        this.spawnCooldown = Math.max(0.5, 1.6 - this.index * 0.08);
      }
    },
  };
  return m;
}
