import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { securityService } from '../../services/securityService';

export const AppLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openAlertsCount, setOpenAlertsCount] = useState(0);

  useEffect(() => {
    const updateStats = () => {
      const summary = securityService.getDashboardSummary();
      setOpenAlertsCount(summary.openAlertsCount);
    };

    updateStats();
    return securityService.subscribe(updateStats);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden dark:bg-[#080c14] bg-slate-50 dark:text-slate-100 text-slate-900 transition-colors duration-150">
      {/* Desktop Sidebar */}
      <div className="hidden md:block h-full shrink-0">
        <Sidebar openAlertsCount={openAlertsCount} />
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-64 h-full dark:bg-[#0a0f1b] bg-white shadow-2xl">
            <Sidebar
              openAlertsCount={openAlertsCount}
              onMobileClose={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Viewport Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <TopBar
          onMobileMenuToggle={() => setMobileMenuOpen((prev) => !prev)}
          openAlertsCount={openAlertsCount}
        />

        <main className="flex-1 overflow-y-auto px-4 py-5 md:px-6 md:py-6 lg:px-8 lg:py-6 dark:bg-[#080c14] bg-slate-50">
          <div className="max-w-[1440px] mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
