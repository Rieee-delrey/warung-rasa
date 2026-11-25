// Warung Rasa — tuning, palette, ingredients and recipes.
// One job: every number and name the rest of the game reads.

export const VIEW_W = 1280;
export const VIEW_H = 720;
export const SHIFT_SECONDS = 180;
export const MAX_HEARTS = 3;
export const CARRY_LIMIT = 2;
export const CHOPS_PER_ITEM = 3;
export const COOK_SECONDS = 6;
export const BURN_AFTER_SECONDS = 9;

export const PALETTE = {
  wall: '#f7e8c9',
  wallTrim: '#e8c98f',
  floorA: '#c96f3f',
  floorB: '#b85f33',
  floorLine: '#a04e28',
  counterWood: '#8a5a2b',
  counterTop: '#b07a3e',
  counterEdge: '#6e451d',
  steel: '#4a4f57',
  steelLight: '#6b7280',
  ticket: '#fff8e6',
  ticketEdge: '#d9b96a',
  ink: '#2e2118',
  cream: '#fff3d6',
  green: '#3e9b4f',
  red: '#d33f2e',
  gold: '#f2b705',
  teal: '#1f7a6d',
};

export const INGREDIENTS = {
  rice:    { id: 'rice',    name: 'Nasi',   short: 'Nasi',  color: '#fff6e0', dark: '#d9c48f', key: '1' },
  noodle:  { id: 'noodle',  name: 'Mie',    short: 'Mie',   color: '#f2c14e', dark: '#b98a1e', key: '2' },
  chicken: { id: 'chicken', name: 'Ayam',   short: 'Ayam',  color: '#e08a4e', dark: '#9c4f1d', key: '3' },
  egg:     { id: 'egg',     name: 'Telur',  short: 'Telur', color: '#ffe9a8', dark: '#d9a441', key: '4' },
  veg:     { id: 'veg',     name: 'Sayur',  short: 'Sayur', color: '#5cb85c', dark: '#2e7d32', key: '5' },
  chili:   { id: 'chili',   name: 'Sambal', short: 'Cabe',  color: '#e23b2e', dark: '#8f1d12', key: '6' },
};

// A component is one ingredient in one prepared state.
// raw: straight from the pantry. chopped: three chops on the board.
// cooked: chopped (or raw, for rice and noodle) fried on the stove.
export const RECIPES = [
  {
    id: 'nasi-goreng', name: 'Nasi Goreng', price: 12, unlockAt: 0,
    blurb: 'Nasi + telur + sambal',
    needs: [
      { ingredient: 'rice', state: 'cooked' },
      { ingredient: 'egg', state: 'cooked' },
      { ingredient: 'chili', state: 'chopped' },
    ],
  },
  {
    id: 'mie-goreng', name: 'Mie Goreng', price: 12, unlockAt: 0,
    blurb: 'Mie + ayam + sayur',
    needs: [
      { ingredient: 'noodle', state: 'cooked' },
      { ingredient: 'chicken', state: 'chopped' },
      { ingredient: 'veg', state: 'chopped' },
    ],
  },
  {
    id: 'sate-ayam', name: 'Sate Ayam', price: 15, unlockAt: 45,
    blurb: 'Ayam bakar + cabe + sayur',
    needs: [
      { ingredient: 'chicken', state: 'cooked' },
      { ingredient: 'chili', state: 'chopped' },
      { ingredient: 'veg', state: 'raw' },
    ],
  },
  {
    id: 'gado-gado', name: 'Gado-Gado', price: 14, unlockAt: 90,
    blurb: 'Sayur + telur + sambal',
    needs: [
      { ingredient: 'veg', state: 'chopped' },
      { ingredient: 'egg', state: 'cooked' },
      { ingredient: 'chili', state: 'chopped' },
    ],
  },
  {
    id: 'soto-ayam', name: 'Soto Ayam', price: 16, unlockAt: 120,
    blurb: 'Ayam + nasi + sayur',
    needs: [
      { ingredient: 'chicken', state: 'cooked' },
      { ingredient: 'rice', state: 'cooked' },
      { ingredient: 'veg', state: 'chopped' },
    ],
  },
];

export const PANTRY_ORDER = ['rice', 'noodle', 'chicken', 'egg', 'veg', 'chili'];

// Order pressure over the shift: spawn gap and patience shrink as the
// shift goes on, but the kitchen never gains a new chore — only pace.
export function spawnGapSeconds(elapsed) {
  if (elapsed < 45) return 15;
  if (elapsed < 90) return 12;
  if (elapsed < 135) return 10;
  return 8;
}

export function orderPatienceSeconds(elapsed) {
  if (elapsed < 45) return 70;
  if (elapsed < 90) return 60;
  if (elapsed < 135) return 52;
  return 45;
}

export function unlockedRecipes(elapsed) {
  return RECIPES.filter((r) => elapsed >= r.unlockAt);
}

export function recipeById(id) {
  return RECIPES.find((r) => r.id === id);
}
