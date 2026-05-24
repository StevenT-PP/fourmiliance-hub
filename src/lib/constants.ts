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
  prospect:  'bg-gray-100 text-gray-700',
  contacte:  'bg-blue-100 text-blue-700',
  devis:     'bg-amber-100 text-amber-700',
  signe:     'bg-green-100 text-green-700',
  en_cours:  'bg-emerald-100 text-emerald-700',
  livre:     'bg-gray-100 text-gray-600',
  archive:   'bg-gray-50 text-gray-500',
  perdu:     'bg-red-100 text-red-700',
}

export const SERVICE_LABELS: Record<ServiceType, { label: string; badge: string }> = {
  vitrine:    { label: 'Site Vitrine',    badge: 'bg-blue-100 text-blue-700' },
  ecommerce:  { label: 'E-commerce',      badge: 'bg-purple-100 text-purple-700' },
  agent_ia:   { label: 'Agent IA',        badge: 'bg-amber-100 text-amber-700' },
  automation: { label: 'Automation',      badge: 'bg-teal-100 text-teal-700' },
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
  low:    'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-700',
  high:   'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
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
  brouillon:  'bg-gray-100 text-gray-600',
  envoye:     'bg-blue-100 text-blue-700',
  en_attente: 'bg-amber-100 text-amber-700',
  paye:       'bg-green-100 text-green-700',
  en_retard:  'bg-red-100 text-red-700',
  annule:     'bg-gray-100 text-gray-500',
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
  sous_traitant:      'bg-blue-500 text-white',
  client:             'bg-sky-500 text-white',
  membre_association: 'bg-fourmiliance-ocre text-white',
  incube:             'bg-purple-500 text-white',
}

export const FUND_OBJECTIVE = 50_000

export const FUND_MILESTONES = [
  { amount: 5_000,  label: 'Bar associatif' },
  { amount: 15_000, label: 'Étude de terrain' },
  { amount: 30_000, label: 'Apport partiel' },
  { amount: 50_000, label: 'Acquisition foncière' },
]

export const AGENCY_FUND_RATE = 0.10
