// roles/mage.js

async function roleAct() {
  const target = getBestTarget();

  if (can_use("burst") && target && target.hp > 5000) {
    use_skill("burst", target);
  }

  if (target && can_attack(target)) {
    attack(target);
    set_message("Casting");
    return;
  }

  set_message("Idle");
}
