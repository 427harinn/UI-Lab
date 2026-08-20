import { useEffect, useRef } from 'react'
import type { KeyboardEvent } from 'react'

interface ConfirmationDialogProps {
  title: string
  message: string
  onCancel: () => void
  onContinue: () => void
}

export function ConfirmationDialog({ title, message, onCancel, onContinue }: ConfirmationDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      onCancel()
      return
    }
    if (event.key !== 'Tab' || !dialogRef.current) return
    const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled])')]
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <div
        ref={dialogRef}
        className="confirmation-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="replacement-dialog-title"
        aria-describedby="replacement-dialog-message"
        onKeyDown={handleKeyDown}
      >
        <p className="eyebrow">Unsaved work</p>
        <h2 id="replacement-dialog-title">{title}</h2>
        <p id="replacement-dialog-message">{message}</p>
        <div className="confirmation-dialog__actions">
          <button ref={cancelRef} type="button" onClick={onCancel}>Cancel</button>
          <button type="button" className="button-primary" onClick={onContinue}>Continue</button>
        </div>
      </div>
    </div>
  )
}
