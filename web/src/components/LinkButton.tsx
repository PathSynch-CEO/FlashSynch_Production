import {
  Mail,
  Phone,
  Linkedin,
  Twitter,
  Instagram,
  Facebook,
  Youtube,
  Github,
  Globe,
  Calendar,
  Link as LinkIcon,
  ExternalLink,
} from 'lucide-react';
import type { CardLink } from '../types';

interface LinkButtonProps {
  link: CardLink;
  primaryColor: string;
  onTrack?: () => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  mail: Mail,
  phone: Phone,
  linkedin: Linkedin,
  twitter: Twitter,
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
  github: Github,
  globe: Globe,
  calendar: Calendar,
  link: LinkIcon,
};

function getLinkHref(link: CardLink): string {
  switch (link.type) {
    case 'email':
      return `mailto:${link.value}`;
    case 'phone':
      return `tel:${link.value.replace(/[^+\d]/g, '')}`;
    default:
      // Use short URL if available, otherwise use original value
      return link.qrsynchShortUrl || link.value;
  }
}

function isExternalLink(type: string): boolean {
  return !['email', 'phone'].includes(type);
}

export default function LinkButton({ link, primaryColor, onTrack }: LinkButtonProps) {
  const Icon = iconMap[link.icon] || LinkIcon;
  const href = getLinkHref(link);
  const isExternal = isExternalLink(link.type);

  const handleClick = () => {
    if (onTrack) {
      onTrack();
    }
  };

  return (
    <a
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      onClick={handleClick}
      className="link-button group"
      style={{
        backgroundColor: `${primaryColor}15`,
        borderColor: `${primaryColor}30`,
        border: '1px solid',
      }}
    >
      <div
        className="flex items-center justify-center w-10 h-10 rounded-lg"
        style={{ backgroundColor: `${primaryColor}20` }}
      >
        <span style={{ color: primaryColor }}>
          <Icon className="w-5 h-5" />
        </span>
      </div>

      <div className="flex-1 text-left">
        <p className="font-medium text-gray-900 dark:text-white">
          {link.label}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
          {link.value}
        </p>
      </div>

      {isExternal && (
        <ExternalLink
          className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors"
        />
      )}
    </a>
  );
}
