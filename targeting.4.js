// targeting.4.js

// === Targeting Toggles (Customize per class) ===
const targetingPrefs = {
  useCM: follow_friend,
  assistLeader: true,
  useOneShots: character.ctype === "ranger",
  useAoE: character.ctype === "warrior" || character.ctype === "mage",
  prioritizeEvent: true,
  prioritizeBoss: character.ctype === "warrior",
  opportunisticKills: character.ctype === "ranger",
};

// === Targeting Helpers ===
function getMonstersAttackingMe() {
  return Object.values(parent.entities).filter(
    (e) =>
      e.type === "monster" &&
      !e.rip &&
      can_attack(e) &&
      (e.target === character.name || partyMems.includes(e.target)) &&
      e.attack < character.max_hp * 0.25 &&
	  e.hp < character.attack / 5
  );
}

function getOneShotTargets(threshold = 800) {
  return Object.values(parent.entities).filter(
    (e) => e.type === "monster" && !e.rip && e.hp <= threshold && can_attack(e)
  );
}

function getTankTarget(tankName = "VertVertReal") {
  return Object.values(parent.entities).find(
    (e) => e.type === "monster" && e.target === tankName && can_attack(e)
  );
}

function getEventMonsters() {
  const eventMobs = ["snowman", "grinch", "franky", "phoenix"];
  return Object.values(parent.entities).filter(
    (e) => eventMobs.includes(e.mtype) && !e.rip && can_attack(e)
  );
}

function getBossMonsters() {
  return Object.values(parent.entities).filter(
    (e) => e.type === "monster" && e.hp > 100000 && !e.rip && can_attack(e)
  );
}

function getMultiTargetClusters(minCount = 3, radius = 120) {
  const mobs = Object.values(parent.entities).filter(
    (e) => e.type === "monster" && !e.rip && can_attack(e)
  );
  return mobs.filter((m) =>
    mobs.filter((o) => distance(m, o) <= radius).length >= minCount
  );
}

function getFastKillsNearPath(maxHP = 800, maxDistance = 200) {
  return Object.values(parent.entities).find(
    (e) =>
      e.type === "monster" &&
      !e.rip &&
      e.hp <= maxHP &&
      e.attack < 200 &&
      can_attack(e) &&
      distance(character, e) <= maxDistance
  );
}

function getBestTarget() {
  // Step 1: Protect yourself or allies
  const attackers = getMonstersAttackingMe();
  if (attackers.length) {
    set_message("Defending");
    return attackers.sort((a, b) => distance(character, a) - distance(character, b))[0];
  }

  // Step 2: Use CM-shared target
  if (targetingPrefs.useCM && remoteTarget && can_attack(remoteTarget)) {
    return remoteTarget;
  }

  // Step 3: Assist leader
  if (targetingPrefs.assistLeader) {
    const leaderEntity = get_entity(leader);
    const leaderTarget = leaderEntity && get_target_of(leaderEntity);
    if (leaderTarget && can_attack(leaderTarget)) return leaderTarget;
  }

  // Step 4: Prioritize event mobs
  if (targetingPrefs.prioritizeEvent) {
    const event = getEventMonsters();
    if (event.length) return event[0];
  }

  // Step 5: Prioritize boss
  if (targetingPrefs.prioritizeBoss) {
    const bosses = getBossMonsters();
    if (bosses.length) return bosses[0];
  }

  // Step 6: AoE cluster
  if (targetingPrefs.useAoE) {
    const clustered = getMultiTargetClusters();
    if (clustered.length) return clustered[0];
  }

  // Step 7: One-shot targets
  if (targetingPrefs.useOneShots) {
    const lowHP = getOneShotTargets();
    if (lowHP.length) return lowHP[0];
  }

  // Step 8: Farming spot fallback
  const spot = farmingSpots[farmingSpot];
  if (spot) {
    const specific = get_nearest_monster({
      type: spot.mobs,
      min_xp: 100,
    });
    if (specific) return specific;
  }

  // Step 9: Free farm fallback
  const fallback = get_nearest_monster({
    min_xp: 100,
    max_att: 800,
    no_target: false,
  });
  if (fallback) {
    set_message("Freefarm");
    return fallback;
  }

  // Step 10: Opportunistic kill
  if (targetingPrefs.opportunisticKills) {
    const quickie = getFastKillsNearPath();
    if (quickie) {
      set_message("Pickoff");
      return quickie;
    }
  }

  return null;
}