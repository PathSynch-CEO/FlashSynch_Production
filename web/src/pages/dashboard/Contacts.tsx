import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import { format } from 'date-fns';
import {
  Users,
  Search,
  Filter,
  Download,
  Mail,
  Phone,
  Building,
  Calendar,
  MoreVertical,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Tag
} from 'lucide-react';

interface Contact {
  _id: string;
  cardId: {
    _id: string;
    slug: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  lead: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    notes?: string;
  };
  source: {
    channel: string;
  };
  status: string;
  tags: string[];
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-700' },
  { value: 'contacted', label: 'Contacted', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'won', label: 'Won', color: 'bg-green-100 text-green-700' },
  { value: 'lost', label: 'Lost', color: 'bg-gray-100 text-gray-700' },
];

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const { getIdToken } = useAuth();

  useEffect(() => {
    fetchContacts();
  }, [page, statusFilter]);

  const fetchContacts = async () => {
    try {
      const token = await getIdToken();
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });
      if (statusFilter) params.append('status', statusFilter);

      const response = await api.get(`/contacts?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setContacts(response.data.data);
      setTotalPages(response.data.pagination?.totalPages || 1);
      setTotal(response.data.pagination?.total || response.data.data.length);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (contactId: string, status: string) => {
    try {
      const token = await getIdToken();
      await api.put(`/contacts/${contactId}`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContacts(contacts.map(c =>
        c._id === contactId ? { ...c, status } : c
      ));
    } catch (error) {
      console.error('Failed to update contact:', error);
    }
    setMenuOpen(null);
  };

  const exportContacts = async () => {
    try {
      const token = await getIdToken();
      const response = await api.get('/contacts?limit=1000', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = response.data.data;
      const csv = [
        ['Name', 'Email', 'Phone', 'Company', 'Status', 'Source', 'Date'].join(','),
        ...data.map((c: Contact) => [
          `"${c.lead.name}"`,
          c.lead.email,
          c.lead.phone || '',
          `"${c.lead.company || ''}"`,
          c.status,
          c.source.channel,
          format(new Date(c.createdAt), 'yyyy-MM-dd')
        ].join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contacts-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export contacts:', error);
    }
  };

  const filteredContacts = contacts.filter(contact => {
    const searchLower = searchQuery.toLowerCase();
    return (
      contact.lead.name.toLowerCase().includes(searchLower) ||
      contact.lead.email.toLowerCase().includes(searchLower) ||
      contact.lead.company?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status: string) => {
    const option = STATUS_OPTIONS.find(s => s.value === status);
    return option || STATUS_OPTIONS[0];
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
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-600 mt-1">{total} leads captured</p>
        </div>

        <button
          onClick={exportContacts}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10"
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="input-field pl-10 pr-8 appearance-none"
          >
            <option value="">All Status</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Contacts list */}
      {filteredContacts.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                    Contact
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 hidden sm:table-cell">
                    Card
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 hidden md:table-cell">
                    Source
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 hidden lg:table-cell">
                    Date
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredContacts.map((contact) => {
                  const statusBadge = getStatusBadge(contact.status);
                  return (
                    <tr key={contact._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{contact.lead.name}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1 text-sm text-gray-500">
                              <Mail className="w-3 h-3" />
                              {contact.lead.email}
                            </span>
                            {contact.lead.phone && (
                              <span className="flex items-center gap-1 text-sm text-gray-500 hidden sm:flex">
                                <Phone className="w-3 h-3" />
                                {contact.lead.phone}
                              </span>
                            )}
                          </div>
                          {contact.lead.company && (
                            <span className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                              <Building className="w-3 h-3" />
                              {contact.lead.company}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-sm text-gray-600">
                          {contact.cardId?.profile?.firstName} {contact.cardId?.profile?.lastName}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-sm text-gray-600 capitalize">
                          {contact.source.channel.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="flex items-center gap-1 text-sm text-gray-500">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(contact.createdAt), 'MMM d, yyyy')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative">
                          <button
                            onClick={() => setMenuOpen(menuOpen === contact._id ? null : contact._id)}
                            className="p-1.5 hover:bg-gray-100 rounded"
                          >
                            <MoreVertical className="w-4 h-4 text-gray-500" />
                          </button>

                          {menuOpen === contact._id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setMenuOpen(null)}
                              />
                              <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                                <p className="px-3 py-1 text-xs text-gray-500 font-medium">
                                  Set Status
                                </p>
                                {STATUS_OPTIONS.map((status) => (
                                  <button
                                    key={status.value}
                                    onClick={() => updateStatus(contact._id, status.value)}
                                    className={`flex items-center gap-2 px-3 py-1.5 text-sm w-full hover:bg-gray-50 ${
                                      contact.status === status.value ? 'text-blue-600' : 'text-gray-700'
                                    }`}
                                  >
                                    <Tag className="w-3 h-3" />
                                    {status.label}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchQuery || statusFilter ? 'No contacts found' : 'No contacts yet'}
          </h3>
          <p className="text-gray-600 max-w-sm mx-auto">
            {searchQuery || statusFilter
              ? 'Try adjusting your filters'
              : 'When someone fills out the contact form on your card, they\'ll appear here'}
          </p>
        </div>
      )}
    </div>
  );
}
