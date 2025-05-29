character.on("cm", async ({ name, message }) => {
  if (!message) return;

  // === MERCHANT CM HANDLING ===
  if (character.ctype === "merchant") {
    if (typeof message === "string") return;

    switch (message.msg) {
      case "inv_full":
		if (dutyTarget) {
  			game_log(`⏳ Already collecting from ${dutyTarget.name}, ignoring ${name}`);
  		return;
		}

        if (isInvFull()) {
          game_log("❌ Can't collect — inventory full.");
          return;
        }
        close_stand();
        dutyTarget = {
          name,
          map: message.map,
          x: message.x,
          y: message.y,
        };
        game_log(`📦 Assigned to collect from ${name}`);
        send_cm(name, "inv_full_merchant_near");
        break;

      case "inv_ok":
        game_log(`✅ Done collecting from ${name}`);
        close_stand();
        dutyTarget = null;
        moveHome();
        break;

      case "buy_hp":
		  close_stand();
		  await smart_move({ map: message.map, x: message.x, y: message.y });
		  await deliverItemsTo(name, { hpot1: message.quantity ?? 1000 });
		  send_cm(name, "buy_hp_merchant_near");
		  break;

		case "buy_mana":
		  close_stand();
		  await smart_move({ map: message.map, x: message.x, y: message.y });
		  await deliverItemsTo(name, { mpot1: message.quantity ?? 1000 });
		  send_cm(name, "buy_mana_merchant_near");
		  break;

      case "buff_mluck":
        close_stand();
        await smart_move({ map: message.map, x: message.x, y: message.y });
        const target = get_entity(name);
        if (target && !is_on_cooldown("mluck")) {
          use_skill("mluck", target);
        }
        break;
    }

    return;
  }

  // === FIGHTER CM RESPONSE HANDLING ===

  if (typeof message === "string") {
    switch (message) {
      case "inv_full_merchant_near":
        game_log("Sending items to merchant...");
        for (let i = 0; i < character.items.length; i++) {
          const item = character.items[i];
			game_log(`${item.name} [lvl ${item.level ?? 0}] x${item.q} in slot: ${i}`);
          if (item && shouldTradeItems(item)) {
			  //item.level === 0 && !["tracker", "hpot1", "jacko","mpot1"].includes(item.name)) {
			game_log(`💎 Sending ${item.name} x${item.q}`);
            await send_item(partyMerchant, i, item.q ?? 1);
          }
        }
        game_log("💸 to merchant");
		sendGold(partyMerchant);
        send_cm(partyMerchant, "inv_ok");
        break;

      case "buy_mana_merchant_near":
      case "buy_hp_merchant_near":
        const merch = get_entity(partyMerchant);
        if (merch && distance(character, merch) <= 250) {
        game_log("💸 to merchant");
		sendGold(partyMerchant);
        } else {
          game_log("❌ Merchant too far to send gold.");
        }
        break;
    }

    return;
  }

  // === SHARED LOGIC (FOR ALL ROLES) ===

  if (message.msg === "magiport" && can_use("magiport")) {
    use_skill("magiport", name);
  }

  if (message.msg === "party_heal" && can_use("partyheal")) {
    use_skill("partyheal");
  }

  if (message?.type === "positionInfo" && message.map && message.x !== undefined) {
    remotePosition = { map: message.map, x: message.x, y: message.y };
  }

  if (message?.type === "targetInfo") {
    const target = get_monster(message.id);
    if (target && !target.rip) {
      remoteTarget = target;
    }
  }

  if (message?.type === "targetList" && Array.isArray(message.targets)) {
    remoteTargetList = message.targets
      .map(t => get_monster(t.id))
      .filter(m => m && !m.rip && can_attack(m));
    if (remoteTargetList.length > 0) {
      remoteTarget = remoteTargetList[0];
    }
  }
});