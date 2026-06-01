import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { ArrowLeft, Plus, Minus, CheckCircle } from 'lucide-react'

const formatRp = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

export default function PreOrderForm() {
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState({}) // { productId: qty }
  const [form, setForm] = useState({ customer_name: '', customer_phone: '', pickup_point: '', pickup_time: '', notes: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    api.get('/menu').then(r => setProducts(r.data || []))
  }, [])

  const updateCart = (id, delta) => {
    setCart(c => {
      const next = (c[id] || 0) + delta
      if (next <= 0) { const { [id]: _, ...rest } = c; return rest }
      return { ...c, [id]: next }
    })
  }

  const cartItems = Object.entries(cart).map(([id, qty]) => {
    const p = products.find(pr => pr.id === Number(id))
    return p ? { ...p, qty } : null
  }).filter(Boolean)

  const total = cartItems.reduce((s, i) => s + i.price * i.qty, 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (cartItems.length === 0) { toast.error('Pilih produk dulu!'); return }
    setLoading(true)
    try {
      const res = await api.post('/preorders', {
        ...form,
        items: cartItems.map(i => ({ product_id: i.id, quantity: i.qty }))
      })
      setSuccess(res.data)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal membuat pre-order')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-coffee-950 flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl p-6 text-center shadow-2xl">
          <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900">Pre-Order Masuk! 🎉</h2>
          <p className="text-gray-500 text-sm mt-2">Nomor order kamu:</p>
          <p className="text-lg font-mono font-bold text-coffee-700 mt-1">{success.order_number}</p>
          <div className="mt-4 bg-coffee-50 rounded-xl p-4 text-left text-sm space-y-1">
            <p><span className="text-gray-500">Total:</span> <strong>{formatRp(success.total_amount)}</strong></p>
            <p><span className="text-gray-500">Ambil di:</span> <strong>{success.pickup_point}</strong></p>
            <p><span className="text-gray-500">Waktu:</span> <strong>{new Date(success.pickup_time).toLocaleString('id-ID')}</strong></p>
          </div>
          <p className="text-xs text-gray-400 mt-4">Kami akan konfirmasi via WhatsApp. Bayar di tempat saat ambil ya!</p>
          <Link to="/" className="mt-4 block text-coffee-600 text-sm font-medium hover:underline">
            ← Kembali ke Menu
          </Link>
        </div>
      </div>
    )
  }

  // Minimum pickup time = now + 30 min
  const minPickup = new Date(Date.now() + 30 * 60 * 1000)
    .toISOString().slice(0, 16)

  return (
    <div className="min-h-screen bg-coffee-950">
      <div className="max-w-lg mx-auto px-4 py-5">
        <Link to="/" className="inline-flex items-center gap-2 text-coffee-300 text-sm mb-4">
          <ArrowLeft size={16} /> Menu
        </Link>

        <h1 className="text-white text-xl font-bold mb-1">Pre-Order ☕</h1>
        <p className="text-coffee-400 text-sm mb-5">Pesan dulu, ambil sesuai jadwal kamu.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product selector */}
          <div className="bg-white rounded-2xl p-4">
            <h2 className="font-semibold text-gray-800 mb-3 text-sm">Pilih Menu</h2>
            <div className="space-y-2">
              {products.map(p => (
                <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl border ${p.stock_count === 0 ? 'opacity-40' : 'border-gray-100'}`}>
                  <div>
                    <p className="font-medium text-sm">{p.name}</p>
                    <p className="text-xs text-coffee-600">{formatRp(p.price)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.stock_count === 0 ? (
                      <span className="text-xs text-red-400">Habis</span>
                    ) : (
                      <>
                        <button type="button" onClick={() => updateCart(p.id, -1)}
                          className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
                          <Minus size={14} />
                        </button>
                        <span className="w-5 text-center text-sm font-medium">{cart[p.id] || 0}</span>
                        <button type="button" onClick={() => updateCart(p.id, 1)}
                          className="w-7 h-7 rounded-full bg-coffee-600 flex items-center justify-center text-white hover:bg-coffee-700">
                          <Plus size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {cartItems.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex justify-between text-sm font-semibold">
                  <span>Total</span>
                  <span className="text-coffee-700">{formatRp(total)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Customer info */}
          <div className="bg-white rounded-2xl p-4 space-y-3">
            <h2 className="font-semibold text-gray-800 text-sm">Data Pemesan</h2>

            {[
              { name: 'customer_name', label: 'Nama', placeholder: 'Nama kamu', type: 'text' },
              { name: 'customer_phone', label: 'No. WhatsApp', placeholder: '08xxxx', type: 'tel' },
              { name: 'pickup_point', label: 'Titik Ambil', placeholder: 'Contoh: Depan Toko ABC', type: 'text' },
            ].map(f => (
              <div key={f.name}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                <input
                  type={f.type}
                  placeholder={f.placeholder}
                  required
                  value={form[f.name]}
                  onChange={e => setForm(v => ({ ...v, [f.name]: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
                />
              </div>
            ))}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Waktu Ambil</label>
              <input
                type="datetime-local"
                required
                min={minPickup}
                value={form.pickup_time}
                onChange={e => setForm(v => ({ ...v, pickup_time: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Catatan (opsional)</label>
              <textarea
                rows={2}
                placeholder="Permintaan khusus..."
                value={form.notes}
                onChange={e => setForm(v => ({ ...v, notes: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400 resize-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || cartItems.length === 0}
            className="w-full bg-coffee-600 hover:bg-coffee-700 text-white font-semibold py-3.5 rounded-2xl transition-colors disabled:opacity-50"
          >
            {loading ? 'Memproses...' : `🛒 Kirim Pre-Order · ${formatRp(total)}`}
          </button>

          <p className="text-xs text-coffee-500 text-center">
            Pembayaran dilakukan saat ambil. Kami akan konfirmasi via WhatsApp.
          </p>
        </form>
      </div>
    </div>
  )
}
