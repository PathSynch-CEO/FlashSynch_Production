import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import {
  Users,
  UserPlus,
  Crown,
  Shield,
  User,
  MoreVertical,
  Trash2,
  Mail,
  Loader2,
  Building,
  Copy,
  Check,
  BarChart3,
  Eye,
  MousePointer,
  UserCheck
} from 'lucide-react';

interface OrgMember {
  userId: {
    _id: string;
    displayName: string;
    email: string;
    avatarUrl?: string;
  };
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

interface Invitation {
  _id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  inviteLink?: string;
}

interface Organization {
  _id: string;
  name: string;
  slug: string;
  ownerId: string;
  members: OrgMember[];
  settings: {
    maxCards: number;
    maxMembers: number;
  };
  stats: {
    memberCount: number;
    cardCount: number;
  };
}

interface MemberStats {
  userId: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  role: string;
  cardCount: number;
  views: number;
  clicks: number;
  captures: number;
}

interface OrgAnalytics {
  totals: {
    views: number;
    clicks: number;
    captures: number;
  };
  cardCount: number;
  memberCount: number;
  memberStats: MemberStats[];
}

export default function Team() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [analytics, setAnalytics] = useState<OrgAnalytics | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [orgName, setOrgName] = useState('');
  const [inviting, setInviting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'members' | 'analytics'>('members');
  const { getIdToken, profile } = useAuth();

  useEffect(() => {
    fetchOrg();
  }, []);

  const fetchOrg = async () => {
    try {
      const token = await getIdToken();
      const response = await api.get('/orgs/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrg(response.data.data);

      // Fetch invitations
      const invitesResponse = await api.get(`/orgs/${response.data.data._id}/invitations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInvitations(invitesResponse.data.data);

      // Fetch analytics
      const analyticsResponse = await api.get(`/orgs/${response.data.data._id}/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnalytics(analyticsResponse.data.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        // No org yet
        setOrg(null);
      } else {
        console.error('Failed to fetch org:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const createOrg = async () => {
    if (!orgName.trim()) return;
    setCreating(true);

    try {
      const token = await getIdToken();
      const response = await api.post('/orgs', { name: orgName }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrg(response.data.data);
      setShowCreateModal(false);
      setOrgName('');
    } catch (error) {
      console.error('Failed to create org:', error);
    } finally {
      setCreating(false);
    }
  };

  const inviteMember = async () => {
    if (!inviteEmail.trim() || !org) return;
    setInviting(true);

    try {
      const token = await getIdToken();
      const response = await api.post(`/orgs/${org._id}/invitations`, {
        email: inviteEmail,
        role: inviteRole
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInvitations([response.data.data, ...invitations]);
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('member');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const cancelInvitation = async (inviteId: string) => {
    if (!org) return;
    try {
      const token = await getIdToken();
      await api.delete(`/orgs/${org._id}/invitations/${inviteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInvitations(invitations.filter(i => i._id !== inviteId));
    } catch (error) {
      console.error('Failed to cancel invitation:', error);
    }
  };

  const removeMember = async (userId: string) => {
    if (!org || !confirm('Remove this member from the team?')) return;
    try {
      const token = await getIdToken();
      await api.delete(`/orgs/${org._id}/members/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrg({
        ...org,
        members: org.members.filter(m => m.userId._id !== userId)
      });
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
    setMenuOpen(null);
  };

  const updateRole = async (userId: string, newRole: 'admin' | 'member') => {
    if (!org) return;
    try {
      const token = await getIdToken();
      await api.put(`/orgs/${org._id}/members/${userId}`, { role: newRole }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrg({
        ...org,
        members: org.members.map(m =>
          m.userId._id === userId ? { ...m, role: newRole } : m
        )
      });
    } catch (error) {
      console.error('Failed to update role:', error);
    }
    setMenuOpen(null);
  };

  const copyInviteLink = (link: string, id: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const getRoleIcon = (role: string) => {
    if (role === 'owner') return <Crown className="w-4 h-4 text-yellow-500" />;
    if (role === 'admin') return <Shield className="w-4 h-4 text-blue-500" />;
    return <User className="w-4 h-4 text-gray-400" />;
  };

  const isAdmin = org && (
    org.ownerId === profile?._id ||
    org.members.find(m => m.userId._id === profile?._id)?.role === 'admin'
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // No organization yet
  if (!org) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Building className="w-8 h-8 text-purple-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Create Your Team</h1>
        <p className="text-gray-600 mb-6">
          Organize your team, manage member cards, and view team-wide analytics.
        </p>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Users className="w-5 h-5" />
          Create Organization
        </button>

        {/* Create Org Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md text-left">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Create Organization</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization Name
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Acme Inc."
                  className="input-field"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={createOrg}
                  disabled={creating || !orgName.trim()}
                  className="flex-1 btn-primary flex items-center justify-center gap-2"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Create
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{org.name}</h1>
          <p className="text-gray-600 mt-1">
            {org.members.length} members · {org.stats?.cardCount || 0} cards
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <UserPlus className="w-5 h-5" />
            Invite Member
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
            activeTab === 'members'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users className="w-4 h-4" />
          Members
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
            activeTab === 'analytics'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Team Analytics
        </button>
      </div>

      {activeTab === 'members' && (
        <>
          {/* Pending Invitations */}
          {invitations.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Pending Invitations</h2>
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {invitations.map((invite) => (
                  <div key={invite._id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <Mail className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{invite.email}</p>
                        <p className="text-sm text-gray-500">
                          Invited as {invite.role} · Expires {new Date(invite.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {invite.inviteLink && (
                        <button
                          onClick={() => copyInviteLink(invite.inviteLink!, invite._id)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          title="Copy invite link"
                        >
                          {copiedLink === invite._id ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => cancelInvitation(invite._id)}
                        className="p-2 hover:bg-red-50 rounded-lg text-red-500"
                        title="Cancel invitation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Members List */}
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Team Members</h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {org.members.map((member) => (
              <div key={member.userId._id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    {member.userId.avatarUrl ? (
                      <img
                        src={member.userId.avatarUrl}
                        alt=""
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{member.userId.displayName}</p>
                      {getRoleIcon(member.role)}
                    </div>
                    <p className="text-sm text-gray-500">{member.userId.email}</p>
                  </div>
                </div>

                {isAdmin && member.role !== 'owner' && member.userId._id !== profile?._id && (
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpen(menuOpen === member.userId._id ? null : member.userId._id)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-500" />
                    </button>

                    {menuOpen === member.userId._id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setMenuOpen(null)}
                        />
                        <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                          {member.role === 'member' && (
                            <button
                              onClick={() => updateRole(member.userId._id, 'admin')}
                              className="flex items-center gap-2 px-3 py-2 text-sm w-full hover:bg-gray-50"
                            >
                              <Shield className="w-4 h-4" />
                              Make Admin
                            </button>
                          )}
                          {member.role === 'admin' && (
                            <button
                              onClick={() => updateRole(member.userId._id, 'member')}
                              className="flex items-center gap-2 px-3 py-2 text-sm w-full hover:bg-gray-50"
                            >
                              <User className="w-4 h-4" />
                              Make Member
                            </button>
                          )}
                          <button
                            onClick={() => removeMember(member.userId._id)}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 w-full hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                            Remove
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'analytics' && analytics && (
        <>
          {/* Team Stats */}
          <div className="grid gap-4 sm:grid-cols-3 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <Eye className="w-4 h-4" />
                Total Views
              </div>
              <p className="text-2xl font-bold text-gray-900">{analytics.totals.views.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <MousePointer className="w-4 h-4" />
                Total Clicks
              </div>
              <p className="text-2xl font-bold text-gray-900">{analytics.totals.clicks.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <UserCheck className="w-4 h-4" />
                Leads Captured
              </div>
              <p className="text-2xl font-bold text-gray-900">{analytics.totals.captures.toLocaleString()}</p>
            </div>
          </div>

          {/* Leaderboard */}
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Team Leaderboard</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Member</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Cards</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Views</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Clicks</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Leads</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {analytics.memberStats.map((member, index) => (
                  <tr key={member.userId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-gray-400 w-6">
                          {index + 1}
                        </span>
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                          {member.avatarUrl ? (
                            <img
                              src={member.avatarUrl}
                              alt=""
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <User className="w-4 h-4 text-white" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{member.displayName}</p>
                          <p className="text-xs text-gray-500">{member.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{member.cardCount}</td>
                    <td className="px-4 py-3 text-center text-gray-900 font-medium">{member.views}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{member.clicks}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{member.captures}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Invite Team Member</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="input-field"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                  className="input-field"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Admins can invite members and manage the team.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowInviteModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={inviteMember}
                disabled={inviting || !inviteEmail.trim()}
                className="flex-1 btn-primary flex items-center justify-center gap-2"
              >
                {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
