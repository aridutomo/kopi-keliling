import { useEffect, useState } from 'react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, X, PackagePlus } from 'lucide-react'

const UNITS = ['gram', 'ml', 'pcs', 'liter', 'kg']
const CATEGORIES = [
  { value: 'bahan_baku', label: 'Bahan Baku' },
  { value: 'pendukung', label: 'Pendukung' },
]
const formatRp = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0)

const emptyForm = { name: '', category: 'bahan_baku', unit: 'gram', stock: '', buyPrice: '', buyQty: '' }

export default function Ingredients() {
  const [ingredients, setIngredients] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [filter, setFilter] = useState('all')
  const [stockModal, setStockModal] = useState(null)
  const [addQty, setAddQty] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => api.get('/admin/ingredients')
    .then(r => setIngredients(Array.isArray(r.data) ? r.data : []))
    .catch(() => setIngredients([]))
  useEffect(() => { load() }, [])

  const openCreate = () => { setForm(emptyForm); setModal('create') }
  const openEdit = (ing) => {
    setForm({
      name: ing.name,
      category: ing.category || 'bahan_baku',
      unit: ing.unit,
      stock: String(ing.stock),
      buyPrice: ing.cost_per_unit ? String(ing.cost_per_unit) : '',
      buyQty: ing.cost_per_unit ? '1' : '',
    })
    setModal(ing)
  }

  // cost per satuan = harga beli / jumlah dibeli (mis. Rp 50.000 untuk 1000 gram → 50/gram)
  const buyPrice = parseFloat(form.buyPrice) || 0
  const buyQty = parseFloat(form.buyQty) || 0
  const costPerUnit = buyQty > 0 ? buyPrice / buyQty : buyPrice

  const handleSave = async () => {
    if (!form.name) { toast.error('Nama wajib diisi'); return }
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        category: form.category,
        unit: form.unit,
        stock: parseFloat(form.stock) || 0,
        cost_per_unit: costPerUnit,
      }
      if (modal === 'create') {
        await api.post('/admin/ingredients', payload); toast.success('Bahan ditambahkan')
      } else {
        await api.put(`/admin/ingredients/${modal.id}`, payload); toast.success('Bahan diperbarui')
      }
      setModal(null); load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Hapus bahan baku ini?')) return
    await api.delete(`/admin/ingredients/${id}`)
    toast.success('Bahan dihapus'); load()
  }

  const handleAddStock = async () => {
    if (!addQty || isNaN(addQty)) { toast.error('Masukkan jumlah yang valid'); return }
    await api.patch(`/admin/ingredients/${stockModal.id}/stock`, { add_qty: parseFloat(addQty) })
    toast.success(`+${addQty} ${stockModal.unit} ditambahkan`)
    setStockModal(null); setAddQty(''); load()
  }

  const stockLevel = (s) => {
    if (s < 100) return 'text-red-500 bg-red-50'
    if (s < 500) return 'text-amber-600 bg-amber-50'
    return 'text-green-600 bg-green-50'
  }

  const visible = ingredients.filter(i => filter === 'all' || (i.category || 'bahan_baku') === filter)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Bahan & Stok Pendukung</h1>
        <button onClick={openCreate} className="flex items-center gap-2 bg-coffee-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-coffee-700">
          <Plus size={16} /> Tambah
        </button>
      </div>

      {/* Filter kategori */}
      <div className="flex gap-2">
        {[{ value: 'all', label: 'Semua' }, ...CATEGORIES].map(c => (
          <button key={c.value} onClick={() => setFilter(c.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === c.value ? 'bg-coffee-600 text-white' : 'border border-gray-200 text-gray-600 hover:border-coffee-300'
            }`}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {visible.length === 0 && <p className="text-center text-gray-400 py-12">Belum ada data</p>}
        {visible.map(ing => (
          <div key={ing.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm">{ing.name}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  (ing.category || 'bahan_baku') === 'pendukung' ? 'bg-sky-50 text-sky-600' : 'bg-coffee-50 text-coffee-600'
                }`}>
                  {(ing.category || 'bahan_baku') === 'pendukung' ? 'Pendukung' : 'Bahan Baku'}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stockLevel(ing.stock)}`}>
                  {ing.stock} {ing.unit}
                </span>
                <span className="text-xs text-gray-400">
                  {ing.cost_per_unit > 0 ? `${formatRp(ing.cost_per_unit)}/${ing.unit}` : 'modal belum diatur'}
                </span>
                {ing.stock < 100 && <span className="text-xs text-red-500">⚠️ Stok menipis!</span>}
              </div>
            </div>
            <button onClick={() => { setStockModal(ing); setAddQty('') }}
              className="flex items-center gap-1 text-xs text-coffee-600 hover:underline px-2 py-1 border border-coffee-200 rounded-lg">
              <PackagePlus size={13} /> Tambah
            </button>
            <button onClick={() => openEdit(ing)} className="p-1.5 text-gray-400 hover:text-coffee-600">
              <Pencil size={15} />
            </button>
            <button onClick={() => handleDelete(ing.id)} className="p-1.5 text-gray-400 hover:text-red-500">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>

      {/* Edit/Create modal */}
      {modal !== null && (
        <Modal title={modal === 'create' ? 'Tambah Bahan / Stok' : 'Edit Bahan / Stok'} onClose={() => setModal(null)}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nama</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Biji Kopi Arabika / Botol 250ml"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Kategori</label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map(cat => (
                  <button key={cat.value} type="button" onClick={() => setForm(f => ({ ...f, category: cat.value }))}
                    className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                      form.category === cat.value ? 'bg-coffee-600 text-white border-coffee-600' : 'border-gray-200 text-gray-600 hover:border-coffee-300'
                    }`}>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Satuan</label>
                <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400">
                  {UNITS.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Stok Awal</label>
                <input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                  placeholder="0"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400" />
              </div>
            </div>

            {/* Harga modal */}
            <div className="bg-amber-50 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-gray-600">Harga Modal (untuk hitung untung)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">Harga beli (Rp)</label>
                  <input type="number" value={form.buyPrice} onChange={e => setForm(f => ({ ...f, buyPrice: e.target.value }))}
                    placeholder="50000"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400" />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">Untuk berapa {form.unit}</label>
                  <input type="number" value={form.buyQty} onChange={e => setForm(f => ({ ...f, buyQty: e.target.value }))}
                    placeholder="1000"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400" />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Modal per satuan: <strong className="text-coffee-700">{costPerUnit > 0 ? `${formatRp(costPerUnit)}/${form.unit}` : '—'}</strong>
              </p>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={() => setModal(null)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm">Batal</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 bg-coffee-600 text-white py-2.5 rounded-lg text-sm hover:bg-coffee-700 disabled:opacity-50">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </Modal>
      )}

      {/* Add stock modal */}
      {stockModal && (
        <Modal title={`Tambah Stok: ${stockModal.name}`} onClose={() => setStockModal(null)}>
          <p className="text-sm text-gray-500 mb-3">Stok saat ini: <strong>{stockModal.stock} {stockModal.unit}</strong></p>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Jumlah yang ditambahkan ({stockModal.unit})</label>
            <input type="number" value={addQty} onChange={e => setAddQty(e.target.value)}
              placeholder={`Contoh: 1000`}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400" />
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setStockModal(null)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm">Batal</button>
            <button onClick={handleAddStock} className="flex-1 bg-coffee-600 text-white py-2.5 rounded-lg text-sm hover:bg-coffee-700">Tambah</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">{title}</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}
