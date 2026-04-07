import { useState, useEffect, useCallback } from "react";
import api from "../services/api";

export default function useDashboard() {
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [authError, setAuthError] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAuthError(false);
    try {
      const res = await api.get("/financial/health");
      setData({
        financialHealth: res.data,
        riskProfile: res.data.riskProfile || null
      });
    } catch (err) {
      if (err.response?.status === 401) {
        setAuthError(true);
        setError("Session expired. Please log in again.");
      } else {
        setError(err.response?.data?.message || "Failed to load dashboard. Make sure the backend is running.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, authError, refresh: fetchData };
}
