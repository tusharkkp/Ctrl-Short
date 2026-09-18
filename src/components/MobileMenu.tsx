import React from 'react';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDashboard?: () => void;
  onOpenDocs?: () => void;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  onClose,
  onOpenDashboard,
  onOpenDocs,
}) => {
  const handleClick = (action: string) => {
    onClose();
    if (action === 'dashboard' || action === 'shorten' || action === 'analytics') {
      onOpenDashboard?.();
    } else if (action === 'api' || action === 'docs') {
      onOpenDocs?.();
    }
  };

  return (
    <div
      id="mobile-menu-overlay"
      aria-hidden={!isOpen}
      className={`fixed inset-0 bg-black/90 backdrop-blur-md z-[9] flex flex-col justify-center px-8 gap-8 text-left md:hidden transition-opacity duration-300 ${
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      <nav className="flex flex-col gap-8" aria-label="Mobile Navigation">
        <button
          type="button"
          onClick={() => handleClick('shorten')}
          className="text-[32px] font-medium text-white hover:opacity-70 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded w-fit text-left cursor-pointer bg-transparent border-0 font-[inherit]"
        >
          Shorten
        </button>
        <button
          type="button"
          onClick={() => handleClick('analytics')}
          className="text-[32px] font-medium text-white hover:opacity-70 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded w-fit text-left cursor-pointer bg-transparent border-0 font-[inherit]"
        >
          Analytics
        </button>
        <button
          type="button"
          onClick={() => handleClick('api')}
          className="text-[32px] font-medium text-white hover:opacity-70 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded w-fit text-left cursor-pointer bg-transparent border-0 font-[inherit]"
        >
          API
        </button>
        <button
          type="button"
          onClick={() => handleClick('docs')}
          className="text-[32px] font-medium text-white hover:opacity-70 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded w-fit text-left cursor-pointer bg-transparent border-0 font-[inherit]"
        >
          Docs
        </button>
        <button
          type="button"
          onClick={() => handleClick('dashboard')}
          className="text-[32px] font-medium text-white hover:opacity-70 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded w-fit text-left cursor-pointer bg-transparent border-0 font-[inherit]"
        >
          Open Dashboard
        </button>
      </nav>
    </div>
  );
};
