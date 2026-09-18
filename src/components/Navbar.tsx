import React from 'react';

interface NavbarProps {
  isMobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isMobileMenuOpen,
  onToggleMobileMenu,
}) => {
  return (
    <header className="fixed top-0 left-0 w-full z-10 px-5 sm:px-8 py-4 sm:py-5 flex justify-between items-center">
      {/* Left: Logo & Decorative Symbol */}
      <div className="flex items-center">
        <a
          href="#"
          className="flex items-center gap-1.5 text-white select-none group focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded py-1"
          aria-label="Ctrl Short - Command center for shorter links"
        >
          <span className="font-heading text-[21px] sm:text-[26px] tracking-tight text-white font-medium">
            Ctrl Short
          </span>
          <span
            className="text-[25px] sm:text-[30px] leading-none text-white select-none tracking-[-0.02em]"
            aria-hidden="true"
          >
            ✳︎
          </span>
        </a>
      </div>

      {/* Center: Desktop Navigation */}
      <nav
        className="hidden md:flex items-center text-[20px] text-white"
        aria-label="Primary Navigation"
      >
        <a
          href="#shorten"
          className="hover:opacity-60 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded px-0.5"
        >
          Shorten
        </a>
        <span className="select-none" aria-hidden="true">,</span>
        <a
          href="#analytics"
          className="ml-1 hover:opacity-60 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded px-0.5"
        >
          Analytics
        </a>
        <span className="select-none" aria-hidden="true">,</span>
        <a
          href="#api"
          className="ml-1 hover:opacity-60 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded px-0.5"
        >
          API
        </a>
        <span className="select-none" aria-hidden="true">,</span>
        <a
          href="#docs"
          className="ml-1 hover:opacity-60 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded px-0.5"
        >
          Docs
        </a>
      </nav>

      {/* Right: Desktop CTA */}
      <div className="hidden md:flex items-center">
        <a
          href="#dashboard"
          className="text-[20px] text-white underline underline-offset-2 hover:opacity-60 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded px-1"
        >
          Open Dashboard
        </a>
      </div>

      {/* Right: Mobile Hamburger Button */}
      <button
        type="button"
        onClick={onToggleMobileMenu}
        aria-label="Toggle navigation menu"
        aria-expanded={isMobileMenuOpen}
        aria-controls="mobile-menu-overlay"
        className="md:hidden flex flex-col justify-center items-center w-8 h-8 focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded p-1 cursor-pointer gap-[5px]"
      >
        <span
          className="w-6 h-[2px] bg-white transition-all duration-300 transform origin-center"
          style={{
            transform: isMobileMenuOpen
              ? 'translateY(7px) rotate(45deg)'
              : 'none',
          }}
        />
        <span
          className="w-6 h-[2px] bg-white transition-all duration-300"
          style={{
            opacity: isMobileMenuOpen ? 0 : 1,
          }}
        />
        <span
          className="w-6 h-[2px] bg-white transition-all duration-300 transform origin-center"
          style={{
            transform: isMobileMenuOpen
              ? 'translateY(-7px) rotate(-45deg)'
              : 'none',
          }}
        />
      </button>
    </header>
  );
};
