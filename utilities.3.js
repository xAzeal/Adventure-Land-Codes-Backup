// shared/utilities.js

function usePotions() {
  if (character.hp < character.max_hp * 0.5 && !is_on_cooldown("use_hp")) use_skill("use_hp");
  if (character.mp < character.max_mp * 0.6 && !is_on_cooldown("use_mp")) use_skill("use_mp");
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
    .filter((e) => e && !e.rip)
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
  var inv = character.items;
  const invLength = inv.length;
  const promises = [];
  for (let i = 0; i < invLength; i++) {
    for (let j = i; j < invLength; j++) {
      const a = inv[i];
      const b = inv[j];
      if (b === null) continue;
      if (a === null) {
        const temp = inv[i];
        inv[i] = inv[j];
        inv[j] = temp;
        promises.push(swap(i, j));
        continue;
      }
      if (a.name.localeCompare(b.name) === -1) {
        const temp = inv[i];
        inv[i] = inv[j];
        inv[j] = temp;
        promises.push(swap(i, j));
        continue;
      }
      if (a.name === b.name) {
        if ((a?.level ?? 0) > (b?.level ?? 0)) {
          const temp = inv[i];
          inv[i] = inv[j];
          inv[j] = temp;
          promises.push(swap(i, j));
        }
      }
    }
  }
  return await Promise.all(promises);
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
    if (!partyMerchant) {
        try {
            partyMerchant = get_entity(partyMerchant);
        } catch (e) {
            game_log(e);
            return;
        }
    }
	if (character.gold > 1000000) {
		const goldToSend = Math.floor(character.gold - 1000000);
		if (distance(character, partyMerchant) <= 250) {
    game_log(`Transferring ${goldToSend} gold to ${partyMerchant.name}`);
			send_gold(partyMerchant, goldToSend);
		} else {
			//console.log("Loot mule out of range for gold transfer.");
		}
	}
}

function sendItems(partyMerchant) {
	if (!partyMerchant || distance(character, partyMerchant) > 250) {
		//console.log("Loot mule out of range for item transfer.");
		return;
	}

	character.items.forEach((item, index) => {
		if (item && shouldTradeItem(item)) {
			send_item(partyMerchant, index, item.q ?? 1);
		}
	});

	for (let i = 37; i < 41; i++) {
		const item = character.items[i];
		if (item && item.q > 0) { 
			send_item(partyMerchant, i, item.q);
		}
	}
}

// function lookForMerch() {
// 	const merchEntity = get_entity(partyMerchant);
// 	if (!merchEntity) return;
// 	sendGold(partyMerchant);
// 	sendItems(partyMerchant);
// }
// // Run lookForMerch every second
// setInterval(lookForMerch, 1000);

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
    message_log("Inv_full!");
    send_cm(partyMerchant, { msg: "inv_full", ...obj });
  } else if (
    !isInvFull(2) &&
    (locate_item("mpot1") === -1 || getTotalQuantityOf("mpot1") < 100)
  ) {
    message_log("Need_Mana");
    send_cm(partyMerchant, { msg: "buy_mana", ...obj });
  } else if (
    !isInvFull(2) &&
    (locate_item("hpot1") === -1 || getTotalQuantityOf("hpot1") < 100)
  ) {
    message_log("Need_Health");
    send_cm(partyMerchant, { msg: "buy_hp", ...obj });
  } else {
    log("all good");
  }
}

if (character.ctype !== "merchant") {
  message_log("Selfchecking");
  setInterval(() => selfCheck(), 60000);
}

//
// Kiting ==============================================================================
let last_x = character.real_x;
let last_y = character.real_y;
let last_x2 = last_x; // Keep track of one more back to detect edges better
let last_y2 = last_y; //
let flipRotation = -1;
let flipRotationCooldown = 0;
let angle; // Your desired angle from the monster, in radians
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