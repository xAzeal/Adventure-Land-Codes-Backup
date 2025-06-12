// roles/warrior.js
const kiting = true;
const warriorOriginRangeRate = 1.1;

let warriorRangeRate = warriorOriginRangeRate;


async function roleAct() {
  loot();
  await scareAwayMobs(true);
  const target = getBestTarget();

  // Use charge if moving
  if (
    character.moving &&
    can_use("charge") &&
    character.mp > G.skills["charge"].mp
  ) {
    use_skill("charge");
  }

  // Taunt to protect allies
  const allyBeingAttacked = Object.values(parent.entities).find(
    (e) =>
      e.type === "monster" &&
      e.target == "xHealer" &&
      e.target !== character.name &&
     !e.cooperative
  );
 if (
    allyBeingAttacked &&
    can_use("taunt") &&
    character.mp > G.skills["taunt"].mp
  ) {
   use_skill("taunt", allyBeingAttacked);
   return;
  }

  if (target && can_attack(target)) {
    const entitiesInRange = Object.values(parent.entities).filter((e) =>
      is_in_range(e, "cleave")
    );

    const entitiesToStomp = Object.values(parent.entities).filter((e) =>
     is_in_range(e, "stomp")
    );

    // Cleave
    if (
      character.mp > G.skills["cleave"].mp &&
      !is_on_cooldown("cleave") &&
      entitiesInRange.length > 4
    ) {
      if (character.slots.mainhand?.name !== "bataxe") {
        await equipBatch({ mainhand: "bataxe", offhand: undefined });
      	}
      set_message("cleaving");
      use_skill("cleave");
      return;
    }
    // Normal attack
    if (character.slots.mainhand?.name !== "fireblade" || character.slots.offhand?.name !== "glolipop") {
      await equipBatch({ mainhand: "fireblade", offhand: "glolipop" });
    }
    if (can_attack(target)) {
      set_message("Attacking");
      await attack(target);
    }
    // Stomp
    if (
      character.mp > G.skills["stomp"].mp &&
      !is_on_cooldown("stomp") &&
      entitiesToStomp.length > 7
    ) {
      if (character.slots.mainhand?.name !== "basher") {
        await equipBatch({ mainhand: "basher", offhand: undefined });
      }
      set_message("stomping");
      use_skill("stomp");
      return;
    }
  }
  set_message("Running");
	if (kiting) {
     kite(target, warriorRangeRate);
	}
  angle = undefined;
  if (
    target &&
    target.range <= character.range &&
    target.speed > character.speed
  ) {
    warriorRangeRate = target.speed / character.speed;
  } else {
    warriorRangeRate = warriorOriginRangeRate;
  }

  set_message("Idle");
}

function on_draw(){
	clear_drawings();
	draw_circle(character.real_x, character.real_y, 160+character.range, 1.5, 0xffa1a1);
}