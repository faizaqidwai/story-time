// app/services/vocabularyService.js
//
// Vocabulary API calls — mirrors bookService.js patterns exactly.

import { apiClient } from "./apiClient";

export const vocabularyService = {

  // ── Home screen: categories for exactly one play level ─────────────────
  // GET /vocabulary/categories/{playLevel}
  getCategoriesForLevel: async (playLevel) => {
    return apiClient.get(`/vocabulary/categories/${playLevel}`);
  },

  // ── Vocabulary screen: all categories up to current profile level ───────
  // GET /vocabulary/categories
  getAllCategories: async () => {
    return apiClient.get("/vocabulary/categories");
  },

  // ── Category detail from home: words for one category at one level ──────
  // GET /vocabulary/categories/{playLevel}/{categoryName}/words
  getWordsForLevelCategory: async (playLevel, categoryName) => {
    return apiClient.get(
      `/vocabulary/categories/${playLevel}/${encodeURIComponent(categoryName)}/words`
    );
  },

  // ── Category detail from vocabulary: words across all levels up to current
  // GET /vocabulary/categories/{categoryName}/words
  getAllWordsForCategory: async (categoryName) => {
    return apiClient.get(
      `/vocabulary/categories/${encodeURIComponent(categoryName)}/words`
    );
  },
};
