/**
 * Purpose:
 * Developer documentation modal providing interactive curl commands,
 * authentication headers, request payloads, and status code specifications.
 */

import React, { useState } from 'react';

interface ApiDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiDocsModal: React.FC<ApiDocsModalProps> = ({ isOpen, onClose }) => {
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const SNIPPETS = [
    {
      id: 'create',
      title: '1. Create Shortened URL',
      method: 'POST',
      endpoint: '/urls',
      curl: `curl -X POST https://api.ctrlshort.io/urls \\
  -H "Authorization: Bearer <COGNITO_JWT_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "originalUrl": "https://github.com/my-org/project",
    "customAlias": "my-project",
    "expiresInSeconds": 604800
  }'`,
    },
    {
      id: 'list',
      title: "2. List User's Links",
      method: 'GET',
      endpoint: '/urls',
      curl: `curl https://api.ctrlshort.io/urls \\
  -H "Authorization: Bearer <COGNITO_JWT_TOKEN>"`,
    },
    {
      id: 'analytics',
      title: '3. Fetch Link Analytics',
      method: 'GET',
      endpoint: '/urls/{id}/analytics',
      curl: `curl https://api.ctrlshort.io/urls/my-project/analytics \\
  -H "Authorization: Bearer <COGNITO_JWT_TOKEN>"`,
    },
    {
      id: 'redirect',
      title: '4. Public Fast Redirect',
      method: 'GET',
      endpoint: '/r/{shortCode}',
      curl: `curl -I https://api.ctrlshort.io/r/my-project
# Returns HTTP 302 Found with Location header`,
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="api-docs-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-[#0A0A0A] border border-white/20 rounded-2xl p-6 sm:p-8 text-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <h2 id="api-docs-modal-title" className="text-lg font-medium">Developer API Reference</h2>
            <p className="text-xs text-white/50 font-mono mt-0.5">Base URL: https://api.ctrlshort.io</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="text-white/60 hover:text-white p-1 rounded text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto pr-1 mt-4 space-y-6 flex-1 text-left">
          {SNIPPETS.map((snippet) => (
            <div key={snippet.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-white text-black font-semibold">
                    {snippet.method}
                  </span>
                  <span className="text-xs font-mono text-white/90">{snippet.endpoint}</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(snippet.curl, snippet.id)}
                  className="text-[11px] font-mono text-white/50 hover:text-white transition-colors"
                >
                  {copiedSnippet === snippet.id ? '✓ Copied' : 'Copy cURL'}
                </button>
              </div>
              <pre className="text-xs font-mono bg-black/60 p-3 rounded-lg overflow-x-auto text-white/80 border border-white/5 leading-relaxed">
                {snippet.curl}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
