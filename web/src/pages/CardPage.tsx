import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { User, Download, MessageSquare, Loader2 } from 'lucide-react';
import { getCardBySlug, trackScan } from '../lib/api';
import { downloadVCard } from '../lib/vcard';
import LinkButton from '../components/LinkButton';
import LeadCaptureModal from '../components/LeadCaptureModal';
import QRCodeDisplay from '../components/QRCodeDisplay';
import type { PublicCard } from '../types';

export default function CardPage() {
  const { slug } = useParams<{ slug: string }>();
  const [card, setCard] = useState<PublicCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);

  useEffect(() => {
    async function fetchCard() {
      if (!slug) return;

      try {
        const data = await getCardBySlug(slug);
        setCard(data);

        // Update page title and meta
        const name = data.profile.displayName ||
          `${data.profile.firstName} ${data.profile.lastName}`;
        document.title = `${name} | FlashSynch`;

        // Update meta tags dynamically
        updateMetaTags(data);
      } catch (err) {
        setError('Card not found');
      } finally {
        setLoading(false);
      }
    }

    fetchCard();
  }, [slug]);

  const updateMetaTags = (card: PublicCard) => {
    const name = card.profile.displayName ||
      `${card.profile.firstName} ${card.profile.lastName}`;
    const description = card.profile.headline ||
      `${card.profile.title || ''} ${card.profile.company ? `at ${card.profile.company}` : ''}`.trim();

    // Update existing meta tags or create new ones
    setMetaTag('description', description);
    setMetaTag('og:title', `${name} | FlashSynch`);
    setMetaTag('og:description', description);
    setMetaTag('og:type', 'profile');
    setMetaTag('og:url', window.location.href);
    if (card.profile.avatarUrl) {
      setMetaTag('og:image', card.profile.avatarUrl);
    }
    setMetaTag('twitter:card', 'summary');
    setMetaTag('twitter:title', `${name} | FlashSynch`);
    setMetaTag('twitter:description', description);
  };

  const setMetaTag = (name: string, content: string) => {
    let element = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
    if (!element) {
      element = document.createElement('meta');
      if (name.startsWith('og:') || name.startsWith('twitter:')) {
        element.setAttribute('property', name);
      } else {
        element.setAttribute('name', name);
      }
      document.head.appendChild(element);
    }
    element.setAttribute('content', content);
  };

  const handleLinkClick = (linkId: string) => {
    if (slug) {
      trackScan(slug, 'click', linkId).catch(() => {});
    }
  };

  const handleSaveContact = () => {
    if (card) {
      downloadVCard(card.profile, card.links);
      if (slug) {
        trackScan(slug, 'save_contact').catch(() => {});
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Card Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            This card doesn't exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  const {
    profile,
    links,
    theme,
    settings,
  } = card;

  const name = profile.displayName || `${profile.firstName} ${profile.lastName}`;
  const cardUrl = `${window.location.origin}/c/${slug}`;

  // Determine font family class
  const fontClass = {
    sans: 'font-sans',
    serif: 'font-serif',
    mono: 'font-mono',
  }[theme.fontFamily] || 'font-sans';

  // Sort links by order
  const sortedLinks = [...links].sort((a, b) => a.order - b.order);

  return (
    <div
      className={`min-h-screen ${fontClass}`}
      style={{
        background: theme.darkMode
          ? `linear-gradient(135deg, #1f2937 0%, ${theme.primaryColor}20 100%)`
          : `linear-gradient(135deg, #f9fafb 0%, ${theme.primaryColor}10 100%)`,
      }}
    >
      <div className="max-w-md mx-auto px-4 py-8">
        {/* Card Container */}
        <div className="card-glass p-6 sm:p-8 animate-fade-in">
          {/* Cover Image */}
          {profile.coverUrl && (
            <div
              className="h-32 -mx-6 -mt-6 sm:-mx-8 sm:-mt-8 mb-6 rounded-t-3xl bg-cover bg-center"
              style={{ backgroundImage: `url(${profile.coverUrl})` }}
            />
          )}

          {/* Profile Section */}
          <div className="text-center mb-8">
            {/* Avatar */}
            <div className="relative inline-block mb-4">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center border-4 border-white shadow-lg"
                  style={{ backgroundColor: `${theme.primaryColor}20` }}
                >
                  <User className="w-12 h-12" style={{ color: theme.primaryColor }} />
                </div>
              )}
            </div>

            {/* Name & Title */}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {profile.prefix && <span className="text-gray-500">{profile.prefix} </span>}
              {name}
              {profile.accreditations && (
                <span className="text-gray-500 text-lg font-normal">
                  , {profile.accreditations}
                </span>
              )}
            </h1>

            {profile.title && (
              <p className="text-gray-600 dark:text-gray-300 mb-1">
                {profile.title}
              </p>
            )}

            {profile.company && (
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {profile.company}
                {profile.department && ` · ${profile.department}`}
              </p>
            )}

            {profile.headline && (
              <p className="text-gray-600 dark:text-gray-300 mt-3 text-sm">
                {profile.headline}
              </p>
            )}

            {profile.bio && (
              <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
                {profile.bio}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mb-8">
            <button
              onClick={handleSaveContact}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-white transition-all hover:opacity-90"
              style={{ backgroundColor: theme.primaryColor }}
            >
              <Download className="w-5 h-5" />
              Save Contact
            </button>

            {settings.leadCaptureEnabled && (
              <button
                onClick={() => setIsLeadModalOpen(true)}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold border-2 transition-all hover:bg-gray-50 dark:hover:bg-gray-800"
                style={{ borderColor: theme.primaryColor, color: theme.primaryColor }}
              >
                <MessageSquare className="w-5 h-5" />
              </button>
            )}

            <QRCodeDisplay
              url={cardUrl}
              primaryColor={theme.primaryColor}
              name={name}
            />
          </div>

          {/* Links */}
          <div className="space-y-3">
            {sortedLinks.map((link) => (
              <LinkButton
                key={link._id}
                link={link}
                primaryColor={theme.primaryColor}
                onTrack={() => handleLinkClick(link._id)}
              />
            ))}
          </div>

          {/* Schedule Link */}
          {settings.scheduleLink && (
            <div className="mt-6">
              <a
                href={settings.scheduleLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-3 px-4 rounded-xl font-semibold text-center text-white transition-all hover:opacity-90"
                style={{
                  background: `linear-gradient(135deg, ${theme.primaryColor} 0%, ${theme.accentColor || theme.primaryColor} 100%)`,
                }}
              >
                Schedule a Meeting
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <a
            href="https://flashsynch.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
          >
            Powered by <span className="font-semibold">FlashSynch</span>
          </a>
        </div>
      </div>

      {/* Lead Capture Modal */}
      <LeadCaptureModal
        slug={slug || ''}
        isOpen={isLeadModalOpen}
        onClose={() => setIsLeadModalOpen(false)}
        primaryColor={theme.primaryColor}
      />
    </div>
  );
}
