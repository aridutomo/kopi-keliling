import { useEffect, useState } from 'react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { Plus, X, AlertTriangle, TrendingUp } from 'lucide-react'

const fmtDate = (d) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

export default function Stock() {
  const [batches, setBatches] = useState([])
  const [summary, setSummary] = useState(null)
  const [products, setProducts] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ product_id: '', quantity: '', expires_at: '' })
  const [saving, setSaving] = useState(false)

  const load = () => {
    api.get('/admin/stock').then(r => setBatches(r.data || []))
    api.get('/admin/stock/summary').then(r => setSummary(r.data))
    api.get('/admin/products').then(r => setProducts(r.data?.filter(p => p.is_available) || []))
  }
  useEffect(load, [])

  const handleCreate = async () => {
    if (!form.product_id || !form.quantity) { toast.error('Pilih produk dan masukkan jumlah'); return }
    setSaving(true)
    try {
      await api.post('/admin/stock', {
        product_id: Number(form.product_id),
        quantity: Number(form.quantity),
        expires_at: form.expires_at,
      })
      toast.success('Batch stok dibuat, bahan baku dikurangi otomatis')
      setModal(false); load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal membuat batch')
    } finally { setSaving(false) }
  }

  const now = new Date()
  const isExpired = (d) => new Date(d) < now
  const isExpiring = (d) => new Date(d) < new Date(Date.now() + 24 * 3600 * 1000) && new Date(d) >= now

  const batchColor = (b) => {
    if (b.remaining === 0) return 'opacity-40'
    if (isExpired(b.expires_at)) return 'border-l-4 border-red-400'
    if (isExpiring(b.expires_at)) return 'border-l-4 border-amber-400'
    return 'border-l-4 border-green-400'
  }

  // Default expiry = 4 days from today
  const defaultExpiry = new Date(Date.now() + 4 * 24 * 3600 * 1000).toISOString().slice(0, 10)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Stok Botol</h1>
        <button onClick={() => { setForm({ product_id: '', quantity: '', expires_at: defaultExpiry }); setModal(true) }}
          className="flex items-center gap-2 bg-coffee-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-coffee-700">
          <Plus size={16} /> Buat Batch
        </button>
      </div>

      {/* Prediction cards */}
      {summary?.predictions?.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
            <TrendingUp size={13} /> Prediksi dari Sisa Bahan Baku
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {summary.predictions.map(p => (
              <div key={p.product_id} className="bg-white rounded-xl p-3 shadow-sm">
                <p className="text-xs text-gray-500 truncate">{p.product_name}</p>
                <p className="text-2xl font-bold text-coffee-700 mt-1">{p.max_batchable}</p>
                <p className="text-xs text-gray-400">botol bisa dibuat</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Batch list */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h2 className="font-semibold text-gray-800 text-sm">Semua Batch</h2>
        </div>
        {batches.length === 0 && <p className="text-center text-gray-400 py-10 text-sm">Belum ada batch stok</p>}
        {batches.map(b => (
          <div key={b.id} className={`flex items-center gap-3 px-4 py-3 border-b last:border-0 ${batchColor(b)}`}>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{b.product?.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Dibuat {fmtDate(b.produced_at)} · Exp {fmtDate(b.expires_at)}
                {isExpired(b.expires_at) && <span className="text-red-500 ml-1">EXPIRED</span>}
                {isExpiring(b.expires_at) && !isExpired(b.expires_at) && (
                  <span className="text-amber-500 ml-1 flex items-center gap-0.5 inline-flex">
                    <AlertTriangle size={10} /> Mau expire!
                  </span>
                )}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-semibold text-sm">{b.remaining} / {b.quantity}</p>
              <p className="text-xs text-gray-400">botol sisa</p>
            </div>
          </div>
        ))}
      </div>

      {/* Create modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">Buat Batch Stok</h2>
              <button onClick={() => setModal(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <p className="text-xs text-gray-500 mb-4 bg-blue-50 rounded-lg p-3">
              ℹ️ Membuat batch akan otomatis mengurangi bahan baku sesuai resep (BOM) produk.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Produk</label>
                <select value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400">
                  <option value="">Pilih produk...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Jumlah Botol</label>
                <input type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                  placeholder="Contoh: 50"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal Kadaluarsa</label>
                <input type="date" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModal(false)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm">Batal</button>
              <button onClick={handleCreate} disabled={saving} className="flex-1 bg-coffee-600 text-white py-2.5 rounded-lg text-sm hover:bg-coffee-700 disabled:opacity-50">
                {saving ? 'Membuat...' : 'Buat Batch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
