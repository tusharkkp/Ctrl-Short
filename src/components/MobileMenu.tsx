import React from 'react';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const MENU_ITEMS = [
  { label: 'Shorten', href: '#shorten' },
  { label: 'Analytics', href: '#analytics' },
  { label: 'API', href: '#api' },
  { label: 'Docs', href: '#docs' },
  { label: 'Open Dashboard', href: '#dashboard' },
];

export const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose }) => {
  return (
    <div
      id="mobile-menu-overlay"
      aria-hidden={!isOpen}
      className={`fixed inset-0 bg-black/90 backdrop-blur-md z-[9] flex flex-col justify-center px-8 gap-8 text-left md:hidden transition-opacity duration-300 ${
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      <nav className="flex flex-col gap-8" aria-label="Mobile Navigation">
        {MENU_ITEMS.map((item) => (
          <a
            key={item.label}
            href={item.href}
            onClick={onClose}
            className="text-[32px] font-medium text-white hover:opacity-70 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded w-fit"
          >
            {item.label}
          </a>
        ))}
      </nav>
    </div>
  );
};
