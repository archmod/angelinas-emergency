import { arc, circle, ellipse, line, roundRect, shade, tint, type Ctx } from './canvas';

/** Character frames are FRAME×FRAME source px, drawn facing +x, displayed at 0.5 scale. */
export const FRAME = 96;
export const WALK_FRAMES = 4;

const OUTLINE = '#22262f';

/** Walk-cycle swing in [-1, 1] for frame k (frame 0 = neutral). */
const swingOf = (frame: number): number => (frame === 0 ? 0 : Math.sin((frame / WALK_FRAMES) * Math.PI * 2));

function shadow(ctx: Ctx, cx: number, cy: number, rx = 26, ry = 28): void {
  ellipse(ctx, cx - 1, cy + 2, rx, ry, 'rgba(0,0,0,0.16)');
}

function eye(ctx: Ctx, x: number, y: number, r: number, outline: string, lookX = 1.5): void {
  circle(ctx, x, y, r, '#ffffff', { stroke: outline, lineWidth: 1.8 });
  circle(ctx, x + lookX, y, r * 0.5, '#151515');
  circle(ctx, x + lookX + r * 0.15, y - r * 0.2, r * 0.16, '#ffffff');
}

/**
 * Angelina: half Dora (brown bob with bangs, pink shirt, orange shorts, purple backpack),
 * half frog (green skin, big bulging eyes on top of the head, wide smile, three-toed feet).
 */
export function drawAngelina(ctx: Ctx, ox: number, oy: number, frame: number): void {
  const cx = ox + FRAME / 2;
  const cy = oy + FRAME / 2;
  const s = swingOf(frame) * 7;
  const skin = '#7ed957';
  const skinDark = '#2f6b1f';
  const hair = '#5a3a22';
  const shirt = '#ff5fa2';

  shadow(ctx, cx, cy);
  // frog feet (behind, alternate)
  const foot = (x: number, y: number) => {
    ellipse(ctx, x, y, 9, 5.5, skin, { stroke: skinDark, lineWidth: 1.8 });
    for (const dy of [-4, 0, 4]) circle(ctx, x + 8, y + dy, 2.2, skin, { stroke: skinDark, lineWidth: 1.2 });
  };
  foot(cx - 10 + s, cy - 18);
  foot(cx - 10 - s, cy + 18);
  // orange shorts peeking out behind the shirt
  ellipse(ctx, cx - 6, cy, 16, 21, '#ff9a3c', { stroke: OUTLINE, lineWidth: 2 });
  // backpack (Dora's Backpack) — purple, on her back (behind = -x)
  roundRect(ctx, cx - 34, cy - 15, 22, 30, 7, shade(ctx, cx - 25, cy - 3, 20, '#a86cf0', '#6f3bbf'), { stroke: '#4a2585', lineWidth: 2 });
  roundRect(ctx, cx - 30, cy - 10, 10, 20, 4, '#5c2f9a');
  // straps to shoulders
  line(ctx, cx - 16, cy - 16, cx - 4, cy - 20, '#5c2f9a', 4);
  line(ctx, cx - 16, cy + 16, cx - 4, cy + 20, '#5c2f9a', 4);
  // pink shirt (shoulders/torso seen from above)
  ellipse(ctx, cx - 2, cy, 20, 25, shade(ctx, cx - 2, cy, 24, '#ff8ec2', shirt), { stroke: OUTLINE, lineWidth: 2 });
  // arms/hands (green) swinging
  circle(ctx, cx + 8 + s, cy - 25, 7, skin, { stroke: skinDark, lineWidth: 1.8 });
  circle(ctx, cx + 8 - s, cy + 25, 7, skin, { stroke: skinDark, lineWidth: 1.8 });
  // head (green frog skin)
  circle(ctx, cx + 3, cy, 21, shade(ctx, cx + 3, cy, 21, '#9ce67a', skin), { stroke: skinDark, lineWidth: 2.4 });
  // Dora bob: hair covers the back/sides of the head; zig-zag bangs edge leaves the green face showing
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx + 1, cy, 22, 0, Math.PI * 2);
  ctx.clip();
  ctx.beginPath();
  ctx.moveTo(cx - 30, cy - 30);
  ctx.lineTo(cx + 2, cy - 30);
  for (let i = 0; i <= 6; i++) {
    const y = cy - 24 + i * 8;
    ctx.lineTo(cx + 2 + (i % 2 === 0 ? 4 : -2), y);
  }
  ctx.lineTo(cx + 2, cy + 30);
  ctx.lineTo(cx - 30, cy + 30);
  ctx.closePath();
  ctx.fillStyle = shade(ctx, cx - 4, cy, 24, '#7a4f2e', hair);
  ctx.fill();
  ctx.restore();
  // hair outline + a couple of strands
  arc(ctx, cx + 1, cy, 22, Math.PI * 0.55, Math.PI * 1.45, tint(hair, 0.6), 2);
  line(ctx, cx - 10, cy - 12, cx - 2, cy - 12, tint(hair, 0.7), 1.5);
  line(ctx, cx - 10, cy + 12, cx - 2, cy + 12, tint(hair, 0.7), 1.5);
  // wide frog smile on the front of the face
  arc(ctx, cx + 11, cy, 9, -Math.PI * 0.4, Math.PI * 0.4, skinDark, 2.2);
  // big frog eyes bulging out the front-top of the head
  eye(ctx, cx + 16, cy - 12, 8.5, skinDark, 2.2);
  eye(ctx, cx + 16, cy + 12, 8.5, skinDark, 2.2);
}

export type HairStyle = 'short' | 'bob' | 'bun' | 'headband' | 'curlers' | 'bald';
export type HatStyle = 'none' | 'ranger' | 'cap';
export type Accessory = 'none' | 'glasses' | 'sash' | 'bag' | 'badge' | 'mop';

export interface PersonLook {
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  shirt: string;
  hat: HatStyle;
  hatColor?: string;
  accessory: Accessory;
  accent?: string;
}

/** Generic top-down person (enemies), facing +x, with a 4-frame walk swing. */
export function drawPerson(ctx: Ctx, ox: number, oy: number, frame: number, look: PersonLook): void {
  const cx = ox + FRAME / 2;
  const cy = oy + FRAME / 2;
  const s = swingOf(frame) * 7;
  const skinDark = tint(look.skin, 0.55);
  const HEAD = 17;
  shadow(ctx, cx, cy, 24, 28);
  // shoes
  ellipse(ctx, cx - 12 + s, cy - 17, 8, 5, '#2b2b33', { stroke: OUTLINE, lineWidth: 1.5 });
  ellipse(ctx, cx - 12 - s, cy + 17, 8, 5, '#2b2b33', { stroke: OUTLINE, lineWidth: 1.5 });
  // torso (shirt colour is a big part of each archetype's identity, so keep it visible around the head)
  ellipse(ctx, cx - 3, cy, 21, 27, shade(ctx, cx - 3, cy, 26, tint(look.shirt, 1.25), look.shirt), { stroke: OUTLINE, lineWidth: 2 });
  if (look.accessory === 'sash') line(ctx, cx - 16, cy - 18, cx + 8, cy + 20, look.accent ?? '#ff9a3c', 6, 'butt');
  if (look.accessory === 'bag') roundRect(ctx, cx - 18, cy + 12, 16, 16, 3, look.accent ?? '#3d6fb8', { stroke: OUTLINE, lineWidth: 1.5 });
  if (look.accessory === 'badge') circle(ctx, cx + 6, cy - 17, 3.5, '#ffd166', { stroke: '#8a6d1a', lineWidth: 1.2 });
  // hands
  circle(ctx, cx + 9 + s, cy - 25, 6.5, look.skin, { stroke: skinDark, lineWidth: 1.6 });
  circle(ctx, cx + 9 - s, cy + 25, 6.5, look.skin, { stroke: skinDark, lineWidth: 1.6 });
  if (look.accessory === 'mop') {
    line(ctx, cx + 9 - s, cy + 25, cx + 34, cy + 22, '#8b6b3d', 4);
    ellipse(ctx, cx + 36, cy + 22, 5, 9, '#d8d3c4', { stroke: '#8a8577', lineWidth: 1.4 });
  }
  // head
  circle(ctx, cx + 3, cy, HEAD, shade(ctx, cx + 3, cy, HEAD, tint(look.skin, 1.15), look.skin), { stroke: skinDark, lineWidth: 2.2 });
  // hair
  const hairFill = shade(ctx, cx - 2, cy, 19, tint(look.hair, 1.3), look.hair);
  const hairOutline = tint(look.hair, 0.55);
  switch (look.hairStyle) {
    case 'short':
      ellipse(ctx, cx - 2, cy, 14, 17, hairFill, { stroke: hairOutline, lineWidth: 1.8 });
      break;
    case 'bob':
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx + 1, cy, 18, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = hairFill;
      ctx.fillRect(cx - 22, cy - 22, 25, 44);
      ctx.restore();
      arc(ctx, cx + 1, cy, 18, Math.PI * 0.55, Math.PI * 1.45, hairOutline, 2);
      break;
    case 'bun':
      ellipse(ctx, cx - 1, cy, 13, 16, hairFill, { stroke: hairOutline, lineWidth: 1.8 });
      circle(ctx, cx - 15, cy, 7.5, hairFill, { stroke: hairOutline, lineWidth: 1.8 });
      break;
    case 'headband':
      ellipse(ctx, cx - 2, cy, 14, 17, hairFill, { stroke: hairOutline, lineWidth: 1.8 });
      roundRect(ctx, cx + 8, cy - 17, 6, 34, 2, look.accent ?? '#ff5a5a', { stroke: OUTLINE, lineWidth: 1.2 });
      break;
    case 'curlers':
      ellipse(ctx, cx - 2, cy, 14, 17, hairFill, { stroke: hairOutline, lineWidth: 1.8 });
      for (const [dx, dy] of [
        [-9, -9],
        [-9, 9],
        [1, -12],
        [1, 12],
        [-1, 0],
        [-12, 0],
      ] as const) {
        roundRect(ctx, cx + dx - 4, cy + dy - 3, 8, 6, 3, look.accent ?? '#ff9ad5', { stroke: '#a04f86', lineWidth: 1 });
      }
      break;
    case 'bald':
      break;
  }
  // hats
  let eyeX = cx + 14;
  if (look.hat === 'ranger') {
    // wide-brim hat over the shoulders, crown with a thin band; eyes peek out in front of the brim
    const hc = look.hatColor ?? '#b89b5a';
    circle(ctx, cx - 1, cy, 21, shade(ctx, cx - 1, cy, 21, tint(hc, 1.15), hc), { stroke: tint(hc, 0.55), lineWidth: 2 });
    circle(ctx, cx, cy, 12, shade(ctx, cx, cy, 12, tint(hc, 1.1), tint(hc, 0.9)), { stroke: tint(hc, 0.55), lineWidth: 1.8 });
    line(ctx, cx - 1, cy - 11, cx - 1, cy + 11, '#5a3a22', 3, 'butt');
    eyeX = cx + 20;
  } else if (look.hat === 'cap') {
    // cap covers the back of the head; visor sticks out over the forehead
    const hc = look.hatColor ?? '#3d6fb8';
    roundRect(ctx, cx + 10, cy - 14, 12, 28, 4, tint(hc, 0.85), { stroke: tint(hc, 0.5), lineWidth: 1.8 });
    circle(ctx, cx - 2, cy, 16, shade(ctx, cx - 2, cy, 16, tint(hc, 1.2), hc), { stroke: tint(hc, 0.55), lineWidth: 2 });
    circle(ctx, cx - 2, cy, 3, tint(hc, 0.6));
    eyeX = cx + 16;
  }
  // eyes (people: smaller than the frog's)
  eye(ctx, eyeX, cy - 7, 4.6, OUTLINE, 1.1);
  eye(ctx, eyeX, cy + 7, 4.6, OUTLINE, 1.1);
  if (look.accessory === 'glasses') {
    circle(ctx, eyeX, cy - 7, 6, 'rgba(255,255,255,0)', { stroke: '#2b2b33', lineWidth: 1.8 });
    circle(ctx, eyeX, cy + 7, 6, 'rgba(255,255,255,0)', { stroke: '#2b2b33', lineWidth: 1.8 });
    line(ctx, eyeX, cy - 1, eyeX, cy + 1, '#2b2b33', 1.8);
  }
  // mouth (not under a hat brim)
  if (look.hat !== 'ranger') arc(ctx, eyeX - 1, cy, 5.5, -Math.PI * 0.35, Math.PI * 0.35, skinDark, 1.6);
}

/** Top-down dog facing +x: body, head with snout and floppy ears, four legs, tail. */
export function drawDog(ctx: Ctx, ox: number, oy: number, frame: number, fur = '#d2a86a'): void {
  const cx = ox + FRAME / 2;
  const cy = oy + FRAME / 2;
  const s = swingOf(frame) * 6;
  const dark = tint(fur, 0.55);
  const ear = tint(fur, 0.6);
  shadow(ctx, cx, cy, 30, 20);
  // tail
  ctx.beginPath();
  ctx.moveTo(cx - 24, cy);
  ctx.quadraticCurveTo(cx - 36, cy - 4, cx - 34, cy - 16);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.stroke();
  // legs (front pair swings opposite to back pair)
  ellipse(ctx, cx + 4 + s, cy - 15, 5, 8, fur, { stroke: dark, lineWidth: 1.5 });
  ellipse(ctx, cx + 4 - s, cy + 15, 5, 8, fur, { stroke: dark, lineWidth: 1.5 });
  ellipse(ctx, cx - 16 - s, cy - 14, 5, 8, fur, { stroke: dark, lineWidth: 1.5 });
  ellipse(ctx, cx - 16 + s, cy + 14, 5, 8, fur, { stroke: dark, lineWidth: 1.5 });
  // body
  ellipse(ctx, cx - 6, cy, 22, 13, shade(ctx, cx - 6, cy, 20, tint(fur, 1.15), fur), { stroke: dark, lineWidth: 2 });
  // collar
  arc(ctx, cx + 8, cy, 11, -Math.PI * 0.55, Math.PI * 0.55, '#d63b3b', 3.5);
  // ears (floppy, hang at the sides of the head)
  ellipse(ctx, cx + 10, cy - 14, 6, 10, ear, { stroke: dark, lineWidth: 1.6, rotation: -0.3 });
  ellipse(ctx, cx + 10, cy + 14, 6, 10, ear, { stroke: dark, lineWidth: 1.6, rotation: 0.3 });
  // head + snout
  circle(ctx, cx + 14, cy, 13, shade(ctx, cx + 14, cy, 13, tint(fur, 1.15), fur), { stroke: dark, lineWidth: 2 });
  ellipse(ctx, cx + 25, cy, 8, 6, tint(fur, 1.25), { stroke: dark, lineWidth: 1.6 });
  circle(ctx, cx + 31, cy, 3, '#1c1c1c');
  // eyes
  circle(ctx, cx + 17, cy - 6, 2.4, '#1c1c1c');
  circle(ctx, cx + 17, cy + 6, 2.4, '#1c1c1c');
  circle(ctx, cx + 17.7, cy - 6.6, 0.8, '#ffffff');
  circle(ctx, cx + 17.7, cy + 5.4, 0.8, '#ffffff');
}

/** Wall-mounted security camera seen from above, lens toward +x. */
export function drawCamera(ctx: Ctx, ox: number, oy: number): void {
  const cx = ox + FRAME / 2;
  const cy = oy + FRAME / 2;
  shadow(ctx, cx, cy, 22, 16);
  circle(ctx, cx - 16, cy, 9, '#6b7280', { stroke: '#2b2f38', lineWidth: 2 });
  roundRect(ctx, cx - 18, cy - 4, 14, 8, 3, '#4b5160', { stroke: '#2b2f38', lineWidth: 1.5 });
  roundRect(ctx, cx - 10, cy - 10, 30, 20, 5, shade(ctx, cx + 4, cy, 22, '#8a93a6', '#4b5160'), { stroke: '#2b2f38', lineWidth: 2 });
  circle(ctx, cx + 20, cy, 9, '#2b2f38', { stroke: '#1a1d24', lineWidth: 2 });
  circle(ctx, cx + 20, cy, 6, shade(ctx, cx + 20, cy, 6, '#9fd3ff', '#2f6fa8'));
  circle(ctx, cx + 22, cy - 2, 1.6, '#ffffff');
  circle(ctx, cx - 4, cy - 6, 2.2, '#ff3b3b');
}

/** Emoji-style cartoon poop with a cheeky face. Source 64×64, displayed at 0.5. */
export function drawPoop(ctx: Ctx, ox: number, oy: number, opts: { face?: boolean; size?: number } = {}): void {
  const size = opts.size ?? 64;
  const k = size / 64;
  const cx = ox + size / 2;
  const base = oy + size * 0.5;
  const fill = (x: number, y: number, r: number) => shade(ctx, x, y, r, '#b8794a', '#6b3f1f');
  const outline = '#3f2412';
  ellipse(ctx, cx, base + 22 * k, 24 * k, 8 * k, 'rgba(0,0,0,0.18)');
  // three lobes + curly tip
  ellipse(ctx, cx, base + 14 * k, 25 * k, 14 * k, fill(cx, base + 14 * k, 25 * k), { stroke: outline, lineWidth: 2.2 * k });
  ellipse(ctx, cx, base + 2 * k, 18 * k, 12 * k, fill(cx, base + 2 * k, 18 * k), { stroke: outline, lineWidth: 2.2 * k });
  ellipse(ctx, cx, base - 9 * k, 12 * k, 9 * k, fill(cx, base - 9 * k, 12 * k), { stroke: outline, lineWidth: 2.2 * k });
  ctx.beginPath();
  ctx.moveTo(cx - 6 * k, base - 15 * k);
  ctx.quadraticCurveTo(cx - 2 * k, base - 30 * k, cx + 12 * k, base - 24 * k);
  ctx.quadraticCurveTo(cx + 6 * k, base - 22 * k, cx + 6 * k, base - 15 * k);
  ctx.closePath();
  ctx.fillStyle = fill(cx, base - 22 * k, 12 * k);
  ctx.fill();
  ctx.lineWidth = 2.2 * k;
  ctx.strokeStyle = outline;
  ctx.stroke();
  // shine
  ellipse(ctx, cx - 10 * k, base + 8 * k, 6 * k, 3 * k, 'rgba(255,255,255,0.28)', { rotation: -0.5 });
  ellipse(ctx, cx - 7 * k, base - 3 * k, 4 * k, 2 * k, 'rgba(255,255,255,0.28)', { rotation: -0.5 });
  if (opts.face !== false) {
    eye(ctx, cx - 8 * k, base + 8 * k, 6 * k, outline, 1.5 * k);
    eye(ctx, cx + 8 * k, base + 8 * k, 6 * k, outline, 1.5 * k);
    arc(ctx, cx, base + 12 * k, 8 * k, Math.PI * 0.15, Math.PI * 0.85, outline, 2.2 * k);
    ellipse(ctx, cx, base + 20 * k, 3.5 * k, 2 * k, '#e05a6a');
    ellipse(ctx, cx - 17 * k, base + 14 * k, 4 * k, 2.5 * k, 'rgba(255,120,150,0.45)');
    ellipse(ctx, cx + 17 * k, base + 14 * k, 4 * k, 2.5 * k, 'rgba(255,120,150,0.45)');
  }
}

/** Three wavy stink lines (drawn light so they read on grass and floor). Source 48×48. */
export function drawStink(ctx: Ctx, ox: number, oy: number): void {
  ctx.lineCap = 'round';
  for (const [x, phase] of [
    [12, 0],
    [24, 1],
    [36, 0.5],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(ox + x, oy + 44);
    for (let i = 1; i <= 4; i++) {
      const y = oy + 44 - i * 9;
      const dx = Math.sin(i * 1.6 + phase) * 4;
      ctx.lineTo(ox + x + dx, y);
    }
    ctx.strokeStyle = 'rgba(214, 240, 160, 0.9)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(90, 120, 40, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

/** Fart puff (64×64): a soft radial gas cloud, pale green-yellow fading to nothing at the rim. */
export function drawPuff(ctx: Ctx, ox: number, oy: number): void {
  const g = ctx.createRadialGradient(ox + 32, oy + 32, 2, ox + 32, oy + 32, 32);
  g.addColorStop(0, 'rgba(226, 244, 170, 0.95)');
  g.addColorStop(0.45, 'rgba(184, 224, 120, 0.7)');
  g.addColorStop(1, 'rgba(140, 190, 90, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(ox, oy, 64, 64);
  // a few darker wisps so it reads as gas, not a glow
  ctx.strokeStyle = 'rgba(90, 120, 40, 0.35)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (const [x0, y0, x1, y1] of [
    [20, 40, 30, 26],
    [34, 44, 42, 30],
    [26, 22, 38, 18],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(ox + x0, oy + y0);
    ctx.quadraticCurveTo(ox + (x0 + x1) / 2 + 5, oy + (y0 + y1) / 2, ox + x1, oy + y1);
    ctx.stroke();
  }
}

/** Zone markers (64×64): a soft rounded square with a faint poop silhouette (spots) or a door arrow (exit). */
export function drawSpot(ctx: Ctx, ox: number, oy: number, kind: 'hidden' | 'exposed' | 'exit'): void {
  const color = kind === 'hidden' ? '#7ee787' : kind === 'exposed' ? '#ffd166' : '#7ab6ff';
  ctx.save();
  ctx.globalAlpha = 0.28;
  roundRect(ctx, ox + 4, oy + 4, 56, 56, 12, color);
  ctx.restore();
  ctx.save();
  if (kind === 'exposed') ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.roundRect(ox + 4, oy + 4, 56, 56, 12);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.9;
  ctx.stroke();
  ctx.restore();
  if (kind === 'exit') {
    ctx.save();
    ctx.globalAlpha = 0.9;
    roundRect(ctx, ox + 18, oy + 14, 22, 36, 4, '#ffffff', { stroke: '#2b4f7a', lineWidth: 2 });
    circle(ctx, ox + 35, oy + 33, 2.5, '#2b4f7a');
    ctx.restore();
  } else {
    ctx.save();
    ctx.globalAlpha = 0.35;
    drawPoop(ctx, ox + 14, oy + 12, { face: false, size: 36 });
    ctx.restore();
  }
}

/**
 * Objective pin (SPOT_PIN_W×SPOT_PIN_H, tip at the bottom centre): a map-pin teardrop in Angelina pink with a
 * poop silhouette in the head. Bobs above every required (must-go) spot until it's used.
 */
export function drawSpotPin(ctx: Ctx, ox: number, oy: number, w: number, h: number): void {
  const cx = ox + w / 2;
  const r = w * 0.42;
  const cy = oy + r + 3;
  const fill = '#ff7ab6';
  const outline = '#3f2412';
  ctx.save();
  // teardrop: circle head + triangle to the tip
  ctx.beginPath();
  ctx.moveTo(cx, oy + h - 2);
  ctx.lineTo(cx - r * 0.72, cy + r * 0.62);
  ctx.arc(cx, cy, r, Math.PI * 0.75, Math.PI * 2.25, false);
  ctx.closePath();
  ctx.fillStyle = shade(ctx, cx - r * 0.3, cy - r * 0.3, r * 1.4, '#ffa9d1', fill);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = outline;
  ctx.lineJoin = 'round';
  ctx.stroke();
  // white disc with the poop mark
  circle(ctx, cx, cy, r * 0.66, '#fff1d6');
  drawPoop(ctx, cx - r * 0.5, cy - r * 0.55, { face: false, size: r });
  ctx.restore();
}

/** "Done" badge (SPOT_DONE_SIZE square): frog-green disc with a cream check mark; replaces a spot's pin once it's spent. */
export function drawSpotDone(ctx: Ctx, ox: number, oy: number, size: number): void {
  const cx = ox + size / 2;
  const cy = oy + size / 2;
  const r = size / 2 - 3;
  circle(ctx, cx, cy, r, shade(ctx, cx - r * 0.3, cy - r * 0.3, r * 1.4, '#a8ef85', '#5aa83a'), { stroke: '#3f2412', lineWidth: 3 });
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#fff1d6';
  ctx.lineWidth = Math.max(3, size * 0.14);
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.5, cy + r * 0.02);
  ctx.lineTo(cx - r * 0.12, cy + r * 0.42);
  ctx.lineTo(cx + r * 0.55, cy - r * 0.42);
  ctx.stroke();
  ctx.restore();
}

/**
 * Frog footprint silhouette (heel pad + three toes) pointing up (-y), single flat colour, in a w×h box.
 * Used for the tiptoe trail on the menu and the faint background pattern; mirror with flipX for the other foot.
 */
export function drawFootprint(ctx: Ctx, ox: number, oy: number, w: number, h: number, fill: string): void {
  const cx = ox + w / 2;
  const k = Math.min(w / 64, h / 80);
  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = fill;
  ctx.lineCap = 'round';
  // heel/sole pad
  ellipse(ctx, cx, oy + h - 26 * k, 16 * k, 22 * k, fill);
  // toes: tapered stalks from the sole ending in round pads
  for (const [dx, dy, r] of [
    [-21, 22, 8],
    [0, 11, 9],
    [21, 22, 8],
  ] as const) {
    line(ctx, cx + dx * 0.4 * k, oy + h - 40 * k, cx + dx * k, oy + dy * k + 4 * k, fill, 8 * k);
    circle(ctx, cx + dx * k, oy + dy * k, r * k, fill);
  }
  ctx.restore();
}

/**
 * Big cartoon frog foot seen from above, toes up (-y), in a w×h box (default 160×220 proportions):
 * green skin with cartoon shading, webbing between the toes, dark outline. `smear` adds a bit of poop she stepped in.
 */
export function drawFrogFoot(ctx: Ctx, ox: number, oy: number, w: number, h: number, opts: { smear?: boolean } = {}): void {
  const k = Math.min(w / 160, h / 220);
  const cx = ox + w / 2;
  const skin = '#7ed957';
  const skinDark = '#2f6b1f';
  const light = '#a8ef85';
  const soleY = oy + h - 70 * k;
  const toes: Array<[number, number, number]> = [
    [-52, 62, 20], // [dx, padY (from top), pad radius]
    [0, 26, 23],
    [52, 62, 20],
  ];
  // webbing between the toes (drawn first, behind everything)
  ctx.beginPath();
  ctx.moveTo(cx - 40 * k, soleY);
  for (const [dx, dy] of toes) ctx.lineTo(cx + dx * k, oy + dy * k + 8 * k);
  ctx.lineTo(cx + 40 * k, soleY);
  ctx.closePath();
  ctx.fillStyle = shade(ctx, cx, soleY - 40 * k, 60 * k, light, skin);
  ctx.fill();
  ctx.lineWidth = 3 * k;
  ctx.strokeStyle = skinDark;
  ctx.stroke();
  // toes: stalk + pad
  for (const [dx, dy, r] of toes) {
    ctx.beginPath();
    ctx.moveTo(cx + dx * 0.35 * k, soleY);
    ctx.lineTo(cx + dx * k, oy + dy * k);
    ctx.lineWidth = 30 * k;
    ctx.lineCap = 'round';
    ctx.strokeStyle = skinDark;
    ctx.stroke();
    ctx.lineWidth = 24 * k;
    ctx.strokeStyle = skin;
    ctx.stroke();
    circle(ctx, cx + dx * k, oy + dy * k, r * k, shade(ctx, cx + dx * k, oy + dy * k, r * k, light, skin), { stroke: skinDark, lineWidth: 3 * k });
    // toe-pad shine
    ellipse(ctx, cx + dx * k - r * 0.3 * k, oy + dy * k - r * 0.35 * k, r * 0.35 * k, r * 0.2 * k, 'rgba(255,255,255,0.35)', { rotation: -0.6 });
  }
  // sole (heel) — overlaps the toe stalks
  ellipse(ctx, cx, soleY + 22 * k, 46 * k, 58 * k, shade(ctx, cx, soleY + 10 * k, 60 * k, light, skin), { stroke: skinDark, lineWidth: 3.5 * k });
  ellipse(ctx, cx - 14 * k, soleY, 12 * k, 20 * k, 'rgba(255,255,255,0.22)', { rotation: 0.3 });
  if (opts.smear) {
    // stepped in it: a brown splat on the outer edge of the sole with a couple of drips
    const sx = cx + 30 * k;
    const sy = soleY - 26 * k;
    const brown = shade(ctx, sx, sy, 24 * k, '#b8794a', '#6b3f1f');
    ellipse(ctx, sx, sy, 24 * k, 15 * k, brown, { stroke: '#3f2412', lineWidth: 2.5 * k, rotation: -0.6 });
    circle(ctx, sx + 16 * k, sy + 16 * k, 7 * k, brown, { stroke: '#3f2412', lineWidth: 2 * k });
    circle(ctx, sx - 18 * k, sy + 14 * k, 5 * k, brown, { stroke: '#3f2412', lineWidth: 2 * k });
    circle(ctx, sx + 4 * k, sy + 24 * k, 4 * k, brown, { stroke: '#3f2412', lineWidth: 2 * k });
    ellipse(ctx, sx - 8 * k, sy - 5 * k, 6 * k, 3 * k, 'rgba(255,255,255,0.28)', { rotation: -0.5 });
  }
}

/**
 * Joshau — Angelina's boyfriend, front view, peeking up over an edge (fingers gripping it) with a raised eyebrow and a
 * smirk. In a w×h box (default 200×150 proportions); the "edge" he grips is at 83% of the height so the scene can hide
 * everything below it off-screen. Eyes look to the left (toward Angelina).
 */
export function drawJoshau(ctx: Ctx, ox: number, oy: number, w: number, h: number): void {
  const k = Math.min(w / 200, h / 150);
  const cx = ox + w / 2;
  const skin = '#f1c27d';
  const skinDark = '#a9773f';
  const hair = '#4a3222';
  const edge = oy + 124 * k;
  // head
  circle(ctx, cx, oy + 82 * k, 50 * k, shade(ctx, cx, oy + 82 * k, 50 * k, '#f8d9a4', skin), { stroke: skinDark, lineWidth: 3 * k });
  // ears
  circle(ctx, cx - 50 * k, oy + 88 * k, 9 * k, skin, { stroke: skinDark, lineWidth: 2.5 * k });
  circle(ctx, cx + 50 * k, oy + 88 * k, 9 * k, skin, { stroke: skinDark, lineWidth: 2.5 * k });
  // short spiky brown hair
  ctx.beginPath();
  ctx.moveTo(cx - 52 * k, oy + 62 * k);
  ctx.quadraticCurveTo(cx - 54 * k, oy + 30 * k, cx - 30 * k, oy + 30 * k);
  for (const [x, y] of [
    [-38, 14],
    [-20, 30],
    [-8, 10],
    [8, 30],
    [22, 12],
    [34, 30],
    [46, 22],
  ] as const) {
    ctx.lineTo(cx + x * k, oy + y * k);
  }
  ctx.quadraticCurveTo(cx + 54 * k, oy + 40 * k, cx + 52 * k, oy + 62 * k);
  ctx.quadraticCurveTo(cx, oy + 40 * k, cx - 52 * k, oy + 62 * k);
  ctx.closePath();
  ctx.fillStyle = shade(ctx, cx - 10 * k, oy + 36 * k, 60 * k, '#7a4f2e', hair);
  ctx.fill();
  ctx.lineWidth = 3 * k;
  ctx.strokeStyle = tint(hair, 0.6);
  ctx.stroke();
  // eyes: big, pupils sliding left (toward Angelina), one eyebrow arched high, the other pressed down = suspicious
  eye(ctx, cx - 20 * k, oy + 84 * k, 12 * k, skinDark, -5 * k);
  eye(ctx, cx + 20 * k, oy + 84 * k, 12 * k, skinDark, -5 * k);
  line(ctx, cx - 36 * k, oy + 60 * k, cx - 6 * k, oy + 66 * k, hair, 5 * k);
  line(ctx, cx + 6 * k, oy + 74 * k, cx + 36 * k, oy + 70 * k, hair, 5 * k);
  // nose + smirk
  arc(ctx, cx + 2 * k, oy + 96 * k, 5 * k, Math.PI * 0.1, Math.PI * 0.9, skinDark, 2.5 * k);
  ctx.beginPath();
  ctx.moveTo(cx - 12 * k, oy + 112 * k);
  ctx.quadraticCurveTo(cx + 4 * k, oy + 120 * k, cx + 16 * k, oy + 108 * k);
  ctx.strokeStyle = skinDark;
  ctx.lineWidth = 3 * k;
  ctx.lineCap = 'round';
  ctx.stroke();
  // hands gripping the edge (fingers curl over it)
  for (const hx of [cx - 62 * k, cx + 62 * k]) {
    ellipse(ctx, hx, edge + 6 * k, 20 * k, 14 * k, skin, { stroke: skinDark, lineWidth: 2.5 * k });
    for (const dx of [-13, -4, 5, 14]) circle(ctx, hx + dx * k, edge - 4 * k, 6 * k, skin, { stroke: skinDark, lineWidth: 2 * k });
  }
}
