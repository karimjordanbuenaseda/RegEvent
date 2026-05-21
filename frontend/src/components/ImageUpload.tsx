import { useRef } from 'react'

interface Props {
  imageUrl: string | null | undefined
  uploading: boolean
  error: string | null
  onFile: (file: File) => void
  emptyLabel?: string
  hint?: string
  replaceLabel?: string
  previewClass?: string
  disabled?: boolean
  disabledMessage?: string
}

export default function ImageUpload({
  imageUrl,
  uploading,
  error,
  onFile,
  emptyLabel = 'Upload Image',
  hint = 'JPEG, PNG, WebP · Max 5 MB',
  replaceLabel = 'Replace Image',
  previewClass = 'w-full h-32 object-cover rounded-xl border border-[#D2C4B4]',
  disabled = false,
  disabledMessage,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    onFile(file)
    if (fileRef.current) fileRef.current.value = ''
  }

  if (disabled) {
    return (
      <p className="text-xs text-gray-400 bg-white/60 rounded-xl p-3 border border-[#D2C4B4] leading-relaxed">
        {disabledMessage ?? 'Save first to upload an image.'}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {imageUrl ? (
        <>
          <img src={imageUrl} alt="" className={previewClass} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="text-xs font-medium py-2 rounded-lg border border-[#D2C4B4] bg-white text-gray-600 hover:bg-white/80 disabled:opacity-60 transition-colors"
          >
            {uploading ? 'Uploading…' : replaceLabel}
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex flex-col items-center justify-center gap-2 py-8 px-4 rounded-xl border-2 border-dashed border-[#D2C4B4] bg-white/40 hover:bg-white/70 disabled:opacity-60 transition-colors text-gray-400 hover:text-gray-600 w-full"
        >
          {uploading ? (
            <p className="text-xs">Uploading…</p>
          ) : (
            <>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M16 8l-4-4-4 4M12 4v12" />
              </svg>
              <span className="text-xs font-medium">{emptyLabel}</span>
              <span className="text-[10px]">{hint}</span>
            </>
          )}
        </button>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  )
}
