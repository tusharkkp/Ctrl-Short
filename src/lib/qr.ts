/**
 * Purpose:
 * Client-side QR code generation utility producing SVG and PNG formats
 * with direct browser download capabilities.
 */

import QRCode from 'qrcode';

/**
 * Generates an SVG string representation of a QR code for a given URL.
 */
export async function generateQrSvg(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: 'svg',
    margin: 1,
    color: {
      dark: '#000000', // Crisp black QR modules
      light: '#00000000', // Transparent background
    },
    errorCorrectionLevel: 'M',
  });
}

/**
 * Generates a high-resolution PNG data URL for a given URL.
 */
export async function generateQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 512,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'M',
  });
}

/**
 * Initiates an immediate browser download for the generated QR code.
 */
export async function downloadQrCode(
  text: string,
  filename: string = 'ctrl-short-qr',
  format: 'png' | 'svg' = 'png'
): Promise<void> {
  if (format === 'svg') {
    const svgString = await generateQrSvg(text);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, `${filename}.svg`);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } else {
    const dataUrl = await generateQrDataUrl(text);
    triggerDownload(dataUrl, `${filename}.png`);
  }
}

function triggerDownload(href: string, filename: string): void {
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}
