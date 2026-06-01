import { useEffect, useState } from 'react'
import api from '../../api/axios'
import { ShoppingCart, TrendingUp, Clock, AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'

const formatRp = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0)

const statusColor = { pending: 'bg-yellow-100 text-yellow-700', paid: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700' }

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/dashboard').then(r => setData(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center py-20 text-gray-400">Memuat...</div>

  const { today, pending_preorders, expiring_batches, recent_orders } = data || {}

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<TrendingUp size={20} className="text-green-500" />} label="Pendapatan Hari Ini" value={formatRp(today?.revenue)} bg="bg-green-50" />
        <StatCard icon={<ShoppingCart size={20} className="text-blue-500" />} label="Order Hari Ini" value={today?.orders ?? 0} bg="bg-blue-50" />
        <StatCard icon={<Clock size={20} className="text-orange-500" />} label="Pre-Order Aktif" value={pending_preorders ?? 0} bg="bg-orange-50" />
        <StatCard icon={<AlertTriangle size={20} className="text-red-500" />} label="Stok Mau Expire" value={(expiring_batches || []).length} bg="bg-red-50" />
      </div>

      {/* Expiring stock warning */}
      {expiring_batches?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-700 font-medium mb-2">
            <AlertTriangle size={16} /> Peringatan Stok Hampir Expire
          </div>
          <div className="space-y-1">
            {expiring_batches.map(b => (
              <div key={b.id} className="flex justify-between text-sm text-amber-800">
                <span>{b.product?.name}</span>
                <span>{b.remaining} botol · exp {new Date(b.expires_at).toLocaleDateString('id-ID')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent orders */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Order Terbaru</h2>
          <Link to="/admin/orders" className="text-sm text-coffee-600 hover:underline">Lihat semua</Link>
        </div>
        {recent_orders?.length === 0 && (
          <p className="text-center text-gray-400 py-8 text-sm">Belum ada order hari ini</p>
        )}
        {recent_orders?.map(o => (
          <div key={o.id} className="px-4 py-3 border-b last:border-0 flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{o.order_number}</p>
              <p className="text-xs text-gray-400">{o.customer_name || 'Tanpa nama'} · {o.payment_method?.toUpperCase()}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-sm">{formatRp(o.total_amount)}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[o.status]}`}>{o.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, bg }) {
  return (
    <div className={`${bg} rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-2">{icon}</div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}
