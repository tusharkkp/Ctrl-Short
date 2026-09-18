import React, { useEffect, useState } from 'react';

const PRIMARY_ACTIONS = [
  { label: 'Shorten a link', href: '#shorten' },
  { label: 'View analytics', href: '#analytics' },
  { label: 'Explore the API', href: '#api' },
  { label: 'Create an account', href: '#signup' },
];

export const ActionPills: React.FC = () => {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    // 400ms delay after page load, independent of typewriter
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="flex flex-wrap gap-y-1 transition-all duration-[400ms] ease-out select-none"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(8px)',
      }}
    >
      {/* Primary Action Pills */}
      {PRIMARY_ACTIONS.map((action) => (
        <a
          key={action.label}
          href={action.href}
          className="inline-flex items-center justify-center bg-white text-black border border-black/10 rounded-full text-[13px] sm:text-[15px] px-4 sm:px-5 py-[0.3em] mx-[0.2em] mb-[0.4em] whitespace-nowrap hover:bg-black hover:text-white transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {action.label}
        </a>
      ))}

      {/* Product Status Outline Pill */}
      <span
        tabIndex={0}
        role="status"
        aria-label="Ctrl Short is serverless by design"
        className="inline-flex items-center gap-2 sm:gap-3 text-white bg-transparent border border-white rounded-full text-[13px] sm:text-[15px] px-4 sm:px-5 py-[0.3em] mx-[0.2em] mb-[0.4em] whitespace-nowrap hover:bg-white hover:text-black transition-colors duration-200 cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <span>Ctrl Short is serverless by design</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-3 h-3 flex-shrink-0"
          aria-hidden="true"
        >
          {/* Cloud / Serverless icon */}
          <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
        </svg>
      </span>
    </div>
  );
};
