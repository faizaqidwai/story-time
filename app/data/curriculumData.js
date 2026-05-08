// app/data/curriculumData.js
//
// Learning path data — each entry maps a level number to its curriculum content.
// To add more levels, simply append new objects to the CURRICULUM array.
// The LearningPath screen reads this array directly — no code changes needed.

export const CURRICULUM = [
  {
    level: 1,
    grade: "LKG",
    gradeLabel: "Lower Kindergarten",
    emoji: "🐣",
    accentColor: "#4CAF50", // green — first steps
    tagColor: "rgba(76,175,80,0.2)",
    tagBorder: "rgba(76,175,80,0.5)",
    challengeWords: 3,
    wordTypes: ["CVC words only"],
    sentenceLength: "3–4 words",
    introduces: [
      "Simple CVC (consonant-vowel-consonant) words",
      "Very short, repetitive sentences",
      "Core sight words",
    ],
    examples: ["The cat ran.", "The cat sat.", "The sun is hot."],
    tip: "Child reads by sounding out each letter. Focus on decoding.",
  },
  {
    level: 2,
    grade: "Early UKG",
    gradeLabel: "Upper Kindergarten — Early",
    emoji: "🌱",
    accentColor: "#00BCD4", // teal
    tagColor: "rgba(0,188,212,0.2)",
    tagBorder: "rgba(0,188,212,0.5)",
    challengeWords: 5,
    wordTypes: ["CVC words", "Simple verbs", "Adjectives", "Adverbs"],
    sentenceLength: "4–5 words",
    introduces: [
      "Descriptive adjectives (red, big, small)",
      "Action verbs (ran, fell, got)",
      "Simple adverbs (fast, well)",
    ],
    examples: ["The red hat fell.", "The man ran fast.", "He got the hat."],
    tip: "Child begins to notice describing words and action words.",
  },
  {
    level: 3,
    grade: "UKG",
    gradeLabel: "Upper Kindergarten",
    emoji: "🐾",
    accentColor: "#FF9800", // orange
    tagColor: "rgba(255,152,0,0.2)",
    tagBorder: "rgba(255,152,0,0.5)",
    challengeWords: 5,
    wordTypes: ["Simple past verbs", "Story conflict"],
    sentenceLength: "5–6 words",
    introduces: [
      "Simple past tense (saw, ran, fell)",
      "Basic story conflict (chase, escape)",
      "Compound sentences with 'and', 'but'",
      "Adverbs of manner",
      "Character motivation",
    ],
    examples: [
      "Omar took his kite out and ran joyfully.",
      "Ali was smart. He did not cry and decided to fix it.",
      "Ali woke up and his tooth hurt badly. He felt worried, so he ran to his mom.",
    ],
    tip: "First exposure to cause & reaction within a story arc.",
  },
  {
    level: 4,
    grade: "UKG Advanced",
    gradeLabel: "Upper Kindergarten — Advanced",
    emoji: "🦋",
    accentColor: "#9C27B0", // purple
    tagColor: "rgba(156,39,176,0.2)",
    tagBorder: "rgba(156,39,176,0.5)",
    challengeWords: 6,
    wordTypes: ["Compound sentences", "More adjectives"],
    sentenceLength: "5–7 words",
    introduces: [
      "Direct speech with quotation marks",
      "Richer adjective use",
      "Emotional context (happy, scared, lost)",
    ],
    examples: [
      '"You have a kind heart," said the tree. Luna smiled and listened to nature every day after that.',
      "As the sun set, they sat together and enjoyed the cool breeze.",
    ],
    tip: "Child starts connecting two ideas in one sentence.",
  },
  {
    level: 5,
    grade: "Grade 1 — Early",
    gradeLabel: "First Grade, Early Stage",
    emoji: "💬",
    accentColor: "#E91E63", // pink
    tagColor: "rgba(233,30,99,0.2)",
    tagBorder: "rgba(233,30,99,0.5)",
    challengeWords: 6,
    wordTypes: ["Dialogue", "Story emotion"],
    sentenceLength: "6–8 words",
    introduces: [
      "More use of direct speech with quotation marks",
      "More emotional context (worried, scared, lost)",
      "Character empathy and perspective-taking",
    ],
    examples: [
      "Day after day, more socks got torn. Sajid felt upset when he saw his socks getting ruined.",
      'He ran to his mother and showed her the torn socks. She said, "This is why we must keep our nails short."',
    ],
    tip: "Child begins to feel story emotions and predict character actions.",
  },
  {
    level: 6,
    grade: "Grade 1",
    gradeLabel: "First Grade",
    emoji: "🧩",
    accentColor: "#00BCD4",
    tagColor: "rgba(0,188,212,0.2)",
    tagBorder: "rgba(0,188,212,0.5)",
    challengeWords: 7,
    wordTypes: ["Problem solving", "Solution narrative"],
    sentenceLength: "6–8 words",
    introduces: [
      "Problem → solution story structure",
      "Sequential connectors (first, then, finally)",
      "Simple inference questions",
    ],
    examples: [
      '"Where is my lunch?" he said softly. He looked around slowly and checked every pocket.',
      "Hamza noticed his friend’s problem and kindly asked him, if he needed help. His friend nodded.",
    ],
    tip: "Child identifies story problem and thinks about solutions.",
  },
  {
    level: 7,
    grade: "Grade 1",
    gradeLabel: "First Grade — Continued",
    emoji: "⚡",
    accentColor: "#FF9800", // yellow
    tagColor: "rgba(255,213,79,0.2)",
    tagBorder: "rgba(255,213,79,0.5)",
    challengeWords: 7,
    wordTypes: ["Cause & effect", "Connectors"],
    sentenceLength: "7–9 words",
    introduces: [
      "Cause & effect relationships",
      "Connectors: because, so, when",
      "Predicting outcomes",
    ],
    examples: [
      'Ali heard a strange sound at night. He felt curious but also a little afraid. He said, "What is that noise?"',
      "Sara learned that kindness brings joy. Small help can make a big difference.",
    ],
    tip: "Child explains why things happen in a story.",
  },
  {
    level: 8,
    grade: "Grade 1",
    gradeLabel: "First Grade — Advanced",
    emoji: "📖",
    accentColor: "#4CAF50",
    tagColor: "rgba(76,175,80,0.2)",
    tagBorder: "rgba(76,175,80,0.5)",
    challengeWords: 8,
    wordTypes: ["Multi-event stories", "Sequence words"],
    sentenceLength: "7–9 words",
    introduces: [
      "Stories with 3 or more events",
      "Time markers (next day, later, after that)",
      "Retelling in sequence",
    ],
    examples: [
      "First the dog barked at the gate.",
      "Then the boy opened the gate slowly.",
      "After that, the dog ran into the yard.",
    ],
    tip: "Child retells story events in the correct order.",
  },
  {
    level: 9,
    grade: "Grade 1",
    gradeLabel: "First Grade — Extended",
    emoji: "🌊",
    accentColor: "#03A9F4", // light blue
    tagColor: "rgba(3,169,244,0.2)",
    tagBorder: "rgba(3,169,244,0.5)",
    challengeWords: 8,
    wordTypes: ["Longer narrative", "Descriptive language"],
    sentenceLength: "8–10 words",
    introduces: [
      "Longer connected narratives",
      "Rich scene-setting descriptions",
      "Advance vocabulary (e.g., tempestuous, precarious)",
    ],
    examples: [
      "The old man walked slowly along the dusty road.",
      "He smiled when he saw his house at last.",
    ],
    tip: "Child visualises scenes and tracks character emotions across a story.",
  },
  {
    level: "10+",
    grade: "Grade 1 Advanced",
    gradeLabel: "First Grade — Mastery",
    emoji: "🏆",
    accentColor: "#E91E63",
    tagColor: "rgba(255,213,79,0.2)",
    tagBorder: "rgba(255,213,79,0.5)",
    challengeWords: 10,
    wordTypes: ["Short paragraph reading", "Inference", "Summarising"],
    sentenceLength: "8–12 words",
    introduces: [
      "Rich character descriptions and emotions",
      "Comprehensive scene-setting descriptions",
      "Longer content with story line and climax",
    ],
    examples: [
      "Leo stayed in the village, using his remaining strength to rebuild their lives together.\nHe finally understood that every act of kindness is a treasure.\nHe learned that true value lies in the people who love you when you have nothing.\nFamily is the only real fortune.",
    ],
    tip: "Child reads full paragraphs and draws meaning beyond what is written.",
  },
];

export default CURRICULUM;
