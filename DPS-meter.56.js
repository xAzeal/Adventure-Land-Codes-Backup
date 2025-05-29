// ======================
// CONFIGURATION
// ======================
const damageTypes = ["Base", "Blast", "Burn", "HPS", "MPS", "DR", "RF", "DPS", "Dmg Taken"];
const displayClassTypeColors = true;
const displayDamageTypeColors = true;
const showOverheal = false;
const showOverManasteal = true;

// Color Mappings
const damageTypeColors = {
  Base: "#A92000", Blast: "#782D33", Burn: "#FF7F27",
  HPS: "#9A1D27", MPS: "#353C9C", DR: "#E94959", RF: "#D880F0",
  DPS: "#FFD700", "Dmg Taken": "#FF4C4C"
};

const classColors = {
  mage: "#3FC7EB", paladin: "#F48CBA", priest: "#FFFFFF",
  ranger: "#AAD372", rogue: "#FFF468", warrior: "#C69B6D"
};

// ======================
// INTERNAL STATE
// ======================
const METER_START = performance.now();
let damageStats = {
  damage: 0, base: 0, burn: 0, blast: 0, heal: 0,
  lifesteal: 0, manasteal: 0, dreturn: 0, reflect: 0
};

let playerDamageSums = {};

function getPlayerEntry(id) {
  if (!playerDamageSums[id]) {
    playerDamageSums[id] = {
      startTime: performance.now(),
      sumDamage: 0, sumBaseDamage: 0, sumBurnDamage: 0, sumBlastDamage: 0,
      sumHeal: 0, sumLifesteal: 0, sumManaSteal: 0,
      sumDamageReturn: 0, sumReflection: 0,
      sumDamageTakenPhys: 0, sumDamageTakenMag: 0
    };
  }
  return playerDamageSums[id];
}

function formatNumber(n) {
  return n.toLocaleString();
}

// ======================
// UI SETUP
// ======================
function initDPSMeter() {
  const $ = parent.$;
  const container = $('<div id="dpsmeter"/>').css({
    fontSize: '20px', color: 'white', textAlign: 'center',
    display: 'table', marginBottom: '-3px', width: '100%',
    backgroundColor: 'rgba(0,0,0,1)'
  });

  container.append(
    $('<div id="dpsmetercontent"/>').css({
      display: 'table-cell', verticalAlign: 'middle',
      padding: '2px', border: '4px solid grey'
    })
  );

  const brc = $('#bottomrightcorner');
  brc.find('#dpsmeter').remove();
  brc.children().first().after(container);
}

// ======================
// HIT PROCESSING
// ======================
parent.socket.on('hit', data => {
  try {
    const isParty = id => parent.party_list.includes(id);
    const attacker = data.hid;
    const target = data.id;

    if (!isParty(attacker) && !isParty(target)) return;

    const attackerEntry = getPlayerEntry(attacker);
    const targetEntry = getPlayerEntry(target);

    // Damage buckets
    if (data.damage) {
      damageStats.damage += data.damage;
      if (data.source === "burn") damageStats.burn += data.damage;
      else if (data.splash) damageStats.blast += data.damage;
      else damageStats.base += data.damage;
    }

    // Heal / Lifesteal
    const healing = (data.heal ?? 0) + (data.lifesteal ?? 0);
    damageStats.heal += healing;
    damageStats.lifesteal += (data.lifesteal ?? 0);

    if (get_player(attacker) && (data.heal || data.lifesteal)) {
      const healer = get_player(attacker);
      const targetEntity = get_player(target);
      let amount = 0;

      if (showOverheal) {
        amount = healing;
      } else {
        amount += data.heal
          ? Math.min(data.heal, (targetEntity?.max_hp ?? 0) - (targetEntity?.hp ?? 0))
          : 0;
        amount += data.lifesteal
          ? Math.min(data.lifesteal, healer.max_hp - healer.hp)
          : 0;
      }

      attackerEntry.sumHeal += amount;
    }

    if (data.manasteal && get_player(attacker)) {
      const entity = get_entity(attacker);
      const mpGain = showOverManasteal ? data.manasteal : Math.min(data.manasteal, entity.max_mp - entity.mp);
      attackerEntry.sumManaSteal += mpGain;
    }

    // Other combat stats
    if (get_player(attacker)) {
      attackerEntry.sumDamage += data.damage ?? 0;
      attackerEntry.sumBaseDamage += (data.source === "burn" || data.splash) ? 0 : data.damage ?? 0;
      attackerEntry.sumBurnDamage += (data.source === "burn") ? data.damage ?? 0 : 0;
      attackerEntry.sumBlastDamage += (data.splash) ? data.damage ?? 0 : 0;
      attackerEntry.sumDamageReturn += data.dreturn ?? 0;
      attackerEntry.sumReflection += data.reflect ?? 0;
    }

    if (data.damage && get_player(target)) {
      if (data.damage_type === 'physical') targetEntry.sumDamageTakenPhys += data.damage;
      else if (data.damage_type === 'magical') targetEntry.sumDamageTakenMag += data.damage;
    }
  } catch (e) {
    console.error("Hit error:", e);
  }
});

// ======================
// METRIC HELPERS
// ======================
function getTypeValue(type, entry) {
  const elapsed = performance.now() - entry.startTime;
  if (elapsed <= 0) return 0;

  switch (type) {
    case "DPS":
      return Math.floor((entry.sumDamage + entry.sumDamageReturn + entry.sumReflection) * 1000 / elapsed);
    case "Base": return Math.floor(entry.sumBaseDamage * 1000 / elapsed);
    case "Burn": return Math.floor(entry.sumBurnDamage * 1000 / elapsed);
    case "Blast": return Math.floor(entry.sumBlastDamage * 1000 / elapsed);
    case "HPS": return Math.floor(entry.sumHeal * 1000 / elapsed);
    case "MPS": return Math.floor(entry.sumManaSteal * 1000 / elapsed);
    case "DR": return Math.floor(entry.sumDamageReturn * 1000 / elapsed);
    case "RF": return Math.floor(entry.sumReflection * 1000 / elapsed);
    case "Dmg Taken":
      return {
        phys: Math.floor(entry.sumDamageTakenPhys * 1000 / elapsed),
        mag: Math.floor(entry.sumDamageTakenMag * 1000 / elapsed)
      };
    default:
      return 0;
  }
}

// ======================
// RENDER METER
// ======================
function updateDPSMeterUI() {
  const $ = parent.$;
  const container = $('#dpsmetercontent'); if (!container.length) return;

  const elapsed = performance.now() - METER_START;
  const hrs = Math.floor(elapsed / 3600000);
  const mins = Math.floor((elapsed % 3600000) / 60000);

  let html = `<div>⏱ Time: ${hrs}h ${mins}m</div><table border="1" style="width:100%"><tr><th></th>`;
  damageTypes.forEach(t => {
    const color = displayDamageTypeColors ? damageTypeColors[t] ?? "white" : "white";
    html += `<th style='color:${color}'>${t}</th>`;
  });
  html += "</tr>";

  const sorted = Object.entries(playerDamageSums)
    .map(([id, e]) => ({ id, dps: getTypeValue("DPS", e), e }))
    .sort((a, b) => b.dps - a.dps);

  for (const { id, e } of sorted) {
    const player = get_player(id); if (!player) continue;
    const nameColor = displayClassTypeColors ? classColors[player.ctype] ?? "white" : "white";
    html += `<tr><td style='color:${nameColor}'>${player.name}</td>`;

    for (const type of damageTypes) {
      if (type === "Dmg Taken") {
        const { phys, mag } = getTypeValue(type, e);
        html += `<td><span style='color:#FF4C4C'>${formatNumber(phys)}</span> | <span style='color:#6ECFF6'>${formatNumber(mag)}</span></td>`;
      } else {
        html += `<td>${formatNumber(getTypeValue(type, e))}</td>`;
      }
    }
    html += "</tr>";
  }

  html += "</table>";
  container.html(html);
}

// ======================
// START
// ======================
initDPSMeter();
setInterval(updateDPSMeterUI, 500);
