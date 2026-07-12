import { Route, Routes } from "react-router-dom";
import { DEFAULT_API_URL } from "@jobs-reporter/shared";
import { AppLayout } from "./components/AppLayout";
import { AnalysisCompaniesPage } from "./pages/AnalysisCompaniesPage";
import { CompaniesIndexPage } from "./pages/CompaniesIndexPage";
import { AnalysisDetailPage } from "./pages/AnalysisDetailPage";
import { AnalysisListPage } from "./pages/AnalysisListPage";
import { RunDetailPage } from "./pages/RunDetailPage";
import { RunHistoryPage } from "./pages/RunHistoryPage";
import { RunListPage } from "./pages/RunListPage";

const API_URL = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL;

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<RunListPage apiUrl={API_URL} />} />
        <Route path="/history" element={<RunHistoryPage apiUrl={API_URL} />} />
        <Route path="/runs/:fetchedAt" element={<RunDetailPage apiUrl={API_URL} />} />
        <Route path="/analyses" element={<AnalysisListPage apiUrl={API_URL} />} />
        <Route path="/companies" element={<CompaniesIndexPage apiUrl={API_URL} />} />
        <Route
          path="/analyses/:analysisId/companies/:countryCode"
          element={<AnalysisCompaniesPage apiUrl={API_URL} />}
        />
        <Route
          path="/analyses/:analysisId/companies"
          element={<AnalysisCompaniesPage apiUrl={API_URL} />}
        />
        <Route path="/analyses/:analysisId" element={<AnalysisDetailPage apiUrl={API_URL} />} />
      </Routes>
    </AppLayout>
  );
}
