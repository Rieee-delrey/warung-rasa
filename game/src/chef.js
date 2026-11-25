// Warung Rasa — the chef: walking, click-to-move, and what their hands hold.

import { CARRY_LIMIT, VIEW_W, VIEW_H } from './config.js';

const CHEF_SPEED = 300;
const FLOOR_TOP = 150;
const FLOOR_BOTTOM = 700;
const FLOOR_LEFT = 30;
const FLOOR_RIGHT = VIEW_W - 30;

// The counters block the middle of the room; the chef walks around them.
const BLOCKERS = [
  { x: 24, y: 150, w: 190, h: 120 },   // pantry counter
  { x: 300, y: 300, w: 190, h: 130 }, // chopping table
  { x: 560, y: 300, w: 300, h: 130 }, // stove
  { x: 950, y: 300, w: 306, h: 150 }, // plating pass
  { x: 24, y: 640, w: 120, h: 60 },   // trash bin
];

function collides(x, y) {
  const r = 20;
  for (const b of BLOCKERS) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return true;
  }
  return false;
}

export function moveChef(world, dt, vector) {
  const chef = world.chef;
  let vx = vector.x;
  let vy = vector.y;
  if (vx === 0 && vy === 0 && chef.moveTarget) {
    const dx = chef.moveTarget.x - chef.x;
    const dy = chef.moveTarget.y - chef.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 8) {
      chef.moveTarget = null;
    } else {
      vx = dx / dist;
      vy = dy / dist;
    }
  }
  if (vx === 0 && vy === 0) {
    chef.moving = false;
    return;
  }
  chef.moving = true;
  chef.bob += dt * 11;
  if (vx !== 0) chef.dir = vx > 0 ? 1 : -1;
  const nx = chef.x + vx * CHEF_SPEED * dt;
  const ny = chef.y + vy * CHEF_SPEED * dt;
  const cx = Math.max(FLOOR_LEFT, Math.min(FLOOR_RIGHT, nx));
  const cy = Math.max(FLOOR_TOP, Math.min(FLOOR_BOTTOM, ny));
  if (!collides(cx, chef.y)) chef.x = cx;
  if (!collides(chef.x, cy)) chef.y = cy;
}

export function chefCarryCount(world) {
  return world.chef.carry.length;
}

export function chefCanCarry(world) {
  return world.chef.carry.length < CARRY_LIMIT;
}

export function chefTake(world, item) {
  if (!chefCanCarry(world)) return false;
  world.chef.carry.push(item);
  return true;
}

export function chefGive(world, index) {
  if (index < 0 || index >= world.chef.carry.length) return null;
  return world.chef.carry.splice(index, 1)[0];
}

export function chefFindCarried(world, predicate) {
  return world.chef.carry.findIndex(predicate);
}

export { BLOCKERS };
