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
	- Fire interval: `540 ms`
	- Projectiles per shot: `1 bullet`
	- Projectile speed: `430`
	- Damage each: `15`
	- Total damage if all connect: `15`
- Level 3
	- Step: Upgrade with `medium` question
	- Range: `186`
	- Fire interval: `440 ms`
	- Projectiles per shot: `1 bullet`
	- Projectile speed: `440`
	- Damage each: `17`
	- Total damage if all connect: `17`
- Level 4
	- Step: Upgrade with `hard` question
	- Range: `205`
	- Fire interval: `360 ms`
	- Projectiles per shot: `1 bullet`
	- Projectile speed: `450`
	- Damage each: `20`
	- Total damage if all connect: `20`
- Level 5
	- Step: Upgrade with `veryHard` question
	- Range: `225`
	- Fire interval: `290 ms`
	- Projectiles per shot: `1 bullet`
	- Projectile speed: `465`
	- Damage each: `24`
	- Total damage if all connect: `24`

## Medium Spray Tower

Shorter-range spread tower. Fires multiple pellets in a cone.

- Level 1
	- Step: Build with `medium` question
	- Range: `138`
	- Fire interval: `980 ms`
	- Projectiles per shot: `3 pellets`
	- Projectile speed: `390`
	- Damage each: `7`
	- Total damage if all connect: `21`
	- Spread: `0.42 radians`
- Level 2
	- Step: Upgrade with `easy` question
	- Range: `158`
	- Fire interval: `910 ms`
	- Projectiles per shot: `4 pellets`
	- Projectile speed: `400`
	- Damage each: `8`
	- Total damage if all connect: `32`
	- Spread: `0.48 radians`
- Level 3
	- Step: Upgrade with `medium` question
	- Range: `178`
	- Fire interval: `830 ms`
	- Projectiles per shot: `5 pellets`
	- Projectile speed: `410`
	- Damage each: `9`
	- Total damage if all connect: `45`
	- Spread: `0.54 radians`
- Level 4
	- Step: Upgrade with `hard` question
	- Range: `198`
	- Fire interval: `760 ms`
	- Projectiles per shot: `6 pellets`
	- Projectile speed: `425`
	- Damage each: `10`
	- Total damage if all connect: `60`
	- Spread: `0.60 radians`
- Level 5
	- Step: Upgrade with `veryHard` question
	- Range: `220`
	- Fire interval: `680 ms`
	- Projectiles per shot: `7 pellets`
	- Projectile speed: `440`
	- Damage each: `12`
	- Total damage if all connect: `84`
	- Spread: `0.66 radians`

## Hard Missile Tower

Long-range homing tower. Fires guided missiles that track a target.

- Level 1
	- Step: Build with `hard` question
	- Range: `180`
	- Fire interval: `1320 ms`
	- Projectiles per shot: `1 missile`
	- Homing speed: `165`
	- Launch speed: `90.75` (55% of homing speed)
	- Damage each: `25`
	- Total damage if all connect: `25`
	- Turn rate: `2.00 radians/sec`
- Level 2
	- Step: Upgrade with `easy` question
	- Range: `202`
	- Fire interval: `1210 ms`
	- Projectiles per shot: `1 missile`
	- Homing speed: `185`
	- Launch speed: `101.75` (55% of homing speed)
	- Damage each: `31`
	- Total damage if all connect: `31`
	- Turn rate: `2.25 radians/sec`
- Level 3
	- Step: Upgrade with `medium` question
	- Range: `226`
	- Fire interval: `1110 ms`
	- Projectiles per shot: `2 missiles`
	- Homing speed: `205`
	- Launch speed: `112.75` (55% of homing speed)
	- Damage each: `36`
	- Total damage if all connect: `72`
	- Turn rate: `2.55 radians/sec`
- Level 4
	- Step: Upgrade with `hard` question
	- Range: `252`
	- Fire interval: `1010 ms`
	- Projectiles per shot: `2 missiles`
	- Homing speed: `230`
	- Launch speed: `126.5` (55% of homing speed)
	- Damage each: `43`
	- Total damage if all connect: `86`
	- Turn rate: `2.85 radians/sec`
- Level 5
	- Step: Upgrade with `veryHard` question
	- Range: `282`
	- Fire interval: `920 ms`
	- Projectiles per shot: `3 missiles`
	- Homing speed: `255`
	- Launch speed: `140.25` (55% of homing speed)
	- Damage each: `50`
	- Total damage if all connect: `150`
	- Turn rate: `3.15 radians/sec`

## Very Hard Cluster Tower

Area-damage tower. Fires one cluster shell that explodes on hit and spawns fragments.

- Level 1
	- Step: Build with `veryHard` question
	- Range: `170`
	- Fire interval: `1920 ms`
	- Projectiles per shot: `1 shell`
	- Shell speed: `260`
	- Shell max damage: `19`
	- Explosion radius: `54`
	- Fragments on impact: `5`
	- Fragment damage each: `6`
	- Fragment speed: `260`
	- Total damage if all connect: `49`
- Level 2
	- Step: Upgrade with `easy` question
	- Range: `195`
	- Fire interval: `1780 ms`
	- Projectiles per shot: `1 shell`
	- Shell speed: `275`
	- Shell max damage: `24`
	- Explosion radius: `64`
	- Fragments on impact: `6`
	- Fragment damage each: `8`
	- Fragment speed: `260`
	- Total damage if all connect: `72`
- Level 3
	- Step: Upgrade with `medium` question
	- Range: `220`
	- Fire interval: `1640 ms`
	- Projectiles per shot: `1 shell`
	- Shell speed: `292`
	- Shell max damage: `29`
	- Explosion radius: `74`
	- Fragments on impact: `8`
	- Fragment damage each: `9`
	- Fragment speed: `260`
	- Total damage if all connect: `101`
- Level 4
	- Step: Upgrade with `hard` question
	- Range: `246`
	- Fire interval: `1500 ms`
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
	- Fire interval: `1360 ms`
	- Projectiles per shot: `1 shell`
	- Shell speed: `330`
	- Shell max damage: `42`
	- Explosion radius: `98`
	- Fragments on impact: `12`
	- Fragment damage each: `13`
	- Fragment speed: `260`
	- Total damage if all connect: `198`

Cluster tower damage details:

- The shell itself does area damage inside the explosion radius.
- Enemies near the center take full shell damage.
- Enemies at the edge of the explosion radius take about 55% of shell damage.
- After the explosion, fragments spread in a full circle and can deal additional damage.