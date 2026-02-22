import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import {
  Plus,
  CreditCard,
  Eye,
  MoreVertical,
  Edit,
  Trash2,
  ExternalLink,
  QrCode,
  Loader2,
  Search
} from 'lucide-react';

interface Card {
  _id: string;
  slug: string;
  mode: string;
  status: string;
  profile: {
    firstName: string;
    lastName: string;
    title?: string;
    company?: string;
    avatarUrl?: string;
  };
  analytics: {
    totalViews: number;
    totalClicks: number;
    totalCaptures: number;
  };
  createdAt: string;
}

export default function Cards() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const { getIdToken, profile } = useAuth();

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      const token = await getIdToken();
      const response = await api.get('/cards', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCards(response.data.data);
    } catch (error) {
      console.error('Failed to fetch cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteCard = async (cardId: string) => {
    if (!confirm('Are you sure you want to delete this card?')) return;

    try {
      const token = await getIdToken();
      await api.delete(`/cards/${cardId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCards(cards.filter(c => c._id !== cardId));
    } catch (error) {
      console.error('Failed to delete card:', error);
    }
  };

  const filteredCards = cards.filter(card => {
    const searchLower = searchQuery.toLowerCase();
    return (
      card.profile.firstName.toLowerCase().includes(searchLower) ||
      card.profile.lastName.toLowerCase().includes(searchLower) ||
      card.slug.toLowerCase().includes(searchLower) ||
      card.profile.company?.toLowerCase().includes(searchLower)
    );
  });

  const getCardLimit = () => {
    if (profile?.plan === 'team') return 'Unlimited';
    if (profile?.plan === 'pro') return 3;
    return 1;
  };

  const canCreateCard = () => {
    if (profile?.plan === 'team') return true;
    if (profile?.plan === 'pro') return cards.length < 3;
    return cards.length < 1;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your Cards</h1>
          <p className="text-gray-600 mt-1">
            {cards.length} of {getCardLimit()} cards used
          </p>
        </div>

        <Link
          to="/dashboard/cards/new"
          className={`btn-primary inline-flex items-center gap-2 ${
            !canCreateCard() ? 'opacity-50 pointer-events-none' : ''
          }`}
        >
          <Plus className="w-5 h-5" />
          Create Card
        </Link>
      </div>

      {/* Search */}
      {cards.length > 0 && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search cards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10"
          />
        </div>
      )}

      {/* Cards grid */}
      {filteredCards.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCards.map((card) => (
            <div
              key={card._id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Card preview header */}
              <div className="h-24 bg-gradient-to-br from-blue-500 to-purple-600 relative">
                {card.profile.avatarUrl && (
                  <img
                    src={card.profile.avatarUrl}
                    alt=""
                    className="absolute bottom-0 left-4 translate-y-1/2 w-16 h-16 rounded-xl border-4 border-white object-cover"
                  />
                )}
              </div>

              {/* Card content */}
              <div className={`p-4 ${card.profile.avatarUrl ? 'pt-10' : 'pt-4'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {card.profile.firstName} {card.profile.lastName}
                    </h3>
                    {card.profile.title && (
                      <p className="text-sm text-gray-600">{card.profile.title}</p>
                    )}
                    {card.profile.company && (
                      <p className="text-sm text-gray-500">{card.profile.company}</p>
                    )}
                  </div>

                  {/* Menu */}
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpen(menuOpen === card._id ? null : card._id)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-500" />
                    </button>

                    {menuOpen === card._id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setMenuOpen(null)}
                        />
                        <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                          <Link
                            to={`/dashboard/cards/${card._id}/edit`}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Edit className="w-4 h-4" />
                            Edit Card
                          </Link>
                          <a
                            href={`/c/${card.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <ExternalLink className="w-4 h-4" />
                            View Live
                          </a>
                          <Link
                            to={`/dashboard/cards/${card._id}/qr`}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <QrCode className="w-4 h-4" />
                            QR Code
                          </Link>
                          <button
                            onClick={() => {
                              setMenuOpen(null);
                              deleteCard(card._id);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <Eye className="w-4 h-4" />
                    {card.analytics.totalViews}
                  </div>
                  <div className="text-sm text-gray-500">
                    /{card.slug}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchQuery ? 'No cards found' : 'No cards yet'}
          </h3>
          <p className="text-gray-600 mb-6 max-w-sm mx-auto">
            {searchQuery
              ? 'Try adjusting your search'
              : 'Create your first digital business card to start sharing your contact info'}
          </p>
          {!searchQuery && (
            <Link to="/dashboard/cards/new" className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create Your First Card
            </Link>
          )}
        </div>
      )}

      {/* Upgrade prompt */}
      {!canCreateCard() && profile?.plan !== 'team' && (
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Need more cards?</h3>
              <p className="text-sm text-gray-600">
                Upgrade to {profile?.plan === 'free' ? 'Pro for 3 cards' : 'Team for unlimited cards'}
              </p>
            </div>
            <Link
              to="/dashboard/settings?tab=billing"
              className="btn-primary"
            >
              Upgrade
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
