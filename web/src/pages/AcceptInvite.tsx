import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Loader2, Zap, Users, CheckCircle, XCircle, LogIn } from 'lucide-react';

interface InviteDetails {
  email: string;
  role: string;
  orgName: string;
  orgSlug: string;
  expiresAt: string;
}

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, getIdToken } = useAuth();

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchInvite();
  }, [token]);

  const fetchInvite = async () => {
    try {
      const response = await api.get(`/orgs/invitations/${token}`);
      setInvite(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invitation not found or expired');
    } finally {
      setLoading(false);
    }
  };

  const acceptInvite = async () => {
    if (!user) {
      // Redirect to login with return URL
      navigate(`/login?redirect=/invite/${token}`);
      return;
    }

    setAccepting(true);
    setError('');

    try {
      const idToken = await getIdToken();
      await api.post(`/orgs/invitations/${token}/accept`, {}, {
        headers: { Authorization: `Bearer ${idToken}` }
      });
      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard/team');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to {invite?.orgName}!</h1>
          <p className="text-gray-600">Redirecting to your team dashboard...</p>
        </div>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invitation</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link to="/dashboard" className="btn-primary inline-flex items-center gap-2">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              FlashSynch
            </span>
          </Link>
        </div>

        {/* Invite Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-purple-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">You're Invited!</h1>
            <p className="text-gray-600">
              You've been invited to join <strong>{invite?.orgName}</strong> as a{' '}
              <span className="capitalize">{invite?.role}</span>.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="text-sm text-gray-600">
              <p><strong>Organization:</strong> {invite?.orgName}</p>
              <p><strong>Your role:</strong> <span className="capitalize">{invite?.role}</span></p>
              <p><strong>Invitation for:</strong> {invite?.email}</p>
            </div>
          </div>

          {user ? (
            <>
              {user.email?.toLowerCase() === invite?.email.toLowerCase() ? (
                <button
                  onClick={acceptInvite}
                  disabled={accepting}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {accepting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Accept Invitation
                    </>
                  )}
                </button>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-red-600 mb-4">
                    This invitation was sent to <strong>{invite?.email}</strong>, but you're signed in as <strong>{user.email}</strong>.
                  </p>
                  <Link
                    to="/login"
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign in with correct account
                  </Link>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 text-center">
                Sign in or create an account to accept this invitation.
              </p>
              <Link
                to={`/login?redirect=/invite/${token}`}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <LogIn className="w-5 h-5" />
                Sign In
              </Link>
              <Link
                to={`/signup?redirect=/invite/${token}`}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Create Account
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
