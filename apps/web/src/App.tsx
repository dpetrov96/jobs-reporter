import { Route, Routes } from "react-router-dom";
import { DEFAULT_API_URL } from "@jobs-reporter/shared";
import { AppLayout } from "./components/AppLayout";
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
      </Routes>
    </AppLayout>
  );
}
