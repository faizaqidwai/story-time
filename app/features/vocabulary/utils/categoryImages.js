import { Image as ExpoImage } from "expo-image";

// Map category name → local asset require()
// Add all your category image files here
export const CATEGORY_ICONS = {
  animal: require("../../../../assets/img/vocabulary/animal.png"),
  action: require("../../../../assets/img/vocabulary/action.png"),
  emotion: require("../../../../assets/img/vocabulary/emotion.png"),
  object: require("../../../../assets/img/vocabulary/object.png"),
  nature: require("../../../../assets/img/vocabulary/nature.png"),
  food: require("../../../../assets/img/vocabulary/food.png"),
  place: require("../../../../assets/img/vocabulary/place.png"),
  people: require("../../../../assets/img/vocabulary/people.png"),
  color: require("../../../../assets/img/vocabulary/color.png"),
  transport: require("../../../../assets/img/vocabulary/transport.png"),
  quality: require("../../../../assets/img/vocabulary/quality.png"),
  time: require("../../../../assets/img/vocabulary/time.png"),
  character: require("../../../../assets/img/vocabulary/character.png"),
  health: require("../../../../assets/img/vocabulary/health.png"),
  clothing: require("../../../../assets/img/vocabulary/clothing.png"),
};

// Map category name → local asset require()
// Add all your category image files here
export const CATEGORY_COVERS = {
  animal: require("../../../../assets/img/vocabulary/animal-cover.jpeg"),
  action: require("../../../../assets/img/vocabulary/action-cover.jpeg"),
  emotion: require("../../../../assets/img/vocabulary/emotion-cover.jpeg"),
  object: require("../../../../assets/img/vocabulary/object-cover.jpeg"),
  nature: require("../../../../assets/img/vocabulary/nature-cover.jpeg"),
  food: require("../../../../assets/img/vocabulary/food-cover.jpeg"),
  place: require("../../../../assets/img/vocabulary/place-cover.jpeg"),
  people: require("../../../../assets/img/vocabulary/people-cover.jpeg"),
  color: require("../../../../assets/img/vocabulary/color-cover.jpeg"),
  transport: require("../../../../assets/img/vocabulary/transport-cover.jpeg"),
  quality: require("../../../../assets/img/vocabulary/quality-cover.jpeg"),
  time: require("../../../../assets/img/vocabulary/time-cover.jpeg"),
  character: require("../../../../assets/img/vocabulary/character-cover.jpeg"),
  health: require("../../../../assets/img/vocabulary/health-cover.jpeg"),
  clothing: require("../../../../assets/img/vocabulary/clothing-cover.jpeg"),
};

// Returns the local asset or null if not found
export function getCategoryIcon(categoryName) {
  return CATEGORY_ICONS[categoryName?.toLowerCase()] ?? null;
}

// Returns the local asset or null if not found
export function getCategoryCover(categoryName) {
  return CATEGORY_COVERS[categoryName?.toLowerCase()] ?? null;
}
