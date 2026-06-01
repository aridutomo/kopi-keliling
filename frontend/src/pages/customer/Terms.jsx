import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { BUSINESS } from '../../config/business'

export default function Terms() {
  return (
    <div className="min-h-screen bg-[#faf6f0]">
      <div className="bg-gradient-to-br from-coffee-700 via-coffee-800 to-coffee-950 text-white">
        <div className="max-w-lg mx-auto px-4 pt-5 pb-10">
          <Link to="/" aria-label="Kembali ke menu" className="inline-flex items-center gap-2 text-coffee-200 text-sm">
            <ArrowLeft size={16} /> Menu
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight mt-4">Syarat &amp; Ketentuan</h1>
          <p className="text-coffee-300 text-sm mt-1">{BUSINESS.name} — berlaku untuk semua pemesanan melalui website ini.</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-6 pb-10">
        <div className="bg-white text-gray-700 rounded-2xl p-6 space-y-5 shadow-xl ring-1 ring-black/5">

          <Section title="1. Tentang Layanan">
            {BUSINESS.description} Seluruh harga dan transaksi pada website ini menggunakan mata uang
            <strong> {BUSINESS.currency}</strong>.
          </Section>

          <Section title="2. Pemesanan">
            Pelanggan memilih produk dari menu, menentukan jumlah, lalu membuat pesanan. Setiap pesanan
            memperoleh nomor order dan kode QR yang ditunjukkan kepada kasir untuk proses pembayaran.
            Ketersediaan produk mengikuti stok harian; pesanan tidak dapat diproses bila stok habis.
          </Section>

          <Section title="3. Pembayaran">
            Pembayaran dilakukan secara <strong>tunai</strong> atau <strong>QRIS</strong>. Seluruh proses
            pembayaran diselesaikan di dalam website/aplikasi kami dan <strong>tidak dialihkan ke situs lain</strong>.
            Pesanan dianggap sah setelah pembayaran diterima dan dikonfirmasi oleh kasir.
          </Section>

          <Section title="4. Kebijakan Pengembalian Dana (Refund)">
            <strong>Tidak ada pengembalian dana.</strong> Seluruh pembayaran yang telah berhasil bersifat final
            dan tidak dapat dikembalikan, karena produk merupakan makanan/minuman siap konsumsi yang disiapkan
            segera setelah pemesanan. Bila terjadi kesalahan penyiapan pesanan dari pihak kami, silakan hubungi
            kami saat di lokasi untuk penggantian produk.
          </Section>

          <Section title="5. Pembatalan">
            Pesanan yang belum dibayar dapat dibatalkan. Setelah pembayaran berhasil, pesanan tidak dapat
            dibatalkan maupun dikembalikan dananya (lihat poin 4).
          </Section>

          <Section title="6. Kontak">
            Untuk pertanyaan terkait pesanan atau layanan, hubungi kami di WhatsApp{' '}
            <strong>{BUSINESS.whatsappDisplay}</strong> atau email <strong>{BUSINESS.email}</strong>.
            Lihat halaman <Link to="/kontak" className="text-coffee-600 underline">Kontak</Link>.
          </Section>

          <p className="text-xs text-gray-400 pt-2 border-t">
            Dengan melakukan pemesanan, Anda dianggap menyetujui Syarat &amp; Ketentuan ini.
          </p>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <h2 className="font-semibold text-gray-900 text-sm mb-1">{title}</h2>
      <p className="text-sm leading-relaxed">{children}</p>
    </div>
  )
}
