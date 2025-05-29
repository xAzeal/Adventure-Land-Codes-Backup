///party.js

function joinParty() {
  if (!parent.party_list.includes(config.leader)) {
    send_party_request(config.leader);
  }
}

function is_party_leader() {
  return character.name === partyMems[0];
}

function on_party_invite(name) {
  if (partyMems.includes(name) || partyFriends.includes(name)) {
    accept_party_invite(name);
  }
}

// Party invite & auto-accept
setInterval(() => {
  if (!is_party_leader()) return;

  for (const name of [...allCharacters]) {
    if (name !== character.name && !parent.party_list.includes(name)) {
      send_party_invite(name);
    }
  }
}, 5000);

// Follow leader if too far
setInterval(() => {
  if (character.ctype === "merchant") return;
  const leaderEntity = get_entity(leader);
  if (smart.moving || character.moving) return;

  if (!leaderEntity && remotePosition !== null) {
    smart_move({ map: remotePosition.map, x: remotePosition.x, y: remotePosition.y 		})
    return;
  }

  const dist = distance(character, leaderEntity);
  if (dist > character.range / 2) {
    move(leaderEntity.x, leaderEntity.y);
  }
}, 1500);