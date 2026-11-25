// Warung Rasa — the world: shift state, orders, scoring. No drawing here.

import {
  SHIFT_SECONDS, MAX_HEARTS, CHOPS_PER_ITEM, COOK_SECONDS, BURN_AFTER_SECONDS,
  spawnGapSeconds, orderPatienceSeconds, unlockedRecipes, recipeById,
} from './config.js';
import { makeRandom, pickFrom } from './random.js';

let orderSeq = 0;

export function makeItem(ingredient, state) {
  return { ingredient, state, chops: 0, cook: 0, burnt: false };
}

export function itemLabel(item) {
  const stateWord = item.state === 'raw' ? '' : item.state === 'chopped' ? ' cincang' : ' masak';
  if (item.burnt) return 'gosong!';
  return item.ingredient + stateWord;
}

export function createWorld(seed) {
  const rng = makeRandom(seed);
  return {
    seed,
    rng,
    mode: 'title', // title | play | end
    paused: false,
    elapsed: 0,
    coins: 0,
    served: 0,
    expiredCount: 0,
    hearts: MAX_HEARTS,
    combo: 0,
    bestCombo: 0,
    spawnIn: 2.5,
    orders: [],
    chef: {
      x: 640, y: 560, dir: 1, moving: false, bob: 0,
      carry: [],
      moveTarget: null,
    },
    board: { item: null }, // chopping board slot
    burners: [
      { item: null, alarmed: false },
      { item: null, alarmed: false },
    ],
    plates: [
      { items: [] },
      { items: [] },
    ],
    toasts: [],
    floaters: [],
    stats: { chopped: 0, cooked: 0, burnt: 0, tips: 0 },
    muted: false,
    endReason: '',
    endStars: 0,
  };
}

export function startShift(world) {
  const fresh = createWorld(world.seed);
  Object.assign(world, fresh, { mode: 'play' });
  spawnOrder(world);
  world.spawnIn = spawnGapSeconds(0);
}

export function spawnOrder(world) {
  const pool = unlockedRecipes(world.elapsed);
  const recipe = pickFrom(world.rng, pool);
  orderSeq += 1;
  const patience = orderPatienceSeconds(world.elapsed);
  world.orders.push({
    id: orderSeq,
    recipeId: recipe.id,
    name: recipe.name,
    blurb: recipe.blurb,
    price: recipe.price,
    needs: recipe.needs.map((n) => ({ ingredient: n.ingredient, state: n.state })),
    timeLeft: patience,
    patience,
    bornAt: world.elapsed,
  });
  return world.orders[world.orders.length - 1];
}

export function orderProgress(order) {
  return Math.max(0, order.timeLeft / order.patience);
}

// Which components of this order are already sitting on this plate?
export function plateMatches(plate, order) {
  const have = plate.items.map((i) => i.ingredient + ':' + i.state).sort();
  const want = order.needs.map((n) => n.ingredient + ':' + n.state).sort();
  if (have.length !== want.length) return false;
  return have.every((h, i) => h === want[i]);
}

export function plateCompleteness(plate, order) {
  let done = 0;
  const remaining = order.needs.slice();
  for (const item of plate.items) {
    const idx = remaining.findIndex((n) => n.ingredient === item.ingredient && n.state === item.state);
    if (idx !== -1) {
      remaining.splice(idx, 1);
      done += 1;
    }
  }
  return { done, total: order.needs.length, remaining };
}

export function plateServesAnyOrder(world, plateIndex) {
  const plate = world.plates[plateIndex];
  if (plate.items.length === 0) return -1;
  for (let i = 0; i < world.orders.length; i++) {
    if (plateMatches(plate, world.orders[i])) return i;
  }
  return -1;
}

export function serveOrder(world, orderIndex, plateIndex) {
  const order = world.orders[orderIndex];
  if (!order) return null;
  const tip = Math.round(6 * orderProgress(order));
  const earned = order.price + tip;
  world.coins += earned;
  world.stats.tips += tip;
  world.served += 1;
  world.combo += 1;
  world.bestCombo = Math.max(world.bestCombo, world.combo);
  world.plates[plateIndex].items = [];
  world.orders.splice(orderIndex, 1);
  world.floaters.push({
    x: 1080, y: 330, text: '+' + earned + ' koin', color: '#f2b705', life: 1.4,
  });
  if (tip > 0) {
    world.floaters.push({
      x: 1080, y: 362, text: 'tip +' + tip, color: '#7ddb8a', life: 1.4,
    });
  }
  return { earned, tip };
}

export function expireOrder(world, orderIndex) {
  world.orders.splice(orderIndex, 1);
  world.expiredCount += 1;
  world.hearts -= 1;
  world.combo = 0;
  world.toasts.push({ text: 'Pesanan hangus! -1 hati', color: '#ff8a7a', life: 2.2 });
}

export function endShift(world, reason) {
  world.mode = 'end';
  world.endReason = reason;
  const served = world.served;
  world.endStars = served >= 14 ? 3 : served >= 9 ? 2 : served >= 5 ? 1 : 0;
}

export function updateWorld(world, dt, sounds) {
  if (world.mode !== 'play' || world.paused) return;
  world.elapsed += dt;
  const remain = SHIFT_SECONDS - world.elapsed;
  if (remain <= 0) {
    endShift(world, 'Shift selesai! Dapur tutup.');
    return;
  }
  if (world.hearts <= 0) {
    endShift(world, 'Tiga pesanan hangus — dapur tutup lebih awal.');
    return;
  }

  // New orders arrive on a shrinking gap as the shift heats up.
  world.spawnIn -= dt;
  if (world.spawnIn <= 0 && world.orders.length < 4) {
    spawnOrder(world);
    sounds.orderArrive();
    world.spawnIn = spawnGapSeconds(world.elapsed);
  }

  // Order countdowns.
  for (let i = world.orders.length - 1; i >= 0; i--) {
    const order = world.orders[i];
    order.timeLeft -= dt;
    if (order.timeLeft <= 0) {
      expireOrder(world, i);
      sounds.error();
      if (world.hearts <= 0) {
        endShift(world, 'Tiga pesanan hangus — dapur tutup lebih awal.');
        return;
      }
    }
  }

  // Burners cook; a finished pan burns if nobody takes it.
  for (const burner of world.burners) {
    const item = burner.item;
    if (!item) { burner.alarmed = false; continue; }
    if (item.state === 'cooking') {
      item.cook += dt;
      if (item.cook >= COOK_SECONDS) {
        item.state = 'cooked';
        item.cook = COOK_SECONDS;
        sounds.ding();
        world.floaters.push({ x: 700, y: 300, text: 'Matang!', color: '#7ddb8a', life: 1.2 });
      }
    } else if (item.state === 'cooked') {
      item.cook += dt;
      if (item.cook >= COOK_SECONDS + BURN_AFTER_SECONDS && !item.burnt) {
        item.burnt = true;
        world.stats.burnt += 1;
        sounds.burnAlarm();
        world.toasts.push({ text: 'Gosong! Buang ke tempat sampah.', color: '#ff8a7a', life: 2.2 });
      }
      if (item.cook >= COOK_SECONDS + BURN_AFTER_SECONDS - 2 && !burner.alarmed) {
        burner.alarmed = true;
        sounds.burnAlarm();
      }
    }
  }

  // Toasts and floaters fade.
  for (const t of world.toasts) t.life -= dt;
  world.toasts = world.toasts.filter((t) => t.life > 0);
  for (const f of world.floaters) { f.life -= dt; f.y -= 22 * dt; }
  world.floaters = world.floaters.filter((f) => f.life > 0);
}
