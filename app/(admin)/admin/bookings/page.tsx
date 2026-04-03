'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, DollarSign, CalendarDays, XCircle, ChevronUp, ChevronDown,
  ChevronsUpDown, Filter, X, ChevronRight, Loader2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Booking {
  id: string;
  listing_id: string;
  listing_name: string;
  listing_slug?: string;
  provider_name?: string;
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  check_in: string;
  check_out: string;
  guest_count: number;
  base_price_usd: number;
  nights: number;
  subtotal_usd: number;
  service_fee_usd: number;
  total_usd: number;
  commission_usd: number;
  net_provider_usd: number;
  status: string;
  payment_method: string;
  confirmation_code: string;
  special_requests?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface Stats {
  total: number;
  totalRevenue: number;
  totalCommission: number;
  totalNetProvider: number;
  cancellationRate: number;
  avgBookingValue: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  confirmed: { bg: '#ECFDF5', color: '#059669', label: 'Confirmed' },
  completed: { bg: '#EFF6FF', color: '#2563EB', label: 'Completed' },
  pending: { bg: '#FFFBEB', color: '#D97706', label: 'Pending' },
  cancelled: { bg: '#FEF2F2', color: '#DC2626', label: 'Cancelled' },
  payment_submitted: { bg: '#F5F3FF', color: '#7C3AED', label: 'Payment Submitted' },
};

const PM_LABELS: Record<string, string> = {
  card: 'Card',
  zelle: 'Zelle',
  usdt: 'USDT',
  arrival: 'Pay on Arrival',
};

function fmt(val: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

type SortKey = 'created_at' | 'check_in' | 'total_usd' | 'commission_usd' | 'status';

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className="rounded-lg p-2" style={{ background: `${color}20` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Table
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  async function fetchBookings() {
    const params = new URLSearchParams();
    if (filterStatus) params.set('status', filterStatus);
    if (filterPayment) params.set('payment_method', filterPayment);
    if (filterDateFrom) params.set('date_from', filterDateFrom);
    if (filterDateTo) params.set('date_to', filterDateTo);
    const res = await fetch(`/api/admin/bookings?${params}`);
    const data = await res.json();
    setBookings(data.bookings ?? []);
    setStats(data.stats ?? null);
    setLoading(false);
  }

  useEffect(() => {
    fetchBookings();
  }, [filterStatus, filterPayment, filterDateFrom, filterDateTo]);

  // Sort
  const sorted = useMemo(() => {
    const copy = [...bookings];
    copy.sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [bookings, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  // This-month stats
  const thisMonth = useMemo(() => {
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const mb = bookings.filter((b) => b.created_at.startsWith(monthStr));
    return {
      count: mb.length,
      revenue: mb.reduce((s, b) => s + b.total_usd, 0),
      commission: mb.reduce((s, b) => s + b.commission_usd, 0),
      netProvider: mb.reduce((s, b) => s + b.net_provider_usd, 0),
    };
  }, [bookings]);

  // Daily chart data — last 30 days
  const chartData = useMemo(() => {
    const days: Record<string, { date: string; bookings: number; revenue: number }> = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days[key] = {
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        bookings: 0,
        revenue: 0,
      };
    }
    bookings.forEach((b) => {
      const key = b.created_at.slice(0, 10);
      if (days[key]) {
        days[key]!.bookings++;
        days[key]!.revenue += b.total_usd;
      }
    });
    return Object.values(days);
  }, [bookings]);

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3.5 h-3.5 text-blue-500" />
      : <ChevronDown className="w-3.5 h-3.5 text-blue-500" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const hasFilters = filterStatus || filterPayment || filterDateFrom || filterDateTo;

  return (
    <div className="p-6 space-y-6 min-h-full" style={{ background: '#F3F4F6' }}>
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Bookings Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">{bookings.length} bookings</p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50"
        >
          <Filter className="w-4 h-4" />
          Filters
          {hasFilters && <span className="w-2 h-2 rounded-full bg-blue-500" />}
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-xl p-4 border border-gray-100 flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 outline-none bg-white"
            >
              <option value="">All statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Payment</label>
            <select
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 outline-none bg-white"
            >
              <option value="">All methods</option>
              <option value="card">Card</option>
              <option value="zelle">Zelle</option>
              <option value="usdt">USDT</option>
              <option value="arrival">Pay on Arrival</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">From</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 outline-none bg-white"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">To</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 outline-none bg-white"
            />
          </div>
          {hasFilters && (
            <button
              onClick={() => { setFilterStatus(''); setFilterPayment(''); setFilterDateFrom(''); setFilterDateTo(''); }}
              className="text-sm text-red-500 hover:underline pb-1.5"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Total Bookings"
          value={String(stats?.total ?? 0)}
          sub="All time"
          icon={CalendarDays}
          color="#3B82F6"
        />
        <StatCard
          label="This Month"
          value={String(thisMonth.count)}
          sub={`${fmtDate(new Date().toISOString().slice(0,8)+'01')} – today`}
          icon={TrendingUp}
          color="#8B5CF6"
        />
        <StatCard
          label="Revenue (Month)"
          value={fmt(thisMonth.revenue)}
          sub={`Commission: ${fmt(thisMonth.commission)}`}
          icon={DollarSign}
          color="#059669"
        />
        <StatCard
          label="Avg Booking Value"
          value={fmt(stats?.avgBookingValue ?? 0)}
          sub="All bookings"
          icon={DollarSign}
          color="#D97706"
        />
        <StatCard
          label="Cancellation Rate"
          value={`${(stats?.cancellationRate ?? 0).toFixed(1)}%`}
          sub={`Net to providers: ${fmt(thisMonth.netProvider)}`}
          icon={XCircle}
          color="#DC2626"
        />
      </div>

      {/* Revenue chart */}
      <div className="bg-white rounded-xl p-5 border border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Daily Bookings — Last 30 Days</h2>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#9CA3AF' }}
              tickLine={false}
              axisLine={false}
              interval={4}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#9CA3AF' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}
              formatter={(val) => [val ?? 0, 'Bookings']}
            />
            <Bar dataKey="bookings" fill="#3B82F6" radius={[3, 3, 0, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Bookings table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                {([
                  ['Date', 'created_at'],
                  ['Guest', null],
                  ['Listing', null],
                  ['Check-in', 'check_in'],
                  ['Check-out', null],
                  ['Amount', 'total_usd'],
                  ['Commission', 'commission_usd'],
                  ['Status', 'status'],
                  ['Payment', null],
                ] as [string, SortKey | null][]).map(([label, key]) => (
                  <th
                    key={label}
                    onClick={() => key && toggleSort(key)}
                    className={`px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap ${key ? 'cursor-pointer hover:text-gray-700' : ''}`}
                  >
                    <span className="flex items-center gap-1">
                      {label}
                      {key && <SortIcon k={key} />}
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3 w-8" />
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-gray-400 text-sm">
                    No bookings found
                  </td>
                </tr>
              )}
              {sorted.map((b) => {
                const statusStyle = STATUS_STYLES[b.status] ?? STATUS_STYLES.pending!;
                const isExpanded = expandedRow === b.id;
                return (
                  <>
                    <tr
                      key={b.id}
                      className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setExpandedRow(isExpanded ? null : b.id)}
                    >
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {fmtDate(b.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{b.guest_name}</div>
                        <div className="text-xs text-gray-400">{b.guest_email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-800 max-w-[160px] truncate">{b.listing_name}</div>
                        {b.provider_name && (
                          <div className="text-xs text-gray-400 truncate">{b.provider_name}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(b.check_in)}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(b.check_out)}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                        {fmt(b.total_usd)}
                      </td>
                      <td className="px-4 py-3 text-green-700 whitespace-nowrap">
                        {fmt(b.commission_usd)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
                          style={{ background: statusStyle.bg, color: statusStyle.color }}
                        >
                          {statusStyle.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {PM_LABELS[b.payment_method] ?? b.payment_method}
                      </td>
                      <td className="px-4 py-3">
                        <ChevronRight
                          className="w-4 h-4 text-gray-300 transition-transform"
                          style={{ transform: isExpanded ? 'rotate(90deg)' : 'none' }}
                        />
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${b.id}-exp`} style={{ background: '#FAFAFA' }}>
                        <td colSpan={10} className="px-6 py-4">
                          <div className="grid grid-cols-3 gap-6 text-sm">
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-2">GUEST INFO</p>
                              <p className="font-medium">{b.guest_name}</p>
                              <p className="text-gray-500">{b.guest_email}</p>
                              {b.guest_phone && <p className="text-gray-500">{b.guest_phone}</p>}
                              <p className="text-gray-500 mt-1">{b.guest_count} guest{b.guest_count !== 1 ? 's' : ''}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-2">PAYMENT BREAKDOWN</p>
                              <div className="space-y-1 text-gray-600">
                                <div className="flex justify-between">
                                  <span>{b.nights}n × {fmt(b.base_price_usd)}</span>
                                  <span>{fmt(b.subtotal_usd)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Service fee</span>
                                  <span>{fmt(b.service_fee_usd)}</span>
                                </div>
                                <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-200">
                                  <span>Total</span>
                                  <span>{fmt(b.total_usd)}</span>
                                </div>
                                <div className="flex justify-between text-green-600">
                                  <span>Commission (platform)</span>
                                  <span>{fmt(b.commission_usd)}</span>
                                </div>
                                <div className="flex justify-between text-blue-600">
                                  <span>Net to provider</span>
                                  <span>{fmt(b.net_provider_usd)}</span>
                                </div>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-2">BOOKING DETAILS</p>
                              <div className="space-y-1 text-gray-600">
                                <p><span className="font-medium text-gray-700">Code: </span>{b.confirmation_code}</p>
                                <p><span className="font-medium text-gray-700">Payment: </span>{PM_LABELS[b.payment_method] ?? b.payment_method}</p>
                                <p><span className="font-medium text-gray-700">Booked: </span>{new Date(b.created_at).toLocaleString()}</p>
                                {b.special_requests && (
                                  <p><span className="font-medium text-gray-700">Requests: </span>{b.special_requests}</p>
                                )}
                                {b.notes && (
                                  <p><span className="font-medium text-gray-700">Notes: </span>{b.notes}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
        {sorted.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
            Showing {sorted.length} booking{sorted.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}
