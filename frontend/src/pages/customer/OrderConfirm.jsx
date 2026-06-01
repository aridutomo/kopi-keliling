import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import api from '../../api/axios'
import { ArrowLeft, CheckCircle, Clock, XCircle, Coffee } from 'lucide-react'

const formatRp = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0)

const STATUS = {
  pending: { label: 'Menunggu pembayaran di kasir', color: 'text-amber-700 bg-amber-50 ring-amber-200', icon: Clock },
  paid: { label: 'Lunas — terima kasih!', color: 'text-green-700 bg-green-50 ring-green-200', icon: CheckCircle },
  cancelled: { label: 'Dibatalkan', color: 'text-red-600 bg-red-50 ring-red-200', icon: XCircle },
}

export default function OrderConfirm() {
  const { number } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = () => api.get(`/orders/${number}`)
    .then(r => setOrder(r.data))
    .catch(() => setOrder(null))
    .finally(() => setLoading(false))

  useEffect(() => {
    load()
    const t = setInterval(load, 5000) // poll status → auto jadi "Lunas" saat kasir konfirmasi
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [number])

  if (loading) return (
    <div className="min-h-screen bg-coffee-950 flex items-center justify-center text-coffee-400">
      <Coffee size={32} className="animate-pulse" />
    </div>
  )

  if (!order) return (
    <div className="min-h-screen bg-coffee-950 flex flex-col items-center justify-center text-coffee-400 gap-3 px-4 text-center">
      <Coffee size={40} />
      <p>Order tidak ditemukan</p>
      <Link to="/" className="text-coffee-300 underline text-sm">Kembali ke menu</Link>
    </div>
  )

  const st = STATUS[order.status] || STATUS.pending
  const StIcon = st.icon
  const paid = order.status === 'paid'

  return (
    <div className="min-h-screen bg-[#faf6f0]">
      {/* Hero */}
      <div className="bg-gradient-to-br from-coffee-700 via-coffee-800 to-coffee-950 text-white">
        <div className="max-w-lg mx-auto px-4 pt-5 pb-10">
          <Link to="/" aria-label="Kembali ke menu" className="inline-flex items-center gap-2 text-coffee-200 text-sm">
            <ArrowLeft size={16} /> Menu
          </Link>
          <div className="text-center mt-4">
            <p className="text-coffee-300 text-xs uppercase tracking-widest">Nomor Order</p>
            <h1 className="text-2xl font-extrabold tracking-tight mt-1">{order.order_number}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-6 pb-10 space-y-4">
        {/* QR card */}
        <div className="bg-white rounded-3xl p-6 text-center shadow-xl ring-1 ring-black/5">
          <div className="flex justify-center mb-4">
            <div className={`bg-white p-4 rounded-2xl border-2 border-gray-100 ${paid ? 'opacity-40' : ''}`}>
              <QRCodeSVG value={order.order_number} size={184} level="M" />
            </div>
          </div>

          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ring-1 ${st.color}`}>
            <StIcon size={15} /> {st.label}
          </div>

          {!paid && (
            <p className="text-sm text-gray-500 mt-4 leading-relaxed">
              Tunjukkan QR / nomor order ini ke kasir untuk membayar.
            </p>
          )}
        </div>

        {/* Ringkasan */}
        <div className="bg-white rounded-2xl p-4 ring-1 ring-black/5">
          <h2 className="font-bold text-gray-900 text-sm mb-3">Ringkasan Pesanan</h2>
          <div className="space-y-2">
            {order.items?.map(it => (
              <div key={it.id} className="flex justify-between text-sm">
                <span className="text-gray-600">{it.product?.name} × {it.quantity}</span>
                <span className="text-gray-800 tabular-nums">{formatRp(it.price * it.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between font-bold mt-3 pt-3 border-t border-gray-100">
            <span>Total</span>
            <span className="text-coffee-700 tabular-nums">{formatRp(order.total_amount)}</span>
          </div>
        </div>

        {paid && (
          <div className="bg-green-50 ring-1 ring-green-200 rounded-2xl p-4 text-center text-green-700 text-sm font-medium">
            Pembayaran diterima. Silakan ambil pesananmu — terima kasih! ☕
          </div>
        )}
      </div>
    </div>
  )
}
