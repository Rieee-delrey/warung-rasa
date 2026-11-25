// Warung Rasa — keyboard and mouse input, kept in game coordinates.

export function createInput(canvas, toGameCoords) {
  const input = {
    keys: new Set(),
    mouse: { x: 0, y: 0, inside: false },
    clickQueue: [],
    pressedKeys: [],
  };

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
      event.preventDefault();
    }
    if (!event.repeat) {
      input.pressedKeys.push(event.key.length === 1 ? event.key.toLowerCase() : event.key);
    }
    input.keys.add(event.key.length === 1 ? event.key.toLowerCase() : event.key);
  });
  window.addEventListener('keyup', (event) => {
    input.keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key);
  });
  window.addEventListener('blur', () => input.keys.clear());

  canvas.addEventListener('mousemove', (event) => {
    const p = toGameCoords(event.clientX, event.clientY);
    input.mouse.x = p.x;
    input.mouse.y = p.y;
    input.mouse.inside = true;
  });
  canvas.addEventListener('mouseleave', () => { input.mouse.inside = false; });
  canvas.addEventListener('mousedown', (event) => {
    const p = toGameCoords(event.clientX, event.clientY);
    input.clickQueue.push({ x: p.x, y: p.y, button: event.button });
  });

  return input;
}

export function consumePressed(input) {
  const out = input.pressedKeys;
  input.pressedKeys = [];
  return out;
}

export function consumeClicks(input) {
  const out = input.clickQueue;
  input.clickQueue = [];
  return out;
}

export function moveVector(input) {
  let x = 0;
  let y = 0;
  if (input.keys.has('a') || input.keys.has('ArrowLeft')) x -= 1;
  if (input.keys.has('d') || input.keys.has('ArrowRight')) x += 1;
  if (input.keys.has('w') || input.keys.has('ArrowUp')) y -= 1;
  if (input.keys.has('s') || input.keys.has('ArrowDown')) y += 1;
  if (x !== 0 && y !== 0) {
    const inv = 1 / Math.sqrt(2);
    x *= inv;
    y *= inv;
  }
  return { x, y };
}
