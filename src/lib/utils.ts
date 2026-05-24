// Formatage monétaire (€)
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Formatage date courte (ex: 12 jan. 2026)
export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateStr))
}

// Formatage date + heure
export function formatDateTime(dateStr: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr))
}

// Temps relatif (ex: "il y a 2 heures")
export function formatRelativeTime(dateStr: string): string {
  const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' })
  const diff = new Date(dateStr).getTime() - Date.now()
  const seconds = Math.round(diff / 1000)
  const minutes = Math.round(seconds / 60)
  const hours   = Math.round(minutes / 60)
  const days    = Math.round(hours / 24)

  if (Math.abs(seconds) < 60)  return rtf.format(seconds, 'second')
  if (Math.abs(minutes) < 60)  return rtf.format(minutes, 'minute')
  if (Math.abs(hours)   < 24)  return rtf.format(hours,   'hour')
  return rtf.format(days, 'day')
}

// Date longue française (ex: "samedi 23 mai 2026")
export function formatLongDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

// Initiales à partir d'un nom complet
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Génère un numéro de facture : F-YYYY-NNN
export function generateInvoiceNumber(sequence: number): string {
  const year = new Date().getFullYear()
  return `F-${year}-${String(sequence).padStart(3, '0')}`
}

// Tronquer un texte
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 1) + '…'
}

// Vérifier si une date est dépassée
export function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}

// Classe CSS conditionnelle (mini clsx)
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
