import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, ShoppingCart, Package, Beaker,
  Archive, ClipboardList, Clock, BarChart2,
  LogOut, Coffee, Menu, X
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/admin/pos', icon: ShoppingCart, label: 'Kasir (POS)' },
  { to: '/admin/products', icon: Coffee, label: 'Menu / Produk' },
  { to: '/admin/ingredients', icon: Beaker, label: 'Bahan Baku' },
  { to: '/admin/stock', icon: Archive, label: 'Stok Botol' },
  { to: '/admin/orders', icon: ClipboardList, label: 'Riwayat Order' },
  { to: '/admin/preorders', icon: Clock, label: 'Pre-Order' },
  { to: '/admin/analytics', icon: BarChart2, label: 'Analitik' },
]

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.to
    return location.pathname.startsWith(item.to)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-64 bg-coffee-900 text-white flex flex-col
        transform transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-5 border-b border-coffee-700 flex items-center gap-3">
          <Coffee size={28} className="text-coffee-300" />
          <div>
            <h1 className="font-bold text-lg leading-tight">Kopi Keliling</h1>
            <p className="text-xs text-coffee-400">Admin Panel</p>
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-5 py-3 text-sm transition-colors ${
                isActive(item)
                  ? 'bg-coffee-700 text-white font-medium'
                  : 'text-coffee-300 hover:bg-coffee-800 hover:text-white'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-coffee-700">
          <p className="text-xs text-coffee-400 mb-2">Login sebagai</p>
          <p className="text-sm font-medium">{user?.username}</p>
          <button
            onClick={handleLogout}
            className="mt-3 w-full flex items-center gap-2 text-sm text-coffee-300 hover:text-white transition-colors"
          >
            <LogOut size={16} /> Keluar
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <header className="lg:hidden bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
          <button onClick={() => setOpen(true)} className="text-gray-600">
            <Menu size={22} />
          </button>
          <span className="font-semibold text-coffee-800">Kopi Keliling</span>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
