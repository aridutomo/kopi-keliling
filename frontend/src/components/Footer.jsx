import { Link } from 'react-router-dom'
import { MessageCircle, MapPin } from 'lucide-react'
import { BUSINESS } from '../config/business'

export default function Footer() {
  return (
    <footer className="pt-6 mt-2 border-t border-coffee-100 space-y-4">
      <div>
        <h2 className="text-coffee-900 font-bold text-sm">Tentang {BUSINESS.name}</h2>
        <p className="text-gray-500 text-xs leading-relaxed mt-1">{BUSINESS.description}</p>
      </div>

      <div className="space-y-2 text-xs text-gray-600">
        <a href={`https://wa.me/${BUSINESS.whatsapp}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-coffee-700">
          <MessageCircle size={14} className="text-green-600" /> {BUSINESS.whatsappDisplay}
        </a>
        <p className="flex items-center gap-2"><MapPin size={14} className="text-red-500" /> {BUSINESS.address}, {BUSINESS.city}</p>
      </div>

      <div className="flex items-center gap-4 text-xs">
        <Link to="/syarat-ketentuan" className="text-coffee-600 underline hover:text-coffee-800">Syarat &amp; Ketentuan</Link>
        <Link to="/kontak" className="text-coffee-600 underline hover:text-coffee-800">Kontak</Link>
      </div>

      <p className="text-[11px] text-gray-400 pt-2">
        Harga dalam {BUSINESS.currency}. Pembayaran (tunai/QRIS) diproses langsung di aplikasi ini.
        © {new Date().getFullYear()} {BUSINESS.name}.
      </p>
    </footer>
  )
}
