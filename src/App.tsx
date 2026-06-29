import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import OrganizationsPage from "./pages/organizations/OrganizationsPage";
import ProjectsPage from "./pages/projects/ProjectsPage";
import ProjectDetailPage from "./pages/projects/ProjectDetailPage";
import RepositoriesPage from "./pages/repositories/RepositoriesPage";
import ScanPoliciesPage from "./pages/scan-policies/ScanPoliciesPage";
import ScansPage from "./pages/scans/ScansPage";
import ScanDetailPage from "./pages/scans/ScanDetailPage";
import FindingsPage from "./pages/findings/FindingsPage";
import FindingDetailPage from "./pages/findings/FindingDetailPage";
import ReportsPage from "./pages/reports/ReportsPage";
import IntegrationsPage from "./pages/integrations/IntegrationsPage";
import SettingsPage from "./pages/settings/SettingsPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="organizations" element={<OrganizationsPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/:id" element={<ProjectDetailPage />} />
            <Route path="repositories" element={<RepositoriesPage />} />
            <Route path="scan-policies" element={<ScanPoliciesPage />} />
            <Route path="scans" element={<ScansPage />} />
            <Route path="scans/:id" element={<ScanDetailPage />} />
            <Route path="findings" element={<FindingsPage />} />
            <Route path="findings/:id" element={<FindingDetailPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="integrations" element={<IntegrationsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
