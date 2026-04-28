/**
 * TreasureHuntGame.jsx
 *
 * THE TREASURE HUNT — Adventure puzzle game for children aged 7-10
 *
 * ARCHITECTURE:
 *  1. LOCATION_DATA   — 10 pre-defined locations with riddles
 *  2. buildGameMap()  — Stage algorithm: generates a new map every game
 *  3. TreasureHuntGame — Root component: gameplay state machine
 *
 * GAMEPLAY:
 *  - Player character stands in front of each location scene
 *  - Tap to move forward (single path) or choose between two (riddle shown)
 *  - Wrong choice: red flash, points deducted, still continues (wrong branch)
 *  - Wrong branch tolerates 3 mistakes before dead end (monster/ocean)
 *  - Chest locations: riddle decides open/leave, correct = win, wrong = game over
 *
 * REGISTER IN _layout.jsx:
 *   <Stack.Screen name="TreasureHuntGame"
 *     options={{headerShown:false, animation:"slide_from_bottom", gestureEnabled:false}}/>
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  StatusBar,
  useWindowDimensions,
  ScrollView,
} from "react-native";
import { Audio } from "expo-av";
import { useRouter } from "expo-router";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const STATUS_H = Platform.OS === "ios" ? 54 : (StatusBar.currentHeight ?? 24);

// Scoring
const PTS_CORRECT_NAV   = 20;
const PTS_WRONG_NAV     = -10;
const PTS_CORRECT_CHEST = 50;
const PTS_WRONG_CHEST   = -30;

// ─── COLORS ───────────────────────────────────────────────────────────────────
const C = {
  bg:          "#08081a",
  yellow:      "#FFD54F",
  yellowDim:   "rgba(255,213,79,0.15)",
  yellowBorder:"rgba(255,213,79,0.6)",
  teal:        "#00BCD4",
  tealDim:     "rgba(0,188,212,0.18)",
  tealBorder:  "rgba(0,188,212,0.5)",
  green:       "#4CAF50",
  red:         "#EF5350",
  white:       "#FFFFFF",
  textSec:     "#B0BEC5",
  textMuted:   "#546E7A",
};

// ─── LOCATION DATA ───────────────────────────────────────────────────────────
// Each location has:
//   riddle1: shown when this location is a NAVIGATION CHOICE (pick me!)
//   riddle2: shown when a CHEST is found at this location (am I the right spot?)
//   scene:   programmatic scene config (sky color, ground color, emojis)
//   name, emoji

const LOCATION_DATA = [
  {
    id: "mountains",
    name: "Snow Mountains",
    emoji: "🏔️",
    riddle1: "Clouds drift around my stony face,\nI wear a cap of ice and lace.\nEagles soar above my height,\nI glow in cold and wintry white.",
    riddle2: "The treasure sleeps where eagles cry,\nWhere frozen peaks touch winter sky.\nSnow blankets all in silence deep,\nIn mountains tall the secrets keep.",
    scene: { sky:["#1a2a4a","#2a3a6a"], ground:"#e8f4f8", accent:"#c8e6fa",
             emojis:["🏔️","❄️","🦅","🌨️"], groundEmojis:["⛄","🎿","🧊"] },
  },
  {
    id: "desert",
    name: "Golden Desert",
    emoji: "🏜️",
    riddle1: "I stretch for miles of golden sand,\nNo rain has touched my burning land.\nCamels walk where rivers dried,\nAnd scorpions in my dunes reside.",
    riddle2: "Beneath the sun that never sets,\nWhere golden sand the wanderer frets.\nNo shade, no stream, just burning ground,\nIn desert sands the chest is found.",
    scene: { sky:["#ff6b35","#ffa552"], ground:"#e8c87a", accent:"#d4a017",
             emojis:["🏜️","☀️","🐪","🌵"], groundEmojis:["🦂","🐍","🌵"] },
  },
  {
    id: "city",
    name: "Ancient City",
    emoji: "🏛️",
    riddle1: "Stone pillars rise where merchants trade,\nMy cobbled streets by ancients made.\nBells ring out from towers tall,\nI hold the stories of them all.",
    riddle2: "Where market voices fill the square,\nAnd history hangs in the city air.\nAmong the stone and archways wide,\nA treasure in the city hides.",
    scene: { sky:["#4a6fa5","#6b8cba"], ground:"#8b7355", accent:"#c4a882",
             emojis:["🏛️","🕌","🏰","🔔"], groundEmojis:["🏺","⚔️","📜"] },
  },
  {
    id: "village",
    name: "Fishing Village",
    emoji: "🏘️",
    riddle1: "Small boats bob by wooden docks,\nFishermen rise before the clocks.\nNets hang drying in the breeze,\nAnd smoke curls through the rooftop eaves.",
    riddle2: "Where fishermen sing at break of dawn,\nAnd seagulls cry from dusk till morn.\nIn quiet lanes where roses grow,\nA village chest waits down below.",
    scene: { sky:["#87CEEB","#b0d9f0"], ground:"#4a8c5c", accent:"#6ab87a",
             emojis:["🏘️","⛵","🐟","🌊"], groundEmojis:["🎣","🦀","⚓"] },
  },
  {
    id: "farmland",
    name: "Sunny Farmland",
    emoji: "🌾",
    riddle1: "Golden fields stretch to the sky,\nCrows and sparrows circle high.\nBarns of red stand proud and wide,\nWith haystacks golden on each side.",
    riddle2: "Where roosters crow at break of day,\nAnd children laugh and horses neigh.\nBetween the rows of golden wheat,\nA hidden chest waits to be seen.",
    scene: { sky:["#87d3f2","#c5e8f5"], ground:"#7ab648", accent:"#a8d060",
             emojis:["🌾","🚜","🌻","🐄"], groundEmojis:["🐔","🐑","🌽"] },
  },
  {
    id: "beach",
    name: "Tropical Beach",
    emoji: "🏖️",
    riddle1: "Warm waves kiss my golden shore,\nPalm trees sway and seagulls soar.\nSunset paints the ocean red,\nAnd crabs dance where the sea tides tread.",
    riddle2: "Where turquoise waves meet sandy ground,\nAnd seashells wait to be found.\nBeneath the palms in salty air,\nA treasure chest is hidden there.",
    scene: { sky:["#00bcd4","#4dd0e1"], ground:"#f5deb3", accent:"#ffd180",
             emojis:["🏖️","🌴","🦀","🐚"], groundEmojis:["🌺","🐠","⛱️"] },
  },
  {
    id: "forest",
    name: "Dark Forest",
    emoji: "🌲",
    riddle1: "Ancient oaks block out the sun,\nWhere foxes sleep and rivers run.\nOwls hoot from branches high,\nAnd mushrooms glow when fireflies fly.",
    riddle2: "Where shadows dance on mossy stones,\nAnd wolves howl through the old tree bones.\nDeep in the wood where light grows thin,\nA forgotten chest lies locked within.",
    scene: { sky:["#1b3a1b","#2d5a2d"], ground:"#3d6b3d", accent:"#2d5a2d",
             emojis:["🌲","🦉","🍄","🦊"], groundEmojis:["🐺","🍂","🌿"] },
  },
  {
    id: "volcano",
    name: "Volcanic Island",
    emoji: "🌋",
    riddle1: "From the sea I rise in flame,\nNo two volcanoes look the same.\nLava flows where rivers burned,\nAnd all who came here never returned.",
    riddle2: "Where fire meets the ocean spray,\nAnd lava carves a brand new bay.\nNear the crater's glowing rim,\nA chest was left on a fiery whim.",
    scene: { sky:["#4a1500","#8b2500"], ground:"#2d1500", accent:"#8b3a00",
             emojis:["🌋","🔥","💨","🌊"], groundEmojis:["🪨","💎","🔴"] },
  },
  {
    id: "tundra",
    name: "Frozen Tundra",
    emoji: "🧊",
    riddle1: "No trees grow in my frozen plain,\nJust ice and wind and bitter rain.\nWolves howl loud across my ground,\nAnd polar bears patrol around.",
    riddle2: "Where blizzards roar and nothing grows,\nAnd frozen rivers never flow.\nBelow the permafrost and ice,\nSomething waits — a treasure prize.",
    scene: { sky:["#e0f0ff","#b0d8ff"], ground:"#d4eeff", accent:"#a8d4f5",
             emojis:["🧊","🐻‍❄️","🌬️","❄️"], groundEmojis:["🦊","🦌","⛄"] },
  },
  {
    id: "cove",
    name: "Hidden Cove",
    emoji: "🏴‍☠️",
    riddle1: "Pirates once moored their ships here,\nIn cliffs that rise both far and near.\nA secret bay where no one goes,\nWhere smugglers hid, the legend grows.",
    riddle2: "Where broken masts on black rocks lie,\nAnd ghost ships sail the moonlit sky.\nIn the cove where pirates rest,\nX marks the spot — open the chest!",
    scene: { sky:["#1a1a3a","#2d2d5a"], ground:"#2d4a3a", accent:"#1a3a2d",
             emojis:["🏴‍☠️","⚓","💀","🗺️"], groundEmojis:["🦜","⚔️","🪙"] },
  },
  // ── 10 NEW LOCATIONS ─────────────────────────────────────────────────────────
  {
    id: "rainforest",
    name: "Amazon Rainforest",
    emoji: "🌴",
    riddle1: "A thousand shades of emerald green,\nThe loudest place you've ever seen.\nParrots screech and monkeys leap,\nAnd waterfalls thunder loud and deep.",
    riddle2: "Where jaguars prowl the jungle floor,\nAnd vines hang down from every pore.\nBeneath the canopy thick and tall,\nThe treasure waits behind a waterfall.",
    scene: { sky:["#1a4a1a","#2a6a2a"], ground:"#2d5a20", accent:"#3a7a28",
             emojis:["🌴","🦜","🐆","🌿"], groundEmojis:["🦋","🐸","🌺"] },
  },
  {
    id: "caves",
    name: "Crystal Caves",
    emoji: "💎",
    riddle1: "No sun has kissed my ancient walls,\nBut crystals light my glittering halls.\nBats sleep hanging from my roof,\nAnd echoes bounce — now there's your proof.",
    riddle2: "Where stalactites drip in the dark,\nAnd glow-worms give their feeble spark.\nDeep underground where crystals shine,\nA chest is hidden — yours and mine.",
    scene: { sky:["#0a0a2a","#1a1a4a"], ground:"#1a1a3a", accent:"#2a2a5a",
             emojis:["💎","🦇","✨","🌑"], groundEmojis:["🪨","💜","🔮"] },
  },
  {
    id: "swamp",
    name: "Misty Swamp",
    emoji: "🐊",
    riddle1: "Murky waters, twisted trees,\nFog rolls in on every breeze.\nCrocodiles lurk just below,\nAnd will-o'-wisps put on a show.",
    riddle2: "Where cypress roots grip black mud deep,\nAnd herons wade through waters steep.\nAmid the reeds and dragonfly hum,\nA sunken chest is where I'm from.",
    scene: { sky:["#2a3a1a","#3a4a2a"], ground:"#3a4a1a", accent:"#4a5a2a",
             emojis:["🐊","🌫️","🐸","🌿"], groundEmojis:["🦟","🐍","🌾"] },
  },
  {
    id: "castle",
    name: "Haunted Castle",
    emoji: "🏰",
    riddle1: "Crumbling towers touch the sky,\nAnd gargoyles watch as bats fly by.\nGhosts roam halls once grand and proud,\nAnd thunder booms from every cloud.",
    riddle2: "Where candles flicker in the gloom,\nAnd chains rattle from room to room.\nIn the dungeon cold and bare,\nA treasure chest sits waiting there.",
    scene: { sky:["#1a1a2a","#2a2a3a"], ground:"#3a3a4a", accent:"#4a4a5a",
             emojis:["🏰","👻","🦇","⚡"], groundEmojis:["💀","🕯️","🕸️"] },
  },
  {
    id: "savanna",
    name: "African Savanna",
    emoji: "🦁",
    riddle1: "Acacia trees dot the golden plain,\nWhere elephants march and lions reign.\nGiraffes stretch tall to reach the leaves,\nAnd zebras gallop in the breeze.",
    riddle2: "Where baobab trees spread wide their arms,\nAnd sunset bathes the land in charms.\nBeside the watering hole at dusk,\nA chest lies hidden in the dust.",
    scene: { sky:["#e8a042","#f0b85a"], ground:"#c8a040", accent:"#d4b050",
             emojis:["🦁","🐘","🦒","🌅"], groundEmojis:["🦓","🐆","🌵"] },
  },
  {
    id: "iceberg",
    name: "Arctic Iceberg",
    emoji: "🏔️",
    riddle1: "I float alone in freezing seas,\nMy jagged peaks scrape icy breeze.\nBelow me lies a hidden world,\nWhere secrets in the deep are furled.",
    riddle2: "Where narwhals swim in frozen brine,\nAnd northern lights so brightly shine.\nAtop the berg where seals do rest,\nExplorer brave — here is your quest.",
    scene: { sky:["#a0d4f0","#c0e8ff"], ground:"#c8e8f8", accent:"#a0d0f0",
             emojis:["🏔️","🌊","🐋","🌌"], groundEmojis:["🦭","🐧","❄️"] },
  },
  {
    id: "ruins",
    name: "Jungle Ruins",
    emoji: "🗿",
    riddle1: "Stone gods stare from crumbling thrones,\nVines have crept through all my bones.\nA lost empire left me here,\nTheir gold and glory disappeared.",
    riddle2: "Where serpent carvings guard the door,\nAnd moss grows thick on every floor.\nBeneath the altar stone so wide,\nThe treasure of the kings resides.",
    scene: { sky:["#2a4a1a","#3a5a2a"], ground:"#4a5a30", accent:"#5a6a3a",
             emojis:["🗿","🐍","🌿","☀️"], groundEmojis:["🏺","💎","🍃"] },
  },
  {
    id: "lighthouse",
    name: "Stormy Lighthouse",
    emoji: "🗼",
    riddle1: "I stand alone on rocky shore,\nMy light has saved a thousand more.\nWaves crash hard against my feet,\nAnd foghorns cry when storm clouds meet.",
    riddle2: "Where keeper's lantern sweeps the night,\nAnd sailors steer by my bright light.\nInside the tower's spiral stair,\nA treasure chest — if you dare!",
    scene: { sky:["#2a3a5a","#3a4a6a"], ground:"#3a4a5a", accent:"#4a5a6a",
             emojis:["🗼","🌊","⛈️","🐦"], groundEmojis:["⚓","🪨","🌊"] },
  },
  {
    id: "meadow",
    name: "Enchanted Meadow",
    emoji: "🌸",
    riddle1: "Wildflowers dance in every breeze,\nAnd fairies hide behind the trees.\nButterflies drift from bloom to bloom,\nAnd honeybees fill the air with tune.",
    riddle2: "Where foxgloves nod in morning dew,\nAnd rainbows paint the sky in hue.\nBeneath the oldest oak so wide,\nA treasure chest is tucked inside.",
    scene: { sky:["#87ceeb","#a8e0f0"], ground:"#5a8a40", accent:"#6a9a50",
             emojis:["🌸","🦋","🌈","🌻"], groundEmojis:["🐝","🍄","🌺"] },
  },
  {
    id: "shipwreck",
    name: "Sunken Shipwreck",
    emoji: "⚓",
    riddle1: "Barnacles cling to my rotting hull,\nAnd fish swim through my broken skull.\nI sank in storms a century past,\nMy mast has crumbled — nothing lasts.",
    riddle2: "Where coral grows through cannon holes,\nAnd octopus guards my darkened holds.\nDeep beneath the ocean's swell,\nA treasure waits inside my shell.",
    scene: { sky:["#004060","#005a80"], ground:"#003a50", accent:"#004a60",
             emojis:["⚓","🐙","🐠","🦑"], groundEmojis:["🪸","🐡","💎"] },
  },
];

// ─── STAGE ALGORITHM ─────────────────────────────────────────────────────────
// Builds a directed graph every game:
//  - Main path: 12 locations ending at treasure (long adventure!)
//  - 4 branch points on main path
//  - Each branch: 3 wrong choices tolerated before dead end
//  - 2 fake chests placed (1 on correct path, 1 on wrong branch)

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = 0 | Math.random() * (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildGameMap() {
  const locs = shuffle(LOCATION_DATA);

  // Main path: 12 locations (indices 0-11)
  const MAIN_PATH_LEN = 12;
  const mainPath  = locs.slice(0, MAIN_PATH_LEN);
  // Wrong branch pool: 8 locations for 4 branches × 2 each
  const wrongPool = locs.slice(MAIN_PATH_LEN); // exactly 8

  const treasureLocId = mainPath[mainPath.length - 1].id;

  // ── Pick 4 NON-ADJACENT branch points ──────────────────────
  // Valid: indices 1..10 (not first=0, not last=11)
  // Non-adjacent: no two branch points within 2 of each other
  // This prevents two branches from fighting over the same correctNext / rejoin node
  const pickNonAdjacentBranches = (count, min, max, minGap) => {
    const candidates = [];
    for (let i = min; i <= max; i++) candidates.push(i);
    const result = [];
    const shuffled = shuffle(candidates);
    for (const c of shuffled) {
      if (result.every(r => Math.abs(r - c) >= minGap)) {
        result.push(c);
        if (result.length === count) break;
      }
    }
    return result.sort((a,b) => a-b);
  };
  // min gap of 2 between branch points so correctNext and rejoin never overlap
  const branchPoints = pickNonAdjacentBranches(4, 1, MAIN_PATH_LEN - 2, 2);

  const nodes = {};
  let nodeCounter = 0;
  const newNodeId = () => `n${nodeCounter++}`;

  // ── Create main path nodes ──────────────────────────────────
  const mainNodes = mainPath.map((loc, i) => {
    const isLast = i === mainPath.length - 1;
    return {
      id: newNodeId(),
      locId: loc.id,
      type: isLast ? "treasure" : "normal",
      next: null, left: null, right: null,
      riddleChoice: null, isCorrectLeft: null,
      chestRiddle: isLast ? loc.riddle2 : null,
    };
  });

  // Register all main nodes first
  mainNodes.forEach(n => { nodes[n.id] = n; });

  // Link main path sequentially — this is the ground truth chain
  for (let i = 0; i < mainNodes.length - 1; i++) {
    mainNodes[i].next = mainNodes[i + 1].id;
  }

  // ── Build branches ─────────────────────────────────────────
  // Branch structure:
  //   mainNode[bp]  = CHOICE:  correct→mainNode[bp+1],  wrong→w0
  //   w0            = CHOICE:  correct→mainNode[bp+2],  wrong→w1
  //   w1            = NORMAL:  next→dead  (tap once, see the location, then monster)
  //   dead          = DEADEND
  //
  // Key insight: we use mainNode[bp+1].id and mainNode[bp+2].id directly.
  // These are already in `nodes` so the chain is always intact regardless of
  // what type those nodes eventually become (choice/normal/fake_chest).

  branchPoints.forEach((bpIdx, bpNum) => {
    const mainNode    = mainNodes[bpIdx];
    const correctNext = mainNodes[bpIdx + 1];                        // always exists (gap≥2 from last)
    const rejoinNode  = mainNodes[Math.min(bpIdx + 2, MAIN_PATH_LEN - 1)]; // skip 1 as punishment

    const wrongLoc0 = wrongPool[bpNum * 2];
    const wrongLoc1 = wrongPool[bpNum * 2 + 1];

    // Dead end
    const deadId = newNodeId();
    nodes[deadId] = {
      id: deadId, locId: null, type: "deadend",
      next: null, left: null, right: null,
      deadType: ["monster","ocean","ditch"][0 | Math.random() * 3],
    };

    // w1: NORMAL node (player sees this location, then taps → dead end)
    const w1Id = newNodeId();
    nodes[w1Id] = {
      id: w1Id, locId: wrongLoc1.id, type: "normal",
      next: deadId,
      left: null, right: null,
      riddleChoice: null, isCorrectLeft: null, chestRiddle: null,
    };

    // w0: CHOICE — correct→rejoin main path, wrong→w1
    const w0Id           = newNodeId();
    const w0CorrectLeft  = Math.random() > 0.5;
    nodes[w0Id] = {
      id: w0Id, locId: wrongLoc0.id, type: "choice",
      next: null,
      left:  w0CorrectLeft ? rejoinNode.id : w1Id,
      right: w0CorrectLeft ? w1Id          : rejoinNode.id,
      riddleChoice:  rejoinNode.locId,
      isCorrectLeft: w0CorrectLeft,
      chestRiddle: null,
    };

    // Convert mainNode to CHOICE — correct→correctNext, wrong→w0
    // IMPORTANT: preserve the original .next so fake-chest logic still works
    const origNext         = mainNode.next;   // save before nulling
    const mainCorrectLeft  = Math.random() > 0.5;
    mainNode.type          = "choice";
    mainNode.riddleChoice  = correctNext.locId;
    mainNode.isCorrectLeft = mainCorrectLeft;
    mainNode.left          = mainCorrectLeft ? correctNext.id : w0Id;
    mainNode.right         = mainCorrectLeft ? w0Id           : correctNext.id;
    mainNode.next          = null; // choice nodes use left/right not next
    mainNode._origNext     = origNext; // stash for fake-chest fallback
  });

  // ── Fake chests ─────────────────────────────────────────────
  // Riddle = treasure location's riddle2 so player knows THIS isn't the right place
  const treasureLoc = LOCATION_DATA.find(l => l.id === treasureLocId);

  // Candidates: any node with a real locId, not treasure, not deadend, not choice
  // MUST still have a valid `next` so player can continue after leaving the chest
  const fakeCandidates = Object.values(nodes).filter(n =>
    n.locId &&
    n.locId !== treasureLocId &&
    n.type === "normal" &&    // only normal nodes — they have a safe `next`
    n.next !== null           // must be able to continue
  );

  const onCorrectPath = fakeCandidates.filter(n =>  mainPath.some(m => m.id === n.locId));
  const onWrongPath   = fakeCandidates.filter(n => !mainPath.some(m => m.id === n.locId));

  // 2 fake chests on correct path, 1 on wrong branch
  shuffle(onCorrectPath).slice(0, 2).forEach(n => {
    n.type        = "chest_fake";
    n.chestRiddle = treasureLoc?.riddle2 ?? "";
    // n.next is preserved — player continues after leaving the chest
  });
  shuffle(onWrongPath).slice(0, 1).forEach(n => {
    n.type        = "chest_fake";
    n.chestRiddle = treasureLoc?.riddle2 ?? "";
  });

  // ── Choice node display metadata ─────────────────────────
  Object.values(nodes).forEach(node => {
    if (node.type !== "choice") return;
    const leftNode  = nodes[node.left];
    const rightNode = nodes[node.right];
    node.leftLocId  = leftNode?.locId  ?? null;
    node.rightLocId = rightNode?.locId ?? null;
    const correctLoc = LOCATION_DATA.find(l => l.id === node.riddleChoice);
    node.riddleText  = correctLoc?.riddle1 ?? "";
  });

  // ── Sanity check: verify treasure is reachable ────────────
  // Walk the correct path and confirm it ends at treasure
  let cur = nodes[mainNodes[0].id];
  let steps = 0;
  while (cur && steps < 50) {
    if (cur.type === "treasure") break;
    if (cur.type === "choice") {
      // Follow correct side
      const nextId = cur.isCorrectLeft ? cur.left : cur.right;
      cur = nodes[nextId];
    } else if (cur.next) {
      cur = nodes[cur.next];
    } else {
      cur = null;
    }
    steps++;
  }
  // If sanity check fails (shouldn't happen with gap≥2), regenerate
  if (!cur || cur.type !== "treasure") {
    console.warn("TreasureHunt: map sanity check failed, regenerating...");
    return buildGameMap();
  }

  return {
    nodes,
    startNodeId: mainNodes[0].id,
    treasureLocId,
    mainPathLocIds: mainPath.map(m => m.id),
  };
}

// ─── FLYING STAR ─────────────────────────────────────────────────────────────
function FlyingStar({ startX, startY, endX, endY, delay, onDone }) {
  const ax = useRef(new Animated.Value(startX)).current;
  const ay = useRef(new Animated.Value(startY)).current;
  const op = useRef(new Animated.Value(0)).current;
  const sc = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(op,{toValue:1,duration:60,useNativeDriver:true}),
        Animated.spring(sc,{toValue:1,friction:5,tension:80,useNativeDriver:true}),
        Animated.timing(ax,{toValue:endX,duration:550,easing:Easing.out(Easing.quad),useNativeDriver:true}),
        Animated.timing(ay,{toValue:endY,duration:550,easing:Easing.out(Easing.quad),useNativeDriver:true}),
      ]),
    ]).start(()=>Animated.timing(op,{toValue:0,duration:80,useNativeDriver:true}).start(onDone));
  },[]);
  return (
    <Animated.View pointerEvents="none" style={{
      position:"absolute",top:0,left:0,width:28,height:28,zIndex:999,
      opacity:op,transform:[{translateX:ax},{translateY:ay},{scale:sc}],
    }}>
      <Text style={{fontSize:24}}>⭐</Text>
    </Animated.View>
  );
}

// ─── LOCATION IMAGE MAP ───────────────────────────────────────────────────────
// Maps each location id to its require(). React Native requires static strings.
const LOCATION_IMAGES = {
  mountains:   require("../assets/games/treasure-hunt/snow-mountains.jpeg"),
  desert:      require("../assets/games/treasure-hunt/golden-desert.jpeg"),
  city:        require("../assets/games/treasure-hunt/ancient-city.jpeg"),
  village:     require("../assets/games/treasure-hunt/fishing-village.jpeg"),
  farmland:    require("../assets/games/treasure-hunt/sunny-farmland.jpeg"),
  beach:       require("../assets/games/treasure-hunt/tropical-beach.jpeg"),
  forest:      require("../assets/games/treasure-hunt/dark-forest.jpeg"),
  volcano:     require("../assets/games/treasure-hunt/volcanic-island.jpeg"),
  tundra:      require("../assets/games/treasure-hunt/arctic-tundra.jpeg"),
  cove:        require("../assets/games/treasure-hunt/hidden-cove.jpeg"),
  rainforest:  require("../assets/games/treasure-hunt/amazon-rainforest.jpeg"),
  caves:       require("../assets/games/treasure-hunt/crystal-caves.jpeg"),
  swamp:       require("../assets/games/treasure-hunt/misty-swamp.jpeg"),
  castle:      require("../assets/games/treasure-hunt/haunted-castle.jpeg"),
  savanna:     require("../assets/games/treasure-hunt/african-savanna.jpeg"),
  iceberg:     require("../assets/games/treasure-hunt/arctic-iceberg.jpeg"),
  ruins:       require("../assets/games/treasure-hunt/jungle-ruins.jpeg"),
  lighthouse:  require("../assets/games/treasure-hunt/stormy-lighthouse.jpeg"),
  meadow:      require("../assets/games/treasure-hunt/enchanted-meadow.jpeg"),
  shipwreck:   require("../assets/games/treasure-hunt/shipwrek.jpeg"),
};

// Game object images
const IMG_GUIDE  = require("../assets/games/treasure-hunt/guide-map.jpeg");
const IMG_CHEST  = require("../assets/games/treasure-hunt/closed-chest.jpeg");
const IMG_OPENED = require("../assets/games/treasure-hunt/opened-chest.jpeg");
const IMG_MONSTER= require("../assets/games/treasure-hunt/monster.jpeg");
const IMG_SNAKE  = require("../assets/games/treasure-hunt/snake.jpeg");
const IMG_PIT    = require("../assets/games/treasure-hunt/pit.jpeg");

// ─── LOCATION SCENE ───────────────────────────────────────────────────────────

function LocationScene({ locId, sw, sh, compact = false }) {
  const img = LOCATION_IMAGES[locId];
  if (!img) return (
    <View style={{
      width: sw, height: sh,
      backgroundColor: "#1a1a2e",
      alignItems: "center", justifyContent: "center",
      borderRadius: compact ? 16 : 0,
    }}>
      <Text style={{ fontSize: 40 }}>
        {LOCATION_DATA.find(l => l.id === locId)?.emoji ?? "🗺️"}
      </Text>
    </View>
  );

  return (
    <Image
      source={img}
      style={{
        width: sw,
        height: sh,
        borderRadius: compact ? 16 : 0,
      }}
      resizeMode="cover"
    />
  );
}

// ─── GUIDE BOOK POPUP ─────────────────────────────────────────────────────────
function GuideBook({ riddle, title, sw, sh, children }) {
  const slide = useRef(new Animated.Value(sh)).current;
  const fade  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slide,{toValue:0,friction:6,tension:60,useNativeDriver:true}),
      Animated.timing(fade, {toValue:1,duration:280,useNativeDriver:true}),
    ]).start();
  }, []);

  return (
    <Animated.View style={{
      position:"absolute", left:0, right:0, bottom:0,
      opacity:fade, transform:[{translateY:slide}],
      zIndex:300,
    }}>
      <View style={{
        backgroundColor:"rgba(15,10,5,0.97)",
        borderTopLeftRadius:28, borderTopRightRadius:28,
        borderWidth:2, borderColor:"rgba(255,213,79,0.6)",
        paddingBottom:30,
        shadowColor:C.yellow, shadowOffset:{width:0,height:-4},
        shadowOpacity:0.3, shadowRadius:20, elevation:20,
      }}>
        {/* Book header with guide-map image */}
        <View style={{
          backgroundColor:"rgba(139,90,43,0.4)",
          borderTopLeftRadius:26, borderTopRightRadius:26,
          paddingVertical:12, paddingHorizontal:16,
          flexDirection:"row", alignItems:"center", gap:12,
          borderBottomWidth:1, borderBottomColor:"rgba(255,213,79,0.3)",
        }}>
          <Image source={IMG_GUIDE} style={{width:48,height:48,borderRadius:8}} resizeMode="cover"/>
          <Text style={{
            flex:1, fontSize:16, fontWeight:"900", color:C.yellow,
            letterSpacing:1, textAlign:"center",
          }}>{title ?? "TREASURE HUNT GUIDE"}</Text>
        </View>
        {/* Riddle */}
        <View style={{paddingHorizontal:24,paddingTop:18,paddingBottom:10}}>
          <Text style={{
            fontSize:15,color:"#E8D5B0",lineHeight:24,
            textAlign:"center",fontStyle:"italic",
            textShadowColor:"rgba(0,0,0,0.4)",
            textShadowOffset:{width:0,height:1},textShadowRadius:2,
          }}>"{riddle}"</Text>
        </View>
        {/* Children (action buttons, etc.) */}
        <View style={{paddingHorizontal:20}}>
          {children}
        </View>
      </View>
    </Animated.View>
  );
}

// ─── CHEST POPUP ─────────────────────────────────────────────────────────────
function ChestPopup({ riddle, sw, sh, onOpen, onLeave }) {
  const sc          = useRef(new Animated.Value(0.5)).current;
  const op          = useRef(new Animated.Value(0)).current;
  const chestBounce = useRef(new Animated.Value(0)).current;
  const [showRiddle,  setShowRiddle]  = useState(false);
  const [showButtons, setShowButtons] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(sc,{toValue:1,friction:5,tension:60,useNativeDriver:true}),
      Animated.timing(op,{toValue:1,duration:300,useNativeDriver:true}),
    ]).start(()=>{
      Animated.loop(Animated.sequence([
        Animated.timing(chestBounce,{toValue:-6,duration:420,useNativeDriver:true}),
        Animated.timing(chestBounce,{toValue:0, duration:420,useNativeDriver:true}),
      ])).start();
      setTimeout(()=>setShowRiddle(true),  800);
      setTimeout(()=>setShowButtons(true), 1400);
    });
  },[]);

  return (
    <Animated.View style={{
      ...StyleSheet.absoluteFillObject,
      backgroundColor:"rgba(0,0,0,0.85)",
      alignItems:"center", justifyContent:"center",
      zIndex:400, opacity:op,
    }}>
      <Animated.View style={{
        width:sw*0.88, maxWidth:380,
        backgroundColor:"rgba(20,12,5,0.98)",
        borderRadius:28, borderWidth:2.5, borderColor:"rgba(255,213,79,0.7)",
        padding:24, alignItems:"center",
        shadowColor:C.yellow,shadowOffset:{width:0,height:0},
        shadowOpacity:0.6,shadowRadius:30,elevation:20,
        transform:[{scale:sc}],
      }}>
        {/* Header */}
        <Text style={{fontSize:22,fontWeight:"900",color:C.yellow,textAlign:"center",marginBottom:4}}>
          🎉 You Found a Chest!
        </Text>
        <Text style={{fontSize:13,color:C.textSec,marginBottom:14,textAlign:"center"}}>
          Be careful before you open it...
        </Text>

        {/* Chest image */}
        <Animated.View style={{transform:[{translateY:chestBounce}],marginBottom:14}}>
          <Image source={IMG_CHEST} style={{width:110,height:80,borderRadius:10}} resizeMode="cover"/>
        </Animated.View>

        {/* Guide riddle */}
        {showRiddle && (
          <View style={{
            backgroundColor:"rgba(139,90,43,0.2)",
            borderRadius:16, borderWidth:1.5, borderColor:"rgba(255,213,79,0.4)",
            padding:14, marginBottom:16, width:"100%",
            flexDirection:"row", alignItems:"flex-start", gap:10,
          }}>
            <Image source={IMG_GUIDE} style={{width:36,height:36,borderRadius:6}} resizeMode="cover"/>
            <View style={{flex:1}}>
              <Text style={{fontSize:11,fontWeight:"900",color:C.yellow,marginBottom:6,letterSpacing:1}}>
                📖 CHECK THE GUIDE FIRST
              </Text>
              <Text style={{fontSize:13,color:"#E8D5B0",lineHeight:20,fontStyle:"italic"}}>
                "{riddle}"
              </Text>
            </View>
          </View>
        )}

        {/* Action buttons */}
        {showButtons && (
          <View style={{flexDirection:"row",gap:12,width:"100%"}}>
            <TouchableOpacity
              style={{
                flex:1, backgroundColor:"#2E7D32", borderRadius:20,
                paddingVertical:14, alignItems:"center",
                borderWidth:2, borderColor:"#4CAF50",
                shadowColor:"#4CAF50",shadowOffset:{width:0,height:0},
                shadowOpacity:0.6,shadowRadius:10,elevation:8,
              }}
              onPress={onOpen} activeOpacity={0.85}
            >
              <Text style={{fontSize:16,fontWeight:"900",color:C.white}}>🔓 OPEN</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex:1, backgroundColor:"rgba(255,255,255,0.06)", borderRadius:20,
                paddingVertical:14, alignItems:"center",
                borderWidth:1.5, borderColor:"rgba(255,255,255,0.2)",
              }}
              onPress={onLeave} activeOpacity={0.85}
            >
              <Text style={{fontSize:16,fontWeight:"900",color:C.textSec}}>🚶 LEAVE</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
}

// ─── WIN OVERLAY ─────────────────────────────────────────────────────────────
function WinOverlay({ score, sw, sh, onPlayAgain, onExit }) {
  const sc    = useRef(new Animated.Value(0.4)).current;
  const op    = useRef(new Animated.Value(0)).current;
  const shimX = useRef(new Animated.Value(-220)).current;
  const chestSc = useRef(new Animated.Value(0)).current;

  useEffect(()=>{
    Animated.parallel([
      Animated.spring(sc,{toValue:1,friction:4,tension:55,useNativeDriver:true}),
      Animated.timing(op,{toValue:1,duration:400,useNativeDriver:true}),
    ]).start(()=>{
      Animated.spring(chestSc,{toValue:1,friction:3,tension:80,useNativeDriver:true}).start();
    });
    Animated.loop(Animated.sequence([
      Animated.delay(600),
      Animated.timing(shimX,{toValue:340,duration:1600,easing:Easing.inOut(Easing.quad),useNativeDriver:true}),
      Animated.timing(shimX,{toValue:-220,duration:0,useNativeDriver:true}),
    ])).start();
  },[]);

  return (
    <Animated.View style={{
      ...StyleSheet.absoluteFillObject,
      backgroundColor:"rgba(0,0,0,0.92)",
      alignItems:"center", justifyContent:"center",
      zIndex:600, opacity:op,
    }}>
      <Animated.View style={{
        width:sw*0.88,maxWidth:380,
        backgroundColor:"rgba(15,10,5,0.98)",
        borderRadius:28,borderWidth:2.5,borderColor:"rgba(255,213,79,0.8)",
        padding:28,alignItems:"center",
        shadowColor:C.yellow,shadowOffset:{width:0,height:0},
        shadowOpacity:0.8,shadowRadius:40,elevation:24,
        transform:[{scale:sc}],
        overflow:"hidden",
      }}>
        {/* Shimmer */}
        <Animated.View pointerEvents="none" style={{
          position:"absolute",top:0,bottom:0,width:80,
          backgroundColor:"rgba(255,255,255,0.12)",
          transform:[{translateX:shimX},{skewX:"-18deg"}],
        }}/>
        {/* Opened chest image */}
        <Animated.View style={{transform:[{scale:chestSc}],marginBottom:12}}>
          <Image source={IMG_OPENED} style={{width:140,height:100,borderRadius:12}} resizeMode="cover"/>
        </Animated.View>
        <Text style={{
          fontSize:26,fontWeight:"900",color:C.yellow,textAlign:"center",
          textShadowColor:"rgba(255,213,79,0.6)",
          textShadowOffset:{width:0,height:0},textShadowRadius:16,
          marginBottom:6,
        }}>TREASURE FOUND!</Text>
        <Text style={{fontSize:14,color:C.textSec,textAlign:"center",marginBottom:20}}>
          You are a legendary treasure hunter! 🗺️
        </Text>
        {/* Score */}
        <View style={{
          width:"100%",backgroundColor:"rgba(255,213,79,0.1)",
          borderRadius:16,borderWidth:1.5,borderColor:"rgba(255,213,79,0.4)",
          padding:16,alignItems:"center",marginBottom:20,
        }}>
          <Text style={{fontSize:11,fontWeight:"900",color:C.textMuted,letterSpacing:2,marginBottom:4}}>FINAL SCORE</Text>
          <Text style={{fontSize:48,fontWeight:"900",color:C.yellow}}>{score}</Text>
        </View>
        <TouchableOpacity style={{
          width:"100%",backgroundColor:C.yellow,borderRadius:28,
          paddingVertical:15,alignItems:"center",marginBottom:10,
          shadowColor:C.yellow,shadowOffset:{width:0,height:0},
          shadowOpacity:0.6,shadowRadius:16,elevation:10,
        }} onPress={onPlayAgain} activeOpacity={0.85}>
          <Text style={{fontSize:16,fontWeight:"900",color:"#1a1a00",letterSpacing:0.5}}>🗺️  New Adventure!</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{
          width:"100%",borderRadius:28,paddingVertical:13,alignItems:"center",
          backgroundColor:"rgba(255,255,255,0.04)",
          borderWidth:1,borderColor:"rgba(255,255,255,0.12)",
        }} onPress={onExit} activeOpacity={0.75}>
          <Text style={{fontSize:14,fontWeight:"700",color:C.textSec}}>✕  Exit Game</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

// ─── LOSE OVERLAY ─────────────────────────────────────────────────────────────
function LoseOverlay({ reason, sw, sh, onPlayAgain, onExit }) {
  const sc    = useRef(new Animated.Value(0.5)).current;
  const op    = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const imgSc = useRef(new Animated.Value(0)).current;

  const configs = {
    deadend_monster: { img:IMG_MONSTER, title:"A Monster Appeared!",  msg:"You chose the wrong path and encountered a fearsome monster!", color:C.red,      bg:"rgba(60,0,0,0.98)" },
    deadend_ocean:   { img:IMG_MONSTER, title:"Swept Away!",           msg:"You chose the wrong path and fell into the raging ocean!",    color:"#1565C0",  bg:"rgba(0,15,60,0.98)" },
    deadend_ditch:   { img:IMG_PIT,     title:"Fell into a Pit!",       msg:"You chose the wrong path and tumbled into a deep dark pit!",  color:"#5D4037",  bg:"rgba(20,10,0,0.98)" },
    wrong_chest:     { img:IMG_SNAKE,   title:"A Snake Bit You!",       msg:"That was the wrong chest! A snake was hiding inside...",      color:C.green,    bg:"rgba(0,30,5,0.98)" },
    left_treasure:   { img:IMG_CHEST,   title:"You Left the Treasure!", msg:"You were so close! The treasure was in that chest you left.", color:"#9C27B0",  bg:"rgba(20,0,40,0.98)" },
  };
  const cfg = configs[reason] ?? configs.deadend_monster;

  useEffect(()=>{
    Animated.parallel([
      Animated.spring(sc,{toValue:1,friction:4,tension:55,useNativeDriver:true}),
      Animated.timing(op,{toValue:1,duration:400,useNativeDriver:true}),
    ]).start(()=>{
      Animated.spring(imgSc,{toValue:1,friction:3,tension:80,useNativeDriver:true}).start();
      Animated.sequence([
        Animated.timing(shake,{toValue:14, duration:55,useNativeDriver:true}),
        Animated.timing(shake,{toValue:-14,duration:55,useNativeDriver:true}),
        Animated.timing(shake,{toValue:10, duration:55,useNativeDriver:true}),
        Animated.timing(shake,{toValue:-10,duration:55,useNativeDriver:true}),
        Animated.timing(shake,{toValue:0,  duration:55,useNativeDriver:true}),
      ]).start();
    });
  },[]);

  return (
    <Animated.View style={{
      ...StyleSheet.absoluteFillObject,
      backgroundColor:"rgba(0,0,0,0.92)",
      alignItems:"center",justifyContent:"center",
      zIndex:600,opacity:op,
    }}>
      <Animated.View style={{
        width:sw*0.88,maxWidth:380,
        backgroundColor:cfg.bg,
        borderRadius:28,borderWidth:2.5,borderColor:cfg.color,
        padding:28,alignItems:"center",
        shadowColor:cfg.color,shadowOffset:{width:0,height:0},
        shadowOpacity:0.8,shadowRadius:30,elevation:20,
        transform:[{scale:sc},{translateX:shake}],
      }}>
        {/* Monster / snake / pit image */}
        <Animated.View style={{transform:[{scale:imgSc}],marginBottom:14}}>
          <Image source={cfg.img} style={{width:130,height:100,borderRadius:12}} resizeMode="cover"/>
        </Animated.View>
        <Text style={{fontSize:22,fontWeight:"900",color:cfg.color,textAlign:"center",marginBottom:8}}>{cfg.title}</Text>
        <Text style={{fontSize:14,color:C.textSec,textAlign:"center",marginBottom:24,lineHeight:22}}>{cfg.msg}</Text>
        <TouchableOpacity style={{
          width:"100%",backgroundColor:C.yellow,borderRadius:28,
          paddingVertical:15,alignItems:"center",marginBottom:10,
          shadowColor:C.yellow,shadowOffset:{width:0,height:0},
          shadowOpacity:0.6,shadowRadius:16,elevation:10,
        }} onPress={onPlayAgain} activeOpacity={0.85}>
          <Text style={{fontSize:16,fontWeight:"900",color:"#1a1a00"}}>🗺️  Try Again!</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{
          width:"100%",borderRadius:28,paddingVertical:13,alignItems:"center",
          backgroundColor:"rgba(255,255,255,0.04)",
          borderWidth:1,borderColor:"rgba(255,255,255,0.12)",
        }} onPress={onExit} activeOpacity={0.75}>
          <Text style={{fontSize:14,fontWeight:"700",color:C.textSec}}>✕  Exit Game</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}


// ─── PULSING TAP BUTTON ───────────────────────────────────────────────────────
function PulsingTapButton({ label, sw }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const glow  = useRef(new Animated.Value(0)).current;

  useEffect(()=>{
    Animated.loop(Animated.sequence([
      Animated.timing(pulse,{toValue:1.07,duration:600,easing:Easing.inOut(Easing.sin),useNativeDriver:true}),
      Animated.timing(pulse,{toValue:1,  duration:600,useNativeDriver:true}),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(glow,{toValue:1,duration:600,easing:Easing.inOut(Easing.sin),useNativeDriver:false}),
      Animated.timing(glow,{toValue:0,duration:600,useNativeDriver:false}),
    ])).start();
  },[]);

  const borderColor = glow.interpolate({
    inputRange:[0,1],
    outputRange:["rgba(255,213,79,0.5)","rgba(255,213,79,1)"],
  });

  return (
    <Animated.View style={{
      position:"absolute", bottom:28,
      left:sw*0.06, right:sw*0.06,
      zIndex:10, transform:[{scale:pulse}],
    }}>
      {/* JS-driver: borderColor on outer view */}
      <Animated.View style={{
        borderRadius:36, borderWidth:2.5, borderColor,
        backgroundColor:"rgba(0,0,0,0.82)",
        shadowColor:C.yellow,shadowOffset:{width:0,height:0},
        shadowOpacity:0.6,shadowRadius:18,elevation:12,
      }}>
        {/* Native-driver: scale+opacity on inner — none needed here, just text */}
        <View style={{
          paddingVertical:18, paddingHorizontal:20,
          alignItems:"center",
        }}>
          <Text style={{
            color:C.yellow,
            fontSize:19, fontWeight:"900",
            letterSpacing:0.4, textAlign:"center",
            textShadowColor:"rgba(0,0,0,0.6)",
            textShadowOffset:{width:0,height:1},textShadowRadius:4,
          }}>{label}</Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

// ─── WELCOME SCREEN ───────────────────────────────────────────────────────────
function WelcomeScreen({ onStart, onExit }) {
  const titleY   = useRef(new Animated.Value(-40)).current;
  const titleOp  = useRef(new Animated.Value(0)).current;
  const cardY    = useRef(new Animated.Value(60)).current;
  const cardOp   = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const shimX    = useRef(new Animated.Value(-200)).current;
  const floatY   = useRef(new Animated.Value(0)).current;

  useEffect(()=>{
    // Staggered entrance
    Animated.stagger(120,[
      Animated.parallel([
        Animated.spring(titleY,{toValue:0,friction:6,tension:60,useNativeDriver:true}),
        Animated.timing(titleOp,{toValue:1,duration:500,useNativeDriver:true}),
      ]),
      Animated.parallel([
        Animated.spring(cardY,{toValue:0,friction:6,tension:60,useNativeDriver:true}),
        Animated.timing(cardOp,{toValue:1,duration:500,useNativeDriver:true}),
      ]),
    ]).start();
    // Button pulse
    Animated.loop(Animated.sequence([
      Animated.timing(btnScale,{toValue:1.06,duration:700,easing:Easing.inOut(Easing.sin),useNativeDriver:true}),
      Animated.timing(btnScale,{toValue:1,duration:700,useNativeDriver:true}),
    ])).start();
    // Shimmer
    Animated.loop(Animated.sequence([
      Animated.delay(1000),
      Animated.timing(shimX,{toValue:350,duration:1600,easing:Easing.inOut(Easing.quad),useNativeDriver:true}),
      Animated.timing(shimX,{toValue:-200,duration:0,useNativeDriver:true}),
    ])).start();
    // Chest float
    Animated.loop(Animated.sequence([
      Animated.timing(floatY,{toValue:-12,duration:1100,easing:Easing.inOut(Easing.sin),useNativeDriver:true}),
      Animated.timing(floatY,{toValue:0,duration:1100,useNativeDriver:true}),
    ])).start();
  },[]);

  return (
    <View style={{
      flex:1,
      backgroundColor:"#08060e",
      alignItems:"center", justifyContent:"center",
      paddingHorizontal:24,
    }}>
      {/* Background shimmer layer */}
      <View style={{...StyleSheet.absoluteFillObject, overflow:"hidden"}}>
        {/* Radial glow behind title */}
        <View style={{
          position:"absolute", top:"8%", left:"10%", right:"10%", height:280,
          backgroundColor:"rgba(255,180,30,0.07)", borderRadius:200,
        }}/>
        {/* Scattered stars */}
        {Array.from({length:30},(_,i)=>(
          <View key={i} style={{
            position:"absolute",
            left:`${(i*137+11)%92}%`,
            top:`${(i*79+5)%85}%`,
            width: i%6===0?3:2, height:i%6===0?3:2,
            borderRadius:2,
            backgroundColor: i%9===0?"#FFD54F":"rgba(255,255,255,0.7)",
            opacity:0.3+(i%5)*0.1,
          }}/>
        ))}
      </View>

      {/* Exit button */}
      <TouchableOpacity
        style={{position:"absolute",top:STATUS_H+12,left:16,
          width:38,height:38,borderRadius:19,
          backgroundColor:"rgba(255,255,255,0.08)",
          borderWidth:1,borderColor:"rgba(255,255,255,0.18)",
          alignItems:"center",justifyContent:"center",zIndex:10}}
        onPress={onExit} activeOpacity={0.8}>
        <Text style={{color:C.textSec,fontSize:15,fontWeight:"700"}}>✕</Text>
      </TouchableOpacity>

      {/* Floating chest */}
      <Animated.View style={{transform:[{translateY:floatY}],marginBottom:16}}>
        <Image source={IMG_CHEST} style={{width:120,height:88,borderRadius:14}} resizeMode="cover"/>
      </Animated.View>

      {/* Title */}
      <Animated.View style={{
        alignItems:"center",marginBottom:20,
        opacity:titleOp,transform:[{translateY:titleY}],
      }}>
        <Text style={{
          fontSize:13,fontWeight:"900",color:"rgba(255,213,79,0.65)",
          letterSpacing:4,marginBottom:6,
        }}>🗺️  ADVENTURE AWAITS</Text>
        <Text style={{
          fontSize:42,fontWeight:"900",color:C.yellow,
          textAlign:"center",lineHeight:48,
          textShadowColor:"rgba(255,180,0,0.5)",
          textShadowOffset:{width:0,height:0},textShadowRadius:24,
        }}>The Treasure{"\n"}Hunt</Text>
      </Animated.View>

      {/* Story card */}
      <Animated.View style={{
        width:"100%",maxWidth:400,
        backgroundColor:"rgba(20,14,6,0.95)",
        borderRadius:24, borderWidth:1.5,
        borderColor:"rgba(255,213,79,0.4)",
        padding:20, marginBottom:28,
        opacity:cardOp, transform:[{translateY:cardY}],
        overflow:"hidden",
        shadowColor:C.yellow,shadowOffset:{width:0,height:0},
        shadowOpacity:0.2,shadowRadius:20,elevation:10,
      }}>
        <Text style={{
          fontSize:15,color:"#E8D5B0",lineHeight:24,
          textAlign:"center",
        }}>
          <Text style={{color:C.yellow,fontWeight:"900"}}>Somewhere hidden</Text> lies a legendary treasure chest — buried in a remote land,{" "}
          guarded by treacherous paths and ancient riddles.{"\n\n"}
          You hold a <Text style={{color:C.yellow,fontWeight:"900"}}>Treasure Hunt Map</Text> with cryptic clues.{" "}
          Follow them wisely. One wrong turn leads to{" "}
          <Text style={{color:C.red,fontWeight:"900"}}>monsters</Text>,{" "}
          <Text style={{color:C.red,fontWeight:"900"}}>snake-filled chests</Text> or a{" "}
          <Text style={{color:C.red,fontWeight:"900"}}>deadly pit</Text>.{"\n\n"}
          <Text style={{color:"#69F0AE",fontWeight:"700"}}>Only the bravest explorer</Text> will find the treasure. Are you ready?
        </Text>
      </Animated.View>

      {/* START button */}
      <Animated.View style={{width:"100%",maxWidth:400,transform:[{scale:btnScale}]}}>
        <TouchableOpacity
          style={{
            backgroundColor:C.yellow,
            borderRadius:32, paddingVertical:18,
            alignItems:"center", justifyContent:"center",
            overflow:"hidden",
            shadowColor:C.yellow,shadowOffset:{width:0,height:0},
            shadowOpacity:0.7,shadowRadius:22,elevation:14,
          }}
          onPress={onStart} activeOpacity={0.88}
        >
          {/* Shimmer on button */}
          <Animated.View pointerEvents="none" style={{
            position:"absolute",top:0,bottom:0,width:70,
            backgroundColor:"rgba(255,255,255,0.3)",
            transform:[{translateX:shimX},{skewX:"-15deg"}],
          }}/>
          <Text style={{
            fontSize:20,fontWeight:"900",color:"#1a1200",
            letterSpacing:1,
          }}>🗺️  BEGIN THE HUNT!</Text>
        </TouchableOpacity>
      </Animated.View>

      <Text style={{
        color:"rgba(255,255,255,0.25)",fontSize:11,
        marginTop:16,textAlign:"center",
      }}>A new map is created every time you play</Text>
    </View>
  );
}

// ─── INTRO POPUP ──────────────────────────────────────────────────────────────
// Shows on top of the first location scene, explains how to play
function IntroPopup({ sw, sh, onContinue }) {
  const sc  = useRef(new Animated.Value(0.5)).current;
  const op  = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(40)).current;

  useEffect(()=>{
    Animated.parallel([
      Animated.spring(sc,{toValue:1,friction:5,tension:55,useNativeDriver:true}),
      Animated.timing(op,{toValue:1,duration:350,useNativeDriver:true}),
      Animated.spring(slideY,{toValue:0,friction:6,useNativeDriver:true}),
    ]).start();
  },[]);

  const tips = [
    { icon:"👆", text:"Tap the screen to move to the next location" },
    { icon:"📖", text:"Use your Treasure Map when you need to choose a path — it holds riddle clues" },
    { icon:"⚠️", text:"Wrong paths lead to monsters, ocean falls or deadly pits" },
    { icon:"📦", text:"You may find chests along the way — always check the guide before opening one" },
    { icon:"🐍", text:"Remote places hide dangerous snakes inside false chests!" },
  ];

  return (
    <Animated.View style={{
      ...StyleSheet.absoluteFillObject,
      backgroundColor:"rgba(0,0,0,0.82)",
      alignItems:"center", justifyContent:"center",
      zIndex:450,
      opacity:op,
    }}>
      <Animated.View style={{
        width:sw*0.9, maxWidth:400,
        backgroundColor:"rgba(12,8,2,0.98)",
        borderRadius:28, borderWidth:2,
        borderColor:"rgba(255,213,79,0.55)",
        paddingTop:0, paddingBottom:22, paddingHorizontal:22,
        overflow:"hidden",
        shadowColor:C.yellow,shadowOffset:{width:0,height:0},
        shadowOpacity:0.5,shadowRadius:30,elevation:20,
        transform:[{scale:sc},{translateY:slideY}],
      }}>
        {/* Header banner */}
        <View style={{
          backgroundColor:"rgba(255,213,79,0.12)",
          borderTopLeftRadius:26, borderTopRightRadius:26,
          paddingVertical:16, paddingHorizontal:20,
          alignItems:"center", marginBottom:18,
          borderBottomWidth:1.5, borderBottomColor:"rgba(255,213,79,0.25)",
        }}>
          <Text style={{fontSize:28,marginBottom:4}}>🗺️</Text>
          <Text style={{
            fontSize:18,fontWeight:"900",color:C.yellow,
            textAlign:"center",letterSpacing:0.5,
          }}>Your Hunt Begins Here!</Text>
          <Text style={{fontSize:12,color:C.textSec,marginTop:3,textAlign:"center"}}>
            Read this before you set off, brave explorer
          </Text>
        </View>

        {/* Tips list */}
        {tips.map((t,i)=>(
          <View key={i} style={{
            flexDirection:"row", alignItems:"flex-start",
            gap:12, marginBottom:14,
          }}>
            <Text style={{fontSize:20,lineHeight:24}}>{t.icon}</Text>
            <Text style={{
              flex:1, fontSize:14, color:"#E8D5B0",
              lineHeight:21,
            }}>{t.text}</Text>
          </View>
        ))}

        {/* Continue button */}
        <TouchableOpacity
          style={{
            backgroundColor:C.yellow, borderRadius:28,
            paddingVertical:15, alignItems:"center",
            marginTop:6,
            shadowColor:C.yellow,shadowOffset:{width:0,height:0},
            shadowOpacity:0.6,shadowRadius:14,elevation:10,
          }}
          onPress={onContinue} activeOpacity={0.85}
        >
          <Text style={{fontSize:17,fontWeight:"900",color:"#1a1200",letterSpacing:0.5}}>
            🏃 Let's Go!
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

// ─── ROOT COMPONENT ───────────────────────────────────────────────────────────
export default function TreasureHuntGame({ onExit }) {
  const router = useRouter();
  const { width: sw, height: sh } = useWindowDimensions();

  // ── Game state ────────────────────────────────────────────
  const [gameMap,     setGameMap]     = useState(null);
  const [currentNode, setCurrentNode] = useState(null);
  const [phase, setPhase]             = useState("welcome");
  // phases: welcome | intro | idle | walking | choice | chest |
  //         deadend | won | lost

  const [score,       setScore]       = useState(0);
  const [stars,       setStars]       = useState([]);
  const [lastChoice,  setLastChoice]  = useState(null); // 'correct'|'wrong'
  const [chosenSide,  setChosenSide]  = useState(null); // 'left'|'right'
  const [wrongFlash,  setWrongFlash]  = useState(null); // 'left'|'right'
  const [loseReason,  setLoseReason]  = useState(null);
  const [screenTint,  setScreenTint]  = useState(null); // 'red'|'green'|'grey'
  const [guideOpen,   setGuideOpen]   = useState(false);
  const [chestReady,  setChestReady]  = useState(false); // Fix #3: show scene before popup
  const [choiceReady, setChoiceReady] = useState(false); // show scene before choice boxes appear

  // Animations
  const sceneOpacity  = useRef(new Animated.Value(0)).current;
  const sceneScale    = useRef(new Animated.Value(0.95)).current;
  const leftBoxAnim   = useRef(new Animated.Value(0)).current;
  const rightBoxAnim  = useRef(new Animated.Value(0)).current;
  const leftFlash     = useRef(new Animated.Value(0)).current;
  const rightFlash    = useRef(new Animated.Value(0)).current;
  const tintOpacity   = useRef(new Animated.Value(0)).current;

  const starIdRef  = useRef(0);
  const badgePos   = useRef({ x: sw - 55, y: STATUS_H + 12 });
  const badgeScale = useRef(new Animated.Value(1)).current;

  // ── Sounds ────────────────────────────────────────────────
  const sndCorrect = useRef(null);
  const sndWrong   = useRef(null);
  const sndWin     = useRef(null);
  const sndLose    = useRef(null);

  useEffect(()=>{
    let alive=true;
    (async()=>{
      try{ await Audio.setAudioModeAsync({playsInSilentModeIOS:true}); }catch(_){}
      for(const [r,a] of [
        [sndCorrect,require("../assets/sounds/game/correct-hit.mp3")],
        [sndWrong,  require("../assets/sounds/game/wrong-hit.mp3")],
        [sndWin,    require("../assets/sounds/game/win.mp3")],
        [sndLose,   require("../assets/sounds/game/lose.mp3")],
      ]){
        try{ const {sound}=await Audio.Sound.createAsync(a); if(alive) r.current=sound; else sound.unloadAsync(); }catch(_){}
      }
    })();
    return()=>{ alive=false; [sndCorrect,sndWrong,sndWin,sndLose].forEach(r=>{r.current?.unloadAsync();r.current=null;}); };
  },[]);

  const playSound = r=>{ try{ r.current?.setPositionAsync(0).then(()=>r.current?.playAsync()); }catch(_){} };

  // ── Scene transition ──────────────────────────────────────
  const fadeInScene = useCallback((cb) => {
    sceneOpacity.setValue(0);
    sceneScale.setValue(0.97);
    Animated.parallel([
      Animated.timing(sceneOpacity,{toValue:1,duration:600,easing:Easing.out(Easing.quad),useNativeDriver:true}),
      Animated.spring(sceneScale,{toValue:1,friction:8,tension:60,useNativeDriver:true}),
    ]).start(cb);
  },[]);

  const fadeOutScene = useCallback((cb) => {
    Animated.timing(sceneOpacity,{toValue:0,duration:400,useNativeDriver:true}).start(cb);
  },[]);

  // ── Stars ─────────────────────────────────────────────────
  const pulseBadge = () => {
    Animated.sequence([
      Animated.spring(badgeScale,{toValue:1.45,friction:3,tension:200,useNativeDriver:true}),
      Animated.spring(badgeScale,{toValue:1,friction:4,tension:200,useNativeDriver:true}),
    ]).start();
  };
  const spawnStars = (x, y) => {
    const bp = badgePos.current;
    const s = Array.from({length:6},(_,i)=>({
      id:starIdRef.current++,
      startX:x-14,startY:y-14,
      endX:bp.x,endY:bp.y,
      delay:i*70,
    }));
    setStars(prev=>[...prev,...s]);
    setTimeout(pulseBadge,450);
  };

  // ── Screen tint ───────────────────────────────────────────
  const showTint = (color, duration=800, cb) => {
    setScreenTint(color);
    tintOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(tintOpacity,{toValue:0.7,duration:250,useNativeDriver:true}),
      Animated.delay(duration-500),
      Animated.timing(tintOpacity,{toValue:0,duration:250,useNativeDriver:true}),
    ]).start(()=>{ setScreenTint(null); cb?.(); });
  };

  // ── Start game (called from welcome screen START button) ─
  const startGame = useCallback(() => {
    const map = buildGameMap();
    setGameMap(map);
    setScore(0);
    setStars([]);
    setLastChoice(null);
    setChosenSide(null);
    setWrongFlash(null);
    setLoseReason(null);
    setScreenTint(null);
    setChestReady(false);
    setChoiceReady(false);

    const startNode = map.nodes[map.startNodeId];
    setCurrentNode(startNode);
    setPhase("intro");   // show intro popup on first scene
    fadeInScene();
  },[fadeInScene]);

  // ── Navigate to node ──────────────────────────────────────
  const goToNode = useCallback((nodeId) => {
    if (!gameMap) return;
    const node = gameMap.nodes[nodeId];
    if (!node) return;

    fadeOutScene(()=>{
      setCurrentNode(node);
      setLastChoice(null);
      setChosenSide(null);
      setWrongFlash(null);
      setGuideOpen(false);
      setChestReady(false);
      setChoiceReady(false);

      if (node.type === "deadend") {
        setPhase("deadend");
        setLoseReason(`deadend_${node.deadType}`);
        fadeInScene();
      } else if (node.type === "treasure" || node.type === "chest_fake") {
        // Show location scene first, then reveal chest popup after 2.5s
        setPhase("chest");
        fadeInScene(()=>{
          setTimeout(()=> setChestReady(true), 2500);
        });
      } else if (node.type === "choice") {
        // Land in "walking" phase first — user sees full scene, taps to reveal choices
        // This gives them time to absorb their current location before being asked to choose
        setPhase("walking");
        fadeInScene();
      } else {
        // Normal node
        setPhase("walking");
        fadeInScene();
      }
    });
  },[gameMap, fadeOutScene, fadeInScene, leftBoxAnim, rightBoxAnim]);

  // ── Handle tap on single-path location ───────────────────
  const handleSceneTap = useCallback(() => {
    if (!currentNode || !gameMap) return;
    if (phase === "chest") return;
    if (phase === "choice") return;
    if (phase !== "walking") return;

    const node = currentNode;

    // If this is a choice node and choices haven't been revealed yet → reveal them
    if (node.type === "choice") {
      setChoiceReady(true);
      setPhase("choice");
      leftBoxAnim.setValue(0);
      rightBoxAnim.setValue(0);
      Animated.parallel([
        Animated.spring(leftBoxAnim, {toValue:1,friction:5,tension:60,useNativeDriver:true}),
        Animated.spring(rightBoxAnim,{toValue:1,friction:5,tension:60,useNativeDriver:false,delay:100}),
      ]).start();
      setTimeout(()=>setGuideOpen(true), 700);
      return;
    }

    // Normal node → navigate forward
    if (node.next) {
      goToNode(node.next);
    }
  }, [currentNode, gameMap, phase, goToNode, leftBoxAnim, rightBoxAnim]);

  // ── Handle navigation choice ──────────────────────────────
  const handleChoiceTap = useCallback((side) => {
    if (!currentNode || phase !== "choice") return;
    if (guideOpen) { setGuideOpen(false); return; }

    const chosenNodeId  = side === "left" ? currentNode.left : currentNode.right;
    const correctSide   = currentNode.isCorrectLeft ? "left" : "right";
    const isCorrect     = side === correctSide;

    setChosenSide(side);
    setGuideOpen(false);

    if (isCorrect) {
      playSound(sndCorrect);
      setScore(s => s + PTS_CORRECT_NAV);
      setLastChoice("correct");
      spawnStars(side==="left" ? sw*0.25 : sw*0.75, sh*0.45);
      // Flash chosen side, then navigate
      setTimeout(()=>goToNode(chosenNodeId), 900);
    } else {
      playSound(sndWrong);
      setScore(s => s + PTS_WRONG_NAV);
      setLastChoice("wrong");
      setWrongFlash(side);
      // Show red on wrong side, then navigate to wrong path
      setTimeout(()=>goToNode(chosenNodeId), 1200);
    }
  },[currentNode, phase, guideOpen, gameMap, goToNode, sw, sh]);

  // ── Handle chest open/leave ───────────────────────────────
  const handleChestOpen = useCallback(() => {
    if (!currentNode || !gameMap) return;
    const isTreasure = currentNode.type === "treasure";

    if (isTreasure) {
      // WIN!
      playSound(sndWin);
      setScore(s => s + PTS_CORRECT_CHEST);
      spawnStars(sw/2, sh*0.4);
      setTimeout(()=>setPhase("won"), 600);
    } else {
      // Wrong chest — snake!
      playSound(sndLose);
      setScore(s => s + PTS_WRONG_CHEST);
      showTint("red", 1000, ()=>setPhase("lost"));
      setLoseReason("wrong_chest");
    }
  },[currentNode, gameMap, sw, sh]);

  const handleChestLeave = useCallback(() => {
    if (!currentNode || !gameMap) return;
    const isTreasure = currentNode.type === "treasure";

    if (isTreasure) {
      // Left the real treasure — lose
      setLoseReason("left_treasure");
      showTint("grey", 800, () => setPhase("lost"));
    } else {
      // Left a fake chest — survived! Screen flashes green, then continue
      showTint("green", 600, () => {
        // fake chest nodes always have next set (guaranteed by buildGameMap)
        if (currentNode.next) {
          goToNode(currentNode.next);
        } else if (currentNode.left) {
          goToNode(currentNode.left);
        } else {
          // absolute fallback: should never happen with new algorithm
          goToNode(gameMap.startNodeId);
        }
      });
    }
  }, [currentNode, gameMap, goToNode]);

  // ── Exit ──────────────────────────────────────────────────
  const handleExit = useCallback(()=>{
    if(typeof onExit==="function") onExit(); else router.back();
  },[onExit]);

  const handlePlayAgain = useCallback(()=>{
    setPhase("welcome");
    setGameMap(null);
    setCurrentNode(null);
  },[]);

  // (game starts from welcome screen, no auto-init needed)

  // ── Welcome screen ────────────────────────────────────────
  if (phase === "welcome") {
    return (
      <WelcomeScreen
        onStart={startGame}
        onExit={handleExit}
      />
    );
  }

  if (!gameMap || !currentNode) {
    return (
      <View style={{flex:1,backgroundColor:C.bg,alignItems:"center",justifyContent:"center"}}>
        <Text style={{fontSize:40}}>🗺️</Text>
        <Text style={{color:C.textSec,fontSize:16,marginTop:12}}>Preparing your adventure...</Text>
      </View>
    );
  }

  const node     = currentNode;
  const leftLoc  = node.leftLocId  ? LOCATION_DATA.find(l=>l.id===node.leftLocId)  : null;
  const rightLoc = node.rightLocId ? LOCATION_DATA.find(l=>l.id===node.rightLocId) : null;
  const mainLoc  = LOCATION_DATA.find(l=>l.id===node.locId);
  const isChoice = phase === "choice";
  const isWalking = phase === "walking";
  const isChest  = phase === "chest";

  const chestRiddle = node.chestRiddle ?? mainLoc?.riddle2 ?? "";

  return (
    <View style={{flex:1,backgroundColor:C.bg,overflow:"hidden"}}>

      {/* ── BLACK HEADER ── */}
      <View style={{
        position:"absolute",top:0,left:0,right:0,
        height:HEADER_H_TOTAL,
        backgroundColor:"#000",
        zIndex:200,
        borderBottomWidth:2,borderBottomColor:"rgba(255,213,79,0.35)",
        flexDirection:"row",alignItems:"flex-end",
        paddingBottom:10,paddingHorizontal:14,
      }}>
        <TouchableOpacity style={st.exitBtn} onPress={handleExit} activeOpacity={0.8}
          hitSlop={{top:12,bottom:12,left:12,right:12}}>
          <Text style={st.exitTxt}>✕</Text>
        </TouchableOpacity>
        <View style={{flex:1,alignItems:"center"}}>
          <Text style={{fontSize:12,fontWeight:"800",color:"rgba(255,213,79,0.7)",letterSpacing:1.5}}>
            🗺️ TREASURE HUNT
          </Text>
          {mainLoc && (
            <Text style={{fontSize:14,fontWeight:"700",color:C.white}}>
              {mainLoc.emoji} {mainLoc.name}
            </Text>
          )}
        </View>
        <Animated.View style={[st.scorePill,{transform:[{scale:badgeScale}]}]}>
          <Text style={st.scoreTxt}>⭐ {score}</Text>
        </Animated.View>
      </View>

      {/* ── MAIN SCENE AREA ── */}
      <TouchableOpacity
        style={{flex:1,marginTop:HEADER_H_TOTAL}}
        onPress={isWalking ? handleSceneTap : undefined}
        activeOpacity={1}
      >
        <Animated.View style={{
          flex:1,
          opacity:sceneOpacity,
          transform:[{scale:sceneScale}],
        }}>
          {/* WALKING: single full-screen scene — also shown before choice boxes appear */}
          {(isWalking || isChest || phase==="deadend") && mainLoc && (
            <LocationScene locId={mainLoc.id} sw={sw} sh={sh - HEADER_H_TOTAL}/>
          )}

          {/* CHOICE: two scenes side by side — only shown after user taps */}
          {isChoice && (
            <View style={{flex:1}}>
              {/* Current scene background (dimmed) */}
              {mainLoc && (
                <View style={{...StyleSheet.absoluteFillObject,opacity:0.35}}>
                  <LocationScene locId={mainLoc.id} sw={sw} sh={sh-HEADER_H_TOTAL}/>
                </View>
              )}

              {/* Choice label */}
              <View style={{
                position:"absolute",top:16,left:0,right:0,
                alignItems:"center",zIndex:10,
              }}>
                <View style={{
                  backgroundColor:"rgba(0,0,0,0.78)",
                  borderRadius:20,paddingHorizontal:18,paddingVertical:8,
                  borderWidth:1.5,borderColor:"rgba(255,213,79,0.5)",
                }}>
                  <Text style={{color:C.yellow,fontWeight:"900",fontSize:14,letterSpacing:0.5}}>
                    📖 Check your guide — where to go?
                  </Text>
                </View>
              </View>

              {/* Two location image boxes — shorter height so labels stay above guide */}
              <View style={{
                position:"absolute",
                top: (sh-HEADER_H_TOTAL)*0.08,
                left:12,right:12,
                flexDirection:"row",gap:12,
                zIndex:5,
              }}>
                {/* LEFT box */}
                {leftLoc && (
                  <TouchableOpacity
                    style={{flex:1,borderRadius:18,overflow:"hidden"}}
                    onPress={()=>handleChoiceTap("left")}
                    activeOpacity={0.85}
                    disabled={!!lastChoice}
                  >
                    <Animated.View style={{
                      borderRadius:18,overflow:"hidden",
                      borderWidth:3,
                      borderColor: wrongFlash==="left" ? C.red :
                                   (lastChoice==="correct"&&chosenSide==="left") ? C.green :
                                   "rgba(255,213,79,0.5)",
                      shadowColor: wrongFlash==="left" ? C.red : C.yellow,
                      shadowOffset:{width:0,height:0},
                      shadowOpacity:0.8,shadowRadius:12,elevation:10,
                      opacity:leftBoxAnim,
                      transform:[{scale:leftBoxAnim.interpolate({inputRange:[0,1],outputRange:[0.85,1]})}],
                    }}>
                      <LocationScene locId={leftLoc.id} sw={(sw-36)/2} sh={(sh-HEADER_H_TOTAL)*0.36} compact/>
                      <View style={{
                        backgroundColor:"rgba(0,0,0,0.92)",
                        paddingVertical:8, paddingHorizontal:6,
                        alignItems:"center",
                      }}>
                        <Text style={{fontSize:16}}>{leftLoc.emoji}</Text>
                        <Text style={{fontSize:12,fontWeight:"900",color:C.white,textAlign:"center",lineHeight:16}}>{leftLoc.name}</Text>
                        {wrongFlash==="left" && <Text style={{fontSize:11,color:C.red,fontWeight:"700",marginTop:2}}>✗ WRONG!</Text>}
                        {lastChoice==="correct"&&chosenSide==="left" && <Text style={{fontSize:11,color:C.green,fontWeight:"700",marginTop:2}}>✓ CORRECT!</Text>}
                      </View>
                    </Animated.View>
                  </TouchableOpacity>
                )}

                {/* RIGHT box */}
                {rightLoc && (
                  <TouchableOpacity
                    style={{flex:1,borderRadius:18,overflow:"hidden"}}
                    onPress={()=>handleChoiceTap("right")}
                    activeOpacity={0.85}
                    disabled={!!lastChoice}
                  >
                    <Animated.View style={{
                      borderRadius:18,overflow:"hidden",
                      borderWidth:3,
                      borderColor: wrongFlash==="right" ? C.red :
                                   (lastChoice==="correct"&&chosenSide==="right") ? C.green :
                                   "rgba(255,213,79,0.5)",
                      shadowColor: wrongFlash==="right" ? C.red : C.yellow,
                      shadowOffset:{width:0,height:0},
                      shadowOpacity:0.8,shadowRadius:12,elevation:10,
                      opacity:rightBoxAnim,
                      transform:[{scale:rightBoxAnim.interpolate({inputRange:[0,1],outputRange:[0.85,1]})}],
                    }}>
                      <LocationScene locId={rightLoc.id} sw={(sw-36)/2} sh={(sh-HEADER_H_TOTAL)*0.36} compact/>
                      <View style={{
                        backgroundColor:"rgba(0,0,0,0.92)",
                        paddingVertical:8, paddingHorizontal:6,
                        alignItems:"center",
                      }}>
                        <Text style={{fontSize:16}}>{rightLoc.emoji}</Text>
                        <Text style={{fontSize:12,fontWeight:"900",color:C.white,textAlign:"center",lineHeight:16}}>{rightLoc.name}</Text>
                        {wrongFlash==="right" && <Text style={{fontSize:11,color:C.red,fontWeight:"700",marginTop:2}}>✗ WRONG!</Text>}
                        {lastChoice==="correct"&&chosenSide==="right" && <Text style={{fontSize:11,color:C.green,fontWeight:"700",marginTop:2}}>✓ CORRECT!</Text>}
                      </View>
                    </Animated.View>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Walking tap hint — large, pulsing, always visible */}
          {isWalking && !isChest && (
            <PulsingTapButton
              label={currentNode?.type === "choice"
                ? "👆  Tap to choose your path"
                : "👆  Tap to move forward"}
              sw={sw}
            />
          )}
        </Animated.View>
      </TouchableOpacity>

      {/* ── INTRO POPUP — shown on first scene only ── */}
      {phase === "intro" && (
        <IntroPopup
          sw={sw} sh={sh}
          onContinue={()=>setPhase("walking")}
        />
      )}

      {/* ── GUIDE BOOK ── */}
      {isChoice && guideOpen && node.riddleText && (
        <GuideBook
          riddle={node.riddleText}
          title="TREASURE HUNT GUIDE"
          sw={sw} sh={sh}
        >
          <View style={{marginTop:12,gap:10}}>
            <Text style={{
              color:C.yellow,fontSize:12,fontWeight:"900",
              textAlign:"center",letterSpacing:0.5,marginBottom:4,
            }}>
              🗺️ Now choose your path — tap LEFT or RIGHT
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor:"rgba(255,213,79,0.15)",borderRadius:16,
                paddingVertical:12,alignItems:"center",
                borderWidth:1,borderColor:"rgba(255,213,79,0.4)",
              }}
              onPress={()=>setGuideOpen(false)}
              activeOpacity={0.8}
            >
              <Text style={{color:C.yellow,fontWeight:"800",fontSize:14}}>Got it! Let me choose →</Text>
            </TouchableOpacity>
          </View>
        </GuideBook>
      )}

      {/* ── CHEST POPUP — only shown after scene has been visible for 2.5s ── */}
      {isChest && chestReady && (
        <ChestPopup
          riddle={chestRiddle}
          sw={sw} sh={sh}
          onOpen={handleChestOpen}
          onLeave={handleChestLeave}
        />
      )}

      {/* Chest found teaser — shown while player sees the scene before popup */}
      {isChest && !chestReady && (
        <View style={{
          position:"absolute", bottom:30, left:sw*0.1, right:sw*0.1,
          backgroundColor:"rgba(0,0,0,0.8)",
          borderRadius:24, paddingVertical:14, paddingHorizontal:18,
          alignItems:"center", zIndex:100,
          borderWidth:2, borderColor:"rgba(255,213,79,0.6)",
        }}>
          <Text style={{fontSize:22, marginBottom:4}}>📦</Text>
          <Text style={{color:C.yellow, fontSize:15, fontWeight:"900", textAlign:"center"}}>
            You found a chest here...
          </Text>
          <Text style={{color:C.textSec, fontSize:12, marginTop:3, textAlign:"center"}}>
            Look around carefully — remember this place!
          </Text>
        </View>
      )}

      {/* ── SCREEN TINT OVERLAY ── */}
      {screenTint && (
        <Animated.View pointerEvents="none" style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor:
            screenTint==="red" ? "rgba(200,0,0,0.6)" :
            screenTint==="green" ? "rgba(0,180,0,0.5)" :
            "rgba(100,100,100,0.5)",
          zIndex:550,
          opacity:tintOpacity,
        }}/>
      )}

      {/* ── FLYING STARS ── */}
      {stars.map(s=>(
        <FlyingStar key={s.id}
          startX={s.startX} startY={s.startY}
          endX={s.endX} endY={s.endY}
          delay={s.delay}
          onDone={()=>setStars(prev=>prev.filter(x=>x.id!==s.id))}
        />
      ))}

      {/* ── WIN / LOSE OVERLAYS ── */}
      {phase==="won" && (
        <WinOverlay score={score} sw={sw} sh={sh}
          onPlayAgain={handlePlayAgain} onExit={handleExit}/>
      )}
      {phase==="lost" && (
        <LoseOverlay reason={loseReason} sw={sw} sh={sh}
          onPlayAgain={handlePlayAgain} onExit={handleExit}/>
      )}
      {phase==="deadend" && (
        <LoseOverlay reason={loseReason} sw={sw} sh={sh}
          onPlayAgain={handlePlayAgain} onExit={handleExit}/>
      )}

    </View>
  );
}

// ─── HEADER HEIGHT CONSTANT ───────────────────────────────────────────────────
// Computed here so LocationScene and root component agree
const HEADER_H_TOTAL = STATUS_H + 56;

// ─── STYLES ───────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  exitBtn: {
    width:38,height:38,borderRadius:19,
    backgroundColor:"rgba(255,255,255,0.08)",
    borderWidth:1,borderColor:"rgba(255,255,255,0.18)",
    alignItems:"center",justifyContent:"center",
  },
  exitTxt: { color:C.textSec, fontSize:15, fontWeight:"700" },
  scorePill: {
    backgroundColor:C.yellowDim,borderRadius:20,
    borderWidth:1.5,borderColor:C.yellowBorder,
    paddingHorizontal:14,paddingVertical:6,minWidth:70,alignItems:"center",
  },
  scoreTxt: { fontSize:14,fontWeight:"900",color:C.yellow },
});
