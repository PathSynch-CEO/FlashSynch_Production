// Card types for the public card page
export interface CardProfile {
  firstName: string;
  lastName: string;
  displayName?: string;
  title?: string;
  company?: string;
  headline?: string;
  bio?: string;
  prefix?: string;
  accreditations?: string;
  department?: string;
  avatarUrl?: string;
  coverUrl?: string;
}

export interface CardLink {
  _id: string;
  type: string;
  label: string;
  value: string;
  icon: string;
  visible: boolean;
  order: number;
  qrsynchShortUrl?: string;
}

export interface CardTheme {
  template: 'modern' | 'classic' | 'minimal' | 'bold';
  primaryColor: string;
  accentColor?: string;
  fontFamily: 'sans' | 'serif' | 'mono';
  darkMode: boolean;
  layout: 'vertical' | 'horizontal';
}

export interface CardSettings {
  leadCaptureEnabled: boolean;
  showEmail: boolean;
  showPhone: boolean;
  scheduleLink?: string;
  embedSchedule: boolean;
}

export interface PublicCard {
  _id: string;
  slug: string;
  mode: 'business' | 'landing' | 'lead' | 'link';
  profile: CardProfile;
  links: CardLink[];
  theme: CardTheme;
  settings: CardSettings;
  qrsynchShortUrl?: string;
}

export interface LeadCaptureData {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  notes?: string;
  consent: boolean;
  channel?: string;
}
