import { useEffect } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import toast from 'react-hot-toast'
import { X } from 'lucide-react'

const READER_ID = 'qr-reader-region'

export default function QrScanner({ onResult, onClose }) {
  useEffect(() => {
    const scanner = new Html5Qrcode(READER_ID)
    let stopped = false

    const stop = () => {
      if (!scanner.isScanning) return Promise.resolve()
      return scanner.stop().then(() => scanner.clear()).catch(() => {})
    }

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          if (stopped) return
          stopped = true
          stop().finally(() => onResult(decodedText))
        },
        () => {} // abaikan error per-frame (QR belum terbaca)
      )
      .catch((err) => {
        toast.error('Tidak bisa mengakses kamera: ' + (err?.message || err))
        onClose()
      })

    return () => { stopped = true; stop() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-semibold text-gray-800">Scan QR Order</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div id={READER_ID} className="w-full [&_video]:w-full" />
        <p className="text-xs text-gray-400 text-center px-4 py-3">
          Arahkan kamera ke QR pada layar HP pelanggan
        </p>
      </div>
    </div>
  )
}
