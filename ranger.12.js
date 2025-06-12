// roles/ranger.js

async function roleAct() {
	loot();
	await scareAwayMobs(); 
  const target = getBestTarget();

  if (
    target &&
    !target.s?.marked &&
    can_use("huntersmark") &&
    target.hp > 3000
  ) {
    use_skill("huntersmark", target);
  }

  if (can_use("supershot") && target && target.hp > 2000) {
    use_skill("supershot", target);
  }

  if (target && can_attack(target)) {
    if (character.mp > 300 && !is_on_cooldown("3shot") && target.attack < 321)
      use_skill("3shot", target);
    attack(target);
    set_message("Shooting");
    return;
  }

  set_message("Idle");
}