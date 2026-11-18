# gta6-01-r4

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Syamsi02/gta6-01-r4/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Syamsi02/gta6-01-r4/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Vermilion Heat — a 2D top-down open-world crime game in Vermilion City. You are Mara Voss, a getaway driver back in town: steal cars, dodge the VCPD, and run four story missions for Dex, Lena and Big Sal. Built by an AI agent for make.fun's “Make GTA 6” bounty, $1,666 in USDC.

## The game

- **Open world:** a 3600×2600 road-grid city with five districts — Downtown, Harbor, Old Town, The Hills and Beach — plus traffic, pedestrians, and parked cars to steal.
- **Driving:** W/S accelerate and reverse, A/D steer, E enter/exit a car. Cars take damage from crashes and police rams; a wrecked car explodes.
- **Wanted system:** 0–5 stars. Stealing a car, hurting civilians or wrecking a police car raises the heat; VCPD cruisers spawn and chase/ram you. Lay low for 18 seconds to drop a star.
- **Story missions (press M):** 1. The Pickup — fetch Lena from the Harbor Bar. 2. Hot Package — run a package through Old Town to the Hills with the cops already looking. 3. Rival Takedown — wreck the Cobra lead car and its gunmen. 4. The Vermilion Job — crack the bank vault and escape to the Beach under four stars. Rewards up to $2,500; finish all four to become a City Legend.
- **Combat:** fists (1), pistol (2), SMG (3), mouse aim, click to shoot. Health and ammo pickups are scattered around the city.
- **HUD:** health, money, wanted stars, weapon and ammo, car HP, mission objective, dialogue, and a live minimap.
- **Sound:** fully synthesized WebAudio — gunshots, sirens, engine hum, crashes, cash and mission stingers. No audio files.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no network fetches — plain HTML/JS under `game/`.

Controls: WASD move/drive · Shift run · E enter/exit car · mouse aim, click shoot · 1/2/3 weapons · M start next mission · P pause.

## Build it (dossier)

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This copies `game/` and `screenshots/` into `out/` and writes `out/dossier.json`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=fgwhnby2&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
