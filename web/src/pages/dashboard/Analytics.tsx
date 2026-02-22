import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import {
  Eye,
  MousePointer,
  UserPlus,
  Share2,
  Loader2,
  Calendar,
  TrendingUp
} from 'lucide-react';

interface AnalyticsData {
  views: number;
  clicks: number;
  captures: number;
  shares: number;
  viewsByDay: { date: string; count: number }[];
  topCards: { cardId: string; cardName: string; views: number }[];
}

const PERIOD_OPTIONS = [
  { value: 7, label: 'Last 7 days' },
  { value: 14, label: 'Last 14 days' },
  { value: 30, label: 'Last 30 days' },
];

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(7);
  const { getIdToken } = useAuth();

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const token = await getIdToken();
      const startDate = format(subDays(new Date(), period), 'yyyy-MM-dd');

      const response = await api.get(`/analytics/aggregate?startDate=${startDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Process data for charts
      const rawData = response.data.data;

      // Fill in missing days with 0
      const days = eachDayOfInterval({
        start: subDays(new Date(), period - 1),
        end: new Date()
      });

      const viewsByDayMap = new Map(
        (rawData.viewsByDay || []).map((d: any) => [d.date, d.count])
      );

      const viewsByDay = days.map(date => ({
        date: format(date, 'MMM d'),
        count: (viewsByDayMap.get(format(date, 'yyyy-MM-dd')) as number) || 0
      }));

      setData({
        views: rawData.views || 0,
        clicks: rawData.clicks || 0,
        captures: rawData.captures || 0,
        shares: rawData.shares || 0,
        viewsByDay,
        topCards: rawData.topCards || []
      });
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      // Set empty data on error
      setData({
        views: 0,
        clicks: 0,
        captures: 0,
        shares: 0,
        viewsByDay: [],
        topCards: []
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const stats = [
    {
      label: 'Total Views',
      value: data?.views || 0,
      icon: Eye,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      label: 'Link Clicks',
      value: data?.clicks || 0,
      icon: MousePointer,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      label: 'Leads Captured',
      value: data?.captures || 0,
      icon: UserPlus,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      label: 'Shares',
      value: data?.shares || 0,
      icon: Share2,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">Track your card performance</p>
        </div>

        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
            className="input-field pl-10 pr-8 appearance-none"
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <TrendingUp className="w-4 h-4 text-gray-400" />
            </div>
            <p className="mt-4 text-2xl font-bold text-gray-900">
              {stat.value.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Views over time */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Views Over Time
          </h2>
          {data?.viewsByDay && data.viewsByDay.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.viewsByDay}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Views"
                    stroke="#2563eb"
                    fillOpacity={1}
                    fill="url(#colorViews)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No data available for this period
            </div>
          )}
        </div>

        {/* Top cards */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Top Performing Cards
          </h2>
          {data?.topCards && data.topCards.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.topCards} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="cardName"
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    tickLine={false}
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                  <Bar
                    dataKey="views"
                    name="Views"
                    fill="#7c3aed"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No card data available
            </div>
          )}
        </div>
      </div>

      {/* Quick insights */}
      <div className="mt-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Insights</h2>
        <ul className="space-y-2 text-gray-700">
          {data && data.views > 0 && (
            <>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                You've received {data.views} views in the last {period} days
              </li>
              {data.clicks > 0 && (
                <li className="flex items-start gap-2">
                  <span className="text-purple-600">•</span>
                  {((data.clicks / data.views) * 100).toFixed(1)}% of visitors clicked on your links
                </li>
              )}
              {data.captures > 0 && (
                <li className="flex items-start gap-2">
                  <span className="text-green-600">•</span>
                  You've captured {data.captures} leads ({((data.captures / data.views) * 100).toFixed(1)}% conversion)
                </li>
              )}
            </>
          )}
          {(!data || data.views === 0) && (
            <li className="flex items-start gap-2">
              <span className="text-gray-400">•</span>
              Share your card to start seeing analytics
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
