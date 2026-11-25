import { useEffect, useState } from 'react'
import { Download, FileText, Trash2, WifiOff } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../context/LanguageContext'
import {
  cacheOfflineAppShell,
  getOfflinePack,
  MAX_OFFLINE_DOCUMENT_BYTES,
  saveOfflinePack,
} from '../../services/offlineStorage'

const EMERGENCY_PHRASES = [
  { english: 'I need help.', hindi: 'मुझे मदद चाहिए।' },
  { english: 'Please call emergency services.', hindi: 'कृपया आपातकालीन सेवाओं को कॉल करें।' },
  { english: 'Where is the nearest hospital?', hindi: 'सबसे नज़दीकी अस्पताल कहाँ है?' },
  { english: 'Please call an ambulance.', hindi: 'कृपया एम्बुलेंस बुलाएँ।' },
  { english: 'I need the police.', hindi: 'मुझे पुलिस की मदद चाहिए।' },
  { english: 'I have a food allergy.', hindi: 'मुझे खाने से एलर्जी है।' },
  { english: 'I am allergic to this ingredient.', hindi: 'मुझे इस सामग्री से एलर्जी है।' },
  { english: 'I do not speak the local language.', hindi: 'मुझे स्थानीय भाषा नहीं आती।' },
]

const documentId = (file) => `${file.name}-${file.size}-${file.lastModified}`

const createAccessKey = () => {
  if (crypto.randomUUID) return crypto.randomUUID()
  const values = new Uint8Array(16)
  crypto.getRandomValues(values)
  return Array.from(values, (value) => value.toString(16).padStart(2, '0')).join('')
}

export default function OfflinePackPanel({ data }) {
  const { t } = useLanguage()
  const { trip, itinerary, budget } = data
  const [savedPack, setSavedPack] = useState(null)
  const [newFiles, setNewFiles] = useState([])
  const [removedDocuments, setRemovedDocuments] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    let active = true
    getOfflinePack(trip._id)
      .then((pack) => {
        if (active) setSavedPack(pack)
      })
      .catch((storageError) => {
        if (active) setError(storageError.message)
      })
    return () => { active = false }
  }, [trip._id])

  const documents = [
    ...(savedPack?.documents || []).filter((file) => !removedDocuments.includes(file.id)),
    ...newFiles.map((file) => ({ id: documentId(file), name: file.name, size: file.size })),
  ]

  const selectFiles = (event) => {
    const selected = Array.from(event.target.files || [])
    const unsupported = selected.find((file) => !file.type.startsWith('image/') && file.type !== 'application/pdf')
    event.target.value = ''
    setError(null)
    if (unsupported) {
      setError(t('Attach PDF or image files only.'))
      return
    }
    setNewFiles((current) => [...current, ...selected])
  }

  const save = async () => {
    const existingDocuments = (savedPack?.documents || []).filter((file) => !removedDocuments.includes(file.id))
    const allDocuments = [
      ...existingDocuments,
      ...newFiles.map((file) => ({
        id: documentId(file),
        name: file.name,
        type: file.type,
        size: file.size,
        blob: file,
      })),
    ]
    const uniqueDocuments = [...new Map(allDocuments.map((file) => [file.id, file])).values()]
    const totalBytes = uniqueDocuments.reduce((sum, file) => sum + file.size, 0)
    if (totalBytes > MAX_OFFLINE_DOCUMENT_BYTES) {
      setError(t('Offline documents must be 25 MB or smaller in total.'))
      return
    }

    setBusy(true)
    setError(null)
    setNotice(null)
    const pack = {
      tripId: trip._id,
      accessKey: savedPack?.accessKey || createAccessKey(),
      trip,
      itinerary,
      budget,
      documents: uniqueDocuments,
      phrases: EMERGENCY_PHRASES,
      savedAt: new Date().toISOString(),
    }

    try {
      await saveOfflinePack(pack)
      setSavedPack(pack)
      setNewFiles([])
      setRemovedDocuments([])
      try {
        await cacheOfflineAppShell()
        setNotice(t('Offline trip pack saved on this device.'))
      } catch {
        setNotice(t('Trip data is saved, but the app shell could not be cached. Stay online and try again.'))
      }
    } catch (saveError) {
      setError(saveError.name === 'QuotaExceededError'
        ? t('This device does not have enough storage for the offline pack.')
        : saveError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card mx-auto mt-6 max-w-6xl p-4 sm:px-6" aria-labelledby="offline-pack-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <WifiOff size={20} className="mt-1 shrink-0 text-clay-600" />
          <div>
            <h2 id="offline-pack-title" className="font-semibold">{t('Offline trip pack')}</h2>
            <p className="mt-1 text-sm text-soot">{t('Save trip details, itinerary, budget, local documents, and an English–Hindi emergency phrasebook on this device.')}</p>
            <p className="mt-1 text-xs text-stone">{t('Documents stay in this browser and are not uploaded. Anyone with access to this device and browser may be able to open them.')}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={save} disabled={busy} className="btn-secondary !py-1.5">
            <Download size={15} /> {busy ? t('Saving offline pack…') : savedPack ? t('Update offline pack') : t('Save offline')}
          </button>
          {savedPack && (
            <Link to={`/offline/trips/${trip._id}?key=${encodeURIComponent(savedPack.accessKey)}`} className="btn-primary !py-1.5">
              <WifiOff size={15} /> {t('Open offline pack')}
            </Link>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="min-w-0 flex-1 text-sm font-medium">
          <span className="mb-1 block">{t('Boarding passes and hotel vouchers')}</span>
          <input
            type="file"
            accept="application/pdf,image/*"
            multiple
            onChange={selectFiles}
            className="input !py-1.5 text-sm"
          />
        </label>
        {documents.length > 0 && (
          <ul className="min-w-full space-y-1 text-xs text-soot sm:min-w-0 sm:flex-1">
            {documents.map((file) => (
              <li key={file.id} className="flex items-center gap-2">
                <FileText size={13} className="shrink-0" />
                <span className="min-w-0 flex-1 truncate">{file.name}</span>
                <span className="shrink-0 text-stone">{formatBytes(file.size)}</span>
                <button
                  type="button"
                  className="btn-ghost !p-1"
                  aria-label={t('Remove {name}', { name: file.name })}
                  onClick={() => {
                    if (savedPack?.documents?.some((savedFile) => savedFile.id === file.id)) {
                      setRemovedDocuments((current) => [...current, file.id])
                    } else {
                      setNewFiles((current) => current.filter((newFile) => documentId(newFile) !== file.id))
                    }
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-3 text-xs text-stone">
        {t('Offline base map tiles are not included until a licensed map source is configured.')}
      </p>
      {notice && <p role="status" className="mt-3 text-sm text-moss-700">{notice}</p>}
      {error && <p role="alert" className="mt-3 text-sm text-clay-700">{t(error)}</p>}
    </section>
  )
}

function formatBytes(bytes) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
