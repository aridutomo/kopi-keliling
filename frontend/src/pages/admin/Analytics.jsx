import { useEffect, useState } from 'react'
import api from '../../api/axios'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { TrendingUp, ShoppingCart, Wallet, AlertTriangle, PiggyBank } from 'lucide-react'

const formatRp = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0)
const fmtRpShort = (n) => {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}rb`
  return formatRp(n)
}

export default function Analytics() {
  const [data, setData] = useState(null)
  const [days, setDays] = useState(7)

  useEffect(() => {
    api.get('/admin/analytics', { params: { days } }).then(r => setData(r.data))
  }, [days])

  if (!data) return <div className="text-center py-20 text-gray-400">Memuat analitik...</div>

  const { summary, daily_sales, top_products, low_stocks } = data

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">Analitik</h1>
        <div className="flex gap-2">
          {[7, 14, 30].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                days === d ? 'bg-coffee-600 text-white' : 'border border-gray-200 text-gray-600 hover:border-coffee-300'
              }`}>
              {d} hari
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard icon={<TrendingUp size={18} className="text-green-500" />} label="Total Pendapatan" value={formatRp(summary?.total_revenue)} bg="bg-green-50" />
        <SummaryCard icon={<Wallet size={18} className="text-red-500" />} label="Total Modal" value={formatRp(summary?.total_cost)} bg="bg-red-50" />
        <SummaryCard icon={<PiggyBank size={18} className="text-emerald-600" />} label="Laba Bersih" value={formatRp(summary?.total_profit)} sub={summary?.total_revenue > 0 ? `margin ${Math.round(summary?.margin_pct)}%` : null} bg="bg-emerald-50" />
        <SummaryCard icon={<ShoppingCart size={18} className="text-blue-500" />} label="Total Order" value={summary?.total_orders ?? 0} bg="bg-blue-50" />
      </div>

      {/* Revenue + profit chart */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800 text-sm">Pendapatan & Laba Harian</h2>
          <div className="flex items-center gap-3 text-[11px] text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#d97b22]" /> Pendapatan</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#059669]" /> Laba</span>
          </div>
        </div>
        {daily_sales?.length === 0
          ? <p className="text-center text-gray-400 py-8 text-sm">Belum ada data penjualan</p>
          : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={daily_sales} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtRpShort} width={55} />
                <Tooltip formatter={(v, n) => [formatRp(v), n === 'revenue' ? 'Pendapatan' : 'Laba']} labelFormatter={l => `Tanggal ${l}`} />
                <Line type="monotone" dataKey="revenue" stroke="#d97b22" strokeWidth={2.5} dot={{ r: 3, fill: '#d97b22' }} />
                <Line type="monotone" dataKey="profit" stroke="#059669" strokeWidth={2.5} dot={{ r: 3, fill: '#059669' }} />
              </LineChart>
            </ResponsiveContainer>
          )
        }
      </div>

      {/* Top products + Low stock */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Top products */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-semibold text-gray-800 mb-4 text-sm">Produk Terlaris</h2>
          {top_products?.length === 0
            ? <p className="text-center text-gray-400 py-6 text-sm">Belum ada data</p>
            : (
              <>
                <div className="space-y-2 mb-4">
                  {top_products?.map((p, i) => (
                    <div key={p.product_id} className="flex items-center gap-2">
                      <span className="w-5 text-xs font-bold text-gray-400">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.product_name}</p>
                        <p className="text-xs text-gray-400">
                          {p.total_sold} botol · {formatRp(p.revenue)}
                          <span className="text-green-600"> · untung {formatRp(p.profit)}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={top_products} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <XAxis dataKey="product_name" tick={{ fontSize: 10 }} tickFormatter={n => n.slice(0, 8) + (n.length > 8 ? '...' : '')} />
                    <YAxis hide />
                    <Tooltip formatter={(v, n) => [v, n === 'total_sold' ? 'Botol' : 'Revenue']} />
                    <Bar dataKey="total_sold" fill="#d97b22" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </>
            )
          }
        </div>

        {/* Low stock */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-semibold text-gray-800 mb-4 text-sm flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-500" /> Bahan Baku Menipis
          </h2>
          {low_stocks?.length === 0
            ? <p className="text-center text-gray-400 py-8 text-sm">✅ Semua stok bahan aman</p>
            : (
              <div className="space-y-2">
                {low_stocks?.map(s => (
                  <div key={s.id} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{s.name}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.stock < 100 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                      {s.stock} {s.unit}
                    </span>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ icon, label, value, sub, bg }) {
  return (
    <div className={`${bg} rounded-xl p-4`}>
      <div className="mb-1">{icon}</div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}
