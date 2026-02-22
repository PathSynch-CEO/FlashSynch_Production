import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Download, Share2 } from 'lucide-react';

interface QRCodeDisplayProps {
  url: string;
  primaryColor: string;
  name: string;
}

export default function QRCodeDisplay({ url, primaryColor, name }: QRCodeDisplayProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDownload = () => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');

      const downloadLink = document.createElement('a');
      downloadLink.download = `${name.toLowerCase().replace(/\s+/g, '-')}-qr.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${name}'s Digital Card`,
          text: `Check out ${name}'s digital business card`,
          url: url,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <>
      {/* QR Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all"
        aria-label="Show QR Code"
      >
        <QRCodeSVG
          value={url}
          size={24}
          fgColor={primaryColor}
          bgColor="transparent"
          level="L"
        />
      </button>

      {/* QR Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />

          <div className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8 mx-4 animate-fade-in">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Scan to Connect
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Point your camera at this QR code
              </p>

              <div className="bg-white p-4 rounded-2xl inline-block mb-6">
                <QRCodeSVG
                  id="qr-code-svg"
                  value={url}
                  size={200}
                  fgColor={primaryColor}
                  bgColor="#ffffff"
                  level="M"
                  includeMargin={true}
                />
              </div>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>

                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-white transition-colors"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
