import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/common/NotificationToast';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { LogExplorerPage } from './pages/LogExplorerPage';
import { FileManagerPage } from './pages/FileManagerPage';
import { AlertsPage } from './pages/AlertsPage';
import { DetectionRulesPage } from './pages/DetectionRulesPage';
import { BlocklistPage } from './pages/BlocklistPage';
import { ReportsPage } from './pages/ReportsPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';

/**
 * Route protection guard ensuring unauthenticated users cannot access dashboard.
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Authentication Route */}
              <Route path="/login" element={<LoginPage />} />

              {/* Protected SOC Console Application Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                {/* 1. Overview */}
                <Route index element={<DashboardPage />} />
                <Route path="dashboard" element={<Navigate to="/" replace />} />

                {/* 2. Logs */}
                <Route path="logs" element={<LogExplorerPage />} />

                {/* Dedicated File Manager */}
                <Route path="files" element={<FileManagerPage />} />

                {/* 3. Alerts */}
                <Route path="alerts" element={<AlertsPage />} />

                {/* 4. Detection Rules */}
                <Route path="rules" element={<DetectionRulesPage />} />

                {/* 5. IP Blocklist */}
                <Route path="blocklist" element={<BlocklistPage />} />

                {/* 6. Analytics */}
                <Route path="reports" element={<ReportsPage />} />
                <Route path="analytics" element={<ReportsPage />} />

                {/* 7. Audit Trail */}
                <Route path="audit" element={<AuditLogPage />} />

                {/* 8. Settings (incorporates preserved account/security controls) */}
                <Route path="settings" element={<SettingsPage />} />

                {/* Safe redirect for removed profile page */}
                <Route path="profile" element={<Navigate to="/settings" replace />} />
              </Route>

              {/* Catch-all fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
