import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import { Coffee, ChevronRight } from 'lucide-react'
import Footer from '../../components/Footer'
import { BUSINESS } from '../../config/business'

const formatRp = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

export default function Menu() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/menu').then(r => setProducts(r.data || [])).finally(() => setLoading(false))
  }, [])

  const available = products.filter(p => p.stock_count > 0)
  const soldOut = products.filter(p => p.stock_count === 0)

  return (
    <div className="min-h-screen bg-gradient-to-b from-coffee-950 to-[#2a0f05]">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-coffee-800 via-coffee-900 to-coffee-950" />
        {/* subtle decorative blobs */}
        <div className="absolute -top-16 -right-10 w-48 h-48 bg-coffee-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-10 w-56 h-56 bg-coffee-700/30 rounded-full blur-3xl" />

        <div className="relative max-w-lg mx-auto px-5 pt-10 pb-8 text-center text-white">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur ring-1 ring-white/15 mb-3">
            <Coffee size={30} className="text-coffee-200" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">{BUSINESS.name}</h1>
          <p className="text-coffee-300/90 text-sm mt-1.5">{BUSINESS.tagline}</p>
        </div>
      </header>

      {/* Content sheet */}
      <main className="max-w-lg mx-auto px-4 -mt-4">
        <div className="bg-[#faf6f0] rounded-t-3xl min-h-[60vh] px-4 pt-6 pb-8 space-y-6 shadow-2xl">
          {loading && (
            <div className="text-center py-16 text-coffee-400">
              <Coffee size={32} className="mx-auto animate-pulse mb-2" />
              <p className="text-sm">Memuat menu...</p>
            </div>
          )}

          {!loading && products.length === 0 && (
            <div className="text-center py-16 text-coffee-400">
              <Coffee size={40} className="mx-auto mb-3" />
              <p className="font-semibold text-coffee-700">Belum ada menu hari ini</p>
              <p className="text-sm mt-1">Coba lagi nanti ya! ☕</p>
            </div>
          )}

          {/* Available */}
          {available.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-coffee-900 font-bold">Menu Hari Ini</h2>
                <span className="text-xs font-medium text-coffee-500 bg-coffee-100 px-2.5 py-1 rounded-full">
                  {available.length} tersedia
                </span>
              </div>
              <div className="space-y-3">
                {available.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            </section>
          )}

          {/* Sold Out */}
          {soldOut.length > 0 && (
            <section>
              <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3">Habis</h2>
              <div className="space-y-3">
                {soldOut.map(p => <ProductCard key={p.id} product={p} soldOut />)}
              </div>
            </section>
          )}

          <Footer />
        </div>
      </main>
    </div>
  )
}

function Thumb({ product: p, soldOut }) {
  if (p.image_url) {
    return (
      <img src={p.image_url} alt={p.name}
        className={`w-16 h-16 rounded-2xl object-cover shrink-0 ${soldOut ? 'grayscale' : ''}`} />
    )
  }
  return (
    <div className={`w-16 h-16 rounded-2xl shrink-0 flex items-center justify-center
      bg-gradient-to-br from-coffee-200 to-coffee-400 ${soldOut ? 'grayscale' : ''}`}>
      <Coffee size={26} className="text-coffee-800" />
    </div>
  )
}

function ProductCard({ product: p, soldOut }) {
  return (
    <Link
      to={`/menu/${p.id}`}
      className={`group flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm ring-1 ring-black/5
        ${soldOut ? 'opacity-60 pointer-events-none' : 'hover:shadow-md hover:ring-coffee-200 active:scale-[0.99] transition-all'}`}
    >
      <Thumb product={p} soldOut={soldOut} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-gray-900 truncate">{p.name}</h3>
          {soldOut && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold shrink-0">Habis</span>}
        </div>
        {p.flavor_notes && <p className="text-xs text-coffee-500 mt-0.5 truncate">{p.flavor_notes}</p>}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="font-extrabold text-coffee-700">{formatRp(p.price)}</span>
          {!soldOut && (
            <span className="text-[11px] text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full font-medium">
              {p.stock_count} botol
            </span>
          )}
        </div>
      </div>

      {!soldOut && (
        <div className="shrink-0 w-9 h-9 rounded-full bg-coffee-600 text-white flex items-center justify-center group-hover:bg-coffee-700 transition-colors">
          <ChevronRight size={18} />
        </div>
      )}
    </Link>
  )
}
