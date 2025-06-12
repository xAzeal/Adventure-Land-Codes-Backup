// priest.js

game_log("THE HOLY LIGHT") 

async function roleAct() {
  loot();
  await scareAwayMobs();
  const target = getBestTarget();
  const ally = getLowestHealth();

  // Heal first
  if (
    ally &&
    ally.hp < ally.max_hp * 0.7 &&
    can_use("heal") &&
    is_in_range(ally, "heal")
  ) {
    use_skill("heal", ally);
    set_message("Heal " + ally.name);
    return;
  }

  // Attack fallback
  if (target && can_attack(target)) {
    attack(target);
    set_message("Attack");
  }
  scareMobs();
  set_message("Idle");
}