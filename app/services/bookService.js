import { cdnFetch, apiFetch } from "./api";
import { API_CONFIG } from "../config/apiConfig";
import { getAccessToken } from "./tokenStorage";

const withBaseUrl = (path) => {
  if (!path) return null;

  // If already full URL, return as-is
  if (path.startsWith("http")) return path;

  return `${API_CONFIG.BASE_URL}${path}`;
};

const transformBook = (book) => ({
  ...book,
  cover: withBaseUrl(book.cover),
  pages: book.pages.map((p) => ({
    ...p,
    image: withBaseUrl(p.image),
  })),
});

export const bookService = {
  async getBooks(currentProfileId) {
    const accessToken = await getAccessToken();

    const data = await apiFetch(`/books/profile/${currentProfileId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return data.map(transformBook);
  },

  async getBookById(id) {
    const data = await cdnFetch(`/books/${id}`);

    return transformBook(data);
  },
};
