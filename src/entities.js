import { angleTo, normalize, pickNearest } from "./utils.js";

// Helper function to check collision with obstacles
function checkObstacleCollision(x, y, radius, world) {
  for (const obs of world.obstacles) {
    // Check if circle (entity) intersects with rectangle (obstacle)
    const closestX = Math.max(obs.x, Math.min(x, obs.x + obs.w));
    const closestY = Math.max(obs.y, Math.min(y, obs.y + obs.h));
    const distX = x - closestX;
    const distY = y - closestY;
    const distSq = distX * distX + distY * distY;

    if (distSq < radius * radius) {
      return { collided: true, obs, closestX, closestY };
    }
  }
  return { collided: false };
}

export class Entity {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.dead = false;
  }
  update(dt, world) {}
  draw(ctx, sprites) {}
}

export class Projectile extends Entity {
  // Add extra options for perks
  constructor(
    x,
    y,
    dirX,
    dirY,
    speed = 260,
    damage = 25,
    owner = "player",
    opts = {}
  ) {
    super(x, y);
    const n = normalize(dirX, dirY);
    this.vx = n.x * speed;
    this.vy = n.y * speed;
    this.baseSpeed = speed; // Store original speed
    this.damage = damage;
    this.owner = owner;
    this.life = 3;
    this.split = opts.split || false;
    this.homing = opts.homing || false;
    this.bounce = opts.bounce || false;
    this.hasSplit = false; // prevent infinite splits
    this.bounceCount = 0;
    this.maxBounces = opts.maxBounces || 0;
    this.piercing = opts.piercing || false;
    this.pierceCount = 0;
    this.maxPierce = opts.maxPierce || 0;
    // Elemental
    this.fire = opts.fire || false;
    this.ice = opts.ice || false;
    this.lightning = opts.lightning || false;
    this.poison = opts.poison || false;
    this.lightningLevel = opts.lightningLevel || 1;
  }
  reset(x, y, dirX, dirY, speed, damage, owner, opts = {}) {
    this.x = x;
    this.y = y;
    const n = normalize(dirX, dirY);
    this.vx = n.x * speed;
    this.vy = n.y * speed;
    this.baseSpeed = speed; // Store original speed
    this.damage = damage;
    this.owner = owner;
    this.life = 3;
    this.dead = false;
    this.split = opts.split || false;
    this.homing = opts.homing || false;
    this.bounce = opts.bounce || false;
    this.hasSplit = false;
    this.bounceCount = 0;
    this.maxBounces = opts.maxBounces || 0;
    this.piercing = opts.piercing || false;
    this.pierceCount = 0;
    this.maxPierce = opts.maxPierce || 0;
    this.fire = opts.fire || false;
    this.ice = opts.ice || false;
    this.lightning = opts.lightning || false;
    this.poison = opts.poison || false;
    this.lightningLevel = opts.lightningLevel || 1;
  }
  update(dt, world) {
    // Homing: adjust velocity toward nearest enemy
    if (this.homing && this.owner === "player") {
      const target = pickNearest(
        this,
        world.enemies.filter((e) => !e.dead)
      );
      if (target) {
        // Get current speed
        const currentSpeed = Math.hypot(this.vx, this.vy);
        // Use base speed or current speed, whichever is higher (prevents slowdown)
        const targetSpeed = Math.max(currentSpeed, this.baseSpeed);

        // Get direction to target
        const n = normalize(target.x - this.x, target.y - this.y);

        // Get current direction
        const currentDir = normalize(this.vx, this.vy);

        // Calculate angle between current direction and target
        const dotProduct = currentDir.x * n.x + currentDir.y * n.y;

        // Only adjust if not turning more than 90 degrees (prevents 180° turns)
        if (dotProduct > 0) {
          // Gentle turn rate - maintains speed
          this.vx = this.vx * 0.92 + n.x * targetSpeed * 0.08;
          this.vy = this.vy * 0.92 + n.y * targetSpeed * 0.08;

          // Ensure we maintain minimum speed (prevents slowdown)
          const newSpeed = Math.hypot(this.vx, this.vy);
          if (newSpeed < this.baseSpeed * 0.95) {
            const scale = this.baseSpeed / newSpeed;
            this.vx *= scale;
            this.vy *= scale;
          }
        }
      }
      // If no target, bullet continues in current direction at full speed
      // No changes needed - velocity is already set
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;

    // Check obstacle collision
    const obstacleHit = checkObstacleCollision(this.x, this.y, 6, world);
    if (obstacleHit.collided) {
      this.dead = true;
      return;
    }

    // Bounce: bounce off walls
    if (
      this.bounce &&
      this.owner === "player" &&
      this.bounceCount < this.maxBounces
    ) {
      let bounced = false;
      if (this.x < 12 || this.x > world.width - 12) {
        this.vx = -this.vx;
        this.bounceCount++;
        bounced = true;
      }
      if (this.y < 12 || this.y > world.height - 12) {
        this.vy = -this.vy;
        this.bounceCount++;
        bounced = true;
      }
      if (bounced) {
        // Clamp inside bounds with better margin
        this.x = Math.max(12, Math.min(world.width - 12, this.x));
        this.y = Math.max(12, Math.min(world.height - 12, this.y));
      }
    }
    if (this.life <= 0) this.dead = true;

    // collisions
    if (this.owner === "player") {
      for (const e of world.enemies) {
        if (e.dead) continue;
        const dx = e.x - this.x;
        const dy = e.y - this.y;
        const r = e.radius + 6;
        if (dx * dx + dy * dy <= r * r) {
          // Elemental effects with level scaling
          const p = world.player;
          if (this.fire) {
            const level = p.perkLevels?.fire || 1;
            if (level === 1) {
              e.applyStatus("burn", 2.5, 4); // 2.5s, 4dps
            } else {
              e.applyStatus("burn", 4, 7); // 4s, 7dps (Fire II)
            }
          }
          if (this.ice) {
            const level = p.perkLevels?.ice || 1;
            if (level === 1) {
              e.applyStatus("slow", 2.5, 0.5); // 2.5s, 50% slow
            } else {
              e.applyStatus("slow", 4, 0.3); // 4s, 70% slow (Ice II)
            }
          }
          if (this.poison) {
            const level = p.perkLevels?.poison || 1;
            if (level === 1) {
              e.applyStatus("poison", 4, 2); // 4s, 2dps
            } else {
              e.applyStatus("poison", 6, 4); // 6s, 4dps (Poison II)
            }
          }
          if (this.lightning) {
            // Chain to another enemy with level scaling
            const level = p.perkLevels?.lightning || 1;
            const chainCount = level === 1 ? 1 : 2; // Lightning I: 1 chain, Lightning II: 2 chains
            const chainDamage = level === 1 ? 0.7 : 0.85;

            const others = world.enemies.filter((en) => !en.dead && en !== e);
            for (let i = 0; i < chainCount && i < others.length; i++) {
              const chain = pickNearest(
                i === 0 ? e : others[i - 1],
                others.filter((en) => !others.slice(0, i).includes(en))
              );
              if (chain) {
                let proj = world.getProjectile();
                if (!proj) proj = new Projectile(0, 0, 0, 0);
                proj.reset(
                  i === 0 ? e.x : others[i - 1].x,
                  i === 0 ? e.y : others[i - 1].y,
                  chain.x - (i === 0 ? e.x : others[i - 1].x),
                  chain.y - (i === 0 ? e.y : others[i - 1].y),
                  Math.hypot(this.vx, this.vy),
                  this.damage * chainDamage,
                  this.owner,
                  {
                    lightning: false, // Prevent infinite chaining!
                  }
                );
                world.spawnProjectile(proj);
              }
            }
          }
          const killed = e.hit(this.damage);

          // Split on impact
          if (this.split && !this.hasSplit) {
            for (let i = 0; i < 2; i++) {
              const angle =
                Math.atan2(this.vy, this.vx) +
                (i === 0 ? Math.PI / 6 : -Math.PI / 6);
              let proj = world.getProjectile();
              if (!proj) proj = new Projectile(0, 0, 0, 0);
              proj.reset(
                this.x,
                this.y,
                Math.cos(angle),
                Math.sin(angle),
                Math.hypot(this.vx, this.vy),
                this.damage * 0.7,
                this.owner,
                {
                  split: false,
                  homing: this.homing,
                  bounce: this.bounce,
                  maxBounces: this.maxBounces,
                  bounceCount: this.bounceCount,
                  piercing: this.piercing,
                  maxPierce: this.maxPierce,
                  fire: this.fire,
                  ice: this.ice,
                  lightning: this.lightning,
                  poison: this.poison,
                  lightningLevel: this.lightningLevel,
                }
              );
              world.spawnProjectile(proj);
            }
            this.hasSplit = true;
          }

          // Piercing: continue through enemies
          if (this.piercing && this.pierceCount < this.maxPierce) {
            this.pierceCount++;
            // Don't set dead, continue to next enemy
          } else {
            this.dead = true;
          }

          if (killed) {
            // award XP to player and notify wave manager
            world.player.gainXP(1);
            if (world.wave) world.wave.onEnemyKilled();
          }
          break;
        }
      }
    } else if (this.owner === "enemy") {
      const p = world.player;
      const dx = p.x - this.x;
      const dy = p.y - this.y;
      const r = p.radius + 6;
      if (dx * dx + dy * dy <= r * r) {
        // optional: player health later
        // for now just visual effect
        world.effects.push({ t: 0.2, x: this.x, y: this.y });
        this.dead = true;
      }
    }
  }
  draw(ctx, sprites) {
    const rot = Math.atan2(this.vy, this.vx);

    // Draw elemental glow effect
    if (this.fire || this.ice || this.lightning || this.poison) {
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.shadowBlur = 12;
      if (this.fire) {
        ctx.shadowColor = "#ff6b35";
        ctx.fillStyle = "#ff6b35";
      } else if (this.ice) {
        ctx.shadowColor = "#4dd0e1";
        ctx.fillStyle = "#4dd0e1";
      } else if (this.lightning) {
        ctx.shadowColor = "#ffd700";
        ctx.fillStyle = "#ffd700";
      } else if (this.poison) {
        ctx.shadowColor = "#9ccc65";
        ctx.fillStyle = "#9ccc65";
      }
      ctx.beginPath();
      ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    sprites.draw(ctx, "dart", this.x, this.y, 24, rot);
  }
}

export class Player extends Entity {
  constructor(x, y) {
    super(x, y);
    this.radius = 12;
    this.speed = 140; // units per second
    this.fireCooldown = 0;
    this.fireRate = 1.0; // seconds between shots
    this.projectileSpeed = 320;
    this.level = 1;
    this.xp = 0;
    this.xpForNext = 10;
    this.pets = [];
    this.maxHp = 100;
    this.hp = this.maxHp;
  }
  update(dt, world) {
    // movement via joystick
    const v = world.input.getVector();
    this.vx = v.x * this.speed;
    this.vy = v.y * this.speed;

    // Try X movement
    const newX = this.x + this.vx * dt;
    const collisionX = checkObstacleCollision(newX, this.y, this.radius, world);
    if (!collisionX.collided) {
      this.x = newX;
    }

    // Try Y movement
    const newY = this.y + this.vy * dt;
    const collisionY = checkObstacleCollision(this.x, newY, this.radius, world);
    if (!collisionY.collided) {
      this.y = newY;
    }

    // clamp to world bounds with better margins
    this.x = Math.max(
      this.radius + 8,
      Math.min(world.width - this.radius - 8, this.x)
    );
    this.y = Math.max(
      this.radius + 8,
      Math.min(world.height - this.radius - 8, this.y)
    );

    // firing to nearest enemy every 1s
    this.fireCooldown -= dt;
    if (this.fireCooldown <= 0) {
      const target = pickNearest(
        this,
        world.enemies.filter((e) => !e.dead)
      );
      if (target) {
        // Use projectile pool and perks (including elemental)
        let opts = {};
        if (this.perkSplit) opts.split = true;
        if (this.perkHoming) opts.homing = true;
        if (this.perkBounce) {
          opts.bounce = true;
          opts.maxBounces = this.maxBounces || 1;
        }
        if (this.perkPiercing) {
          opts.piercing = true;
          opts.maxPierce = this.maxPierce || 1;
        }
        if (this.perkFire) opts.fire = true;
        if (this.perkIce) opts.ice = true;
        if (this.perkLightning) {
          opts.lightning = true;
          opts.lightningLevel = this.perkLevels?.lightning || 1;
        }
        if (this.perkPoison) opts.poison = true;
        let p = world.getProjectile();
        if (!p) p = new Projectile(0, 0, 0, 0);
        p.reset(
          this.x,
          this.y,
          target.x - this.x,
          target.y - this.y,
          this.projectileSpeed,
          25,
          "player",
          opts
        );
        world.spawnProjectile(p);
        world.effects.push({ t: 0.08, x: this.x, y: this.y });
        this.fireCooldown = this.fireRate;
      }
    }

    // update pets
    for (const pet of this.pets) pet.update(dt, world, this);
  }
  draw(ctx, sprites) {
    sprites.draw(ctx, "player", this.x, this.y, 32);
    for (const pet of this.pets) pet.draw(ctx, sprites);
    // healthbar
    drawHealthbar(ctx, this.x, this.y - 24, 32, this.hp, this.maxHp);
  }

  gainXP(amount) {
    this.xp += amount;
    // handle multiple levels if enough XP
    while (this.xp >= this.xpForNext) {
      this.xp -= this.xpForNext;
      this.level += 1;
      if (this.onLevelUp) this.onLevelUp();
    }
  }
}

export class Enemy extends Entity {
  constructor(x, y) {
    super(x, y);
    this.radius = 12;
    this.speed = 90;
    this.maxHp = 25;
    this.hp = this.maxHp;
    this.state = "cooldown";
    this.timer = 0.5; // start with short wait
    this.fireInterval = 1.6; // slower than player
    // Status effects: {type, timer, value}
    this.status = [];
  }

  hit(dmg) {
    this.hp -= dmg;
    if (this.hp <= 0) {
      this.dead = true;
      return true;
    }
    return false;
  }

  applyStatus(type, duration, value) {
    // If already present, refresh timer
    let s = this.status.find((s) => s.type === type);
    if (s) {
      s.timer = duration;
      s.value = value;
    } else {
      this.status.push({ type, timer: duration, value });
    }
  }

  respawn(x, y) {
    this.x = x;
    this.y = y;
    this.maxHp = 25;
    this.hp = this.maxHp;
    this.dead = false;
    this.state = "cooldown";
    this.timer = this.fireInterval;
  }

  update(dt, world) {
    if (this.dead) return;
    const p = world.player;

    // Status effects
    let speedMod = 1;
    for (let i = this.status.length - 1; i >= 0; i--) {
      const s = this.status[i];
      s.timer -= dt;
      if (s.type === "burn") {
        this.hp -= s.value * dt;
      } else if (s.type === "poison") {
        this.hp -= s.value * dt;
      } else if (s.type === "slow") {
        speedMod *= s.value;
      }
      if (s.timer <= 0) this.status.splice(i, 1);
    }
    if (this.hp <= 0) {
      this.dead = true;
      return;
    }

    switch (this.state) {
      case "cooldown": {
        this.vx = 0;
        this.vy = 0;
        this.timer -= dt;
        if (this.timer <= 0) {
          // fire a dart toward player
          const dirX = p.x - this.x;
          const dirY = p.y - this.y;
          world.spawnProjectile(
            new Projectile(this.x, this.y, dirX, dirY, 240, 25, "enemy")
          );
          world.effects.push({ t: 0.08, x: this.x, y: this.y });
          // then move closer for 1s
          this.state = "chase";
          this.timer = 1.0;
        }
        break;
      }
      case "chase": {
        // move toward player for 1 second
        const n = normalize(p.x - this.x, p.y - this.y);
        this.vx = n.x * this.speed * 0.8 * speedMod;
        this.vy = n.y * this.speed * 0.8 * speedMod;

        // Try X movement with obstacle check
        const newX = this.x + this.vx * dt;
        const collisionX = checkObstacleCollision(
          newX,
          this.y,
          this.radius,
          world
        );
        if (!collisionX.collided) {
          this.x = newX;
        }

        // Try Y movement with obstacle check
        const newY = this.y + this.vy * dt;
        const collisionY = checkObstacleCollision(
          this.x,
          newY,
          this.radius,
          world
        );
        if (!collisionY.collided) {
          this.y = newY;
        }

        this.timer -= dt;
        if (this.timer <= 0) {
          this.state = "cooldown";
          this.timer = this.fireInterval;
        }
        break;
      }
    }

    // bounds
    this.x = Math.max(this.radius, Math.min(world.width - this.radius, this.x));
    this.y = Math.max(
      this.radius,
      Math.min(world.height - this.radius, this.y)
    );
  }

  draw(ctx, sprites) {
    sprites.draw(ctx, "enemy", this.x, this.y, 32);
    drawHealthbar(ctx, this.x, this.y - 22, 28, this.hp, this.maxHp);
  }
}

// A simple pet companion that orbits the player and fires slowly at enemies
export class Pet extends Entity {
  constructor(offsetAngle = 0) {
    super(0, 0);
    this.radius = 8;
    this.orbitR = 28;
    this.angle = offsetAngle;
    this.fireCooldown = 0;
    this.fireRate = 1.8; // slower than player
    this.maxHp = 30;
    this.hp = this.maxHp;
  }
  update(dt, world, player) {
    // orbit around player
    this.angle += dt * 1.2;
    this.x = player.x + Math.cos(this.angle) * (player.radius + this.orbitR);
    this.y = player.y + Math.sin(this.angle) * (player.radius + this.orbitR);

    // fire
    this.fireCooldown -= dt;
    if (this.fireCooldown <= 0) {
      const target = pickNearest(
        this,
        world.enemies.filter((e) => !e.dead)
      );
      if (target) {
        // Use projectile pool and perks (including elemental)
        let opts = {};
        if (player.perkSplit) opts.split = true;
        if (player.perkHoming) opts.homing = true;
        if (player.perkBounce) {
          opts.bounce = true;
          opts.maxBounces = player.maxBounces || 1;
        }
        if (player.perkPiercing) {
          opts.piercing = true;
          opts.maxPierce = player.maxPierce || 1;
        }
        if (player.perkFire) opts.fire = true;
        if (player.perkIce) opts.ice = true;
        if (player.perkLightning) {
          opts.lightning = true;
          opts.lightningLevel = player.perkLevels?.lightning || 1;
        }
        if (player.perkPoison) opts.poison = true;
        let p = world.getProjectile();
        if (!p) p = new Projectile(0, 0, 0, 0);
        p.reset(
          this.x,
          this.y,
          target.x - this.x,
          target.y - this.y,
          280,
          20,
          "player",
          opts
        );
        world.spawnProjectile(p);
        world.effects.push({ t: 0.06, x: this.x, y: this.y });
        this.fireCooldown = this.fireRate;
      }
    }
  }
  draw(ctx, sprites) {
    // reuse player sprite smaller for pet
    sprites.draw(ctx, "player", this.x, this.y, 20);
    drawHealthbar(ctx, this.x, this.y - 18, 18, this.hp, this.maxHp);
  }
}

function drawHealthbar(ctx, x, y, width, hp, maxHp) {
  ctx.save();
  const h = 4;
  const pad = 1;
  const w = width;
  // background
  ctx.fillStyle = "#111827";
  ctx.fillRect(x - w / 2, y, w, h);
  // border
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 1;
  ctx.strokeRect(x - w / 2 + 0.5, y + 0.5, w - 1, h - 1);
  // fill
  const ratio = Math.max(0, Math.min(1, hp / maxHp));
  ctx.fillStyle =
    ratio > 0.5 ? "#22c55e" : ratio > 0.25 ? "#f59e0b" : "#ef4444";
  ctx.fillRect(x - w / 2 + pad, y + pad, (w - pad * 2) * ratio, h - pad * 2);
  ctx.restore();
}

// --- New Enemy Types ---

// Fast, low-HP enemy
export class FastEnemy extends Enemy {
  constructor(x, y) {
    super(x, y);
    this.speed = 160;
    this.maxHp = 15;
    this.hp = this.maxHp;
    this.radius = 10;
    this.fireInterval = 2.0;
    this.enemyType = "fast";
  }

  draw(ctx, sprites) {
    // Draw with slight red tint
    ctx.save();
    ctx.globalAlpha = 0.8;
    sprites.draw(ctx, "enemy", this.x, this.y, 28);
    ctx.restore();
    drawHealthbar(ctx, this.x, this.y - 20, 24, this.hp, this.maxHp);
  }
}

// Tanky, slow enemy
export class TankEnemy extends Enemy {
  constructor(x, y) {
    super(x, y);
    this.speed = 50;
    this.maxHp = 60;
    this.hp = this.maxHp;
    this.radius = 16;
    this.fireInterval = 2.5;
    this.enemyType = "tank";
  }

  draw(ctx, sprites) {
    // Draw larger
    sprites.draw(ctx, "enemy", this.x, this.y, 40);
    drawHealthbar(ctx, this.x, this.y - 26, 36, this.hp, this.maxHp);
  }
}

// Splits into 2 smaller enemies on death
export class SplitterEnemy extends Enemy {
  constructor(x, y, isSplit = false) {
    super(x, y);
    this.speed = 100;
    this.maxHp = isSplit ? 12 : 30;
    this.hp = this.maxHp;
    this.radius = isSplit ? 10 : 14;
    this.fireInterval = 1.8;
    this.isSplit = isSplit;
    this.enemyType = "splitter";
  }

  hit(dmg) {
    this.hp -= dmg;
    if (this.hp <= 0) {
      this.dead = true;
      return true;
    }
    return false;
  }

  draw(ctx, sprites) {
    const size = this.isSplit ? 26 : 34;
    ctx.save();
    ctx.globalAlpha = this.isSplit ? 0.7 : 1;
    sprites.draw(ctx, "enemy", this.x, this.y, size);
    ctx.restore();
    drawHealthbar(
      ctx,
      this.x,
      this.y - (this.isSplit ? 18 : 22),
      this.isSplit ? 24 : 30,
      this.hp,
      this.maxHp
    );
  }
}
