// app/services/bookService.js

import { apiClient } from "./apiClient";
import { CDN_BASE_URL } from "../config/env";

const withBaseUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${CDN_BASE_URL}${path}`;
};

const transformBook = (book) => ({
  ...book,
  cover: withBaseUrl(book.cover),
  pages: book.pages.map((p) => ({ ...p, image: withBaseUrl(p.image) })),
});

export const bookService = {
  async getBooks(currentProfileId) {
    const data = await apiClient.get(`/books/profile/${currentProfileId}`);
    return data.map(transformBook);
  },

  async getBookById(id) {
    const data = await apiClient.get(`/books/${id}`);
    return transformBook(data);
  },
};
