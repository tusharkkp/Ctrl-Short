import React from 'react';
import { useTypewriter } from '../hooks/useTypewriter';
import { ActionPills } from './ActionPills';

const TYPEWRITER_TEXT = 'Short links. Clear analytics. Total control.';

export const Hero: React.FC = () => {
  const { displayed, done } = useTypewriter({
    text: TYPEWRITER_TEXT,
    speed: 38,
    startDelay: 600,
  });

  return (
    <main className="h-screen w-full flex flex-col justify-end pb-12 md:justify-center md:pb-0 px-5 sm:px-8 md:px-10 overflow-hidden relative z-10">
      <div className="max-w-xl relative z-10 text-left">
        {/* Semantic H1 for SEO */}
        <h1 className="sr-only">
          Ctrl Short — Serverless URL Shortening & Analytics Platform
        </h1>

        {/* 1. Intro Label: Subtle blurred product introduction */}
        <div
          aria-hidden="true"
          className="pointer-events-none select-none mb-5 sm:mb-6 text-[clamp(18px,4vw,26px)] leading-[1.3] font-normal text-white [filter:blur(4px)]"
        >
          Hey there, meet Ctrl Short,<br />
          your command center for shorter links.
        </div>

        {/* 2. Typewriter Hero Message */}
        <p className="text-white mb-5 sm:mb-6 text-[clamp(18px,4vw,26px)] leading-[1.35] font-normal min-h-[54px] flex items-baseline">
          <span>{displayed}</span>
          {!done && (
            <span
              className="inline-block w-[2px] h-[1.1em] bg-white align-middle ml-[2px] animate-blink"
              aria-hidden="true"
            />
          )}
        </p>

        {/* 3 & 4. Action Pills */}
        <ActionPills />
      </div>
    </main>
  );
};
