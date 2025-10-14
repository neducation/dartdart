import { angleTo, normalize, pickNearest } from "./utils.js";

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
  constructor(x, y, dirX, dirY, speed = 260, damage = 25, owner = "player") {
    super(x, y);
    const n = normalize(dirX, dirY);
    this.vx = n.x * speed;
    this.vy = n.y * speed;
    this.damage = damage;
    this.owner = owner;
    this.life = 3; // seconds
  }
  update(dt, world) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;

    // collisions
    if (this.owner === "player") {
      for (const e of world.enemies) {
        if (e.dead) continue;
        const dx = e.x - this.x;
        const dy = e.y - this.y;
        const r = e.radius + 6;
        if (dx * dx + dy * dy <= r * r) {
          const killed = e.hit(this.damage);
          this.dead = true;
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
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // clamp to world bounds
    this.x = Math.max(this.radius, Math.min(world.width - this.radius, this.x));
    this.y = Math.max(
      this.radius,
      Math.min(world.height - this.radius, this.y)
    );

    // firing to nearest enemy every 1s
    this.fireCooldown -= dt;
    if (this.fireCooldown <= 0) {
      const target = pickNearest(
        this,
        world.enemies.filter((e) => !e.dead)
      );
      if (target) {
        world.spawnProjectile(
          new Projectile(
            this.x,
            this.y,
            target.x - this.x,
            target.y - this.y,
            this.projectileSpeed,
            25,
            "player"
          )
        );
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
  }

  hit(dmg) {
    this.hp -= dmg;
    if (this.hp <= 0) {
      this.dead = true;
      return true;
    }
    return false;
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
        this.vx = n.x * this.speed * 0.8;
        this.vy = n.y * this.speed * 0.8;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
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
        world.spawnProjectile(
          new Projectile(
        drawHealthbar(ctx, this.x, this.y - 18, 18, this.hp, this.maxHp);
            this.x,
            this.y,

    function drawHealthbar(ctx, x, y, width, hp, maxHp) {
      ctx.save();
      const h = 4;
      const pad = 1;
      const w = width;
      // background
      ctx.fillStyle = '#111827';
      ctx.fillRect(x - w/2, y, w, h);
      // border
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.strokeRect(x - w/2 + 0.5, y + 0.5, w - 1, h - 1);
      // fill
      const ratio = Math.max(0, Math.min(1, hp / maxHp));
      ctx.fillStyle = ratio > 0.5 ? '#22c55e' : (ratio > 0.25 ? '#f59e0b' : '#ef4444');
      ctx.fillRect(x - w/2 + pad, y + pad, (w - pad*2) * ratio, h - pad*2);
      ctx.restore();
    }
            target.x - this.x,
            target.y - this.y,
            280,
            20,
            "player"
          )
        );
        world.effects.push({ t: 0.06, x: this.x, y: this.y });
        this.fireCooldown = this.fireRate;
      }
    }
  }
  draw(ctx, sprites) {
    // reuse player sprite smaller for pet
    sprites.draw(ctx, "player", this.x, this.y, 20);
  }
}
