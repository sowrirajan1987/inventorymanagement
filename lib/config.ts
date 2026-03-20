// API Configuration
// Change this URL when moving between environments (UAT, Production, etc.)
export const API_BASE_URL = "https://uat.ishpms.in";

// --- DEVELOPMENT TOGGLE ---
// Set this to false when you want to test real authentication locally
export const DISABLE_AUTH = true;

// API Endpoints
export const API_ENDPOINTS = {
  home: `${API_BASE_URL}/api/home`,
  categories: `${API_BASE_URL}/api/categories`,
  addCategory: `${API_BASE_URL}/api/add-category`,
  editCategory: `${API_BASE_URL}/api/edit-category`,
  deleteCategory: `${API_BASE_URL}/api/delete-category`,
  dropdowns: `${API_BASE_URL}/api/dropdowns`,
} as const;
