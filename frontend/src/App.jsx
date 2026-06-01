import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AdminLayout from './components/AdminLayout'

// Pages
import Login from './pages/Login'
import Menu from './pages/customer/Menu'
import ProductDetail from './pages/customer/ProductDetail'
import OrderConfirm from './pages/customer/OrderConfirm'
import PreOrderForm from './pages/customer/PreOrderForm'
import Terms from './pages/customer/Terms'
import Contact from './pages/customer/Contact'
import Dashboard from './pages/admin/Dashboard'
import POS from './pages/admin/POS'
import Products from './pages/admin/Products'
import Ingredients from './pages/admin/Ingredients'
import Stock from './pages/admin/Stock'
import Orders from './pages/admin/Orders'
import PreOrders from './pages/admin/PreOrders'
import Analytics from './pages/admin/Analytics'

function AdminPage({ children }) {
  return (
    <ProtectedRoute>
      <AdminLayout>{children}</AdminLayout>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: { fontSize: '14px', borderRadius: '12px' }
          }}
        />
        <Routes>
          {/* Customer (public) */}
          <Route path="/" element={<Menu />} />
          <Route path="/menu/:id" element={<ProductDetail />} />
          <Route path="/order/:number" element={<OrderConfirm />} />
          <Route path="/preorder" element={<PreOrderForm />} />
          <Route path="/syarat-ketentuan" element={<Terms />} />
          <Route path="/kontak" element={<Contact />} />

          {/* Auth */}
          <Route path="/login" element={<Login />} />

          {/* Admin */}
          <Route path="/admin" element={<AdminPage><Dashboard /></AdminPage>} />
          <Route path="/admin/pos" element={<AdminPage><POS /></AdminPage>} />
          <Route path="/admin/products" element={<AdminPage><Products /></AdminPage>} />
          <Route path="/admin/ingredients" element={<AdminPage><Ingredients /></AdminPage>} />
          <Route path="/admin/stock" element={<AdminPage><Stock /></AdminPage>} />
          <Route path="/admin/orders" element={<AdminPage><Orders /></AdminPage>} />
          <Route path="/admin/preorders" element={<AdminPage><PreOrders /></AdminPage>} />
          <Route path="/admin/analytics" element={<AdminPage><Analytics /></AdminPage>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
