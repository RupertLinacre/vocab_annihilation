# Tower Reference

This document describes the intended tower types and upgrade path. The numbers below are a balance target for tuning, so they may differ from the live implementation while the tower system is being adjusted.

## How towers are unlocked

- Answer an `easy` vocab question to build an `Easy Bullet Tower`.
- Answer a `medium` vocab question to build a `Medium Spray Tower`.
- Answer a `hard` vocab question to build a `Hard Missile Tower`.
- Answer a `veryHard` vocab question to build a `Very Hard Cluster Tower`.
- Answer a `veryHard` vocab question to build a `Very Hard Wall`.
- Answer a `veryHard` vocab question to call a `Very Hard Airstrike` on any map square.

## Upgrade path

Combat towers start at level 1 and are planned to upgrade through level 8. Walls and airstrikes have no upgrade path.

- Easy Bullet Tower upgrade difficulty trajectory: `easy -> easy -> medium -> medium -> hard -> hard -> veryHard`
- Medium Spray Tower upgrade difficulty trajectory: `medium -> medium -> hard -> hard -> hard -> veryHard -> veryHard`
- Hard Missile Tower upgrade difficulty trajectory: `hard -> hard -> hard -> veryHard -> veryHard -> veryHard -> veryHard`
- Very Hard Cluster Tower upgrade difficulty trajectory: `veryHard -> veryHard -> veryHard -> veryHard -> veryHard -> veryHard -> veryHard`
- Very Hard Wall upgrade difficulty trajectory: none
- Very Hard Airstrike upgrade difficulty trajectory: none

## Notes on interpreting the numbers

- Balance goal: spending a question on an upgrade should add roughly the same DPS value as spending that question on building a new tower of that difficulty.
- Balance goal: upgrades should scale slightly better than building sideways, so a high-level tower ends up meaningfully stronger than the same number of level 1 towers.
- `Projectiles per shot` is the number created when the tower fires once.
- `Projectile speed` is in game units per second.
- `Damage each` is the damage of each projectile or pellet.
- `Total damage if all connect` is the full volley damage if every projectile from that shot hits.
- Spray towers fire multiple pellets in an arc. The total assumes every pellet lands.
- Easy tower upgrades lean primarily on fire-rate improvement rather than large per-shot damage jumps.
- When a tower gains a larger volley, its fire interval can flatten or increase slightly to keep DPS progression smooth.
- Missile towers fire homing missiles. They launch at 55% of the listed speed, then immediately steer using the listed homing speed.
- Cluster towers fire one shell. On impact, the shell deals explosion damage in an area and then spawns fragments. `Total damage if all connect` for cluster towers is `max explosion damage + all fragment damage`, which is a theoretical maximum.
- Cluster explosion damage falls off by up to 45% at the edge of the explosion radius.
- Cluster fragments always travel at `260` speed, regardless of tower level.
- Walls are impassable to monsters and projectiles, matching tree blocking behavior.
- Walls have `10` health. Enemies that no longer have any path to the base attack walls instead of attacking the base.
- Airstrikes are one-shot calls. They can target any in-bounds square, detonate after a short flyover delay, kill enemies in the target square and its 8 neighbors, and apply nonlethal damage plus knockback across the rest of the map with distance falloff.

## Very Hard Wall

Blocking tower. It does not fire and cannot be upgraded.

- Level 1
	- Step: Build with `veryHard` question
	- Health: `10`
	- Upgrade path: none

## Very Hard Airstrike

One-shot strike. It is called on a target square, detonates after a short flyover, and cannot be upgraded.

- Level 1
	- Step: Build with `veryHard` question
	- Targeting: any in-bounds square
	- Delay: `500 ms`
	- Central kill zone: target square plus the surrounding `3x3` squares
	- Outer effect: map-wide nonlethal damage and knockback with distance falloff
	- Upgrade path: none

## Easy Bullet Tower

Single-target bullet tower. Fires one bullet straight at its target.

- Level 1
	- Step: Build with `easy` question
	- Range: `150`
	- Fire interval: `660 ms`
	- Projectiles per shot: `1 bullet`
	- Projectile speed: `420`
	- Damage each: `13`
	- Total damage if all connect: `13`
- Level 2
	- Step: Upgrade with `easy` question
	- Range: `168`
	- Fire interval: `330 ms`
	- Projectiles per shot: `1 bullet`
	- Projectile speed: `430`
	- Damage each: `13`
	- Total damage if all connect: `13`
- Level 3
	- Step: Upgrade with `easy` question
	- Range: `186`
	- Fire interval: `230 ms`
	- Projectiles per shot: `1 bullet`
	- Projectile speed: `440`
	- Damage each: `14`
	- Total damage if all connect: `14`
- Level 4
	- Step: Upgrade with `medium` question
	- Range: `205`
	- Fire interval: `180 ms`
	- Projectiles per shot: `1 bullet`
	- Projectile speed: `450`
	- Damage each: `16`
	- Total damage if all connect: `16`
- Level 5
	- Step: Upgrade with `medium` question
	- Range: `225`
	- Fire interval: `150 ms`
	- Projectiles per shot: `1 bullet`
	- Projectile speed: `465`
	- Damage each: `18`
	- Total damage if all connect: `18`
- Level 6
	- Step: Upgrade with `hard` question
	- Range: `246`
	- Fire interval: `130 ms`
	- Projectiles per shot: `1 bullet`
	- Projectile speed: `480`
	- Damage each: `20`
	- Total damage if all connect: `20`
- Level 7
	- Step: Upgrade with `hard` question
	- Range: `268`
	- Fire interval: `115 ms`
	- Projectiles per shot: `1 bullet`
	- Projectile speed: `495`
	- Damage each: `22`
	- Total damage if all connect: `22`
- Level 8
	- Step: Upgrade with `veryHard` question
	- Range: `291`
	- Fire interval: `105 ms`
	- Projectiles per shot: `1 bullet`
	- Projectile speed: `515`
	- Damage each: `24`
	- Total damage if all connect: `24`

## Medium Spray Tower

Shorter-range spread tower. Fires multiple pellets in a cone.

- Level 1
	- Step: Build with `medium` question
	- Range: `138`
	- Fire interval: `1000 ms`
	- Projectiles per shot: `3 pellets`
	- Projectile speed: `390`
	- Damage each: `8`
	- Total damage if all connect: `24`
	- Spread: `0.42 radians`
- Level 2
	- Step: Upgrade with `medium` question
	- Range: `158`
	- Fire interval: `670 ms`
	- Projectiles per shot: `4 pellets`
	- Projectile speed: `400`
	- Damage each: `8`
	- Total damage if all connect: `32`
	- Spread: `0.48 radians`
- Level 3
	- Step: Upgrade with `medium` question
	- Range: `178`
	- Fire interval: `600 ms`
	- Projectiles per shot: `5 pellets`
	- Projectile speed: `410`
	- Damage each: `9`
	- Total damage if all connect: `45`
	- Spread: `0.54 radians`
- Level 4
	- Step: Upgrade with `hard` question
	- Range: `198`
	- Fire interval: `550 ms`
	- Projectiles per shot: `6 pellets`
	- Projectile speed: `425`
	- Damage each: `10`
	- Total damage if all connect: `60`
	- Spread: `0.60 radians`
- Level 5
	- Step: Upgrade with `hard` question
	- Range: `220`
	- Fire interval: `500 ms`
	- Projectiles per shot: `7 pellets`
	- Projectile speed: `440`
	- Damage each: `10`
	- Total damage if all connect: `70`
	- Spread: `0.66 radians`
- Level 6
	- Step: Upgrade with `hard` question
	- Range: `242`
	- Fire interval: `460 ms`
	- Projectiles per shot: `8 pellets`
	- Projectile speed: `455`
	- Damage each: `10`
	- Total damage if all connect: `80`
	- Spread: `0.72 radians`
- Level 7
	- Step: Upgrade with `veryHard` question
	- Range: `266`
	- Fire interval: `430 ms`
	- Projectiles per shot: `9 pellets`
	- Projectile speed: `475`
	- Damage each: `10`
	- Total damage if all connect: `90`
	- Spread: `0.78 radians`
- Level 8
	- Step: Upgrade with `veryHard` question
	- Range: `290`
	- Fire interval: `410 ms`
	- Projectiles per shot: `10 pellets`
	- Projectile speed: `495`
	- Damage each: `10`
	- Total damage if all connect: `100`
	- Spread: `0.84 radians`

## Hard Missile Tower

Long-range homing tower. Fires guided missiles that track a target.

- Level 1
	- Step: Build with `hard` question
	- Range: `180`
	- Fire interval: `920 ms`
	- Projectiles per shot: `1 missile`
	- Homing speed: `165`
	- Launch speed: `90.75` (55% of homing speed)
	- Damage each: `24`
	- Total damage if all connect: `24`
	- Turn rate: `2.00 radians/sec`
- Level 2
	- Step: Upgrade with `hard` question
	- Range: `202`
	- Fire interval: `530 ms`
	- Projectiles per shot: `1 missile`
	- Homing speed: `185`
	- Launch speed: `101.75` (55% of homing speed)
	- Damage each: `27`
	- Total damage if all connect: `27`
	- Turn rate: `2.25 radians/sec`
- Level 3
	- Step: Upgrade with `hard` question
	- Range: `226`
	- Fire interval: `650 ms`
	- Projectiles per shot: `2 missiles`
	- Homing speed: `205`
	- Launch speed: `112.75` (55% of homing speed)
	- Damage each: `28`
	- Total damage if all connect: `56`
	- Turn rate: `2.55 radians/sec`
- Level 4
	- Step: Upgrade with `hard` question
	- Range: `252`
	- Fire interval: `540 ms`
	- Projectiles per shot: `2 missiles`
	- Homing speed: `230`
	- Launch speed: `126.5` (55% of homing speed)
	- Damage each: `31`
	- Total damage if all connect: `62`
	- Turn rate: `2.85 radians/sec`
- Level 5
	- Step: Upgrade with `veryHard` question
	- Range: `282`
	- Fire interval: `650 ms`
	- Projectiles per shot: `3 missiles`
	- Homing speed: `255`
	- Launch speed: `140.25` (55% of homing speed)
	- Damage each: `32`
	- Total damage if all connect: `96`
	- Turn rate: `3.15 radians/sec`
- Level 6
	- Step: Upgrade with `veryHard` question
	- Range: `314`
	- Fire interval: `560 ms`
	- Projectiles per shot: `3 missiles`
	- Homing speed: `280`
	- Launch speed: `154` (55% of homing speed)
	- Damage each: `34`
	- Total damage if all connect: `102`
	- Turn rate: `3.45 radians/sec`
- Level 7
	- Step: Upgrade with `veryHard` question
	- Range: `348`
	- Fire interval: `620 ms`
	- Projectiles per shot: `4 missiles`
	- Homing speed: `310`
	- Launch speed: `170.5` (55% of homing speed)
	- Damage each: `35`
	- Total damage if all connect: `140`
	- Turn rate: `3.80 radians/sec`
- Level 8
	- Step: Upgrade with `veryHard` question
	- Range: `386`
	- Fire interval: `550 ms`
	- Projectiles per shot: `4 missiles`
	- Homing speed: `340`
	- Launch speed: `187` (55% of homing speed)
	- Damage each: `37`
	- Total damage if all connect: `148`
	- Turn rate: `4.15 radians/sec`

## Very Hard Cluster Tower

Area-damage tower. Fires one cluster shell that explodes on hit and spawns fragments.

- Level 1
	- Step: Build with `veryHard` question
	- Range: `170`
	- Fire interval: `1600 ms`
	- Projectiles per shot: `1 shell`
	- Shell speed: `260`
	- Shell max damage: `19`
	- Explosion radius: `54`
	- Fragments on impact: `5`
	- Fragment damage each: `6`
	- Fragment speed: `260`
	- Total damage if all connect: `49`
- Level 2
	- Step: Upgrade with `veryHard` question
	- Range: `195`
	- Fire interval: `1100 ms`
	- Projectiles per shot: `1 shell`
	- Shell speed: `275`
	- Shell max damage: `24`
	- Explosion radius: `64`
	- Fragments on impact: `6`
	- Fragment damage each: `8`
	- Fragment speed: `260`
	- Total damage if all connect: `72`
- Level 3
	- Step: Upgrade with `veryHard` question
	- Range: `220`
	- Fire interval: `970 ms`
	- Projectiles per shot: `1 shell`
	- Shell speed: `292`
	- Shell max damage: `29`
	- Explosion radius: `74`
	- Fragments on impact: `8`
	- Fragment damage each: `9`
	- Fragment speed: `260`
	- Total damage if all connect: `101`
- Level 4
	- Step: Upgrade with `veryHard` question
	- Range: `246`
	- Fire interval: `930 ms`
	- Projectiles per shot: `1 shell`
	- Shell speed: `310`
	- Shell max damage: `35`
	- Explosion radius: `86`
	- Fragments on impact: `9`
	- Fragment damage each: `11`
	- Fragment speed: `260`
	- Total damage if all connect: `134`
- Level 5
	- Step: Upgrade with `veryHard` question
	- Range: `274`
	- Fire interval: `1050 ms`
	- Projectiles per shot: `1 shell`
	- Shell speed: `330`
	- Shell max damage: `42`
	- Explosion radius: `98`
	- Fragments on impact: `12`
	- Fragment damage each: `13`
	- Fragment speed: `260`
	- Total damage if all connect: `198`
- Level 6
	- Step: Upgrade with `veryHard` question
	- Range: `304`
	- Fire interval: `1060 ms`
	- Projectiles per shot: `1 shell`
	- Shell speed: `352`
	- Shell max damage: `50`
	- Explosion radius: `112`
	- Fragments on impact: `13`
	- Fragment damage each: `15`
	- Fragment speed: `260`
	- Total damage if all connect: `245`
- Level 7
	- Step: Upgrade with `veryHard` question
	- Range: `336`
	- Fire interval: `1040 ms`
	- Projectiles per shot: `1 shell`
	- Shell speed: `376`
	- Shell max damage: `59`
	- Explosion radius: `126`
	- Fragments on impact: `14`
	- Fragment damage each: `16`
	- Fragment speed: `260`
	- Total damage if all connect: `283`
- Level 8
	- Step: Upgrade with `veryHard` question
	- Range: `370`
	- Fire interval: `1100 ms`
	- Projectiles per shot: `1 shell`
	- Shell speed: `402`
	- Shell max damage: `69`
	- Explosion radius: `142`
	- Fragments on impact: `16`
	- Fragment damage each: `18`
	- Fragment speed: `260`
	- Total damage if all connect: `357`

Cluster tower damage details:

- The shell itself does area damage inside the explosion radius.
- Enemies near the center take full shell damage.
- Enemies at the edge of the explosion radius take about 55% of shell damage.
- After the explosion, fragments spread in a full circle and can deal additional damage.