# Tower Reference

This document describes the tower types and their current upgrade path, based on the values in the game code today. It is intended as a design reference that can be edited later when tower balance changes.

## How towers are unlocked

- Answer an `easy` vocab question to build an `Easy Bullet Tower`.
- Answer a `medium` vocab question to build a `Medium Spray Tower`.
- Answer a `hard` vocab question to build a `Hard Missile Tower`.
- Answer a `veryHard` vocab question to build a `Very Hard Cluster Tower`.

## Upgrade path

All towers start at level 1 and can be upgraded to level 5.

- Upgrade from level 1 to level 2 requires an `easy` question.
- Upgrade from level 2 to level 3 requires a `medium` question.
- Upgrade from level 3 to level 4 requires a `hard` question.
- Upgrade from level 4 to level 5 requires a `veryHard` question.

## Notes on interpreting the numbers

- `Projectiles per shot` is the number created when the tower fires once.
- `Projectile speed` is in game units per second.
- `Damage each` is the damage of each projectile or pellet.
- `Total damage if all connect` is the full volley damage if every projectile from that shot hits.
- Spray towers fire multiple pellets in an arc. The total assumes every pellet lands.
- Missile towers fire homing missiles. They launch at 55% of the listed speed, then immediately steer using the listed homing speed.
- Cluster towers fire one shell. On impact, the shell deals explosion damage in an area and then spawns fragments. `Total damage if all connect` for cluster towers is `max explosion damage + all fragment damage`, which is a theoretical maximum.
- Cluster explosion damage falls off by up to 45% at the edge of the explosion radius.
- Cluster fragments always travel at `260` speed, regardless of tower level.

## Easy Bullet Tower

Single-target bullet tower. Fires one bullet straight at its target.

| Level | Build or upgrade step | Range | Fire interval | Projectiles per shot | Projectile speed | Damage each | Total damage if all connect |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | Build with `easy` question | 150 | 660 ms | 1 bullet | 420 | 13 | 13 |
| 2 | Upgrade with `easy` question | 168 | 540 ms | 1 bullet | 430 | 15 | 15 |
| 3 | Upgrade with `medium` question | 186 | 440 ms | 1 bullet | 440 | 17 | 17 |
| 4 | Upgrade with `hard` question | 205 | 360 ms | 1 bullet | 450 | 20 | 20 |
| 5 | Upgrade with `veryHard` question | 225 | 290 ms | 1 bullet | 465 | 24 | 24 |

## Medium Spray Tower

Shorter-range spread tower. Fires multiple pellets in a cone.

| Level | Build or upgrade step | Range | Fire interval | Projectiles per shot | Projectile speed | Damage each | Total damage if all connect |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | Build with `medium` question | 138 | 980 ms | 3 pellets | 390 | 7 | 21 |
| 2 | Upgrade with `easy` question | 158 | 910 ms | 4 pellets | 400 | 8 | 32 |
| 3 | Upgrade with `medium` question | 178 | 830 ms | 5 pellets | 410 | 9 | 45 |
| 4 | Upgrade with `hard` question | 198 | 760 ms | 6 pellets | 425 | 10 | 60 |
| 5 | Upgrade with `veryHard` question | 220 | 680 ms | 7 pellets | 440 | 12 | 84 |

Spray spread width by level:

| Level | Spread |
| --- | ---: |
| 1 | 0.42 radians |
| 2 | 0.48 radians |
| 3 | 0.54 radians |
| 4 | 0.60 radians |
| 5 | 0.66 radians |

## Hard Missile Tower

Long-range homing tower. Fires guided missiles that track a target.

| Level | Build or upgrade step | Range | Fire interval | Projectiles per shot | Homing speed | Damage each | Total damage if all connect |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | Build with `hard` question | 180 | 1320 ms | 1 missile | 165 | 25 | 25 |
| 2 | Upgrade with `easy` question | 202 | 1210 ms | 1 missile | 185 | 31 | 31 |
| 3 | Upgrade with `medium` question | 226 | 1110 ms | 2 missiles | 205 | 36 | 72 |
| 4 | Upgrade with `hard` question | 252 | 1010 ms | 2 missiles | 230 | 43 | 86 |
| 5 | Upgrade with `veryHard` question | 282 | 920 ms | 3 missiles | 255 | 50 | 150 |

Missile turn rate by level:

| Level | Turn rate |
| --- | ---: |
| 1 | 2.00 radians/sec |
| 2 | 2.25 radians/sec |
| 3 | 2.55 radians/sec |
| 4 | 2.85 radians/sec |
| 5 | 3.15 radians/sec |

## Very Hard Cluster Tower

Area-damage tower. Fires one cluster shell that explodes on hit and spawns fragments.

| Level | Build or upgrade step | Range | Fire interval | Projectiles per shot | Shell speed | Shell max damage | Explosion radius | Fragments on impact | Fragment damage each | Fragment speed | Total damage if all connect |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | Build with `veryHard` question | 170 | 1920 ms | 1 shell | 260 | 19 | 54 | 5 | 6 | 260 | 49 |
| 2 | Upgrade with `easy` question | 195 | 1780 ms | 1 shell | 275 | 24 | 64 | 6 | 8 | 260 | 72 |
| 3 | Upgrade with `medium` question | 220 | 1640 ms | 1 shell | 292 | 29 | 74 | 8 | 9 | 260 | 101 |
| 4 | Upgrade with `hard` question | 246 | 1500 ms | 1 shell | 310 | 35 | 86 | 9 | 11 | 260 | 134 |
| 5 | Upgrade with `veryHard` question | 274 | 1360 ms | 1 shell | 330 | 42 | 98 | 12 | 13 | 260 | 198 |

Cluster tower damage details:

- The shell itself does area damage inside the explosion radius.
- Enemies near the center take full shell damage.
- Enemies at the edge of the explosion radius take about 55% of shell damage.
- After the explosion, fragments spread in a full circle and can deal additional damage.