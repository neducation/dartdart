export class SpriteSheet {
  constructor(img, tileW = 16, tileH = 16) {
    this.img = img;
    this.tileW = tileW;
    this.tileH = tileH;
    this.map = {
      player: { x: 0, y: 0 },
      enemy: { x: 16, y: 0 },
      dart: { x: 32, y: 0 },
      muzzle: { x: 48, y: 0 },
    };
  }

  draw(ctx, name, x, y, size = 32, rotation = 0) {
    const s = this.map[name];
    if (!s) return;
    ctx.save();
    ctx.translate(x, y);
    if (rotation) ctx.rotate(rotation);
    const scale = size / this.tileW;
    ctx.drawImage(
      this.img,
      s.x,
      s.y,
      this.tileW,
      this.tileH,
      (-this.tileW * scale) / 2,
      (-this.tileH * scale) / 2,
      this.tileW * scale,
      this.tileH * scale
    );
    ctx.restore();
  }
}

export async function loadSpriteSheet(url) {
  const img = new Image();
  img.src = url;
  await img.decode();
  return new SpriteSheet(img);
}
