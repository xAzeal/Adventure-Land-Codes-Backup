// MAIN.1.js - Modular Central Entry Point

let remoteTarget = null;
let remoteTargetList = [];
let remotePosition = null;
let load_allies = false;
let follow_friend = true;

// Load shared config and modules
load_code("config");
load_code("utilities");
load_code("party");
load_code("CM");
load_code("chatfilter");
if (character.ctype !== "merchant"){
  load_code("targeting");
}
if (!character.controller){
  //load_code("upgrade-table");
  //load_code("frames");
  //load_code("DPS-meter");
}

// Load character-specific role behavior
load_code(character.ctype);

if (character.name === "LeLouche" && load_allies) {
	game_log("loading allies");
	load_code("loadAllies");
}

// Main behavior loop
setInterval(async function () {
  if (character.rip) return respawn();
  usePotions();
  await roleAct(); // Defined in each role (e.g., healer.js)
}, 250);

function on_draw()
{
	clear_drawings();
	if (remotePosition !== null){
		draw_circle(remotePosition.x, remotePosition.y, 2, 3, 0xF8FFA0);
	}
		
}