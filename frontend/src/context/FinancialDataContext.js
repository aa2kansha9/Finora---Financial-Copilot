import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../services/api";

const FinancialDataContext = createContext(null);

export function FinancialDataProvider({ children }) {
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [authError, setAuthError] = useState(false);

  const fetchData = useCallback(async () => {
    // Don't fetch if there's no token — user is not logged in yet
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
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
        setError(err.response?.data?.message || "Failed to load financial data. Make sure the backend is running.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <FinancialDataContext.Provider value={{ data, loading, error, authError, refresh: fetchData }}>
      {children}
    </FinancialDataContext.Provider>
  );
}

export function useFinancialData() {
  const ctx = useContext(FinancialDataContext);
  if (!ctx) throw new Error("useFinancialData must be used inside FinancialDataProvider");
  return ctx;
}
