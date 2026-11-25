// Warung Rasa — boot, game loop, and turning input into station actions.

import { VIEW_W, VIEW_H, PANTRY_ORDER, SHIFT_SECONDS } from './config.js';
import { createWorld, startShift, updateWorld, plateServesAnyOrder, serveOrder } from './world.js';
import { createInput, consumePressed, consumeClicks, moveVector } from './input.js';
import { moveChef, chefCarryCount } from './chef.js';
import {
  STATIONS, pantryBinRect, stationAtPoint, nearestStation,
  pantryPick, boardInteract, boardTake, stoveInteract, plateInteract,
  trashInteract, interactNearest,
} from './stations.js';
import { drawGame } from './render.js';
import { worldForShot } from './shots.js';
import {
  unlockAudio, toggleMute, isMuted, playClick, playPop, playCoin, playDing,
  playOrderArrive, playError, setSizzleLevel,
} from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || '7') || 7;

const sounds = {
  orderArrive: playOrderArrive,
  ding: playDing,
  error: playError,
  coin: playCoin,
};

let world;
if (shotName) {
  world = worldForShot(shotName, seed);
} else {
  world = createWorld(seed);
}

function toGameCoords(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left) * (VIEW_W / rect.width),
    y: (clientY - rect.top) * (VIEW_H / rect.height),
  };
}

const input = createInput(canvas, toGameCoords);

function fitCanvas() {
  const scale = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  canvas.style.width = Math.floor(VIEW_W * scale) + 'px';
  canvas.style.height = Math.floor(VIEW_H * scale) + 'px';
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

function burnerRect(i) {
  const s = STATIONS.stove;
  return { x: s.x + 30 + i * 150, y: s.y + 16, w: 120, h: 68 };
}

function plateRect(i) {
  const s = STATIONS.pass;
  return { x: s.x + 24 + i * 150, y: s.y + 18, w: 110, h: 68 };
}

function pointIn(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function handleClick(x, y) {
  unlockAudio();
  if (world.mode === 'title') {
    playClick();
    startShift(world);
    return;
  }
  if (world.mode === 'end') {
    if (x >= 490 && x <= 790 && y >= 430 && y <= 482) {
      playClick();
      startShift(world);
    }
    return;
  }
  if (world.paused) return;

  // Order ticket: serve it if a plate already matches it.
  for (let i = 0; i < world.orders.length; i++) {
    const tx = 246 + i * 206;
    if (x >= tx && x <= tx + 198 && y >= 8 && y <= 92) {
      for (let p = 0; p < world.plates.length; p++) {
        if (plateServesAnyOrder(world, p) === i) {
          serveOrder(world, i, p);
          playCoin();
          playDing();
          return;
        }
      }
      playError();
      world.toasts.push({ text: 'Belum ada piring yang cocok', color: '#ffd27d', life: 1.4 });
      return;
    }
  }

  // Pantry bins.
  for (let i = 0; i < PANTRY_ORDER.length; i++) {
    if (pointIn(pantryBinRect(i), x, y)) {
      pantryPick(world, PANTRY_ORDER[i]);
      return;
    }
  }
  // Chopping board: chop, or take a finished pile.
  const board = STATIONS.board;
  if (pointIn(board, x, y)) {
    if (world.board.item && world.board.item.state === 'chopped') boardTake(world);
    else boardInteract(world);
    return;
  }
  // Stove burners.
  for (let i = 0; i < world.burners.length; i++) {
    if (pointIn(burnerRect(i), x, y)) {
      stoveInteract(world, i);
      return;
    }
  }
  // Plating pass.
  for (let i = 0; i < world.plates.length; i++) {
    if (pointIn(plateRect(i), x, y)) {
      plateInteract(world, i, sounds);
      return;
    }
  }
  // Trash.
  if (pointIn(STATIONS.trash, x, y)) {
    trashInteract(world);
    return;
  }
  // Anywhere else on the floor: walk there.
  if (y > 120) {
    world.chef.moveTarget = { x, y };
    playPop();
  }
}

function handleKeys(pressed) {
  for (const key of pressed) {
    unlockAudio();
    if (key === 'm') {
      toggleMute();
      world.muted = isMuted();
      continue;
    }
    if (world.mode === 'title' && (key === 'Enter' || key === ' ')) {
      playClick();
      startShift(world);
      continue;
    }
    if (world.mode === 'end' && (key === 'r' || key === 'R' || key === 'Enter')) {
      playClick();
      startShift(world);
      continue;
    }
    if (world.mode !== 'play') continue;
    if (key === 'p' || key === 'P') {
      world.paused = !world.paused;
      continue;
    }
    if (world.paused) continue;
    if (key === 'e' || key === 'E') interactNearest(world, sounds);
    else if (key === 'q' || key === 'Q') trashInteract(world);
    else if (key === ' ') {
      const ready = world.plates.findIndex((_, i) => plateServesAnyOrder(world, i) !== -1);
      if (ready !== -1) plateInteract(world, ready, sounds);
      else playError();
    } else if (key >= '1' && key <= '6') {
      pantryPick(world, PANTRY_ORDER[Number(key) - 1]);
    }
  }
}

function highlightStation() {
  if (world.mode !== 'play' || world.paused) return null;
  const near = nearestStation(world);
  return near ? near.id : null;
}

let last = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!shotName) {
    handleKeys(consumePressed(input));
    for (const click of consumeClicks(input)) handleClick(click.x, click.y);
    const vector = moveVector(input);
    moveChef(world, dt, vector);
    updateWorld(world, dt, sounds);
    const cooking = world.burners.filter((b) => b.item && b.item.state === 'cooking').length;
    setSizzleLevel(cooking);
    document.getElementById('status').textContent =
      'Warung Rasa: ' + world.coins + ' koin, ' + world.served + ' piring tersaji, '
      + world.orders.length + ' pesanan menunggu.';
  }
  drawGame(ctx, world, highlightStation());
  if (!shotName) requestAnimationFrame(frame);
}

if (shotName) {
  // A still frame: draw once the page is laid out, exactly as the world is.
  requestAnimationFrame(() => {
    drawGame(ctx, world, null);
    document.title = 'Warung Rasa — shot ' + shotName;
  });
} else {
  requestAnimationFrame(frame);
}
