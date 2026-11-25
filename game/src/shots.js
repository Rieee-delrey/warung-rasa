// Warung Rasa — deterministic screenshot states.
// Each shot plays the real rules forward from a fresh seeded world: the
// autopilot below presses the same pantry / board / stove / plate functions
// a player presses, and the world ticks in fixed steps, so every frame is
// what a short real game looks like. Display values (coins, timers) are set
// afterwards so each shot reads at a glance.

import { recipeById } from './config.js';
import { createWorld, startShift, spawnOrder, updateWorld, makeItem } from './world.js';
import { STATIONS, pantryPick, boardInteract, stoveInteract, plateInteract } from './stations.js';

const SILENT = { orderArrive() {}, ding() {}, error() {}, coin() {}, burnAlarm() {} };

function tick(world, seconds) {
  const step = 0.25;
  let left = seconds;
  while (left > 0) {
    updateWorld(world, Math.min(step, left), SILENT);
    left -= step;
  }
}

function goTo(world, stationId) {
  const stand = STATIONS[stationId].stand;
  world.chef.x = stand.x;
  world.chef.y = stand.y;
  world.chef.moveTarget = null;
  world.chef.moving = false;
}

function forceOrders(world, specs) {
  world.orders = specs.map((spec, i) => {
    const recipe = recipeById(spec.recipeId);
    return {
      id: 10 + i,
      recipeId: recipe.id,
      name: recipe.name,
      blurb: recipe.blurb,
      price: recipe.price,
      needs: recipe.needs.map((n) => ({ ingredient: n.ingredient, state: n.state })),
      timeLeft: spec.timeLeft,
      patience: spec.timeLeft + 20,
      bornAt: world.elapsed,
    };
  });
}

function buildPlayWorld(seed) {
  const world = createWorld(seed);
  startShift(world);
  // The four tickets the cover shows, up front so the plate only ever
  // accepts components these orders need.
  forceOrders(world, [
    { recipeId: 'nasi-goreng', timeLeft: 55 },
    { recipeId: 'mie-goreng', timeLeft: 40 },
    { recipeId: 'sate-ayam', timeLeft: 60 },
    { recipeId: 'gado-gado', timeLeft: 30 },
  ]);
  // Cook a Nasi Goreng all the way onto plate 0: rice, then egg, then chili.
  goTo(world, 'pantry');
  pantryPick(world, 'rice');
  pantryPick(world, 'egg');
  goTo(world, 'stove');
  stoveInteract(world, 0); // rice onto burner 0
  tick(world, 6.5); // rice finishes cooking
  stoveInteract(world, 0); // take the cooked rice
  goTo(world, 'pass');
  plateInteract(world, 0, SILENT); // rice onto plate 0
  goTo(world, 'board');
  boardInteract(world); // egg onto the board
  boardInteract(world); // chop 1
  boardInteract(world); // chop 2
  boardInteract(world); // chop 3, chopped egg back in hand
  goTo(world, 'stove');
  stoveInteract(world, 1); // egg onto burner 1
  tick(world, 6.5); // egg fries
  stoveInteract(world, 1); // take the cooked egg
  goTo(world, 'pass');
  plateInteract(world, 0, SILENT); // egg onto plate 0: 2 of 3
  goTo(world, 'pantry');
  pantryPick(world, 'chili');
  goTo(world, 'board');
  boardInteract(world); // chili onto the board
  boardInteract(world);
  boardInteract(world);
  boardInteract(world); // chili chopped
  goTo(world, 'pass');
  plateInteract(world, 0, SILENT); // chili onto plate 0: SIAP SAJI!
  // Meanwhile a Mie Goreng is underway: noodle frying, chicken half-chopped.
  goTo(world, 'pantry');
  pantryPick(world, 'noodle');
  goTo(world, 'stove');
  stoveInteract(world, 0); // noodle onto burner 0
  tick(world, 3); // halfway through frying
  goTo(world, 'pantry');
  pantryPick(world, 'chicken');
  goTo(world, 'board');
  boardInteract(world); // chicken onto the board
  boardInteract(world); // chop 1
  boardInteract(world); // chop 2, one chop short
  goTo(world, 'stove');
  // Display state for the cover frame.
  world.elapsed = 62;
  world.coins = 48;
  world.served = 4;
  world.combo = 2;
  return world;
}

function buildRushWorld(seed) {
  const world = buildPlayWorld(seed);
  // Let real time run: the noodle on burner 0 finishes, waits, and burns.
  tick(world, 12);
  world.chef.carry = [makeItem('chicken', 'chopped')];
  goTo(world, 'pass');
  forceOrders(world, [
    { recipeId: 'soto-ayam', timeLeft: 16 },
    { recipeId: 'nasi-goreng', timeLeft: 9 },
    { recipeId: 'mie-goreng', timeLeft: 24 },
    { recipeId: 'sate-ayam', timeLeft: 13 },
  ]);
  world.elapsed = 152;
  world.coins = 132;
  world.served = 11;
  world.combo = 3;
  world.hearts = 1;
  return world;
}

export function worldForShot(shot, seed) {
  if (shot === 'start') {
    const world = createWorld(seed);
    world.mode = 'title';
    spawnOrder(world);
    world.orders[0].timeLeft = 58;
    return world;
  }
  if (shot === 'rush') return buildRushWorld(seed);
  if (shot === 'end') {
    const world = createWorld(seed);
    world.mode = 'end';
    world.endReason = 'Shift selesai! Dapur tutup.';
    world.coins = 168;
    world.served = 13;
    world.bestCombo = 4;
    world.endStars = 2;
    world.stats = { chopped: 18, cooked: 14, burnt: 1, tips: 31 };
    world.elapsed = 180;
    return world;
  }
  return buildPlayWorld(seed); // 'play' is the default cover
}
