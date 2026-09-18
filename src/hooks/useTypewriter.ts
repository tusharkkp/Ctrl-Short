import { useState, useEffect } from 'react';

export interface UseTypewriterOptions {
  text: string;
  speed?: number;
  startDelay?: number;
}

export function useTypewriter(
  textOrOptions: string | UseTypewriterOptions,
  speedArg = 38,
  startDelayArg = 600
): { displayed: string; done: boolean } {
  const text = typeof textOrOptions === 'string' ? textOrOptions : textOrOptions.text;
  const speed = typeof textOrOptions === 'string' ? speedArg : (textOrOptions.speed ?? 38);
  const startDelay = typeof textOrOptions === 'string' ? startDelayArg : (textOrOptions.startDelay ?? 600);

  const [displayed, setDisplayed] = useState<string>('');
  const [done, setDone] = useState<boolean>(false);

  useEffect(() => {
    // Check for reduced motion preference
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayed(text);
      setDone(true);
      return;
    }

    setDisplayed('');
    setDone(false);

    let currentIndex = 0;
    let timerId: ReturnType<typeof setTimeout> | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    timerId = setTimeout(() => {
      intervalId = setInterval(() => {
        currentIndex += 1;
        setDisplayed(text.slice(0, currentIndex));

        if (currentIndex >= text.length) {
          if (intervalId) clearInterval(intervalId);
          setDone(true);
        }
      }, speed);
    }, startDelay);

    return () => {
      if (timerId) clearTimeout(timerId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [text, speed, startDelay]);

  return { displayed, done };
}
