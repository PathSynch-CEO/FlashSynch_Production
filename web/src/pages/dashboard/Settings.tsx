import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import {
  User,
  CreditCard,
  Bell,
  Shield,
  Loader2,
  Save,
  Check,
  Crown
} from 'lucide-react';

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
];

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    features: ['1 digital card', 'Basic themes', 'Lead capture', 'QR code sharing'],
    current: true
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$9',
    period: 'per month',
    features: ['3 digital cards', 'All themes', 'Advanced analytics', 'Custom branding', 'Priority support'],
    popular: true
  },
  {
    id: 'team',
    name: 'Team',
    price: '$29',
    period: 'per month',
    features: ['Unlimited cards', 'Team management', 'API access', 'PathSynch CRM sync', 'Dedicated support'],
  },
];

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'profile';
  const { user, profile, getIdToken, refreshProfile } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const token = await getIdToken();
      await api.put('/users/me', { displayName }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <nav className="lg:w-48 flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Settings</h2>

              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="input-field bg-gray-50 text-gray-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Email cannot be changed
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="input-field"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Handle
                  </label>
                  <div className="flex items-center">
                    <span className="px-3 py-2 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-gray-500 text-sm">
                      flashsynch.com/
                    </span>
                    <input
                      type="text"
                      value={profile?.handle || ''}
                      disabled
                      className="input-field rounded-l-none bg-gray-50 text-gray-500"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="btn-primary flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : saved ? (
                    <>
                      <Check className="w-4 h-4" />
                      Saved!
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Billing Tab */}
          {activeTab === 'billing' && (
            <div className="space-y-6">
              {/* Current plan */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Current Plan</h2>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    profile?.plan === 'pro'
                      ? 'bg-blue-100 text-blue-700'
                      : profile?.plan === 'team'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {profile?.plan?.toUpperCase() || 'FREE'}
                  </span>
                </div>
                <p className="text-gray-600">
                  {profile?.plan === 'free'
                    ? 'You\'re on the Free plan. Upgrade to unlock more features.'
                    : `You're currently on the ${profile?.plan?.charAt(0).toUpperCase()}${profile?.plan?.slice(1)} plan.`}
                </p>
              </div>

              {/* Plans */}
              <div className="grid gap-4 md:grid-cols-3">
                {PLANS.map((plan) => {
                  const isCurrent = profile?.plan === plan.id;
                  return (
                    <div
                      key={plan.id}
                      className={`bg-white rounded-xl border-2 p-6 relative ${
                        plan.popular
                          ? 'border-blue-500'
                          : isCurrent
                          ? 'border-green-500'
                          : 'border-gray-200'
                      }`}
                    >
                      {plan.popular && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full">
                          Most Popular
                        </span>
                      )}
                      {isCurrent && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-green-600 text-white text-xs font-medium rounded-full">
                          Current Plan
                        </span>
                      )}

                      <div className="flex items-center gap-2 mb-2">
                        {plan.id !== 'free' && <Crown className="w-5 h-5 text-yellow-500" />}
                        <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                      </div>

                      <div className="mb-4">
                        <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                        <span className="text-gray-500 ml-1">/{plan.period}</span>
                      </div>

                      <ul className="space-y-2 mb-6">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                            <Check className="w-4 h-4 text-green-500" />
                            {feature}
                          </li>
                        ))}
                      </ul>

                      <button
                        disabled={isCurrent}
                        className={`w-full py-2 rounded-lg font-medium transition-colors ${
                          isCurrent
                            ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                            : plan.popular
                            ? 'btn-primary'
                            : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {isCurrent ? 'Current Plan' : 'Upgrade'}
                      </button>
                    </div>
                  );
                })}
              </div>

              <p className="text-sm text-gray-500 text-center">
                Payments are processed securely through RevenueCat. Cancel anytime.
              </p>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Notification Settings</h2>

              <div className="space-y-4">
                {[
                  { id: 'leads', label: 'New lead notifications', description: 'Get notified when someone fills out your contact form' },
                  { id: 'weekly', label: 'Weekly summary', description: 'Receive a weekly email with your card statistics' },
                  { id: 'tips', label: 'Tips & updates', description: 'Get product updates and tips to improve your card' },
                ].map((setting) => (
                  <div key={setting.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{setting.label}</p>
                      <p className="text-sm text-gray-600">{setting.description}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Security Settings</h2>

              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Change Password</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Update your password to keep your account secure
                  </p>
                  <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                    Change Password
                  </button>
                </div>

                <hr />

                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Two-Factor Authentication</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Add an extra layer of security to your account
                  </p>
                  <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                    Enable 2FA
                  </button>
                </div>

                <hr />

                <div>
                  <h3 className="font-medium text-red-600 mb-2">Danger Zone</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Permanently delete your account and all associated data
                  </p>
                  <button className="px-4 py-2 border border-red-300 rounded-lg text-red-600 hover:bg-red-50">
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
