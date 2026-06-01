import { useEffect, useState } from 'react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, X, ToggleLeft, ToggleRight } from 'lucide-react'

const empty = { name: '', description: '', price: '', bean_type: '', flavor_notes: '', base_ingredients: '', is_available: true, image_url: '', ingredients: [] }

export default function Products() {
  const [products, setProducts] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [modal, setModal] = useState(null) // null | 'create' | product obj
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  const load = () => {
    api.get('/admin/products').then(r => setProducts(r.data || []))
    api.get('/admin/ingredients').then(r => setIngredients(r.data || []))
  }
  useEffect(load, [])

  const openCreate = () => { setForm(empty); setModal('create') }
  const openEdit = (p) => {
    setForm({
      ...p,
      price: String(p.price),
      ingredients: p.ingredients?.map(i => ({ ingredient_id: i.ingredient_id, quantity: String(i.quantity) })) || []
    })
    setModal(p)
  }

  const handleSave = async () => {
    if (!form.name || !form.price) { toast.error('Nama dan harga wajib diisi'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        ingredients: form.ingredients.map(i => ({ ingredient_id: Number(i.ingredient_id), quantity: parseFloat(i.quantity) })).filter(i => i.ingredient_id && i.quantity)
      }
      if (modal === 'create') {
        await api.post('/admin/products', payload)
        toast.success('Produk ditambahkan')
      } else {
        await api.put(`/admin/products/${modal.id}`, payload)
        toast.success('Produk diperbarui')
      }
      setModal(null); load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Hapus produk ini?')) return
    await api.delete(`/admin/products/${id}`)
    toast.success('Produk dihapus'); load()
  }

  const addIngRow = () => setForm(f => ({ ...f, ingredients: [...f.ingredients, { ingredient_id: '', quantity: '' }] }))
  const removeIngRow = (i) => setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, idx) => idx !== i) }))
  const updateIng = (i, field, val) => setForm(f => ({ ...f, ingredients: f.ingredients.map((r, idx) => idx === i ? { ...r, [field]: val } : r) }))

  const formatRp = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0)

  // Modal (COGS) live dari resep yang sedang diedit: Σ qty × cost_per_unit bahan
  const liveCost = form.ingredients.reduce((sum, row) => {
    const ing = ingredients.find(i => i.id === Number(row.ingredient_id))
    return sum + (ing ? ing.cost_per_unit * (parseFloat(row.quantity) || 0) : 0)
  }, 0)
  const livePrice = parseFloat(form.price) || 0
  const liveMargin = livePrice - liveCost

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Menu / Produk</h1>
        <button onClick={openCreate} className="flex items-center gap-2 bg-coffee-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-coffee-700">
          <Plus size={16} /> Tambah Produk
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {products.length === 0 && (
          <p className="text-center text-gray-400 py-12">Belum ada produk</p>
        )}
        {products.map(p => (
          <div key={p.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{p.name}</span>
                {p.is_available
                  ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Aktif</span>
                  : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Nonaktif</span>
                }
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{p.flavor_notes || p.bean_type || '-'}</p>
              <div className="flex items-center gap-2 mt-1 text-[11px]">
                <span className="text-gray-400">Modal {formatRp(p.cost)}</span>
                <span className={`px-1.5 py-0.5 rounded-full font-medium ${
                  p.margin > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
                }`}>
                  Untung {formatRp(p.margin)}{p.price > 0 ? ` (${Math.round(p.margin_pct)}%)` : ''}
                </span>
              </div>
            </div>
            <span className="font-semibold text-coffee-700 text-sm shrink-0">{formatRp(p.price)}</span>
            <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-coffee-600 transition-colors">
              <Pencil size={15} />
            </button>
            <button onClick={() => handleDelete(p.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modal !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-5 py-4 border-b flex items-center justify-between">
              <h2 className="font-bold text-gray-900">{modal === 'create' ? 'Tambah Produk' : 'Edit Produk'}</h2>
              <button onClick={() => setModal(null)}><X size={20} className="text-gray-400" /></button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Nama Produk *</Label>
                  <Input value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Kopi Susu Aren" />
                </div>
                <div>
                  <Label>Harga (Rp) *</Label>
                  <Input type="number" value={form.price} onChange={v => setForm(f => ({ ...f, price: v }))} placeholder="15000" />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <button onClick={() => setForm(f => ({ ...f, is_available: !f.is_available }))}>
                    {form.is_available
                      ? <ToggleRight size={28} className="text-green-500" />
                      : <ToggleLeft size={28} className="text-gray-400" />
                    }
                  </button>
                  <span className="text-sm text-gray-600">Tersedia</span>
                </div>
              </div>

              <div>
                <Label>Jenis Biji Kopi</Label>
                <Input value={form.bean_type} onChange={v => setForm(f => ({ ...f, bean_type: v }))} placeholder="Arabika Gayo & Robusta Temanggung" />
              </div>
              <div>
                <Label>Flavor Notes</Label>
                <Input value={form.flavor_notes} onChange={v => setForm(f => ({ ...f, flavor_notes: v }))} placeholder="Chocolaty, Bold, Low Acidity" />
              </div>
              <div>
                <Label>Bahan Dasar</Label>
                <Input value={form.base_ingredients} onChange={v => setForm(f => ({ ...f, base_ingredients: v }))} placeholder="Espresso, Susu Segar, Gula Aren" />
              </div>
              <div>
                <Label>Deskripsi</Label>
                <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400 resize-none" />
              </div>

              {/* BOM - Bahan baku per botol */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Resep Bahan Baku (BOM)</Label>
                  <button onClick={addIngRow} className="text-xs text-coffee-600 hover:underline flex items-center gap-1">
                    <Plus size={12} /> Tambah bahan
                  </button>
                </div>
                {form.ingredients.map((row, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <select value={row.ingredient_id} onChange={e => updateIng(i, 'ingredient_id', e.target.value)}
                      className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400">
                      <option value="">Pilih bahan</option>
                      {ingredients.map(ing => (
                        <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                      ))}
                    </select>
                    <input type="number" placeholder="Qty" value={row.quantity} onChange={e => updateIng(i, 'quantity', e.target.value)}
                      className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400" />
                    <button onClick={() => removeIngRow(i)} className="text-red-400 hover:text-red-600 px-1">
                      <X size={16} />
                    </button>
                  </div>
                ))}

                {/* Ringkasan modal & untung */}
                <div className="mt-3 bg-gray-50 rounded-lg p-3 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase">Modal</p>
                    <p className="text-sm font-semibold text-gray-700">{formatRp(liveCost)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase">Harga Jual</p>
                    <p className="text-sm font-semibold text-coffee-700">{formatRp(livePrice)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase">Untung</p>
                    <p className={`text-sm font-semibold ${liveMargin >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {formatRp(liveMargin)}{livePrice > 0 ? ` (${Math.round(liveMargin / livePrice * 100)}%)` : ''}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white px-5 py-4 border-t flex gap-3">
              <button onClick={() => setModal(null)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium">
                Batal
              </button>
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-coffee-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-coffee-700 disabled:opacity-50">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Label({ children }) {
  return <label className="block text-xs font-medium text-gray-600 mb-1">{children}</label>
}
function Input({ value, onChange, ...props }) {
  return (
    <input {...props} value={value} onChange={e => onChange(e.target.value)}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-400" />
  )
}
