import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import { ArrowLeft, Coffee, Droplets, Leaf, Minus, Plus } from 'lucide-react'

const formatRp = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [qty, setQty] = useState(1)
  const [ordering, setOrdering] = useState(false)

  useEffect(() => {
    api.get(`/menu/${id}`).then(r => setProduct(r.data)).finally(() => setLoading(false))
  }, [id])

  const handleOrder = async () => {
    if (qty < 1) return
    setOrdering(true)
    try {
      const { data } = await api.post('/orders', {
        items: [{ product_id: Number(id), quantity: qty }],
      })
      navigate(`/order/${data.order_number}`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal membuat order')
    } finally {
      setOrdering(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-coffee-950 flex items-center justify-center text-coffee-400">
      <Coffee size={32} className="animate-pulse" />
    </div>
  )

  if (!product) return (
    <div className="min-h-screen bg-coffee-950 flex flex-col items-center justify-center text-coffee-400 gap-3">
      <Coffee size={40} />
      <p>Produk tidak ditemukan</p>
      <Link to="/" className="text-coffee-300 underline text-sm">Kembali ke menu</Link>
    </div>
  )

  const inStock = product.stock_count > 0

  return (
    <div className="min-h-screen bg-[#faf6f0]">
      <div className="max-w-lg mx-auto pb-28">
        {/* Hero */}
        <div className="relative h-64 bg-gradient-to-br from-coffee-700 via-coffee-800 to-coffee-950 overflow-hidden">
          {product.image_url && (
            <img src={product.image_url} alt={product.name} className="absolute inset-0 w-full h-full object-cover" />
          )}
          {!product.image_url && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Coffee size={76} className="text-coffee-200/80" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

          {/* Back button */}
          <Link to="/" aria-label="Kembali ke menu"
            className="absolute top-5 left-4 w-11 h-11 rounded-full bg-white/90 backdrop-blur flex items-center justify-center text-coffee-800 shadow-md active:scale-95 transition-transform">
            <ArrowLeft size={18} />
          </Link>

          {/* Stock badge */}
          <div className="absolute top-5 right-4">
            {inStock
              ? <span className="text-xs bg-green-500/90 text-white px-3 py-1.5 rounded-full font-medium shadow">{product.stock_count} botol</span>
              : <span className="text-xs bg-red-500/90 text-white px-3 py-1.5 rounded-full font-medium shadow">Habis</span>}
          </div>
        </div>

        {/* Content sheet */}
        <div className="relative -mt-6 bg-[#faf6f0] rounded-t-3xl px-4 pt-6 space-y-3">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">{product.name}</h1>
            {product.flavor_notes && <p className="text-coffee-500 text-sm mt-1">{product.flavor_notes}</p>}
            <p className="text-2xl font-extrabold text-coffee-700 mt-2">{formatRp(product.price)}</p>
          </div>

          {product.description && (
            <div className="bg-white rounded-2xl p-4 ring-1 ring-black/5">
              <p className="text-gray-600 text-sm leading-relaxed">{product.description}</p>
            </div>
          )}

          {(product.bean_type || product.base_ingredients || product.flavor_notes) && (
            <div className="bg-white rounded-2xl p-4 space-y-3 ring-1 ring-black/5">
              {product.bean_type && <DetailRow icon={<Leaf size={16} className="text-green-500" />} label="Biji Kopi" value={product.bean_type} />}
              {product.base_ingredients && <DetailRow icon={<Droplets size={16} className="text-blue-400" />} label="Bahan" value={product.base_ingredients} />}
              {product.flavor_notes && <DetailRow icon={<Coffee size={16} className="text-coffee-500" />} label="Flavor Notes" value={product.flavor_notes} />}
            </div>
          )}
        </div>
      </div>

      {/* Sticky bottom order bar */}
      {inStock ? (
        <div className="fixed bottom-0 inset-x-0 z-40">
          <div className="max-w-lg mx-auto bg-white border-t border-gray-100 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
            <div className="flex items-center gap-3">
              {/* Qty stepper */}
              <div className="flex items-center gap-1.5 bg-coffee-50 rounded-full p-1">
                <button onClick={() => setQty(q => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Kurangi jumlah"
                  className="w-11 h-11 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-600 disabled:opacity-40 transition-colors">
                  <Minus size={16} />
                </button>
                <span className="w-7 text-center font-bold text-gray-900 tabular-nums" aria-live="polite">{qty}</span>
                <button onClick={() => setQty(q => Math.min(product.stock_count, q + 1))} disabled={qty >= product.stock_count} aria-label="Tambah jumlah"
                  className="w-11 h-11 rounded-full bg-coffee-600 text-white flex items-center justify-center disabled:opacity-40 hover:bg-coffee-700 transition-colors">
                  <Plus size={16} />
                </button>
              </div>

              {/* Order CTA */}
              <button
                onClick={handleOrder}
                disabled={ordering}
                className="flex-1 flex items-center justify-between bg-coffee-600 hover:bg-coffee-700 text-white font-semibold pl-5 pr-4 py-3 rounded-full transition-colors disabled:opacity-60 active:scale-[0.99]"
              >
                <span>{ordering ? 'Memproses...' : 'Pesan'}</span>
                <span className="font-extrabold">{formatRp(product.price * qty)}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="fixed bottom-0 inset-x-0 z-40">
          <div className="max-w-lg mx-auto bg-white border-t border-gray-100 px-4 py-3">
            <div className="w-full text-center bg-gray-200 text-gray-500 font-semibold py-3.5 rounded-full">Stok Habis</div>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailRow({ icon, label, value }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-sm text-gray-800">{value}</p>
      </div>
    </div>
  )
}
