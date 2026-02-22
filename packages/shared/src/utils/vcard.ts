import type { CardProfile, CardLink } from '../types';

/**
 * Generate a vCard (VCF) string from card profile and links
 */
export function generateVCard(profile: CardProfile, links: CardLink[]): string {
  const lines: string[] = [
    'BEGIN:VCARD',
    'VERSION:3.0',
  ];

  // Name
  const fullName = profile.displayName || `${profile.firstName} ${profile.lastName}`;
  lines.push(`FN:${escapeVCardValue(fullName)}`);
  lines.push(`N:${escapeVCardValue(profile.lastName)};${escapeVCardValue(profile.firstName)};;;`);

  // Prefix/suffix
  if (profile.prefix) {
    lines.push(`TITLE:${escapeVCardValue(profile.prefix)}`);
  }

  // Organization
  if (profile.company) {
    const org = profile.department
      ? `${profile.company};${profile.department}`
      : profile.company;
    lines.push(`ORG:${escapeVCardValue(org)}`);
  }

  // Job title
  if (profile.title) {
    lines.push(`ROLE:${escapeVCardValue(profile.title)}`);
  }

  // Note (bio/headline)
  if (profile.headline || profile.bio) {
    const note = profile.headline || profile.bio;
    lines.push(`NOTE:${escapeVCardValue(note || '')}`);
  }

  // Photo
  if (profile.avatarUrl) {
    lines.push(`PHOTO;VALUE=URI:${profile.avatarUrl}`);
  }

  // Process links
  for (const link of links) {
    if (!link.visible) continue;

    switch (link.type) {
      case 'email':
        lines.push(`EMAIL;TYPE=WORK:${escapeVCardValue(link.value)}`);
        break;
      case 'phone':
        lines.push(`TEL;TYPE=WORK:${escapeVCardValue(link.value)}`);
        break;
      case 'website':
        lines.push(`URL:${escapeVCardValue(link.value)}`);
        break;
      case 'linkedin':
        lines.push(`X-SOCIALPROFILE;TYPE=linkedin:${escapeVCardValue(link.value)}`);
        break;
      case 'twitter':
        lines.push(`X-SOCIALPROFILE;TYPE=twitter:${escapeVCardValue(link.value)}`);
        break;
      case 'instagram':
        lines.push(`X-SOCIALPROFILE;TYPE=instagram:${escapeVCardValue(link.value)}`);
        break;
      case 'facebook':
        lines.push(`X-SOCIALPROFILE;TYPE=facebook:${escapeVCardValue(link.value)}`);
        break;
      case 'github':
        lines.push(`X-SOCIALPROFILE;TYPE=github:${escapeVCardValue(link.value)}`);
        break;
      default:
        // Add other links as URLs
        if (link.value.startsWith('http')) {
          lines.push(`URL;TYPE=${link.type.toUpperCase()}:${escapeVCardValue(link.value)}`);
        }
    }
  }

  lines.push('END:VCARD');

  return lines.join('\r\n');
}

/**
 * Escape special characters in vCard values
 */
function escapeVCardValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Generate a download filename for a vCard
 */
export function getVCardFilename(profile: CardProfile): string {
  const name = profile.displayName || `${profile.firstName}_${profile.lastName}`;
  const safeName = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return `${safeName}.vcf`;
}
