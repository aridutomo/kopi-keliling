import { useEffect, useState } from 'react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { Search } from 'lucide-react'

const formatRp = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0)
const fmtTime = (d) => new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

const STATUS_LABELS = { pending: 'Menunggu', paid: 'Lunas', cancelled: 'Batal' }
const STATUS_COLOR = {
  pending: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [expanded, setExpanded] = useState(null)

  const load = () => {
    api.get('/admin/orders', { params: { date } }).then(r => setOrders(r.data || []))
  }
  useEffect(load, [date])

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/admin/orders/${id}/status`, { status })
      toast.success('Status diperbarui')
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal')
    }
  }

  const todayRevenue = orders.filter(o => o.status === 'paid').reduce((s, o) => s + o.total_amount, 0)
  const todayCount = orders.filter(o => o.status === 'paid').length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">Riwayat Order</h1>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400" />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 rounded-xl p-4">
          <p className="text-xs text-gray-500">Pendapatan</p>
          <p className="text-xl font-bold text-green-700">{formatRp(todayRevenue)}</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4">
          <p className="text-xs text-gray-500">Order Lunas</p>
          <p className="text-xl font-bold text-blue-700">{todayCount}</p>
        </div>
      </div>

      {/* Order list */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {orders.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Search size={32} className="mx-auto mb-2" />
            <p>Tidak ada order pada tanggal ini</p>
          </div>
        )}
        {orders.map(o => (
          <div key={o.id} className="border-b last:border-0">
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50"
              onClick={() => setExpanded(expanded === o.id ? null : o.id)}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{o.order_number}</p>
                <p className="text-xs text-gray-400">{o.customer_name || 'Tanpa nama'} · {fmtTime(o.created_at)} · {o.payment_method?.toUpperCase()}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold text-sm">{formatRp(o.total_amount)}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[o.status]}`}>
                  {STATUS_LABELS[o.status] || o.status}
                </span>
              </div>
            </div>

            {expanded === o.id && (
              <div className="px-4 pb-4 bg-gray-50">
                {/* Items */}
                <div className="space-y-1 mb-3">
                  {o.items?.map(item => (
                    <div key={item.id} className="flex justify-between text-sm text-gray-600">
                      <span>{item.product?.name} × {item.quantity}</span>
                      <span>{formatRp(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                {/* Status actions */}
                {o.status === 'pending' && (
                  <div className="flex gap-2">
                    <button onClick={() => updateStatus(o.id, 'paid')}
                      className="flex-1 bg-green-600 text-white py-1.5 rounded-lg text-xs font-medium hover:bg-green-700">
                      ✓ Tandai Lunas
                    </button>
                    <button onClick={() => updateStatus(o.id, 'cancelled')}
                      className="flex-1 border border-red-200 text-red-500 py-1.5 rounded-lg text-xs font-medium hover:bg-red-50">
                      Batalkan
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
