import { Link } from 'react-router-dom'
import { ArrowLeft, MessageCircle, Mail, MapPin, Instagram } from 'lucide-react'
import { BUSINESS } from '../../config/business'

export default function Contact() {
  const waLink = `https://wa.me/${BUSINESS.whatsapp}`

  return (
    <div className="min-h-screen bg-[#faf6f0]">
      <div className="bg-gradient-to-br from-coffee-700 via-coffee-800 to-coffee-950 text-white">
        <div className="max-w-lg mx-auto px-4 pt-5 pb-10">
          <Link to="/" aria-label="Kembali ke menu" className="inline-flex items-center gap-2 text-coffee-200 text-sm">
            <ArrowLeft size={16} /> Menu
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight mt-4">Kontak {BUSINESS.name}</h1>
          <p className="text-coffee-300 text-sm mt-1">{BUSINESS.tagline}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-6 pb-10">
        <div className="bg-white text-gray-700 rounded-2xl p-6 space-y-4 shadow-xl ring-1 ring-black/5">
          <Row icon={<MessageCircle size={18} className="text-green-600" />} label="WhatsApp">
            <a href={waLink} target="_blank" rel="noreferrer" className="text-coffee-700 underline">
              {BUSINESS.whatsappDisplay}
            </a>
          </Row>
          <Row icon={<Mail size={18} className="text-blue-500" />} label="Email">
            <a href={`mailto:${BUSINESS.email}`} className="text-coffee-700 underline">{BUSINESS.email}</a>
          </Row>
          <Row icon={<MapPin size={18} className="text-red-500" />} label="Alamat">
            {BUSINESS.address}, {BUSINESS.city}
          </Row>
          {/* <Row icon={<Instagram size={18} className="text-pink-500" />} label="Instagram">
            <a href={`https://instagram.com/${BUSINESS.instagram}`} target="_blank" rel="noreferrer" className="text-coffee-700 underline">
              @{BUSINESS.instagram}
            </a>
          </Row> */}

          <a href={waLink} target="_blank" rel="noreferrer"
            className="block w-full text-center bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors mt-2">
            Hubungi via WhatsApp
          </a>
        </div>
      </div>
    </div>
  )
}

function Row({ icon, label, children }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-sm text-gray-800">{children}</p>
      </div>
    </div>
  )
}
