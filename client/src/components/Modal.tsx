import { useEffect, useId, useRef, type ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const pressStartedOnBackdrop = useRef(false)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      // Fires when the browser closes the dialog, for example on Escape.
      onClose={onClose}
      onMouseDown={(e) => {
        pressStartedOnBackdrop.current = e.target === e.currentTarget
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && pressStartedOnBackdrop.current) onClose()
      }}
      className="m-auto w-full max-w-lg rounded-card border border-line bg-surface-raised p-0 text-ink backdrop-blur-xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      {/* Content exists only while open, so every form starts fresh each time. */}
      {open ? (
        <div className="p-6">
          <h2 id={titleId} className="text-xl font-semibold tracking-tight">
            {title}
          </h2>
          <div className="mt-4">{children}</div>
        </div>
      ) : null}
    </dialog>
  )
}