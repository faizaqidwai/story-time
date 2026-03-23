// app/services/reportService.js
//
// Fetches the progress report for a given profile from the backend.
// Follows the exact same pattern as bookService.js:
//   apiFetch(endpoint, options) from ./api
//   getAccessToken() from ./tokenStorage

import { apiFetch } from "./api";
import { getAccessToken } from "./tokenStorage";

export const reportService = {
  /**
   * Fetch the full progress report for a profile.
   *
   * Backend endpoint: GET /report/profile/{profileId}
   *
   * @param {string} profileId
   * @returns {Promise<ReportResponse>}
   */
  async getReport(profileId) {
    const accessToken = await getAccessToken();

    const data = await apiFetch(`/report/profile/${profileId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return data;
  },
};
