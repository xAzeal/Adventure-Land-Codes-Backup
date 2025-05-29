///targeting.js


function getBestTarget() {
  // Step 1: Defend yourself
  const attackers = Object.values(parent.entities).filter(
    (e) =>
      e.type === "monster" &&
      !e.rip &&
      can_attack(e) &&
      (
        e.target === character.name ||
        partyMems.includes(e.target)
      ) &&
      e.attack < 400 // Only react to weak mobs like goos/chickens
  );

  if (attackers.length) {
    const closest = attackers.sort((a, b) => distance(character, a) - distance(character, b))[0];
    if (closest) {
      set_message("Defending");
      return closest;
    }
  }

  // Step 2: CM or leader target
  if (follow_friend && remoteTarget && can_attack(remoteTarget)) {
    return remoteTarget;
  }

  const leaderEntity = get_entity(leader);
  const leaderTarget = leaderEntity && get_target_of(leaderEntity);
  if (leaderTarget && can_attack(leaderTarget)) return leaderTarget;

  // Step 3: Regular farming spot fallback
  const spot = farmingSpots[farmingSpot];
  if (!spot) return null;

  return get_nearest_monster({
    type: spot.mobs,
    min_xp: 100,
    max_att: 800,
  });
}
