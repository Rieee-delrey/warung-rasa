# Warung Rasa — Dapur Kaki Lima

[![make.fun](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/rieee-delrey/warung-rasa/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/rieee-delrey/warung-rasa/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)

An original 2D canvas cooking game for the make.fun best cooking game
competition. You run the busiest street-food stall in town: orders land on
the board upstairs, and you have three minutes to cook them all.

## How it plays

- Orders arrive as tickets with a dish and a countdown. Serve before the
  timer runs out or you lose a heart; three lost hearts close the kitchen.
- Walk the chef with WASD or arrow keys, or click the floor to walk there.
  Click a station, or stand by it and press E.
- Pantry (keys 1-6 or click a bin): grab up to two ingredients at a time.
- Talenan (chopping board): put a raw ingredient down and press E three
  times to chop it. Rice and noodles skip the board and go straight to the
  stove.
- Kompor (stove, two burners): fry a chopped ingredient or a pot of rice or
  noodles. A finished pan waits a few seconds, then burns — throw it away.
- Meja Saji (plating pass, two plates): stack a dish's components on a
  plate. A finished plate glows SIAP SAJI: press E or click its ticket to
  serve. Fast serves earn tips.
- Five recipes unlock across the shift — Nasi Goreng, Mie Goreng, Sate Ayam,
  Gado-Gado, Soto Ayam — and orders arrive faster as the shift heats up.
  Pressure grows, the kitchen never gains a new chore.
- Q throws away what you are carrying. P pauses, M mutes, R restarts.

All art is drawn in code, all sounds (chop, sizzle, ding, coins) are
synthesized with WebAudio. No network requests, no build step.

## Play it

Serve `game/` with any static server and open `index.html` in a desktop
browser.

```
node serve.ts   # then open http://localhost:8080
```

Screenshots are staged from the game's own code: `?shot=play`,
`?shot=rush`, `?shot=start`, `?shot=end` (see `shots.json`). Each shot
plays the real rules forward from a fresh seeded world with a small
autopilot, so every frame is what a short real game looks like.

## Hand in

`main.ts` (Node 22, standard library only) copies `game/` and
`screenshots/` to `/output` and writes `/output/dossier.json` with
`vendor/makefun-game.ts` from the competition kit.

License: MIT.
