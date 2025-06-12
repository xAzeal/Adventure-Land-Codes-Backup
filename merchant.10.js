const bankItems = [
  "rattail", "spores", "seashell", "crabclaw", "beewings", "ascale", "bfur", "vitscroll","spidersilk", "pvptoken", "pumpkinspice", "eggnog", "offeringp", "offering", "monstertoken", "hotchocolate", "gum", "essenceofgreed", "elixirint0", "elixirdex0", "cscroll2", "cryptkey", "cake", "elixirstr0", "elixirstr1", "elixirvit0", "elixirvit1", "elixirvit2", "essenceoflife", "frozenkey", "funtoken", "egg0", "egg1", "egg2", "egg3", "egg4", "egg5", "egg6", "egg7", "egg8", "egg9", "whiteegg", "sstinger", "spores", "snakefang", "seashell", "rattail", "pstem", "poison", "pleather", "lspores", "lotusf", "lostearring", "leather", "ink", "gslime", "frogt", "forscroll", "feather0", "essenceofnature", "essenceoffrost", "dexscroll", "cshell",
  "crabclaw", "carrot", "bwing", "btusk", "bfur", "beewings", "ascale"
];

const junkList = [
  "snowball", "cclaw", "dagger", "coat", "pants", "gloves", "shoes", "helmet", "coat1","pants1","gloves1", "shoes1", "helmet1", "rednose", "stinger", "dexring", "intring", "strring", "vitring", "vitearring", "strearring", "skullamulet", "stinger", "lantern", "hpamulet", "gphelmet", "phelmet", "throwingstars", "smoke", "sword", "spear", "blade", "wgloves", "wcap", "wshoes", "wattire", "t2bow", "wbreeches", "hpbelt", "slimestaff"
];

const xchangeList = [
  { name: "candy1", quantity: 1 },
  { name: "candy0", quantity: 1 },
  { name: "gem0", quantity: 1 },
  { name: "gem1", quantity: 1 },
  { name: "weaponbox", quantity: 1 },
  { name: "armorbox", quantity: 1 },
  { name: "mistletoe", quantity: 1 },
  { name: "candycane", quantity: 1 },
  { name: "greenenvelope", quantity: 1 },
  { name: "goldenegg", quantity: 1 },
  { name: "basketofeggs", quantity: 1 },
  { name: "5bucks", quantity: 1 },
  { name: "candypop", quantity: 10 },
];

const upgradeTargets = {
  "fireblade": 6,
  "firestaff": 6,
  "firebow": 7,
  "poucher": 8,
  "crossbow": 5,
  "t3bow": 4,
  "basher": 8,
  "wbook": 4,
  "ringsj": 4,
  "intamulet": 3,
  "dexamulet": 3
};

const compoundTargets = ["wbook0", "ringsj", "intamulet", "dexamulet", "hpbelt"];

let dutyTarget = null;
let lastSmartMove = 0;
const fishingLocation = { map: "main", x: -1368, y: 80 };
const miningLocation = { map: "tunnel", x: 280, y: -40 };

// === Main Loop ===
async function roleAct() {
  if (character.rip) return;
  if (!is_on_cooldown("regen_mp")){
  use_skill("regen_mp");
  }
  await scareAwayMobs();
  if (character.moving && character.stand || isInvFull()) close_stand();
  if (!character.moving && !character.stand && isAtHome()) open_stand();

  if (isInvFull(6)) {
    // First try SELL and COMPOUND before bank
    if (hasSellableItems() || hasCompoundableItems()) {
      set_message("Selling first");
      await sellGarbage();

      set_message("Compounding first");
      await compoundItems();
    }

    // Check again — if still full and has bankable items, go bank
    if (isInvFull(6) && hasBankableItems()) {
      set_message("Banking");
      await moveSmart("bank");
      set_message("Stashing");
      await bankAllTradableItems();
      await sortAndBank();
      return true;
    }
  }

  if (dutyTarget && !isInvFull()) {
    await handleDutyTarget();
    return;
  }

  if (character.map !== "main") {
    set_message("Relocating");
    await moveSmart({ map: "main", x: -135, y: -135 });
    return true;
  }

  set_message("Selling");
  await sellGarbage();

  set_message("Exchanging");
  await exchangeItems();
  await exchangeMines();

  set_message("Compounding");
  await compoundItems();

  set_message("Upgrading");
  await upgradeItems();


  const didMoveHome = await handleMerchantInventory();
  if (didMoveHome) return;

  await goFishing();
  await goMining();

  set_message("Chillin");
}

function isAtHome() {
  return character.map === "main" && character.real_x === -135 && character.real_y === -135;
}

async function moveSmart(dest, cooldown = 3000) {
  if (Date.now() - lastSmartMove > cooldown) {
    lastSmartMove = Date.now();
    close_stand();
    await equipBroom();
    await smart_move(dest);
  }
}

function hasSellableItems() {
  return character.items.some(item => item && shouldSell(item));
}

function hasCompoundableItems() {
  return character.items.some(item => item && isCompoundable(item));
}

function hasBankableItems() {
  return character.items.some(item => item && shouldBank(item));
}

async function equipBroom() {
  if (character.slots.mainhand?.name === "broom") return;
  const broom = locate_item("broom");
  if (broom !== -1) {
    await equip_batch([{ slot: "mainhand", num: broom }]);
  } else {
    if (character.slots.mainhand) unequip("mainhand");
    if (character.slots.offhand) unequip("offhand");
  }
}

async function handleDutyTarget() {
  const mainTarget = get_entity(dutyTarget?.name);
  if (!mainTarget) return;

  if (character.map !== dutyTarget.map || distance(character, mainTarget) > 150) {
    await moveSmart({ map: dutyTarget.map, x: dutyTarget.x, y: dutyTarget.y });
    return;
  }

  await fulfillAndCollectFrom(mainTarget.name, dutyTarget);

  for (const name of parent.party_list) {
    if (name === character.name || name === dutyTarget.name) continue;
    const ally = get_entity(name);
    if (!ally || distance(character, ally) > 250) continue;

    await fulfillAndCollectFrom(ally.name);
  }

  dutyTarget = null;
}

async function handleMerchantInventory() {
  if (!isInventoryProblematic()) return false;

  if (isInvFull(15)) {
    set_message("Banking");
    await moveSmart("bank");
    set_message("Stashing");
    await bankAllTradableItems();
    await sortAndBank();
    return true;
  }

  if (character.map !== "main") {
    set_message("Relocating");
    await moveSmart({ map: "main", x: -135, y: -135 });
    return true;
  }

if (canSell()) {
  set_message("Selling");
  await sellGarbage();
}

if (canExchange()) {
  set_message("Exchanging");
  await exchangeItems();
  await exchangeMines();
}

if (canCompound()) {
  set_message("Compounding");
  await compoundItems();
}

if (canUpgrade()) {
  set_message("Upgrading");
  await upgradeItems();
}

  return false;
}

function isInventoryProblematic() {
  return isInvFull(15) || character.items.some(item => item && (shouldBank(item) || isCompoundable(item) || isUpgradeable(item)));
}

// === START Gathering ===

async function goFishing() {
  if (isInvFull() || character.c.fishing) return;

  if (character.map !== fishingLocation.map || distance(character, fishingLocation) > 20) {
    await moveSmart(fishingLocation);
    return;
  }

  if (character.slots.mainhand?.name !== "rod" && locate_item("rod") === -1) {
    moveHome();
    return;
  }

  if (character.mp > 120 && !character.c.fishing) {
    if (character.slots.mainhand?.name !== "rod" && locate_item("rod") !== -1) {
      await equipBatch({ mainhand: "rod", offhand: undefined });
    }
    log("Fishing!");
    await use_skill("fishing");
  }
}

async function goMining() {
  if (isInvFull() || character.c.mining) return;

  if (character.map !== miningLocation.map || distance(character, miningLocation) > 20) {
    await moveSmart(miningLocation);
    return;
  }

  if (character.slots.mainhand?.name !== "pickaxe" && locate_item("pickaxe") === -1) {
    return;
  }

  if (character.mp > 120 && !character.c.mining) {
    if (character.slots.mainhand?.name !== "pickaxe" && locate_item("pickaxe") !== -1) {
      await equipBatch({ mainhand: "pickaxe", offhand: undefined });
    }
    log("Mining!");
    await use_skill("mining");
  }
}

async function sellGarbage() {
  for (let i = 0; i < character.items.length; i++) {
    const item = character.items[i];
    if (item && shouldSell(item)) {
      game_log(`Selling ${item.name} x${item.q}`);
      await sell(i, item.q ?? 1);
      await sleep(100);
    }
  }
}

function canSell() {
  const npc = get_nearest_npc();
  return npc && distance(character, npc) <= 400 && npc.role === "merchant";
}

function canUpgrade() {
  const npc = get_nearest_npc();
  return npc && distance(character, npc) <= 400 && npc.role === "newupgrade";
}

function canCompound() {
  const npc = get_nearest_npc();
  return npc && distance(character, npc) <= 400 && npc.role === "compound";
}

function canCompound() {
  const npc = get_nearest_npc();
  return npc && distance(character, npc) <= 400 && npc.role === "exchange";
}

function exchangeItems() {
  if (isInvFull(6)) return;

  let slot = undefined;
  xchangeList.map((item) => {
    if (
      locate_item(item.name) !== -1 &&
      character.items[locate_item(item.name)].q >= item.quantity
    )
      slot = locate_item(item.name);
  });

  if (slot !== undefined)
    exchange(slot).catch((e) => {
      switch (e.response) {
        case "inventory_full":
          handleMerchantInventory();
      }
    });
}

async function exchangeMines() {
  const itemName = ["gemfragment"];
  let slot = undefined;
  itemName.map((name) => {
    if (locate_item(name) !== -1) slot = locate_item(name);
  });

  if (slot && character.items[slot].q >= 50) {
    await smart_move(miningLocation);
    await exchange(slot).catch((e) => {
      switch (e.response) {
        case "inventory_full":
          dutyTarget = null;
      }
    });
  }
}

async function compoundItems() {
  const groups = {};
  for (let i = 0; i < character.items.length; i++) {
    const item = character.items[i];
    if (!item || !isCompoundable(item)) continue;

    const key = item.name + "_" + (item.level ?? 0);
    if (!groups[key]) groups[key] = [];
    groups[key].push(i);
  }

  for (const key in groups) {
    const indices = groups[key];
    while (indices.length >= 3) {
      const [i1, i2, i3] = indices.splice(0, 3);
      const scrollSlot = findCompoundScroll();
      if (scrollSlot === -1) return;

      await compound(i1, i2, i3, scrollSlot);
      await sleep(500);
    }
  }
}

async function upgradeItems() {
  for (let i = 0; i < character.items.length; i++) {
    const item = character.items[i];
    if (!item || !isUpgradeable(item)) continue;

    const scrollSlot = findUpgradeScroll();
    if (scrollSlot !== -1) {
      game_log(`Upgrading ${item.name} to level ${item.level + 1}`);
      await upgrade(i, scrollSlot);
      await sleep(500);
    } else {
      game_log("No upgrade scroll found");
      return;
    }
  }
}

async function bankAllTradableItems() {
  for (let i = 0; i < character.items.length; i++) {
    const item = character.items[i];
    if (item && shouldBank(item)) {
      let stored = false;

      const validPacks = Object.keys(character.bank).filter(p => p.startsWith("items"));
      for (const packName of validPacks) {
        if (stored) break;
        const bankPack = character.bank[packName];
        if (!bankPack) continue;

        for (let j = 0; j < bankPack.length; j++) {
          if (!bankPack[j]) {
            await bank_store(i, packName);
            stored = true;
            await sleep(100);
            break;
          }
        }
      }

      if (!stored) {
        game_log(`No space to bank item: ${item.name}`);
      }
    }
  }
}

async function sortAndBank() {
  set_message("Sorting Bank");
  await sortBank();
  set_message("Sorting Inventory");
  await sortInv();
}

function shouldBank(item) {
  if (!item) return false;
  if (item.shiny || item.level >= 5) return true;
  return bankItems.includes(item.name) || isMaxUpgraded(item);
}

function shouldSell(item) {
  if (!item) return false;
  if (item.shiny || item.level >= 2) return false;
  return junkList.includes(item.name);
}

function isCompoundable(item) {
  return item && G.items[item.name]?.compound && item.level < 3 && compoundTargets.includes(item.name);
}

function isUpgradeable(item) {
  if (!item || !G.items[item.name]?.upgrade) return false;
  const maxLevel = upgradeTargets[item.name];
  return maxLevel !== undefined && item.level < maxLevel;
}

function isMaxUpgraded(item) {
  const maxLevel = upgradeTargets[item.name];
  return maxLevel !== undefined && item.level >= maxLevel;
}

function findUpgradeScroll() {
  const priority = ["scroll2", "scroll1", "scroll0"];
  for (const name of priority) {
    const slot = locate_item(name);
    if (slot !== -1) return slot;
  }
  return -1;
}

function findCompoundScroll() {
  const scrollNames = ["cscroll2", "cscroll1", "cscroll0"];
  for (const name of scrollNames) {
    const slot = locate_item(name);
    if (slot !== -1) {
      game_log(`Using scroll "${name}" in slot ${slot}`);
      return slot;
    }
  }
  game_log("No usable compound scroll found");
  return -1;
}

async function deliverItemsTo(targetName, items = {}) {
  if (typeof items !== "object" || Array.isArray(items)) {
    game_log(`Invalid items passed to deliverItemsTo for ${targetName}`);
    return false;
  }

  const target = get_entity(targetName);
  if (!target || distance(character, target) > 250) {
    game_log(`Target ${targetName} not nearby for delivery.`);
    return false;
  }

  for (const itemName in items) {
    const desiredAmount = items[itemName];

    let remaining = desiredAmount;
    while (remaining > 0) {
      const slot = locate_item(itemName);
      if (slot === -1) {
        game_log(`Not enough ${itemName} in inventory to complete delivery`);
        break;
      }

      const item = character.items[slot];
      const sendAmount = Math.min(item.q ?? 1, remaining);

      game_log(`Sending ${sendAmount} x ${itemName} to ${targetName}`);
      await send_item(targetName, slot, sendAmount);
      await sleep(300);

      remaining -= sendAmount;
    }
  }

  return true;
}
