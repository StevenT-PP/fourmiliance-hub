export const ROLES = [
  'admin',
  'sous_traitant',
  'client',
  'membre_association',
  'incube',
] as const

export type Role = typeof ROLES[number]

export const PIPELINE_STAGES = [
  'prospect',
  'contacte',
  'devis',
  'signe',
  'en_cours',
  'livre',
  'archive',
  'perdu',
] as const

export type PipelineStage = typeof PIPELINE_STAGES[number]

export const SERVICE_TYPES = [
  'vitrine',
  'ecommerce',
  'agent_ia',
  'automation',
] as const

export type ServiceType = typeof SERVICE_TYPES[number]

export const PIPELINE_LABELS: Record<PipelineStage, string> = {
  prospect:  'Prospect',
  contacte:  'Contacté',
  devis:     'Devis envoyé',
  signe:     'Signé',
  en_cours:  'En cours',
  livre:     'Livré',
  archive:   'Archivé',
  perdu:     'Perdu',
}

export const PIPELINE_COLORS: Record<PipelineStage, string> = {
  prospect:  'badge-neutral',
  contacte:  'badge-sage',
  devis:     'badge-warm',
  signe:     'badge-green',
  en_cours:  'badge-pine',
  livre:     'badge-ink',
  archive:   'badge-neutral',
  perdu:     'badge-rust',
}

export const SERVICE_LABELS: Record<ServiceType, { label: string; badge: string }> = {
  vitrine:    { label: 'Site Vitrine',    badge: 'badge-sage' },
  ecommerce:  { label: 'E-commerce',      badge: 'badge-pine' },
  agent_ia:   { label: 'Agent IA',        badge: 'badge-warm' },
  automation: { label: 'Automation',      badge: 'badge-green' },
}

export const PROJECT_STATUSES = [
  'briefing',
  'maquette',
  'developpement',
  'validation',
  'livre',
  'archive',
] as const

export type ProjectStatus = typeof PROJECT_STATUSES[number]

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  briefing:       'Briefing',
  maquette:       'Maquette',
  developpement:  'Développement',
  validation:     'Validation',
  livre:          'Livré',
  archive:        'Archivé',
}

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  briefing:      'badge-neutral',
  maquette:      'badge-sage',
  developpement: 'badge-warm',
  validation:    'badge-pine',
  livre:         'badge-green',
  archive:       'badge-neutral',
}

export const TASK_STATUSES = ['todo', 'in_progress', 'review', 'done'] as const
export type TaskStatus = typeof TASK_STATUSES[number]

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo:        'À faire',
  in_progress: 'En cours',
  review:      'En révision',
  done:        'Terminé',
}

export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const
export type TaskPriority = typeof TASK_PRIORITIES[number]

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low:    'Faible',
  medium: 'Normale',
  high:   'Haute',
  urgent: 'Urgent',
}

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  low:    'badge-neutral',
  medium: 'badge-sage',
  high:   'badge-warm',
  urgent: 'badge-rust',
}

export const INVOICE_STATUSES = [
  'brouillon',
  'envoye',
  'en_attente',
  'paye',
  'en_retard',
  'annule',
] as const

export type InvoiceStatus = typeof INVOICE_STATUSES[number]

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  brouillon:  'Brouillon',
  envoye:     'Envoyé',
  en_attente: 'En attente',
  paye:       'Payé',
  en_retard:  'En retard',
  annule:     'Annulé',
}

export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  brouillon:  'badge-neutral',
  envoye:     'badge-sage',
  en_attente: 'badge-warm',
  paye:       'badge-green',
  en_retard:  'badge-rust',
  annule:     'badge-neutral',
}

export const ROLE_LABELS: Record<string, string> = {
  admin:              'Admin',
  sous_traitant:      'Sous-traitant',
  client:             'Client',
  membre_association: 'Membre asso.',
  incube:             'Incubé',
}

export const ROLE_COLORS: Record<string, string> = {
  admin:              'bg-fourmiliance-mid text-white',
  sous_traitant:      'bg-fourmiliance-forest text-white',
  client:             'bg-fourmiliance-ocre text-white',
  membre_association: 'bg-fourmiliance-light text-white',
  incube:             'bg-fourmiliance-deep text-white',
}

export const FUND_OBJECTIVE = 50_000

export const FUND_MILESTONES = [
  { amount: 5_000,  label: 'Bar associatif' },
  { amount: 15_000, label: 'Étude de terrain' },
  { amount: 30_000, label: 'Apport partiel' },
  { amount: 50_000, label: 'Acquisition foncière' },
]

export const AGENCY_FUND_RATE = 0.10
