// app/book/read.jsx
//
// Route entry point — picks the correct reader based on the story's readingLevel:
//   "EARLY"            → BookReader   (image-heavy, swipe pages, child-friendly)
//   "MID" | "ADVANCE"  → AdvancedBookReader (editorial layout, optional images, side-by-side)

import { useStoryActivity } from "../../../../_contexts/StoryActivityContext";
import BookReader from "../BookReader";
import AdvancedBookReader from "../AdvancedBookReader";

export default function BookReaderRoute() {
  const { currentStory } = useStoryActivity();

  const level = currentStory?.readingLevel?.toUpperCase();

  if (level === "MIDDLE" || level === "ADVANCE") {
    return <AdvancedBookReader />;
  }

  // Default: "EARLY" or unknown → original swipe reader
  return <BookReader />;
}
