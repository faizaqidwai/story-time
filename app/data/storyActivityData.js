// data/storyActivityData.js
//
// ── TEMPORARY ──────────────────────────────────────────────────────────────
// This file attaches activity data to stories fetched from the backend.
// Once the backend sends activity data along with each story, simply delete
// this file and remove the call to `attachActivityDataToStories()` in home.jsx.
//
// Each story gets:
//   challengeWords  — used by WordGuessGame (word_story_challenge)
//   listeningData   — used by Article / ListeningChallenge (word_listening_challenge)
//   understandingData — used by DescribeObjectGame (word_understanding_challenge)
// ─────────────────────────────────────────────────────────────────────────────

// ── Shared pool of word-guess entries (maps to words.json structure) ──────
const WORD_POOL = [
  {
    word: "ELEPHANT",
    hints: [
      "The largest land animal on Earth",
      "Has a very long nose called a trunk",
      "Lives in Africa and Asia",
      "Herbivore — eats only plants",
      "Uses its trunk to drink water",
    ],
  },
  {
    word: "JUNGLE",
    hints: [
      "A dense tropical forest",
      "Full of tall trees and wild animals",
      "Very hot and humid",
      "Often found near the equator",
      "Home to monkeys, parrots and snakes",
    ],
  },
  {
    word: "ADVENTURE",
    hints: [
      "An exciting or dangerous journey",
      "Often involves exploring new places",
      "Requires courage",
      "Stories are full of this",
      "The opposite of a boring routine",
    ],
  },
  {
    word: "RIVER",
    hints: [
      "A large natural stream of water",
      "Flows downhill to the sea",
      "Fish live inside it",
      "You can cross it on a bridge",
      "Crocodiles love to rest beside it",
    ],
  },
  {
    word: "SAVANNA",
    hints: [
      "A wide grassy plain in Africa",
      "Has very few trees",
      "Lions and giraffes live here",
      "Gets very little rain",
      "Also called a grassland",
    ],
  },
  {
    word: "FAMILY",
    hints: [
      "People or animals you are related to",
      "Elephants travel in tight groups of these",
      "Includes parents and children",
      "A source of love and protection",
      "Sticks together in hard times",
    ],
  },
];

// ── Shared listening articles pool ────────────────────────────────────────
// Structure mirrors articles.json entries used by Article.jsx
const LISTENING_POOL = [
  {
    id: "story_listen_1",
    title: "The Journey Begins",
    image_url: null,
    audio_narration_script:
      "Deep in the heart of Africa, a young elephant named Kofi took his first steps into the wide world. His mother walked beside him, her enormous ears fanning the hot savanna air. Together they trudged through golden grass that reached above Kofi's head, searching for the distant river their herd had visited every dry season for a hundred years. Kofi had heard stories of the cool water and the sweet reeds that grew along its banks. Now, at last, he was old enough to make the journey himself.",
    questions: [
      {
        question: "Where does the story take place?",
        options: ["In the Arctic", "Deep in Africa", "On a mountain", "In the ocean"],
        correct_answer_index: 1,
      },
      {
        question: "What is the young elephant's name?",
        options: ["Bongo", "Kofi", "Simba", "Tembo"],
        correct_answer_index: 1,
      },
      {
        question: "What was the herd searching for?",
        options: ["Food in the jungle", "A distant river", "A safe cave", "Other elephants"],
        correct_answer_index: 1,
      },
      {
        question: "Why was Kofi excited?",
        options: [
          "He had won a race",
          "He found a new friend",
          "He was old enough to make the journey",
          "He learned a new trick",
        ],
        correct_answer_index: 2,
      },
    ],
  },
  {
    id: "story_listen_2",
    title: "Friends of the Rainforest",
    image_url: null,
    audio_narration_script:
      "High in the treetops of the Amazon rainforest, a bright-green parrot named Pico spotted something unusual far below. A small turtle was trying to climb over a mossy log, slipping again and again on the wet bark. Pico swooped down to help. Together they figured out that if the turtle gripped the log with its claws while Pico pushed from behind with its beak, they could get the turtle safely over. That afternoon they shared a meal of berries and became the best of friends.",
    questions: [
      {
        question: "Where does this story take place?",
        options: ["In the desert", "In the Amazon rainforest", "In the ocean", "On a farm"],
        correct_answer_index: 1,
      },
      {
        question: "What was the turtle trying to do?",
        options: [
          "Cross a river",
          "Find food",
          "Climb over a mossy log",
          "Build a nest",
        ],
        correct_answer_index: 2,
      },
      {
        question: "How did Pico help the turtle?",
        options: [
          "Carried it on its back",
          "Called other animals",
          "Pushed from behind with its beak",
          "Dug a tunnel under the log",
        ],
        correct_answer_index: 2,
      },
      {
        question: "What did they share at the end?",
        options: ["Water", "Berries", "Fish", "Seeds"],
        correct_answer_index: 1,
      },
    ],
  },
  {
    id: "story_listen_3",
    title: "The Lost Cub",
    image_url: null,
    audio_narration_script:
      "A lion cub named Zara wandered too far from the pride one misty morning. She followed a butterfly through the tall grass until the butterfly vanished and she found herself completely alone. Zara sat very still and listened, just as her mother had taught her. She heard the distant rumble of her pride — low and steady, like thunder rolling across the plains. Step by step, using her ears to guide her, Zara found her way home before sunset.",
    questions: [
      {
        question: "Why did Zara wander away from the pride?",
        options: [
          "She was looking for food",
          "She followed a butterfly",
          "She was chasing a zebra",
          "She wanted to explore",
        ],
        correct_answer_index: 1,
      },
      {
        question: "What did Zara do when she was lost?",
        options: [
          "She ran in circles",
          "She sat still and listened",
          "She climbed a tree",
          "She cried loudly",
        ],
        correct_answer_index: 1,
      },
      {
        question: "What did she hear that guided her home?",
        options: [
          "A bird singing",
          "The wind blowing",
          "The distant rumble of her pride",
          "A river flowing",
        ],
        correct_answer_index: 2,
      },
      {
        question: "When did Zara find her way home?",
        options: ["At sunrise", "At noon", "Before sunset", "After midnight"],
        correct_answer_index: 2,
      },
    ],
  },
];

// ── Shared describing objects pool ────────────────────────────────────────
// Mirrors describeObjects.json structure used by DescribeObjectGame
const DESCRIBE_POOL = [
  {
    id: "desc_elephant",
    object: "Elephant",
    emoji: "🐘",
    options: [
      { id: "e1", text: "Has a long trunk used for breathing and grabbing", correct: true },
      { id: "e2", text: "Has large flapping ears to stay cool", correct: true },
      { id: "e3", text: "Is the largest land animal on Earth", correct: true },
      { id: "e4", text: "Has sharp claws for climbing trees", correct: false },
      { id: "e5", text: "Lives in cold icy regions", correct: false },
      { id: "e6", text: "Eats meat and fish", correct: false },
    ],
  },
  {
    id: "desc_parrot",
    object: "Parrot",
    emoji: "🦜",
    options: [
      { id: "p1", text: "Can mimic human speech", correct: true },
      { id: "p2", text: "Has bright colourful feathers", correct: true },
      { id: "p3", text: "Uses its curved beak to crack nuts", correct: true },
      { id: "p4", text: "Lives underwater in coral reefs", correct: false },
      { id: "p5", text: "Has four legs and no wings", correct: false },
      { id: "p6", text: "Only eats other birds", correct: false },
    ],
  },
  {
    id: "desc_lion",
    object: "Lion",
    emoji: "🦁",
    options: [
      { id: "l1", text: "Lives in groups called prides", correct: true },
      { id: "l2", text: "Male lions have a distinctive mane", correct: true },
      { id: "l3", text: "Known as the king of the jungle", correct: true },
      { id: "l4", text: "Builds nests high up in trees", correct: false },
      { id: "l5", text: "Is a herbivore that eats grass", correct: false },
      { id: "l6", text: "Lives in cold Arctic regions", correct: false },
    ],
  },
  {
    id: "desc_river",
    object: "River",
    emoji: "🏞️",
    options: [
      { id: "r1", text: "Flows from highlands down to the sea", correct: true },
      { id: "r2", text: "Provides fresh water for animals and plants", correct: true },
      { id: "r3", text: "Can be crossed using bridges or boats", correct: true },
      { id: "r4", text: "Is made of salt water like the ocean", correct: false },
      { id: "r5", text: "Only found in cold snowy countries", correct: false },
      { id: "r6", text: "Flows uphill from sea to mountains", correct: false },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT — attach activity data to a list of stories
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mutates (or maps) stories array to attach activity data to each story.
 * Each story receives:
 *   story.activityData.wordGuess        — array of word-guess objects
 *   story.activityData.listening        — listening article object
 *   story.activityData.understanding    — array of describe-objects (3 per game)
 *
 * Words are rotated through WORD_POOL, listening / describing through their
 * respective pools using the story's array index so each story gets different data.
 *
 * @param {Array} stories  — raw stories from API / cache
 * @returns {Array}        — stories with activityData attached
 */
export function attachActivityDataToStories(stories) {
  if (!Array.isArray(stories)) return stories;

  return stories.map((story, idx) => {
    // Each story gets 3 words from the pool (cycled)
    const wordGuess = [
      WORD_POOL[idx % WORD_POOL.length],
      WORD_POOL[(idx + 1) % WORD_POOL.length],
      WORD_POOL[(idx + 2) % WORD_POOL.length],
    ];

    // Each story gets one listening article (cycled)
    const listening = LISTENING_POOL[idx % LISTENING_POOL.length];

    // Each story gets 3 describe-object items (cycled)
    const understanding = [
      DESCRIBE_POOL[idx % DESCRIBE_POOL.length],
      DESCRIBE_POOL[(idx + 1) % DESCRIBE_POOL.length],
      DESCRIBE_POOL[(idx + 2) % DESCRIBE_POOL.length],
    ];

    return {
      ...story,
      activityData: {
        wordGuess,   // used by WordGuessGame
        listening,   // used by Article / ListeningChallenge
        understanding, // used by DescribeObjectGame
      },
      // Expose challenge words at the top level for easy access
      challengeWords: wordGuess.map((w) => w.word.toLowerCase()),
    };
  });
}

export default attachActivityDataToStories;
