// Virtual joystick that appears wherever the user touches/drags
export class VirtualJoystick {
  constructor(canvas) {
    this.canvas = canvas;
    this.active = false;
    this.start = { x: 0, y: 0 };
    this.pos = { x: 0, y: 0 };
    this.vec = { x: 0, y: 0 };
    this.radius = 64; // logical pixels

    // Bind events for both touch and mouse
    canvas.addEventListener("pointerdown", this.onDown, { passive: false });
    canvas.addEventListener("pointermove", this.onMove, { passive: false });
    canvas.addEventListener("pointerup", this.onUp, { passive: false });
    canvas.addEventListener("pointercancel", this.onUp, { passive: false });
    canvas.addEventListener("lostpointercapture", this.onUp, {
      passive: false,
    });
  }

  screenToCanvas(x, y) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return { x: (x - rect.left) * scaleX, y: (y - rect.top) * scaleY };
  }

  onDown = (e) => {
    e.preventDefault();
    this.canvas.setPointerCapture(e.pointerId);
    const p = this.screenToCanvas(e.clientX, e.clientY);
    this.start = { x: p.x, y: p.y };
    this.pos = { x: p.x, y: p.y };
    this.active = true;
    this.vec = { x: 0, y: 0 };
  };

  onMove = (e) => {
    if (!this.active) return;
    e.preventDefault();
    const p = this.screenToCanvas(e.clientX, e.clientY);
    this.pos = p;
    let dx = p.x - this.start.x;
    let dy = p.y - this.start.y;
    const len = Math.hypot(dx, dy);
    const max = this.radius;
    if (len > max) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
    }
    this.vec = { x: dx / max, y: dy / max };
  };

  onUp = (e) => {
    if (!this.active) return;
    e.preventDefault();
    this.active = false;
    this.vec = { x: 0, y: 0 };
  };

  getVector() {
    return this.vec;
  }

  draw(ctx) {
    if (!this.active) return;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "#1f2937";
    ctx.beginPath();
    ctx.arc(this.start.x, this.start.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.8;
    ctx.fillStyle = "#93c5fd";
    ctx.beginPath();
    ctx.arc(
      this.start.x + this.vec.x * this.radius,
      this.start.y + this.vec.y * this.radius,
      24,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();
  }
}
