import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 — only redirect to login from non-dashboard pages
// On dashboard pages, let the component handle the error gracefully
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const path = window.location.pathname;
      const isDashboard = path.includes("/dashboard");

      if (!isDashboard && !path.includes("/login")) {
        // Not on dashboard — safe to redirect
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
      // On dashboard — let the component show its own error message
      // The AuthContext will handle logout if needed
    }
    return Promise.reject(error);
  }
);

export default api;
