// Warung Rasa — the stations: pantry, chopping board, stove, plating pass.
// Every interaction goes through here, keyboard or mouse alike.

import { CHOPS_PER_ITEM, INGREDIENTS, PANTRY_ORDER } from './config.js';
import { makeItem, serveOrder } from './world.js';
import { chefCanCarry, chefTake, chefGive, chefFindCarried } from './chef.js';
import {
  playChop, playPop, playPlace, playDing, playCoin, playError,
} from './audio.js';

export const STATIONS = {
  pantry: { id: 'pantry', label: 'Pantry', x: 24, y: 150, w: 190, h: 120, stand: { x: 230, y: 210 } },
  board: { id: 'board', label: 'Talenan', x: 300, y: 300, w: 190, h: 130, stand: { x: 395, y: 485 } },
  stove: { id: 'stove', label: 'Kompor', x: 560, y: 300, w: 300, h: 130, stand: { x: 710, y: 490 } },
  pass: { id: 'pass', label: 'Meja Saji', x: 950, y: 300, w: 306, h: 150, stand: { x: 1103, y: 520 } },
  trash: { id: 'trash', label: 'Sampah', x: 24, y: 640, w: 120, h: 60, stand: { x: 170, y: 660 } },
};

// Pantry bins sit on the pantry counter: two rows of three.
export function pantryBinRect(index) {
  const col = index % 3;
  const row = Math.floor(index / 3);
  return { x: 36 + col * 62, y: 164 + row * 56, w: 54, h: 46 };
}

export function stationAtPoint(x, y) {
  for (const key of Object.keys(STATIONS)) {
    const s = STATIONS[key];
    if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return s;
  }
  return null;
}

export function nearestStation(world) {
  const { x, y } = world.chef;
  let best = null;
  let bestDist = 130;
  for (const key of Object.keys(STATIONS)) {
    const s = STATIONS[key];
    // Distance to the station's rectangle, not its centre: the chef stands
    // beside a wide counter, not on top of it.
    const dx = Math.max(s.x - x, 0, x - (s.x + s.w));
    const dy = Math.max(s.y - y, 0, y - (s.y + s.h));
    const d = Math.hypot(dx, dy);
    if (d < bestDist) { bestDist = d; best = s; }
  }
  return best;
}

function canChop(item) {
  return item.state === 'raw' && item.ingredient !== 'rice' && item.ingredient !== 'noodle';
}

function canCook(item) {
  return item.state === 'chopped' || item.ingredient === 'rice' || item.ingredient === 'noodle';
}

// --- Pantry ---

export function pantryPick(world, ingredientId) {
  if (!chefCanCarry(world)) {
    playError();
    world.toasts.push({ text: 'Tangan penuh! (maks 2)', color: '#ff8a7a', life: 1.6 });
    return false;
  }
  chefTake(world, makeItem(ingredientId, 'raw'));
  playPop();
  return true;
}

// --- Chopping board ---

export function boardInteract(world) {
  const board = world.board;
  if (!board.item) {
    const idx = chefFindCarried(world, (it) => canChop(it));
    if (idx === -1) {
      const hasRaw = chefFindCarried(world, (it) => it.state === 'raw') !== -1;
      playError();
      world.toasts.push({
        text: hasRaw ? 'Bahan ini langsung ke kompor' : 'Ambil bahan dari pantry dulu',
        color: '#ff8a7a', life: 1.8,
      });
      return;
    }
    board.item = chefGive(world, idx);
    board.item.chops = 0;
    playPlace();
    return;
  }
  // Chop what is on the board. Three quick chops and it is done.
  board.item.chops += 1;
  playChop();
  world.stats.chopped += board.item.chops === CHOPS_PER_ITEM ? 1 : 0;
  if (board.item.chops >= CHOPS_PER_ITEM) {
    board.item.state = 'chopped';
    board.item.chops = 0;
    if (chefTake(world, board.item)) {
      board.item = null;
      playPop();
    } else {
      // Hands full: the chopped pile waits on the board.
      world.toasts.push({ text: 'Cincangan siap — tangan penuh!', color: '#ffd27d', life: 1.6 });
    }
  }
}

export function boardTake(world) {
  if (world.board.item && world.board.item.state === 'chopped' && chefCanCarry(world)) {
    chefTake(world, world.board.item);
    world.board.item = null;
    playPop();
    return true;
  }
  return false;
}

// --- Stove ---

export function stoveInteract(world, burnerIndex) {
  const burner = world.burners[burnerIndex];
  if (!burner) return;
  if (!burner.item) {
    const idx = chefFindCarried(world, (it) => canCook(it) && !it.burnt);
    if (idx === -1) {
      playError();
      world.toasts.push({ text: 'Butuh bahan cincang, nasi, atau mie', color: '#ff8a7a', life: 1.8 });
      return;
    }
    const item = chefGive(world, idx);
    item.state = 'cooking';
    item.cook = 0;
    burner.item = item;
    burner.alarmed = false;
    playPlace();
    return;
  }
  if (burner.item.state === 'cooked' || burner.item.burnt) {
    if (burner.item.burnt) {
      // A burnt pan goes straight to the trash, never to a plate.
      burner.item = null;
      playError();
      world.toasts.push({ text: 'Gosong dibuang.', color: '#ff8a7a', life: 1.4 });
      return;
    }
    if (chefTake(world, burner.item)) {
      burner.item = null;
      playPop();
    } else {
      playError();
      world.toasts.push({ text: 'Tangan penuh!', color: '#ff8a7a', life: 1.4 });
    }
  } else {
    playError();
    world.toasts.push({ text: 'Masih dimasak…', color: '#ffd27d', life: 1.2 });
  }
}

// --- Plating pass ---

export function plateInteract(world, plateIndex, sounds) {
  const plate = world.plates[plateIndex];
  if (!plate) return;
  // A finished plate serves the order it matches.
  const orderIndex = world.orders.findIndex((o) => {
    const have = plate.items.map((i) => i.ingredient + ':' + i.state).sort();
    const want = o.needs.map((n) => n.ingredient + ':' + n.state).sort();
    return have.length === want.length && have.every((h, i) => h === want[i]);
  });
  if (orderIndex !== -1) {
    const result = serveOrder(world, orderIndex, plateIndex);
    if (result) {
      playCoin();
      playDing();
    }
    return;
  }
  // Otherwise add a carried component to the plate — but only one some
  // open order actually needs, so a plate can never hold junk.
  const idx = chefFindCarried(world, (it) => {
    if (it.state === 'cooking' || it.burnt) return false;
    return world.orders.some((o) => o.needs.some(
      (n) => n.ingredient === it.ingredient && n.state === it.state,
    ));
  });
  if (idx === -1) {
    if (plate.items.length > 0) {
      playError();
      world.toasts.push({ text: 'Piring ini belum lengkap', color: '#ffd27d', life: 1.6 });
    } else {
      playError();
      world.toasts.push({ text: 'Tidak ada pesanan yang butuh bahan ini', color: '#ff8a7a', life: 1.6 });
    }
    return;
  }
  const item = chefGive(world, idx);
  plate.items.push(item);
  playPlace();
}

// --- Trash ---

export function trashInteract(world) {
  if (world.chef.carry.length === 0) {
    playError();
    world.toasts.push({ text: 'Tidak ada yang dibuang', color: '#ffd27d', life: 1.2 });
    return;
  }
  const item = chefGive(world, 0);
  if (item && item.burnt) world.stats.burnt += 0; // already counted at burn time
  playPop();
  world.toasts.push({ text: 'Dibuang: ' + (INGREDIENTS[item.ingredient]?.name ?? item.ingredient), color: '#ffd27d', life: 1.4 });
}

// One entry point for the E key: act on the station the chef stands by.
export function interactNearest(world, sounds) {
  const station = nearestStation(world);
  if (!station) {
    playError();
    return;
  }
  if (station.id === 'board') boardInteract(world);
  else if (station.id === 'stove') {
    const free = world.burners.findIndex((b) => !b.item);
    const done = world.burners.findIndex((b) => b.item && (b.item.state === 'cooked' || b.item.burnt));
    stoveInteract(world, done !== -1 ? done : free !== -1 ? free : 0);
  } else if (station.id === 'pass') {
    const ready = world.plates.findIndex((p, i) => world.orders.some((o) => {
      const have = p.items.map((it) => it.ingredient + ':' + it.state).sort();
      const want = o.needs.map((n) => n.ingredient + ':' + n.state).sort();
      return have.length === want.length && have.every((h, i) => h === want[i]);
    }));
    const empty = world.plates.findIndex((p) => p.items.length === 0);
    const partial = world.plates.findIndex((p) => p.items.length > 0);
    plateInteract(world, ready !== -1 ? ready : empty !== -1 ? empty : partial, sounds);
  } else if (station.id === 'trash') trashInteract(world);
  else if (station.id === 'pantry') {
    playError();
    world.toasts.push({ text: 'Klik bahan di pantry, atau tekan 1-6', color: '#ffd27d', life: 1.8 });
  }
}

export { PANTRY_ORDER };
