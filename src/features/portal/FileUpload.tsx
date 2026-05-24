import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Upload, Download, Trash2, FileText, Image, Archive } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth.tsx'
import { formatRelativeTime } from '../../lib/utils'

// ─── Constantes ──────────────────────────────────────────────────────────────

const BUCKET = 'project-files'
const MAX_SIZE_MB = 50
const ACCEPTED = '.pdf,.png,.jpg,.jpeg,.zip,.ai,.svg'
const ACCEPTED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/svg+xml',
                        'application/zip', 'application/x-zip-compressed',
                        'application/postscript', 'image/svg+xml']

interface StorageFile {
  name: string
  id: string
  updated_at: string
  metadata: {
    size: number
    mimetype: string
  }
}

function fileIcon(mime: string) {
  if (mime?.startsWith('image/')) return <Image className="w-4 h-4 text-blue-500" />
  if (mime === 'application/pdf')  return <FileText className="w-4 h-4 text-red-500" />
  return <Archive className="w-4 h-4 text-[#9A9A9A]" />
}

function formatSize(bytes: number): string {
  if (bytes < 1024)       return `${bytes} o`
  if (bytes < 1024 ** 2)  return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / 1024 ** 2).toFixed(1)} Mo`
}

// ─── Composant ───────────────────────────────────────────────────────────────

export default function FileUpload({ projectId }: { projectId: string }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)

  const [dragging, setDragging]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [progress, setProgress]   = useState(0)

  // Liste des fichiers dans le bucket pour ce projet
  const { data: files = [], isLoading } = useQuery({
    queryKey: ['storage-files', projectId],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(projectId, { sortBy: { column: 'updated_at', order: 'desc' } })
      if (error) throw error
      return (data ?? []) as StorageFile[]
    },
  })

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    setError(null)

    const file = fileList[0]

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Fichier trop volumineux (max ${MAX_SIZE_MB} Mo).`)
      return
    }

    if (ACCEPTED_TYPES.length > 0 && !ACCEPTED_TYPES.includes(file.type) && file.type !== '') {
      // On accepte quand même si type inconnu (certains navigateurs ne détectent pas bien)
    }

    setUploading(true)
    setProgress(10)

    const path = `${projectId}/${Date.now()}_${file.name}`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: false })

    if (uploadError) {
      setError(`Erreur upload : ${uploadError.message}`)
      setUploading(false)
      setProgress(0)
      return
    }

    setProgress(80)

    // Log activité
    if (user) {
      await supabase.from('activity_log').insert({
        user_id:      user.id,
        action:       'file_uploaded',
        entity_type:  'project',
        entity_id:    projectId,
        entity_label: file.name,
        metadata:     { size: file.size, mime: file.type },
      })
    }

    setProgress(100)
    setUploading(false)
    setProgress(0)
    void queryClient.invalidateQueries({ queryKey: ['storage-files', projectId] })
  }

  async function downloadFile(fileName: string) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(`${projectId}/${fileName}`, 3600)
    if (error || !data) return
    window.open(data.signedUrl, '_blank')
  }

  async function deleteFile(fileName: string) {
    await supabase.storage.from(BUCKET).remove([`${projectId}/${fileName}`])
    void queryClient.invalidateQueries({ queryKey: ['storage-files', projectId] })
  }

  return (
    <div>
      {/* Zone drag & drop */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
          ${dragging
            ? 'border-fourmiliance-mid bg-fourmiliance-mid/5'
            : 'border-[#E0DAD0] hover:border-fourmiliance-mid/40 hover:bg-fourmiliance-cream'
          }`}
        onDragOver={e  => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault()
          setDragging(false)
          void handleFiles(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={e => void handleFiles(e.target.files)}
        />
        <Upload className={`w-8 h-8 mx-auto mb-3 ${dragging ? 'text-fourmiliance-mid' : 'text-[#C0B8B0]'}`} />
        <p className="text-sm font-medium text-[#5A5A5A]">
          {uploading ? 'Envoi en cours…' : 'Déposer un fichier ou cliquer pour parcourir'}
        </p>
        <p className="text-xs text-[#9A9A9A] mt-1">
          PDF, PNG, JPG, ZIP, AI, SVG — max {MAX_SIZE_MB} Mo
        </p>

        {/* Barre de progression */}
        {uploading && progress > 0 && (
          <div className="mt-4 max-w-xs mx-auto">
            <div className="h-1.5 bg-[#E0DAD0] rounded-full overflow-hidden">
              <div
                className="h-full bg-fourmiliance-mid rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Erreur */}
      {error && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}

      {/* Liste des fichiers */}
      {(isLoading || files.length > 0) && (
        <div className="mt-4 space-y-2">
          {isLoading ? (
            <p className="text-xs text-[#9A9A9A]">Chargement…</p>
          ) : (
            files.map(f => {
              const displayName = f.name.replace(/^\d+_/, '')
              return (
                <div key={f.id ?? f.name}
                  className="flex items-center gap-3 p-3 border border-[#E0DAD0] rounded-lg">
                  {fileIcon(f.metadata?.mimetype ?? '')}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#2A2A2A] truncate">{displayName}</p>
                    <p className="text-xs text-[#9A9A9A]">
                      {f.metadata?.size ? formatSize(f.metadata.size) : ''}
                      {f.updated_at ? ` · ${formatRelativeTime(f.updated_at)}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => void downloadFile(f.name)}
                    className="text-[#9A9A9A] hover:text-fourmiliance-mid transition-colors"
                    title="Télécharger"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => void deleteFile(f.name)}
                    className="text-[#9A9A9A] hover:text-red-500 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
