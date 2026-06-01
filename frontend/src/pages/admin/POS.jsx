import { useEffect, useState } from 'react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { Plus, Minus, Trash2, CheckCircle, ShoppingCart, Search, QrCode, X, Camera } from 'lucide-react'
import QrScanner from '../../components/QrScanner'

const formatRp = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

export default function POS() {
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState([])
  const [customerName, setCustomerName] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [loading, setLoading] = useState(false)
  const [lastOrder, setLastOrder] = useState(null)

  // Tarik order pelanggan (self-order via QR)
  const [lookupCode, setLookupCode] = useState('')
  const [pulled, setPulled] = useState(null)
  const [showQris, setShowQris] = useState(false)
  const [paying, setPaying] = useState(false)
  const [scanning, setScanning] = useState(false)

  const pullOrder = async (codeArg) => {
    const code = (codeArg ?? lookupCode).trim()
    if (!code) return
    try {
      const { data } = await api.get(`/admin/orders/by-number/${encodeURIComponent(code)}`)
      setPulled(data); setShowQris(false)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Order tidak ditemukan')
      setPulled(null)
    }
  }

  const handleScanResult = (text) => {
    setScanning(false)
    const code = (text || '').trim()
    setLookupCode(code)
    pullOrder(code)
  }

  const confirmPay = async (method) => {
    if (!pulled) return
    if (method === 'qris' && !showQris) { setShowQris(true); return }
    setPaying(true)
    try {
      await api.patch(`/admin/orders/${pulled.id}/status`, { status: 'paid', payment_method: method })
      toast.success(`Order ${pulled.order_number} lunas (${method.toUpperCase()})`)
      setPulled(null); setLookupCode(''); setShowQris(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal konfirmasi pembayaran')
    } finally { setPaying(false) }
  }

  const cancelPulled = async () => {
    if (!pulled) return
    if (!confirm(`Batalkan order ${pulled.order_number}? Stok akan dikembalikan.`)) return
    try {
      await api.patch(`/admin/orders/${pulled.id}/status`, { status: 'cancelled' })
      toast.success('Order dibatalkan, stok dikembalikan')
      setPulled(null); setLookupCode(''); setShowQris(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal membatalkan')
    }
  }

  const load = () => api.get('/menu')
    .then(r => setProducts(Array.isArray(r.data) ? r.data : []))
    .catch(() => setProducts([]))
  useEffect(() => { load() }, [])

  const stockOf = (id) => products.find(p => p.id === id)?.stock_count ?? 0

  const addToCart = (product) => {
    if (product.stock_count <= 0) { toast.error(`${product.name} sedang habis`); return }
    setCart(c => {
      const exist = c.find(i => i.id === product.id)
      if (exist) {
        if (exist.qty >= product.stock_count) {
          toast.error(`Stok ${product.name} hanya ${product.stock_count} botol`)
          return c
        }
        return c.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      }
      return [...c, { ...product, qty: 1 }]
    })
  }

  const updateQty = (id, delta) => {
    setCart(c => c.map(i => {
      if (i.id !== id) return i
      const next = i.qty + delta
      if (delta > 0 && next > stockOf(id)) {
        toast.error(`Stok hanya ${stockOf(id)} botol`)
        return i
      }
      return { ...i, qty: next }
    }).filter(i => i.qty > 0))
  }

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0)

  const handleCheckout = async () => {
    if (cart.length === 0) { toast.error('Keranjang kosong!'); return }
    setLoading(true)
    try {
      const res = await api.post('/admin/orders', {
        customer_name: customerName,
        payment_method: paymentMethod,
        items: cart.map(i => ({ product_id: i.id, quantity: i.qty }))
      })
      setLastOrder(res.data)
      setCart([])
      setCustomerName('')
      toast.success(`Order ${res.data.order_number} berhasil!`)
      load() // refresh stok botol setelah terjual
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal membuat order')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Kasir (POS)</h1>

      {/* Tarik order pelanggan via kode/QR */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <QrCode size={18} className="text-coffee-600" />
          <h2 className="font-semibold text-gray-800 text-sm">Tarik Order Pelanggan</h2>
        </div>
        <div className="flex gap-2">
          <input
            value={lookupCode}
            onChange={e => setLookupCode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && pullOrder()}
            placeholder="Masukkan / scan nomor order (ORD-…)"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
          />
          <button onClick={() => setScanning(true)} className="flex items-center gap-1.5 border border-coffee-300 text-coffee-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-coffee-50">
            <Camera size={15} /> Scan
          </button>
          <button onClick={() => pullOrder()} className="flex items-center gap-1.5 bg-coffee-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-coffee-700">
            <Search size={15} /> Tarik
          </button>
        </div>

        {pulled && (
          <div className="mt-4 border border-gray-100 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-gray-900">{pulled.order_number}</p>
                {pulled.customer_name && <p className="text-xs text-gray-400">{pulled.customer_name}</p>}
              </div>
              <button onClick={() => { setPulled(null); setShowQris(false) }} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            <div className="space-y-1.5 my-3">
              {pulled.items?.map(it => (
                <div key={it.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">{it.product?.name} × {it.quantity}</span>
                  <span className="text-gray-800">{formatRp(it.price * it.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-bold border-t pt-2">
              <span>Total</span>
              <span className="text-coffee-700">{formatRp(pulled.total_amount)}</span>
            </div>

            {pulled.status === 'paid' ? (
              <div className="mt-3 flex items-center gap-2 text-green-600 text-sm font-medium">
                <CheckCircle size={16} /> Sudah lunas ({pulled.payment_method?.toUpperCase()})
              </div>
            ) : pulled.status === 'cancelled' ? (
              <div className="mt-3 text-red-500 text-sm font-medium">Order dibatalkan</div>
            ) : showQris ? (
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600 mb-2">Scan QRIS, lalu masukkan nominal:</p>
                <p className="text-2xl font-bold text-coffee-700 mb-3">{formatRp(pulled.total_amount)}</p>
                <img src="/qris.jpeg" alt="QRIS Anaki Coffee"
                  className="mx-auto w-full max-w-[18rem] h-auto object-contain border rounded-xl bg-white"
                  onError={e => { e.currentTarget.style.display = 'none' }} />
                <p className="text-[11px] text-gray-400 mt-2">Pelanggan scan QRIS lalu input nominal di atas</p>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setShowQris(false)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm">Kembali</button>
                  <button onClick={() => confirmPay('qris')} disabled={paying} className="flex-1 bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                    {paying ? '...' : '✓ Konfirmasi Lunas'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-xs text-gray-500 mb-2">Pilih metode pembayaran:</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => confirmPay('cash')} disabled={paying}
                    className="py-2.5 rounded-lg text-sm font-medium border border-gray-200 hover:border-coffee-300 disabled:opacity-50">
                    💵 Cash (Lunas)
                  </button>
                  <button onClick={() => confirmPay('qris')} disabled={paying}
                    className="py-2.5 rounded-lg text-sm font-medium border border-gray-200 hover:border-coffee-300 disabled:opacity-50">
                    📱 QRIS
                  </button>
                </div>
                <button onClick={cancelPulled} className="w-full mt-2 text-xs text-red-500 hover:underline py-1">
                  Batalkan order ini
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {scanning && <QrScanner onResult={handleScanResult} onClose={() => setScanning(false)} />}

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Product grid */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {products.map(p => {
              const habis = p.stock_count <= 0
              return (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  disabled={habis}
                  className={`bg-white rounded-xl p-4 text-left shadow-sm transition-all ${
                    habis
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:shadow-md hover:ring-2 hover:ring-coffee-400 active:scale-95'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-gray-900 text-sm leading-tight">{p.name}</p>
                    {habis
                      ? <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium shrink-0">Habis</span>
                      : <span className="text-xs bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full font-medium shrink-0">{p.stock_count}</span>}
                  </div>
                  {p.flavor_notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{p.flavor_notes}</p>}
                  <p className="text-coffee-700 font-bold mt-2 text-sm">{formatRp(p.price)}</p>
                </button>
              )
            })}
            {products.length === 0 && (
              <div className="col-span-3 text-center py-12 text-gray-400">
                Belum ada produk aktif
              </div>
            )}
          </div>
        </div>

        {/* Cart */}
        <div className="bg-white rounded-xl shadow-sm flex flex-col">
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <ShoppingCart size={18} className="text-coffee-600" />
            <h2 className="font-semibold text-gray-800">Keranjang</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-64 lg:max-h-80">
            {cart.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-8">Klik produk untuk tambah</p>
            )}
            {cart.map(item => (
              <div key={item.id} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-gray-400">{formatRp(item.price)}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded-full border flex items-center justify-center text-gray-500 hover:bg-gray-50">
                    {item.qty === 1 ? <Trash2 size={11} /> : <Minus size={11} />}
                  </button>
                  <span className="w-5 text-center text-sm">{item.qty}</span>
                  <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 rounded-full bg-coffee-600 flex items-center justify-center text-white hover:bg-coffee-700">
                    <Plus size={11} />
                  </button>
                </div>
                <span className="text-xs font-medium text-gray-700 w-16 text-right">{formatRp(item.price * item.qty)}</span>
              </div>
            ))}
          </div>

          <div className="p-4 border-t space-y-3">
            <input
              type="text"
              placeholder="Nama pelanggan (opsional)"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400"
            />

            <div className="grid grid-cols-2 gap-2">
              {['cash', 'qris'].map(m => (
                <button
                  key={m}
                  onClick={() => setPaymentMethod(m)}
                  className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                    paymentMethod === m
                      ? 'bg-coffee-600 text-white border-coffee-600'
                      : 'border-gray-200 text-gray-600 hover:border-coffee-300'
                  }`}
                >
                  {m === 'cash' ? '💵 Cash' : '📱 QRIS'}
                </button>
              ))}
            </div>

            <div className="flex justify-between items-center font-bold">
              <span>Total</span>
              <span className="text-coffee-700 text-lg">{formatRp(total)}</span>
            </div>

            <button
              onClick={handleCheckout}
              disabled={loading || cart.length === 0}
              className="w-full bg-coffee-600 hover:bg-coffee-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              {loading ? 'Memproses...' : '✓ Bayar'}
            </button>
          </div>
        </div>
      </div>

      {/* Last order receipt */}
      {lastOrder && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
            <CheckCircle size={18} /> Order Berhasil!
          </div>
          <p className="text-sm"><strong>{lastOrder.order_number}</strong> · {formatRp(lastOrder.total_amount)} · {lastOrder.payment_method?.toUpperCase()} · Status: <strong>{lastOrder.status}</strong></p>
        </div>
      )}
    </div>
  )
}
