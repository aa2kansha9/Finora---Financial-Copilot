import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import DashboardHome from "./components/Dashboard/DashboardHome.jsx";
import Portfolio from "./components/Portfolio/Portfolio";
import AIInsights from "./components/AIInsights/AIInsights";
import GoalPlanner from "./components/Goals/GoalPlanner";
import AffordabilityChecker from "./components/Reports/AffordabilityChecker";
import WhatIfSimulator from "./components/Goals/WhatIfSimulator";
import InsightHistory from "./components/AIInsights/InsightHistory";
import FinanceEntry from "./components/FinanceEntry/FinanceEntry";
import PersonalityPage from "./components/FinancialHealth/personality.jsx";
import AboutPage   from "./pages/About.jsx";
import HelpPage    from "./pages/Help.jsx";


const PrivateRoute = ({ children }) => {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<PrivateRoute><DashboardHome /></PrivateRoute>} />
        <Route path="/dashboard/health" element={<PrivateRoute><Home /></PrivateRoute>} />
        <Route path="/dashboard/portfolio"   element={<PrivateRoute><Portfolio /></PrivateRoute>} />
        <Route path="/dashboard/ai-insights" element={<PrivateRoute><AIInsights /></PrivateRoute>} />
        <Route path="/dashboard/goals"       element={<PrivateRoute><GoalPlanner /></PrivateRoute>} />
        <Route path="/dashboard/afford"      element={<PrivateRoute><AffordabilityChecker /></PrivateRoute>} />
        <Route path="/dashboard/simulator"   element={<PrivateRoute><WhatIfSimulator /></PrivateRoute>} />
        <Route path="/dashboard/history"     element={<PrivateRoute><InsightHistory /></PrivateRoute>} />
        <Route path="/dashboard/finance"     element={<PrivateRoute><FinanceEntry /></PrivateRoute>} />
        <Route path="/dashboard/personality"  element={<PrivateRoute><PersonalityPage /></PrivateRoute>} />
        <Route path="/dashboard/about"        element={<PrivateRoute><AboutPage /></PrivateRoute>} />
        <Route path="/dashboard/help"         element={<PrivateRoute><HelpPage /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}
