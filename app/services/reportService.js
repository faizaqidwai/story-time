// app/services/reportService.js

import { apiClient } from "./apiClient";

export const reportService = {
  async getReport(profileId) {
    return apiClient.get(`/report/profile/${profileId}`);
  },
};
