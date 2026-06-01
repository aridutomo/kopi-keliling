import { useEffect, useState } from 'react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { Clock, ChevronDown, ChevronUp } from 'lucide-react'

const formatRp = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0)
const fmtDt = (d) => new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

const FLOW = ['pending', 'confirmed', 'ready', 'done']
const LABELS = { pending: 'Menunggu', confirmed: 'Dikonfirmasi', ready: 'Siap Ambil', done: 'Selesai', cancelled: 'Batal' }
const COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  ready: 'bg-purple-100 text-purple-700',
  done: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-400',
}

export default function PreOrders() {
  const [preorders, setPreorders] = useState([])
  const [filter, setFilter] = useState('pending')
  const [expanded, setExpanded] = useState(null)

  const load = () => {
    const params = filter !== 'all' ? { status: filter } : {}
    api.get('/admin/preorders', { params }).then(r => setPreorders(r.data || []))
  }
  useEffect(load, [filter])

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/admin/preorders/${id}/status`, { status })
      toast.success(`Status → ${LABELS[status]}`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal')
    }
  }

  const nextStatus = (current) => {
    const idx = FLOW.indexOf(current)
    return idx >= 0 && idx < FLOW.length - 1 ? FLOW[idx + 1] : null
  }

  const TABS = ['pending', 'confirmed', 'ready', 'done', 'cancelled', 'all']

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Pre-Order</h1>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setFilter(t)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === t ? 'bg-coffee-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-coffee-300'
            }`}>
            {t === 'all' ? 'Semua' : LABELS[t]}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {preorders.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Clock size={32} className="mx-auto mb-2" />
            <p className="text-sm">Tidak ada pre-order</p>
          </div>
        )}
        {preorders.map(po => (
          <div key={po.id} className="border-b last:border-0">
            <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50"
              onClick={() => setExpanded(expanded === po.id ? null : po.id)}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{po.order_number}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${COLORS[po.status]}`}>
                    {LABELS[po.status]}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {po.customer_name} · {po.customer_phone}
                </p>
                <div className="flex items-center gap-1 mt-0.5 text-xs text-coffee-600">
                  <Clock size={11} /> {fmtDt(po.pickup_time)} · {po.pickup_point}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold text-sm">{formatRp(po.total_amount)}</p>
                {expanded === po.id ? <ChevronUp size={14} className="ml-auto text-gray-400 mt-1" /> : <ChevronDown size={14} className="ml-auto text-gray-400 mt-1" />}
              </div>
            </div>

            {expanded === po.id && (
              <div className="px-4 pb-4 bg-gray-50 space-y-3">
                {/* Items */}
                <div className="space-y-1">
                  {po.items?.map(item => (
                    <div key={item.id} className="flex justify-between text-sm text-gray-600">
                      <span>{item.product?.name} × {item.quantity}</span>
                      <span>{formatRp(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                {po.notes && (
                  <p className="text-xs text-gray-500 italic bg-yellow-50 rounded-lg px-3 py-2">📝 {po.notes}</p>
                )}

                {/* Action buttons */}
                {po.status !== 'done' && po.status !== 'cancelled' && (
                  <div className="flex gap-2">
                    {nextStatus(po.status) && (
                      <button onClick={() => updateStatus(po.id, nextStatus(po.status))}
                        className="flex-1 bg-coffee-600 text-white py-2 rounded-lg text-xs font-medium hover:bg-coffee-700">
                        → {LABELS[nextStatus(po.status)]}
                      </button>
                    )}
                    <button onClick={() => updateStatus(po.id, 'cancelled')}
                      className="px-3 border border-red-200 text-red-500 py-2 rounded-lg text-xs hover:bg-red-50">
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
