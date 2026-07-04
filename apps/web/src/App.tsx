import { Link, Route, Routes } from "react-router-dom";
import { DEFAULT_API_URL } from "@jobs-reporter/shared";
import { RunDetailPage } from "./pages/RunDetailPage";
import { RunListPage } from "./pages/RunListPage";
import { useTheme } from "./hooks/useTheme";

const API_URL = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL;

export default function App() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <Link to="/" className="brand">
            Jobs Reporter
          </Link>
          <p className="subtitle">LinkedIn fetch history from DynamoDB</p>
        </div>
        <button type="button" className="ghost-btn" onClick={toggleTheme}>
          {theme === "dark" ? "Light" : "Dark"}
        </button>
      </header>

      <Routes>
        <Route path="/" element={<RunListPage apiUrl={API_URL} />} />
        <Route path="/runs/:fetchedAt" element={<RunDetailPage apiUrl={API_URL} />} />
      </Routes>
    </div>
  );
}
