// === CHARACTER SETUP ===
const partyMems = ["xRehkyt", "xHealer", "xAzeal"];
const partyMerchant = "LeLouche";
const partyFriends = [
  "VertVertReal", "XL3f", "VertHeal", "Kitter",
  "magasineur", "givesomeheal", "rang3r"
];
const myCharacters = ["xAzeal", "xHealer", "xRehkyt", "LeLouche"];
const allCharacters = [...partyMems, ...partyFriends, partyMerchant];
  
// === FARMING SPOTS ===
const farmingSpots = {
  goo: { map: "main", x: 0, y: 800, mobs: ["goo", "bgoo"] },
  igoo: { map: "level2s", x: 10, y: 480, mobs: ["cgoo", "bgoo"] },
  bee: { map: "main", x: 660, y: 1100, mobs: ["cutebee", "bee"] },
  croc: { map: "main", x: 150, y: 1300, mobs: ["croc"] },
  armadillo: { map: "main", x: 550, y: 1500, mobs: ["armadillo"] },
  poisio: { map: "main", x: -150, y: 1300, mobs: ["poisio"] },
  boar: { map: "winterland", x: -20, y: -740, mobs: ["boar"] },
  darkhound: { map: "winterland", x: -40, y: -1870, mobs: ["wolfie"] },
  snake: { map: "halloween", x: -600, y: -600, mobs: ["osnake", "snake"] },
  minimush: { map: "halloween", x: 0, y: 500, mobs: ["minimush"] },
  bat: { map: "cave", x: 280, y: -1100, mobs: ["mvampire","goldenbat", "bat"] },
  spider: { map: "main", x: 780, y: -110, mobs: ["spider"] },
  crab: { map: "main", x: -1120, y: -50, mobs: ["crab"] },
  crabx: { map: "main", x: -1120, y: 1800, mobs: ["crabx"] },
  frog: { map: "main", x: -1120, y: 1360, mobs: ["frog"] },
  rat: { map: "mansion", x: 0, y: -110, mobs: ["rat"] },
  vrat: { map: "level1", x: 35, y: 35, mobs: ["prat"] },
  cgoo: { map: "arena", x: 420, y: -420, mobs: ["cgoo"] },
  stoneworm: { map: "spookytown", x: 500, y: 110, mobs: ["stoneworm"] },
  bbpompom: { map: "level3", x: 250, y: -110, mobs: ["bbpompom"] },
  iceroamer: { map: "winterland", x: 350, y: 20, mobs: ["iceroamer"] },
  porcupine: { map: "desertland", x: -350, y: 20, mobs: ["porcupine"] },
  xp: { map: "main", x: -1269, y: 300, mobs: ["phoenix","squigtoad","frog","squig"] }
};

// === RUNTIME CONFIGURATION ===
let farmingSpot = "igoo"; // Changeable via commands later
let leader = "xRehkyt"; // High-luck player for aggro
let friend_controller = "VertVertReal"; // Trusted sender of CM info
const blockList = ["hpot1", "mpot1", "tracker", "jacko", "computer"];
