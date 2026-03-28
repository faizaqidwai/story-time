// app/services/bookService.js
//
// Changes from original:
//   • getBooks(profileId) — UNCHANGED. Still fetches the profile's
//     current-level stories from GET /books/profile/{profileId}.
//     Used by the sync engine and existing level progression flow.
//
//   • getBooksByLevel(levelNumber) — NEW.
//     Fetches stories for any arbitrary level number.
//     Used by the home screen when loadedLevel ≠ profile.playLevel.
//
// Everything else is untouched.

import { apiClient } from "./apiClient";

// ─────────────────────────────────────────────────────────────────────────────
export const bookService = {
  // ── Existing: current-level stories for a profile (used by home + sync) ──
  getBooks: async (profileId) => {
    const books = await apiClient.get(`/books/profile/${profileId}`);
    return books;
  },

  // ── NEW: stories for an explicit level number ────────────────────────────
  // Backend endpoint: GET /levels/{level}/stories
  getBooksByLevel: async (levelNumber) => {
    const books = await apiClient.get(`/levels/${levelNumber}/stories`);
    return books;
  },

  // ── Existing: single book by id ──────────────────────────────────────────
  getBook: async (bookId) => {
    const book = await apiClient.get(`/books/${bookId}`);
    return book;
  },
};
