import { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { BackgroundVideo } from './components/BackgroundVideo';
import { Navbar } from './components/Navbar';
import { MobileMenu } from './components/MobileMenu';
import { Hero } from './components/Hero';
import type { ActionPillType } from './components/ActionPills';
import { DashboardModal } from './components/dashboard/DashboardModal';
import { AuthModal } from './components/modals/AuthModal';
import { ApiDocsModal } from './components/modals/ApiDocsModal';

export function AppContent() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [isDocsOpen, setIsDocsOpen] = useState(false);

  // Close modals or mobile menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDocsOpen) setIsDocsOpen(false);
        else if (isAuthOpen) setIsAuthOpen(false);
        else if (isDashboardOpen) setIsDashboardOpen(false);
        else if (isMobileMenuOpen) setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen, isDashboardOpen, isAuthOpen, isDocsOpen]);

  // Lock body scroll when any modal or mobile menu is open
  useEffect(() => {
    const hasActiveOverlay = isMobileMenuOpen || isDashboardOpen || isAuthOpen || isDocsOpen;
    if (hasActiveOverlay) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen, isDashboardOpen, isAuthOpen, isDocsOpen]);

  const handleOpenAuth = (mode: 'signin' | 'signup' = 'signin') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  const handleActionClick = (action: ActionPillType) => {
    if (action === 'shorten' || action === 'analytics') {
      setIsDashboardOpen(true);
    } else if (action === 'api') {
      setIsDocsOpen(true);
    } else if (action === 'signup') {
      handleOpenAuth('signup');
    }
  };

  return (
    <div className="relative w-full h-full min-h-screen bg-black select-text">
      {/* Immersive background video & contrast overlay */}
      <BackgroundVideo />

      {/* Fixed top navigation */}
      <Navbar
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
        onOpenDashboard={() => setIsDashboardOpen(true)}
        onOpenDocs={() => setIsDocsOpen(true)}
      />

      {/* Mobile navigation overlay */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onOpenDashboard={() => setIsDashboardOpen(true)}
        onOpenDocs={() => setIsDocsOpen(true)}
      />

      {/* Full-screen Hero Section */}
      <Hero onActionClick={handleActionClick} />

      {/* Interactive Modals */}
      <DashboardModal
        isOpen={isDashboardOpen}
        onClose={() => setIsDashboardOpen(false)}
        onOpenAuth={() => handleOpenAuth('signin')}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        initialMode={authMode}
      />

      <ApiDocsModal
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
