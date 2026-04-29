/**
 * levelDescriptions.js
 * app/data/levelDescriptions.js
 *
 * Content shown in WelcomeLevelOverlay when user progresses to a new level.
 * Add or edit entries freely — the overlay reads from here with no code changes.
 */

export const LEVEL_DESCRIPTIONS = {
  1: {
    welcomeHeading:   "Welcome to Level 1!",
    praiseMessage:    "Every great reader starts somewhere — and you just did!",
    courageMessage:   "8 beautiful stories are waiting for you. Let's begin your reading journey!",
    storiesHeading:   "8 Wonderful Stories",
    storiesSubtitle:  "Simple words, big adventures. Your first stories are here!",
    gamesHeading:     "2 Hidden Surprises",
    gamesMessage:     "Read your stories and scratch away the mystery — 2 exciting games are hiding inside this level!",
  },
  2: {
    welcomeHeading:   "Level 2 Unlocked! 🎉",
    praiseMessage:    "You finished Level 1 — that's incredible! You're already a real reader.",
    courageMessage:   "Level 2 brings bigger words and more exciting adventures. You're ready!",
    storiesHeading:   "8 Amazing New Stories",
    storiesSubtitle:  "Meet new characters, discover new places, and learn new words.",
    gamesHeading:     "2 New Surprises Hiding Here",
    gamesMessage:     "Complete your stories to scratch away the golden cover and reveal what's waiting inside!",
  },
  3: {
    welcomeHeading:   "Level 3 — You're Flying! ✨",
    praiseMessage:    "Two whole levels done! Your reading skills are growing stronger every day.",
    courageMessage:   "Level 3 introduces exciting new sentences and wonderful characters to meet.",
    storiesHeading:   "8 Exciting Stories",
    storiesSubtitle:  "More action, more adventure, more words to learn!",
    gamesHeading:     "2 Surprises Behind the Cover",
    gamesMessage:     "Finish your 8 stories and peel back the mystery. Two surprises are hidden just for you!",
  },
  4: {
    welcomeHeading:   "Level 4 — Amazing Progress! 🌟",
    praiseMessage:    "You've read so many stories — look how far you've come!",
    courageMessage:   "Level 4 brings richer language and longer adventures. Your brain is ready!",
    storiesHeading:   "8 Richer Stories",
    storiesSubtitle:  "Longer sentences, deeper stories, and bigger discoveries.",
    gamesHeading:     "2 Hidden Games",
    gamesMessage:     "Two new games are hiding under the golden cover. Read your stories to reveal them!",
  },
  5: {
    welcomeHeading:   "Level 5 — Halfway There! 🏆",
    praiseMessage:    "You've reached the middle — and you've earned every step of it!",
    courageMessage:   "Level 5 challenges you with more complex ideas and exciting new words.",
    storiesHeading:   "8 Wonderful Stories",
    storiesSubtitle:  "Stories that make you think, wonder, and imagine!",
    gamesHeading:     "2 Special Surprises",
    gamesMessage:     "Scratch away the mystery with every story you complete. Two special games await!",
  },
  6: {
    welcomeHeading:   "Level 6 — You're a Star! ⭐",
    praiseMessage:    "Five levels behind you — you should be so proud of yourself!",
    courageMessage:   "Level 6 brings more descriptive language and vivid storytelling.",
    storiesHeading:   "8 Vivid New Stories",
    storiesSubtitle:  "Rich descriptions and colorful characters await you.",
    gamesHeading:     "2 Mysteries to Uncover",
    gamesMessage:     "Every story you finish reveals more of the golden mystery. Two games are hiding inside!",
  },
  7: {
    welcomeHeading:   "Level 7 — Nearly There! 💫",
    praiseMessage:    "You're in the top levels — your reading has transformed completely!",
    courageMessage:   "Level 7 brings advanced vocabulary and thought-provoking stories.",
    storiesHeading:   "8 Advanced Stories",
    storiesSubtitle:  "Big words, deep ideas, and unforgettable moments.",
    gamesHeading:     "2 Golden Surprises",
    gamesMessage:     "The most exciting games are hidden in this level. Read to reveal them!",
  },
  8: {
    welcomeHeading:   "Level 8 — You're Extraordinary! 🌈",
    praiseMessage:    "Eight levels in — you are a true reading champion!",
    courageMessage:   "Level 8 has some of the most beautiful and complex stories in the app.",
    storiesHeading:   "8 Extraordinary Stories",
    storiesSubtitle:  "Complex vocabulary, rich themes, and incredible adventures.",
    gamesHeading:     "2 Epic Surprises",
    gamesMessage:     "Epic games are hiding under the golden cover. Complete your stories to find them!",
  },
  9: {
    welcomeHeading:   "Level 9 — One More to Go! 🎯",
    praiseMessage:    "You are so close to completing the entire journey — incredible!",
    courageMessage:   "Level 9 will push your reading to new heights. You are ready for this!",
    storiesHeading:   "8 Masterful Stories",
    storiesSubtitle:  "The most nuanced language and the most memorable tales.",
    gamesHeading:     "2 Final Surprises",
    gamesMessage:     "Two special rewards are hidden in this level just for you. Finish your stories to reveal them!",
  },
  10: {
    welcomeHeading:   "Level 10 — The Final Chapter! 🏅",
    praiseMessage:    "You made it to the final level. This is an incredible achievement!",
    courageMessage:   "The last 8 stories are some of the best in the entire collection.",
    storiesHeading:   "8 Legendary Stories",
    storiesSubtitle:  "The final, most beautiful stories. Savour every word.",
    gamesHeading:     "2 Legendary Surprises",
    gamesMessage:     "The ultimate hidden games await in this final level. Finish strong!",
  },
};

/**
 * getLevelDescription(levelNumber)
 * Returns the description for a level, falling back to a generic message
 * if the level is beyond what's defined above.
 */
export function getLevelDescription(levelNumber) {
  return (
    LEVEL_DESCRIPTIONS[levelNumber] ?? {
      welcomeHeading:  `Level ${levelNumber} Unlocked! 🎉`,
      praiseMessage:   "You've worked so hard to get here — amazing effort!",
      courageMessage:  "New stories, new words, and new adventures are waiting for you.",
      storiesHeading:  "8 New Stories",
      storiesSubtitle: "Fresh adventures and new vocabulary in every story.",
      gamesHeading:    "2 Hidden Surprises",
      gamesMessage:    "Complete your stories to scratch the golden cover and reveal 2 hidden games!",
    }
  );
}

/**
 * STORY_TEASERS
 * Shown in the Stories slide of WelcomeLevelOverlay.
 * The overlay cycles through these messages paired with story cards.
 * Each teaser is generic enough to work for any story in any level.
 */
export const STORY_TEASERS = [
  "What happens when friendship meets an unexpected surprise?",
  "A tiny creature is about to do something extraordinary...",
  "Can you guess what amazing discovery is waiting inside?",
  "Something wonderful is just around the corner...",
  "One small moment that will change everything!",
  "Adventure begins where the story ends...",
  "Are you ready to find out what happens next?",
  "The most exciting part is just getting started!",
];
