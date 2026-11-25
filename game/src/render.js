// Warung Rasa — every pixel the player sees, drawn in code. No image files.

import {
  VIEW_W, VIEW_H, PALETTE, INGREDIENTS, PANTRY_ORDER, SHIFT_SECONDS,
  COOK_SECONDS, BURN_AFTER_SECONDS,
} from './config.js';
import { STATIONS, pantryBinRect } from './stations.js';
import { plateCompleteness, plateServesAnyOrder, orderProgress } from './world.js';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, s, x, y, size, color, weight = 'bold', align = 'left') {
  ctx.fillStyle = color;
  ctx.font = weight + ' ' + size + 'px "Trebuchet MS", Verdana, sans-serif';
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, x, y);
}

// --- Food icons, one small drawing per ingredient ---

export function drawIngredient(ctx, id, x, y, s, state = 'raw') {
  ctx.save();
  ctx.translate(x, y);
  const u = s / 48; // unit scale
  ctx.lineWidth = 2 * u;
  ctx.strokeStyle = 'rgba(46,33,24,0.55)';
  if (id === 'rice') {
    ctx.fillStyle = '#f3e2b8';
    ctx.beginPath(); ctx.ellipse(0, 6 * u, 20 * u, 9 * u, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff8e6';
    ctx.beginPath(); ctx.ellipse(0, 0, 16 * u, 11 * u, 0, Math.PI, 0); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e8c98f';
    for (const dx of [-8, 0, 8]) { ctx.beginPath(); ctx.arc(dx * u, -2 * u, 1.6 * u, 0, Math.PI * 2); ctx.fill(); }
    if (state === 'cooked') { ctx.fillStyle = '#f2b705'; ctx.beginPath(); ctx.arc(10 * u, -8 * u, 3 * u, 0, Math.PI * 2); ctx.fill(); }
  } else if (id === 'noodle') {
    ctx.strokeStyle = '#d9a441';
    ctx.lineWidth = 4 * u;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      ctx.moveTo(-16 * u, (-6 + i * 7) * u);
      ctx.bezierCurveTo(-6 * u, (-12 + i * 7) * u, 6 * u, (0 + i * 7) * u, 16 * u, (-6 + i * 7) * u);
    }
    ctx.stroke();
    ctx.strokeStyle = '#b98a1e'; ctx.lineWidth = 2 * u;
    ctx.beginPath(); ctx.ellipse(0, 4 * u, 20 * u, 10 * u, 0, 0, Math.PI * 2); ctx.stroke();
  } else if (id === 'chicken') {
    ctx.fillStyle = '#e08a4e';
    ctx.beginPath(); ctx.ellipse(-2 * u, -2 * u, 13 * u, 11 * u, -0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f7d9b0';
    ctx.beginPath(); ctx.ellipse(-6 * u, -5 * u, 7 * u, 5 * u, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#f7e9d2'; ctx.lineWidth = 4 * u;
    ctx.beginPath(); ctx.moveTo(8 * u, 6 * u); ctx.lineTo(18 * u, 14 * u); ctx.stroke();
    ctx.fillStyle = '#fff3d6';
    ctx.beginPath(); ctx.arc(19 * u, 15 * u, 3.5 * u, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(15 * u, 18 * u, 3 * u, 0, Math.PI * 2); ctx.fill();
  } else if (id === 'egg') {
    ctx.fillStyle = '#fff6e0';
    ctx.beginPath(); ctx.ellipse(0, 0, 20 * u, 15 * u, 0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f2b705';
    ctx.beginPath(); ctx.arc(2 * u, 0, 8 * u, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d98e04';
    ctx.beginPath(); ctx.arc(4 * u, -2 * u, 3 * u, 0, Math.PI * 2); ctx.fill();
  } else if (id === 'veg') {
    ctx.fillStyle = '#3e9b4f';
    for (const a of [0, 1.2, 2.4, 3.6, 4.8]) {
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * 10 * u, Math.sin(a) * 8 * u, 9 * u, 5 * u, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#7ddb8a';
    ctx.beginPath(); ctx.arc(0, 0, 6 * u, 0, Math.PI * 2); ctx.fill();
  } else if (id === 'chili') {
    ctx.fillStyle = '#e23b2e';
    ctx.beginPath();
    ctx.moveTo(-14 * u, -6 * u);
    ctx.quadraticCurveTo(0, -18 * u, 16 * u, 2 * u);
    ctx.quadraticCurveTo(4 * u, 12 * u, -14 * u, -6 * u);
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 3 * u;
    ctx.beginPath(); ctx.moveTo(14 * u, 0); ctx.quadraticCurveTo(20 * u, -6 * u, 18 * u, -12 * u); ctx.stroke();
  }
  if (state === 'chopped') {
    // A knife-cut mark: two small diagonal lines over the food.
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2.5 * u;
    ctx.beginPath(); ctx.moveTo(-8 * u, -10 * u); ctx.lineTo(8 * u, 8 * u); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8 * u, -10 * u); ctx.lineTo(-8 * u, 8 * u); ctx.stroke();
  }
  if (state === 'cooked') {
    ctx.fillStyle = 'rgba(242,183,5,0.9)';
    ctx.beginPath(); ctx.arc(-14 * u, -12 * u, 2.5 * u, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(14 * u, -12 * u, 2.5 * u, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawStateTag(ctx, item, x, y) {
  const label = item.burnt ? 'GOSONG' : item.state === 'chopped' ? 'CINCANG' : item.state === 'cooked' ? 'MATANG' : item.state === 'cooking' ? 'MASAK…' : 'MENTAH';
  const color = item.burnt ? '#d33f2e' : item.state === 'cooked' ? '#3e9b4f' : '#8a5a2b';
  ctx.save();
  ctx.fillStyle = color;
  rr(ctx, x - 26, y - 9, 52, 15, 7);
  ctx.fill();
  text(ctx, label, x, y + 3, 9, '#fff', 'bold', 'center');
  ctx.restore();
}

// --- Kitchen ---

function drawFloor(ctx) {
  ctx.fillStyle = PALETTE.wall;
  ctx.fillRect(0, 0, VIEW_W, 108);
  ctx.fillStyle = PALETTE.wallTrim;
  ctx.fillRect(0, 100, VIEW_W, 8);
  ctx.fillStyle = '#c96f3f';
  ctx.fillRect(0, 108, VIEW_W, VIEW_H - 108);
  ctx.strokeStyle = PALETTE.floorLine;
  ctx.lineWidth = 1;
  for (let y = 150; y < VIEW_H; y += 46) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VIEW_W, y); ctx.stroke();
  }
  for (let x = 0; x < VIEW_W; x += 64) {
    ctx.beginPath(); ctx.moveTo(x, 108); ctx.lineTo(x, VIEW_H); ctx.stroke();
  }
}

function drawCounter(ctx, s, highlight, hideLabel) {
  ctx.save();
  if (highlight) {
    ctx.shadowColor = '#f2b705';
    ctx.shadowBlur = 18;
  }
  ctx.fillStyle = PALETTE.counterEdge;
  rr(ctx, s.x - 4, s.y - 4, s.w + 8, s.h + 8, 10);
  ctx.fill();
  ctx.fillStyle = PALETTE.counterTop;
  rr(ctx, s.x, s.y, s.w, s.h, 8);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = PALETTE.counterWood;
  ctx.fillRect(s.x + 8, s.y + s.h - 26, s.w - 16, 18);
  if (!hideLabel) text(ctx, s.label.toUpperCase(), s.x + s.w / 2, s.y + s.h - 10, 12, '#ffe9c0', 'bold', 'center');
  ctx.restore();
}

function drawPantry(ctx, world, highlight) {
  const s = STATIONS.pantry;
  drawCounter(ctx, s, highlight);
  PANTRY_ORDER.forEach((id, i) => {
    const bin = pantryBinRect(i);
    ctx.fillStyle = '#fff8e6';
    rr(ctx, bin.x, bin.y, bin.w, bin.h, 6);
    ctx.fill();
    ctx.strokeStyle = '#d9b96a';
    ctx.lineWidth = 2;
    ctx.stroke();
    drawIngredient(ctx, id, bin.x + bin.w / 2, bin.y + bin.h / 2 - 2, 30);
    text(ctx, INGREDIENTS[id].key, bin.x + 6, bin.y + 13, 10, '#8a5a2b', 'bold');
  });
}

function drawBoard(ctx, world, highlight) {
  const s = STATIONS.board;
  const item = world.board.item;
  drawCounter(ctx, s, highlight, !!item);
  ctx.fillStyle = '#f7e8c9';
  rr(ctx, s.x + 30, s.y + 14, s.w - 60, 62, 8);
  ctx.fill();
  ctx.strokeStyle = '#d9b96a';
  ctx.lineWidth = 2;
  ctx.stroke();
  if (item) {
    drawIngredient(ctx, item.ingredient, s.x + s.w / 2, s.y + 42, 44, item.state);
    if (item.state === 'raw') {
      text(ctx, 'Cincang: ' + item.chops + '/' + 3, s.x + s.w / 2, s.y + 96, 12, '#2e2118', 'bold', 'center');
      // Chop progress pips.
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i < item.chops ? '#3e9b4f' : '#d9c48f';
        ctx.beginPath(); ctx.arc(s.x + s.w / 2 - 18 + i * 18, s.y + 108, 6, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      drawStateTag(ctx, item, s.x + s.w / 2, s.y + 100);
    }
  } else {
    text(ctx, 'Letakkan bahan,', s.x + s.w / 2, s.y + 40, 11, '#8a5a2b', 'bold', 'center');
    text(ctx, 'tekan E 3x', s.x + s.w / 2, s.y + 56, 11, '#8a5a2b', 'bold', 'center');
  }
}

function drawStove(ctx, world, highlight) {
  const s = STATIONS.stove;
  drawCounter(ctx, s, highlight);
  world.burners.forEach((burner, i) => {
    const bx = s.x + 30 + i * 150;
    const by = s.y + 16;
    ctx.fillStyle = PALETTE.steel;
    ctx.beginPath(); ctx.ellipse(bx + 60, by + 34, 58, 30, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.steelLight;
    ctx.beginPath(); ctx.ellipse(bx + 60, by + 30, 52, 26, 0, 0, Math.PI * 2); ctx.fill();
    const item = burner.item;
    if (item) {
      if (item.burnt) {
        ctx.fillStyle = '#1c1c1c';
        ctx.beginPath(); ctx.ellipse(bx + 60, by + 30, 40, 18, 0, 0, Math.PI * 2); ctx.fill();
        text(ctx, 'GOSONG!', bx + 60, by + 8, 13, '#ff8a7a', 'bold', 'center');
        text(ctx, 'BUANG KE SAMPAH', bx + 60, by + 66, 11, '#ff8a7a', 'bold', 'center');
        ctx.fillStyle = 'rgba(120,120,120,0.7)';
        ctx.beginPath(); ctx.arc(bx + 40, by - 6, 7, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(bx + 62, by - 14, 9, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(bx + 82, by - 4, 6, 0, Math.PI * 2); ctx.fill();
        return;
      }
      drawIngredient(ctx, item.ingredient, bx + 60, by + 28, 40, item.state);
      // Cook ring: fills while cooking, drains while a finished pan waits.
      const frac = item.state === 'cooking'
        ? item.cook / COOK_SECONDS
        : item.state === 'cooked'
          ? 1 - Math.max(0, (item.cook - COOK_SECONDS) / BURN_AFTER_SECONDS)
          : 0;
      ctx.strokeStyle = item.state === 'cooked' && item.cook > COOK_SECONDS + BURN_AFTER_SECONDS - 3 ? '#d33f2e' : '#f2b705';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(bx + 60, by + 30, 46, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
      ctx.stroke();
      if (item.state === 'cooked') text(ctx, 'MATANG — AMBIL!', bx + 60, by + 66, 11, '#7ddb8a', 'bold', 'center');
      else if (item.state === 'cooking') text(ctx, Math.ceil(COOK_SECONDS - item.cook) + ' dtk', bx + 60, by + 66, 11, '#fff3d6', 'bold', 'center');
    } else {
      text(ctx, 'Kompor ' + (i + 1), bx + 60, by + 34, 12, '#d9d9d9', 'bold', 'center');
    }
  });
}

function drawPass(ctx, world, highlight) {
  const s = STATIONS.pass;
  drawCounter(ctx, s, highlight);
  world.plates.forEach((plate, i) => {
    const px = s.x + 24 + i * 150;
    const py = s.y + 18;
    const readyIdx = plateServesAnyOrder(world, i);
    if (readyIdx !== -1) {
      ctx.save();
      ctx.shadowColor = '#f2b705';
      ctx.shadowBlur = 22;
      ctx.fillStyle = '#fff8e6';
      ctx.beginPath(); ctx.ellipse(px + 55, py + 34, 58, 30, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.fillStyle = 'rgba(46,33,24,0.85)';
      rr(ctx, px + 12, py + 62, 86, 18, 9);
      ctx.fill();
      text(ctx, 'SIAP SAJI!', px + 55, py + 75, 12, '#f2b705', 'bold', 'center');
    } else {
      ctx.fillStyle = '#fff8e6';
      ctx.beginPath(); ctx.ellipse(px + 55, py + 34, 58, 30, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#d9b96a';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    plate.items.forEach((item, j) => {
      drawIngredient(ctx, item.ingredient, px + 22 + j * 36, py + 34, 30, item.state);
    });
    if (plate.items.length === 0) text(ctx, 'Piring ' + (i + 1), px + 55, py + 38, 11, '#b09a6a', 'bold', 'center');
  });
}

function drawTrash(ctx, highlight) {
  const s = STATIONS.trash;
  ctx.save();
  if (highlight) { ctx.shadowColor = '#f2b705'; ctx.shadowBlur = 16; }
  ctx.fillStyle = '#5a6068';
  rr(ctx, s.x, s.y, s.w, s.h, 8);
  ctx.fill();
  ctx.shadowBlur = 0;
  text(ctx, 'SAMPAH', s.x + s.w / 2, s.y + s.h / 2 + 5, 13, '#fff', 'bold', 'center');
  ctx.restore();
}

// --- Chef ---

function drawChef(ctx, world) {
  const chef = world.chef;
  const bob = chef.moving ? Math.sin(chef.bob) * 3 : 0;
  const x = chef.x;
  const y = chef.y + bob;
  ctx.save();
  ctx.translate(x, y);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(0, 26, 22, 7, 0, 0, Math.PI * 2); ctx.fill();
  // Legs.
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(-12, 12, 9, 14);
  ctx.fillRect(3, 12, 9, 14);
  // Apron body.
  ctx.fillStyle = '#fff8e6';
  rr(ctx, -18, -12, 36, 28, 10);
  ctx.fill();
  ctx.fillStyle = '#1f7a6d';
  ctx.fillRect(-18, -12, 36, 8);
  // Arms.
  ctx.fillStyle = '#f7c99b';
  ctx.beginPath(); ctx.arc(-20, 2, 6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(20, 2, 6, 0, Math.PI * 2); ctx.fill();
  // Head.
  ctx.fillStyle = '#f7c99b';
  ctx.beginPath(); ctx.arc(0, -24, 15, 0, Math.PI * 2); ctx.fill();
  // Chef hat.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(-8, -36, 8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -40, 9, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(8, -36, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(-13, -38, 26, 8);
  // Face.
  ctx.fillStyle = '#2e2118';
  const look = chef.dir * 2;
  ctx.beginPath(); ctx.arc(-5 + look, -24, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(5 + look, -24, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2e2118';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(look, -19, 4, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  ctx.restore();
  // Carried items float above the hat.
  chef.carry.forEach((item, i) => {
    const cx = x - (chef.carry.length - 1) * 18 + i * 36;
    const cy = y - 58;
    ctx.fillStyle = 'rgba(255,248,230,0.95)';
    ctx.beginPath(); ctx.arc(cx, cy, 17, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#d9b96a';
    ctx.lineWidth = 2;
    ctx.stroke();
    drawIngredient(ctx, item.ingredient, cx, cy, 26, item.state);
  });
}

// --- Order board and HUD ---

function drawOrders(ctx, world) {
  const startX = 246;
  world.orders.forEach((order, i) => {
    const x = startX + i * 206;
    const y = 8;
    const w = 198;
    const h = 84;
    const frac = orderProgress(order);
    const urgent = order.timeLeft <= 12;
    ctx.save();
    if (urgent && Math.floor(world.elapsed * 3) % 2 === 0) {
      ctx.shadowColor = '#d33f2e';
      ctx.shadowBlur = 14;
    }
    ctx.fillStyle = PALETTE.ticket;
    rr(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = urgent ? '#d33f2e' : PALETTE.ticketEdge;
    ctx.lineWidth = urgent ? 3 : 2;
    ctx.stroke();
    text(ctx, '#' + order.id + ' ' + order.name, x + 10, y + 20, 14, PALETTE.ink, 'bold');
    text(ctx, order.blurb, x + 10, y + 36, 10, '#8a6d3b', 'bold');
    order.needs.forEach((need, j) => {
      drawIngredient(ctx, need.ingredient, x + 24 + j * 34, y + 54, 26, need.state);
    });
    // Countdown bar.
    const barW = w - 20;
    ctx.fillStyle = '#e8dcc0';
    rr(ctx, x + 10, y + 70, barW, 9, 4);
    ctx.fill();
    ctx.fillStyle = frac > 0.5 ? '#3e9b4f' : frac > 0.25 ? '#f2b705' : '#d33f2e';
    if (frac > 0) {
      rr(ctx, x + 10, y + 70, Math.max(9, barW * frac), 9, 4);
      ctx.fill();
    }
    text(ctx, Math.ceil(order.timeLeft) + ' dtk', x + w - 8, y + 20, 12, urgent ? '#d33f2e' : '#8a6d3b', 'bold', 'right');
    ctx.restore();
  });
  if (world.orders.length === 0) {
    text(ctx, 'Belum ada pesanan…', startX + 10, 50, 14, '#8a6d3b', 'bold');
  }
}

function drawHud(ctx, world) {
  // Left panel: title, shift clock, hearts. Right panel: coins and score.
  ctx.fillStyle = 'rgba(46,33,24,0.55)';
  rr(ctx, 8, 6, 230, 90, 10);
  ctx.fill();
  rr(ctx, 1062, 6, 210, 90, 10);
  ctx.fill();
  // Left: title, shift clock, hearts.
  text(ctx, 'WARUNG RASA', 16, 26, 20, '#fff3d6', 'bold');
  const remain = Math.max(0, SHIFT_SECONDS - world.elapsed);
  const mm = Math.floor(remain / 60);
  const ss = String(Math.floor(remain % 60)).padStart(2, '0');
  text(ctx, 'Shift: ' + mm + ':' + ss, 16, 50, 14, '#ffe9c0', 'bold');
  ctx.fillStyle = '#e8dcc0';
  rr(ctx, 16, 58, 200, 8, 4);
  ctx.fill();
  ctx.fillStyle = '#f2b705';
  rr(ctx, 16, 58, Math.max(8, 200 * (remain / SHIFT_SECONDS)), 8, 4);
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < world.hearts ? '#d33f2e' : 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    const hx = 26 + i * 26;
    const hy = 82;
    ctx.moveTo(hx, hy + 6);
    ctx.bezierCurveTo(hx - 9, hy - 3, hx - 5, hy - 10, hx, hy - 4);
    ctx.bezierCurveTo(hx + 5, hy - 10, hx + 9, hy - 3, hx, hy + 6);
    ctx.fill();
  }
  // Right: coins, served, combo.
  text(ctx, '🪙 ' + world.coins + ' koin', 1264, 26, 18, '#f2b705', 'bold', 'right');
  text(ctx, 'Tersaji: ' + world.served + '   Kombo x' + world.combo, 1264, 50, 13, '#ffe9c0', 'bold', 'right');
  text(ctx, 'M: suara  •  P: jeda', 1264, 72, 11, '#d9c48f', 'bold', 'right');
}

function drawToasts(ctx, world) {
  world.toasts.forEach((t, i) => {
    ctx.save();
    ctx.globalAlpha = Math.min(1, t.life);
    ctx.fillStyle = 'rgba(46,33,24,0.85)';
    const w = ctx.measureText(t.text).width + 120;
    rr(ctx, 640 - 160, 660 - i * 28, 320, 22, 11);
    ctx.fill();
    text(ctx, t.text, 640, 676 - i * 28, 13, t.color, 'bold', 'center');
    ctx.restore();
  });
}

function drawFloaters(ctx, world) {
  for (const f of world.floaters) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, f.life);
    text(ctx, f.text, f.x, f.y, 18, f.color, 'bold', 'center');
    ctx.restore();
  }
}

function drawHintBar(ctx) {
  ctx.fillStyle = 'rgba(46,33,24,0.55)';
  ctx.fillRect(0, 700, VIEW_W, 20);
  text(
    ctx,
    'WASD / panah: jalan   •   E: pakai stasiun   •   1-6: ambil bahan   •   Klik: pantry, talenan, kompor, piring   •   Q: buang bawaan',
    640, 714, 12, '#fff3d6', 'bold', 'center',
  );
}

// --- Screens ---

function drawTitle(ctx, world) {
  ctx.fillStyle = 'rgba(46,33,24,0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = PALETTE.ticket;
  rr(ctx, 340, 110, 600, 440, 16);
  ctx.fill();
  ctx.strokeStyle = PALETTE.ticketEdge;
  ctx.lineWidth = 3;
  ctx.stroke();
  text(ctx, 'WARUNG RASA', 640, 180, 52, '#8a5a2b', 'bold', 'center');
  text(ctx, 'Dapur kaki lima paling sibuk di kota', 640, 214, 18, '#a04e28', 'bold', 'center');
  text(ctx, 'Pesanan datang di papan atas. Ambil bahan dari pantry,', 640, 262, 16, PALETTE.ink, 'bold', 'center');
  text(ctx, 'cincang di talenan, masak di kompor, sajikan di meja saji.', 640, 286, 16, PALETTE.ink, 'bold', 'center');
  text(ctx, 'Jangan biarkan masakan gosong — dan jangan biarkan', 640, 310, 16, PALETTE.ink, 'bold', 'center');
  text(ctx, 'pelanggan menunggu terlalu lama!', 640, 334, 16, PALETTE.ink, 'bold', 'center');
  ctx.fillStyle = '#3e9b4f';
  rr(ctx, 490, 370, 300, 56, 12);
  ctx.fill();
  text(ctx, 'MULAI SHIFT  ▶', 640, 406, 22, '#fff', 'bold', 'center');
  text(ctx, 'Enter / klik untuk mulai  •  3 menit, 5 resep, makin lama makin ramai', 640, 470, 13, '#8a6d3b', 'bold', 'center');
  text(ctx, 'Resep hari ini: Nasi Goreng, Mie Goreng, Sate Ayam,', 640, 500, 13, '#8a6d3b', 'bold', 'center');
  text(ctx, 'Gado-Gado, Soto Ayam', 640, 522, 13, '#8a6d3b', 'bold', 'center');
}

function drawEnd(ctx, world) {
  ctx.fillStyle = 'rgba(46,33,24,0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = PALETTE.ticket;
  rr(ctx, 360, 130, 560, 420, 16);
  ctx.fill();
  ctx.strokeStyle = PALETTE.ticketEdge;
  ctx.lineWidth = 3;
  ctx.stroke();
  text(ctx, 'SHIFT SELESAI', 640, 196, 40, '#8a5a2b', 'bold', 'center');
  text(ctx, world.endReason, 640, 228, 15, '#a04e28', 'bold', 'center');
  let stars = '';
  for (let i = 0; i < 3; i++) stars += i < world.endStars ? '★' : '☆';
  text(ctx, stars, 640, 292, 44, '#f2b705', 'bold', 'center');
  text(ctx, 'Koin: ' + world.coins + '   •   Tersaji: ' + world.served + ' piring', 640, 340, 20, PALETTE.ink, 'bold', 'center');
  text(ctx, 'Kombo terbaik: x' + world.bestCombo + '   •   Tip: ' + world.stats.tips + ' koin', 640, 372, 16, '#8a6d3b', 'bold', 'center');
  text(ctx, 'Cincang: ' + world.stats.chopped + '   •   Masak: ' + world.stats.cooked + '   •   Gosong: ' + world.stats.burnt, 640, 400, 16, '#8a6d3b', 'bold', 'center');
  ctx.fillStyle = '#3e9b4f';
  rr(ctx, 490, 430, 300, 52, 12);
  ctx.fill();
  text(ctx, 'MAIN LAGI  (R)', 640, 464, 20, '#fff', 'bold', 'center');
  text(ctx, 'Terima kasih sudah masak di Warung Rasa!', 640, 516, 13, '#8a6d3b', 'bold', 'center');
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(46,33,24,0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  text(ctx, 'JEDA — tekan P untuk lanjut', 640, 360, 32, '#fff3d6', 'bold', 'center');
}

export function drawGame(ctx, world, highlightStation) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawFloor(ctx);
  drawPantry(ctx, world, highlightStation === 'pantry');
  drawBoard(ctx, world, highlightStation === 'board');
  drawStove(ctx, world, highlightStation === 'stove');
  drawPass(ctx, world, highlightStation === 'pass');
  drawTrash(ctx, highlightStation === 'trash');
  if (world.mode !== 'title') drawChef(ctx, world);
  drawOrders(ctx, world);
  drawHud(ctx, world);
  drawToasts(ctx, world);
  drawFloaters(ctx, world);
  drawHintBar(ctx);
  if (world.mode === 'title') drawTitle(ctx, world);
  if (world.mode === 'end') drawEnd(ctx, world);
  if (world.paused) drawPaused(ctx);
}
