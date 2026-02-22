import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import {
  ArrowLeft,
  Save,
  Loader2,
  User,
  Palette,
  Link as LinkIcon,
  Plus,
  Trash2,
  GripVertical,
  Eye
} from 'lucide-react';

const LINK_TYPES = [
  { value: 'email', label: 'Email', placeholder: 'email@example.com' },
  { value: 'phone', label: 'Phone', placeholder: '+1 (555) 000-0000' },
  { value: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/...' },
  { value: 'twitter', label: 'Twitter/X', placeholder: 'https://x.com/...' },
  { value: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/...' },
  { value: 'website', label: 'Website', placeholder: 'https://...' },
  { value: 'calendly', label: 'Calendly', placeholder: 'https://calendly.com/...' },
  { value: 'custom', label: 'Custom Link', placeholder: 'https://...' },
];

const TEMPLATES = [
  { value: 'modern', label: 'Modern' },
  { value: 'classic', label: 'Classic' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'bold', label: 'Bold' },
];

interface CardLink {
  _id?: string;
  type: string;
  label: string;
  value: string;
  visible: boolean;
  order: number;
}

interface CardData {
  profile: {
    firstName: string;
    lastName: string;
    displayName?: string;
    title?: string;
    company?: string;
    headline?: string;
    bio?: string;
    avatarUrl?: string;
    coverUrl?: string;
  };
  links: CardLink[];
  theme: {
    template: string;
    primaryColor: string;
    accentColor: string;
    fontFamily: string;
    darkMode: boolean;
  };
  settings: {
    leadCaptureEnabled: boolean;
    showEmail: boolean;
    showPhone: boolean;
  };
  mode: string;
}

const defaultCard: CardData = {
  profile: {
    firstName: '',
    lastName: '',
    displayName: '',
    title: '',
    company: '',
    headline: '',
    bio: '',
    avatarUrl: '',
    coverUrl: '',
  },
  links: [],
  theme: {
    template: 'modern',
    primaryColor: '#2563eb',
    accentColor: '#7c3aed',
    fontFamily: 'sans',
    darkMode: false,
  },
  settings: {
    leadCaptureEnabled: true,
    showEmail: true,
    showPhone: true,
  },
  mode: 'business',
};

export default function CardEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getIdToken, profile: userProfile } = useAuth();
  const [card, setCard] = useState<CardData>(defaultCard);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [error, setError] = useState('');

  const isEditing = !!id;

  useEffect(() => {
    if (id) {
      fetchCard();
    } else if (userProfile) {
      // Pre-fill with user profile
      setCard(prev => ({
        ...prev,
        profile: {
          ...prev.profile,
          firstName: userProfile.displayName?.split(' ')[0] || '',
          lastName: userProfile.displayName?.split(' ').slice(1).join(' ') || '',
        }
      }));
    }
  }, [id, userProfile]);

  const fetchCard = async () => {
    try {
      const token = await getIdToken();
      const response = await api.get(`/cards/id/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = response.data.data;
      setCard({
        profile: data.profile,
        links: data.links || [],
        theme: data.theme || defaultCard.theme,
        settings: data.settings || defaultCard.settings,
        mode: data.mode || 'business',
      });
    } catch (err) {
      console.error('Failed to fetch card:', err);
      setError('Failed to load card');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!card.profile.firstName || !card.profile.lastName) {
      setError('First name and last name are required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const token = await getIdToken();
      const payload = {
        ...card,
        links: card.links.map((link, i) => ({ ...link, order: i })),
      };

      if (isEditing) {
        await api.put(`/cards/${id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await api.post('/cards', payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save card');
    } finally {
      setSaving(false);
    }
  };

  const addLink = () => {
    setCard(prev => ({
      ...prev,
      links: [...prev.links, {
        type: 'website',
        label: 'Website',
        value: '',
        visible: true,
        order: prev.links.length
      }]
    }));
  };

  const updateLink = (index: number, updates: Partial<CardLink>) => {
    setCard(prev => ({
      ...prev,
      links: prev.links.map((link, i) => i === index ? { ...link, ...updates } : link)
    }));
  };

  const removeLink = (index: number) => {
    setCard(prev => ({
      ...prev,
      links: prev.links.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'links', label: 'Links', icon: LinkIcon },
    { id: 'theme', label: 'Theme', icon: Palette },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Card' : 'Create Card'}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {isEditing && (
            <a
              href={`/c/${id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              <Eye className="w-4 h-4" />
              Preview
            </a>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Card
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                value={card.profile.firstName}
                onChange={(e) => setCard(prev => ({
                  ...prev,
                  profile: { ...prev.profile, firstName: e.target.value }
                }))}
                className="input-field"
                placeholder="John"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                value={card.profile.lastName}
                onChange={(e) => setCard(prev => ({
                  ...prev,
                  profile: { ...prev.profile, lastName: e.target.value }
                }))}
                className="input-field"
                placeholder="Smith"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Job Title
            </label>
            <input
              type="text"
              value={card.profile.title || ''}
              onChange={(e) => setCard(prev => ({
                ...prev,
                profile: { ...prev.profile, title: e.target.value }
              }))}
              className="input-field"
              placeholder="Software Engineer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company
            </label>
            <input
              type="text"
              value={card.profile.company || ''}
              onChange={(e) => setCard(prev => ({
                ...prev,
                profile: { ...prev.profile, company: e.target.value }
              }))}
              className="input-field"
              placeholder="Acme Inc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Headline
            </label>
            <input
              type="text"
              value={card.profile.headline || ''}
              onChange={(e) => setCard(prev => ({
                ...prev,
                profile: { ...prev.profile, headline: e.target.value }
              }))}
              className="input-field"
              placeholder="Building the future of..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bio
            </label>
            <textarea
              value={card.profile.bio || ''}
              onChange={(e) => setCard(prev => ({
                ...prev,
                profile: { ...prev.profile, bio: e.target.value }
              }))}
              className="input-field min-h-[100px]"
              placeholder="A brief description about yourself..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Avatar URL
            </label>
            <input
              type="url"
              value={card.profile.avatarUrl || ''}
              onChange={(e) => setCard(prev => ({
                ...prev,
                profile: { ...prev.profile, avatarUrl: e.target.value }
              }))}
              className="input-field"
              placeholder="https://example.com/avatar.jpg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cover Image URL
            </label>
            <input
              type="url"
              value={card.profile.coverUrl || ''}
              onChange={(e) => setCard(prev => ({
                ...prev,
                profile: { ...prev.profile, coverUrl: e.target.value }
              }))}
              className="input-field"
              placeholder="https://example.com/cover.jpg"
            />
          </div>

          {/* Lead capture toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Lead Capture</p>
              <p className="text-sm text-gray-600">Allow visitors to share their contact info</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={card.settings.leadCaptureEnabled}
                onChange={(e) => setCard(prev => ({
                  ...prev,
                  settings: { ...prev.settings, leadCaptureEnabled: e.target.checked }
                }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      )}

      {/* Links Tab */}
      {activeTab === 'links' && (
        <div className="space-y-4">
          {card.links.map((link, index) => (
            <div
              key={index}
              className="bg-white rounded-xl border border-gray-200 p-4"
            >
              <div className="flex items-start gap-4">
                <div className="p-2 text-gray-400 cursor-move">
                  <GripVertical className="w-5 h-5" />
                </div>

                <div className="flex-1 grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <select
                      value={link.type}
                      onChange={(e) => {
                        const type = LINK_TYPES.find(t => t.value === e.target.value);
                        updateLink(index, {
                          type: e.target.value,
                          label: type?.label || link.label
                        });
                      }}
                      className="input-field"
                    >
                      {LINK_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Label
                    </label>
                    <input
                      type="text"
                      value={link.label}
                      onChange={(e) => updateLink(index, { label: e.target.value })}
                      className="input-field"
                      placeholder="Label"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Value
                    </label>
                    <input
                      type="text"
                      value={link.value}
                      onChange={(e) => updateLink(index, { value: e.target.value })}
                      className="input-field"
                      placeholder={LINK_TYPES.find(t => t.value === link.type)?.placeholder}
                    />
                  </div>
                </div>

                <button
                  onClick={() => removeLink(index)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-3 ml-12 flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={link.visible}
                    onChange={(e) => updateLink(index, { visible: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Visible on card
                </label>
              </div>
            </div>
          ))}

          <button
            onClick={addLink}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Link
          </button>
        </div>
      )}

      {/* Theme Tab */}
      {activeTab === 'theme' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Template
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {TEMPLATES.map((template) => (
                <button
                  key={template.value}
                  onClick={() => setCard(prev => ({
                    ...prev,
                    theme: { ...prev.theme, template: template.value }
                  }))}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    card.theme.template === template.value
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="font-medium">{template.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={card.theme.primaryColor}
                  onChange={(e) => setCard(prev => ({
                    ...prev,
                    theme: { ...prev.theme, primaryColor: e.target.value }
                  }))}
                  className="w-12 h-12 rounded-lg border border-gray-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={card.theme.primaryColor}
                  onChange={(e) => setCard(prev => ({
                    ...prev,
                    theme: { ...prev.theme, primaryColor: e.target.value }
                  }))}
                  className="input-field flex-1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Accent Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={card.theme.accentColor}
                  onChange={(e) => setCard(prev => ({
                    ...prev,
                    theme: { ...prev.theme, accentColor: e.target.value }
                  }))}
                  className="w-12 h-12 rounded-lg border border-gray-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={card.theme.accentColor}
                  onChange={(e) => setCard(prev => ({
                    ...prev,
                    theme: { ...prev.theme, accentColor: e.target.value }
                  }))}
                  className="input-field flex-1"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Font Family
            </label>
            <div className="flex gap-3">
              {['sans', 'serif', 'mono'].map((font) => (
                <button
                  key={font}
                  onClick={() => setCard(prev => ({
                    ...prev,
                    theme: { ...prev.theme, fontFamily: font }
                  }))}
                  className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                    card.theme.fontFamily === font
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  style={{
                    fontFamily: font === 'sans' ? 'Inter, sans-serif'
                      : font === 'serif' ? 'Georgia, serif'
                      : 'JetBrains Mono, monospace'
                  }}
                >
                  {font.charAt(0).toUpperCase() + font.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Dark Mode</p>
              <p className="text-sm text-gray-600">Use dark theme for your card</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={card.theme.darkMode}
                onChange={(e) => setCard(prev => ({
                  ...prev,
                  theme: { ...prev.theme, darkMode: e.target.checked }
                }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
