import { now } from "./utils.js";

export class Engine {
  constructor(update, render) {
    this.update = update;
    this.render = render;
    this.accum = 0;
    this.last = now();
    this.dt = 1000 / 60; // 60Hz fixed update
    this.running = false;
  }

  start() {
    if (this.running) return;
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      const t = now();
      let frame = t - this.last;
      if (frame > 1000) frame = this.dt; // safari tab resume guard
      this.last = t;
      this.accum += frame;
      while (this.accum >= this.dt) {
        this.update(this.dt / 1000);
        this.accum -= this.dt;
      }
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
  }
}
