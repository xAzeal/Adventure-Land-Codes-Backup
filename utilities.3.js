// shared/utilities.js

function usePotions() {
  if (character.mp < character.max_mp - 500 && !is_on_cooldown("use_mp")) use_skill("use_mp");
  if (character.hp < character.max_hp * 0.75 && !is_on_cooldown("use_hp")) use_skill("use_hp");
}

function getLoadedCharacters() {
  const raw = get_active_characters?.();
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") return Object.values(raw);
  return [];
}

function getLowestHealth() {
  return parent.party_list
    .map((name) => get_entity(name))
    .filter((e) => e && !e.rip && distance(character, e) < character.range)
    .sort((a, b) => a.hp / a.max_hp - b.hp / b.max_hp)[0] || character;
}


function farm(monster, monsters) {
  send_cm(leader, {
        type: "changeMonster",
        mtype: monster,
      list: monsters
    });
}

async function sortInv() {
  const promises = [];
  const inv = character.items;

  for (let i = 0; i < inv.length; i++) {
    for (let j = i + 1; j < inv.length; j++) {
      const a = inv[i];
      const b = inv[j];

      if (!a && b) {
        promises.push(swap(i, j));
      } else if (a && b && a.name.localeCompare(b.name) > 0) {
        promises.push(swap(i, j));
      } else if (a && b && a.name === b.name && (a.level ?? 0) < (b.level ?? 0)) {
        promises.push(swap(i, j));
      }
    }
  }

  return Promise.all(promises);
}


function isInvFull(slots = 10) {
  return character.esize <= slots;
}

function shouldTradeItem(item) {
  if (!item) return false;
  const isBlocked = blockList.includes(item.name);
  const isScroll = item.name.startsWith("scroll") || item.name.startsWith("compoundscroll");
  const isLocked = item.locked || item.expires;
  const isHighLevel = item.level && item.level > 2;
  const isSpecial = item.name.includes("shiny");

  return !(isBlocked || isScroll || isLocked || isHighLevel || isSpecial);
}

// Function to transfer gold
function sendGold(partyMerchant) {
	const merchant = get_entity(partyMerchant);
	if (!merchant) return;

	if (character.gold > 5000000 && distance(character, merchant) <= 250) {
		const goldToSend = Math.floor(character.gold - 5000000);
		game_log(`Transferring ${goldToSend} gold to ${merchant.name}`);
		send_gold(merchant.name, goldToSend);
	}
}
function sendItems(partyMerchant) {
	const merchant = get_entity(partyMerchant);
	if (!merchant || distance(character, merchant) > 250) return;

	character.items.forEach((item, index) => {
		if (item && shouldTradeItem(item)) {
			send_item(merchant.name, index, item.q ?? 1);
		}
	});

	for (let i = 37; i < 41; i++) {
		const item = character.items[i];
		if (item && item.q > 0) {
			send_item(merchant.name, i, item.q);
		}
	}
}

function lookForMerch() {
	sendGold(partyMerchant);  
	sendItems(partyMerchant);
}


async function selfCheck() {
	game_log("hmmmm...");
	sortInv();
	
	const obj = {
    map: character.map,
    x: character.x,
    y: character.y,
    };
  // Merchant buff
  if (
    !character.s ||
    !character.s.mluck ||
    character.s.mluck.f !== partyMerchant
  ) {
    log("Asking our merchant for some luck!");
    send_cm(partyMerchant, { msg: "buff_mluck", ...obj });
  }

  // Inventory check and potions
  if (isInvFull(21)) {
    set_message("Inv_full!");
    send_cm(partyMerchant, { msg: "inv_full", ...obj });
  } else if (
    !isInvFull(2) &&
    (locate_item("mpot1") === -1 || getTotalQuantityOf("mpot1") < 100)
  ) {
    set_message("Need_Mana");
    send_cm(partyMerchant, { msg: "buy_mana", ...obj });
  } else if (
    !isInvFull(2) &&
    (locate_item("hpot1") === -1 || getTotalQuantityOf("hpot1") < 100)
  ) {
    set_message("Need_Health");
    send_cm(partyMerchant, { msg: "buy_hp", ...obj });
  } else {
    log("all good");
  }
}

if (character.ctype !== "merchant") {
  set_message("Selfchecking");
  setInterval(() => selfCheck(), 60000);
}

async function equipBatch(suggestedItems) {
  if (character.cc > 100) return;

  await Promise.all(
    Object.keys(suggestedItems).map(async (slot) => {
      if (character.slots[slot]?.name !== suggestedItems[slot]) unequip(slot);
    })
  );

  return equip_batch(
    Object.keys(suggestedItems)
      .filter((slot) => suggestedItems[slot] !== undefined)
      .map((slot) => ({
        slot,
        num: findMaxLevelItem(suggestedItems[slot]),
      }))
      .filter((equipInfo) => equipInfo.num >= 0)
  );
}

function findMaxLevelItem(id) {
  let maxSlot = -1;
  let maxLevel = 0;
  for (let iter = 0; iter < character.items.length; iter++) {
    const currentItem = character.items[iter];
    if (!(currentItem && currentItem.name === id)) continue;
    if (currentItem.level >= maxLevel) {
      maxSlot = iter;
      maxLevel = currentItem.level;
    }
  }
  return maxSlot;
}

async function scareMobs() {
      if (
        character.mp > 100 &&
        !is_on_cooldown("scare") &&
        target.max_hp > 3000 &&
        Object.keys(parent.entities).some(
          (entity) => parent.entities[entity]?.target === character.name
        )
      )
    if (character.slots.orb?.name !== "jacko") {
      await equipBatch({ orb: "jacko"});
    }
        use_skill("scare");
      break;
}
//
// Kiting ==============================================================================
let last_x = character.real_x;
let last_y = character.real_y;
let last_x2 = last_x; // Keep track of one more back to detect edges better
let last_y2 = last_y; //
let flipRotation = -1;
let flipRotationCooldown = 0;
let angle= 35; // Your desired angle from the monster, in radians
let flip_cooldown = 0;
let stuck_threshold = 2;
let basicRangeRate = 0.5; // Is used to reset
let rangeRate = basicRangeRate; // letiate range rate

function kite(target, rangeRate) {
	game_log("Running from : "+ target.name)
  if (!target || target.dead || target.rip || target.hp <= 0) {
    change_target();
    return;
  }

  if (!angle) {
    let diff_x = character.real_x - target.real_x;
    let diff_y = character.real_y - target.real_y;
    angle = Math.atan2(diff_y, diff_x);
  }

  var new_x = target.real_x + (character.range + character.xrange) * rangeRate * Math.cos(angle);
  var new_y = target.real_y + (character.range + character.xrange) * rangeRate * Math.sin(angle);

  let firstTimeKiting = false;
	
  if (!angle && target) {
    diff_x = character.real_x - target.real_x;
    diff_y = character.real_y - target.real_y;
    angle = Math.atan2(diff_y, diff_x);
    firstTimeKiting = true;
  }

  // Calculate the distance we moved since the last iteration
  chx = character.real_x - last_x;
  chy = character.real_y - last_y;
  dist_moved = Math.sqrt(chx * chx + chy * chy);

  // Calculate the distance we moved since the 2nd to last iteration
  chx2 = character.real_x - last_x2;
  chy2 = character.real_y - last_y2;
  dist_moved2 = Math.sqrt(chx2 * chx2 + chy2 * chy2);

  // If the dist_moved is low enough to indicate that we're stuck,
  // rotate our desired angle 45 degrees around the target
  if (dist_moved < stuck_threshold || dist_moved2 < stuck_threshold * 2) {
    if (flipRotationCooldown < 0) {
      flipRotation *= -1;
      flipRotationCooldown = 2;
    }
    angle = angle + (flipRotation * Math.PI) / 4;
  }

  // Calculate our new desired position. It will be our max attack range
  // from the target, at the angle described by var angle.
  var new_x =
    target.real_x +
    (character.range + character.xrange) * rangeRate * Math.cos(angle);
  var new_y =
    target.real_y +
    (character.range + character.xrange) * rangeRate * Math.sin(angle);

  // Save current position and last position
  last_x2 = last_x; // Keep track of one more back to detect edges better
  last_y2 = last_y; //
  last_x = character.real_x;
  last_y = character.real_y;

  // If target gets too close, maybe we're stuck? Flip the rotation some.
  // Has a cooldown after flipping so it doesn't thrash back and forth
  if (flip_cooldown > 18) {
    if (
      parent.distance(character, target) <=
      (character.range + character.xrange) * 0.1 * rangeRate
    ) {
      angle = angle + flipRotation * Math.PI * 2 * 0.35;
    }
    flip_cooldown = 0;
  }

  flip_cooldown++;
  flipRotationCooldown--;

  if (!is_in_range(target, "attack")) move(new_x, new_y);
  else if (!can_move_to(new_x, new_y)) {
    flipRotation *= -1;
  } else move(new_x, new_y);
}

async function scareAwayMobs(tankMode = false) {
  const attackers = Object.values(parent.entities).filter(
    (mob) =>
      mob?.target === character.name &&
      mob?.type === "monster" &&
      !mob.rip
  );

  const attackersCount = attackers.length;
  const hpPercent = character.hp / character.max_hp;

  const dangerThreshold = tankMode ? 6 : 3; // Warrior tolerates more mobs
  const hpThreshold = tankMode ? 0.4 : 0.6;  // Warrior tolerates lower HP

  const needScare =
    attackersCount >= dangerThreshold || hpPercent < hpThreshold;

  if (
    needScare &&
    !is_on_cooldown("scare") &&
    character.mp > 100 &&
    (locate_item("jacko") !== -1 || character.slots["orb"]?.name === "jacko")
  ) {
    if (character.slots["orb"]?.name !== "jacko") {
      await equipBatch({ orb: "jacko" });
    }
    game_log(`Scaring away ${attackersCount} mobs!`);
    await use_skill("scare");
  }
}
