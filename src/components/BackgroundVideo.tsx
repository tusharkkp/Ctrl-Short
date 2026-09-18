import React, { useEffect, useRef } from 'react';

const VIDEO_SRC = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260826_041744_63efcd78-bf7d-4039-99e2-2461e8a61903.mp4';
const SENSITIVITY = 0.8;

export const BackgroundVideo: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const prevXRef = useRef<number | null>(null);
  const isSeekingRef = useRef<boolean>(false);
  const pendingTimeRef = useRef<number | null>(null);
  const targetTimeRef = useRef<number>(0);

  const handleSeeked = () => {
    const video = videoRef.current;
    if (!video) {
      isSeekingRef.current = false;
      return;
    }

    if (pendingTimeRef.current !== null) {
      const nextTarget = pendingTimeRef.current;
      pendingTimeRef.current = null;
      try {
        video.currentTime = nextTarget;
      } catch {
        isSeekingRef.current = false;
      }
    } else {
      isSeekingRef.current = false;
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      targetTimeRef.current = videoRef.current.currentTime || 0;
    }
  };

  useEffect(() => {
    // Check for touch devices or reduced motion
    const isTouchDevice =
      typeof window !== 'undefined' &&
      (window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window);

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (isTouchDevice || prefersReducedMotion) {
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const video = videoRef.current;
      if (!video || !video.duration || Number.isNaN(video.duration)) return;

      if (prevXRef.current === null) {
        prevXRef.current = e.clientX;
        return;
      }

      const delta = e.clientX - prevXRef.current;
      prevXRef.current = e.clientX;

      if (window.innerWidth <= 0) return;

      const offset = (delta / window.innerWidth) * SENSITIVITY * video.duration;
      const newTarget = Math.max(0, Math.min(video.duration, targetTimeRef.current + offset));
      targetTimeRef.current = newTarget;

      if (isSeekingRef.current) {
        // Queue the latest target position
        pendingTimeRef.current = newTarget;
      } else {
        isSeekingRef.current = true;
        try {
          video.currentTime = newTarget;
        } catch {
          isSeekingRef.current = false;
        }
      }
    };

    const handleMouseLeave = () => {
      prevXRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <>
      {/* Background Video */}
      <video
        ref={videoRef}
        src={VIDEO_SRC}
        muted
        playsInline
        preload="auto"
        onSeeked={handleSeeked}
        onLoadedMetadata={handleLoadedMetadata}
        aria-hidden="true"
        className="fixed inset-0 z-0 w-full h-full object-cover [object-position:70%_center] pointer-events-none select-none"
      />

      {/* Dark / Subtle Contrast Overlay */}
      <div
        className="fixed inset-0 z-[1] pointer-events-none bg-black/40 backdrop-brightness-[0.88]"
        aria-hidden="true"
      />
    </>
  );
};
