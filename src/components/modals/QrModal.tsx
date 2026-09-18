/**
 * Purpose:
 * Modal displaying high-contrast SVG QR codes for shortened links
 * with one-click SVG and PNG downloads.
 */

import React, { useState, useEffect } from 'react';
import { generateQrSvg, downloadQrCode } from '../../lib/qr';

interface QrModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  shortCode: string;
}

export const QrModal: React.FC<QrModalProps> = ({ isOpen, onClose, url, shortCode }) => {
  const [svgContent, setSvgContent] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && url) {
      generateQrSvg(url)
        .then(setSvgContent)
        .catch((err) => console.error('Failed to generate QR code:', err));
    }
  }, [isOpen, url]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-sm bg-[#0C0C0C] border border-white/20 rounded-2xl p-6 text-white text-center shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 id="qr-modal-title" className="text-base font-medium">QR Code</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="text-white/60 hover:text-white p-1 rounded text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-white/50 mb-4 font-mono truncate px-2">{url}</p>

        {/* QR Code Container with High Contrast */}
        <div className="mx-auto w-52 h-52 bg-white p-3 rounded-xl flex items-center justify-center shadow-inner">
          {svgContent ? (
            <div
              className="w-full h-full [&>svg]:w-full [&>svg]:h-full [&>svg_path]:fill-black"
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          ) : (
            <div className="text-black/40 text-xs">Generating QR...</div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 mt-5">
          <button
            type="button"
            onClick={() => downloadQrCode(url, `ctrl-short-${shortCode}`, 'svg')}
            className="py-2 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-mono transition-colors"
          >
            Download SVG
          </button>
          <button
            type="button"
            onClick={() => downloadQrCode(url, `ctrl-short-${shortCode}`, 'png')}
            className="py-2 px-3 bg-white text-black hover:bg-white/90 rounded-lg text-xs font-mono font-medium transition-colors"
          >
            Download PNG
          </button>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="w-full mt-3 py-1.5 text-xs text-white/60 hover:text-white transition-colors"
        >
          {copied ? '✓ Link copied to clipboard' : 'Copy link address'}
        </button>
      </div>
    </div>
  );
};
