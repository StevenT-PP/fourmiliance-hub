export const ROLES = [
  'admin',
  'sous_traitant',
  'commercial',
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
  commercial:         'Commercial',
  client:             'Client',
  membre_association: 'Membre asso.',
  incube:             'Incubé',
}

export const ROLE_COLORS: Record<string, string> = {
  admin:              'bg-fourmiliance-mid text-white',
  sous_traitant:      'bg-fourmiliance-forest text-white',
  commercial:         'bg-fourmiliance-light text-white',
  client:             'bg-fourmiliance-ocre text-white',
  membre_association: 'bg-fourmiliance-deep text-white',
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

// ─── Rôle commercial ─────────────────────────────────────────────────────────
// Ajouté au tableau ROLES existant via extension de type
export const COMMERCIAL_ROLES = ['admin', 'commercial'] as const

// ─── Statuts lead (pipeline d'appels) ────────────────────────────────────────
export const LEAD_STATUSES = [
  'nouveau',
  'en_attente',
  'pas_repondu',
  'refus',
  'rappel',
  'rdv_pris',
  'presentation',
  'proposition',
  'production',
  'livre',
  'perdu',
] as const

export type LeadStatus = typeof LEAD_STATUSES[number]

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  nouveau:      'Nouveau',
  en_attente:   'En attente',
  pas_repondu:  'Pas répondu',
  refus:        'Refus',
  rappel:       'À rappeler',
  rdv_pris:     'RDV pris',
  presentation: 'Présentation',
  proposition:  'Proposition',
  production:   'En production',
  livre:        'Livré',
  perdu:        'Perdu',
}

export const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  nouveau:      'bg-gray-100 text-gray-600',
  en_attente:   'bg-blue-50 text-blue-600',
  pas_repondu:  'bg-gray-100 text-gray-500',
  refus:        'bg-red-50 text-red-600',
  rappel:       'bg-yellow-50 text-yellow-700',
  rdv_pris:     'bg-emerald-50 text-emerald-700',
  presentation: 'bg-teal-50 text-teal-700',
  proposition:  'bg-purple-50 text-purple-700',
  production:   'bg-fourmiliance-light/20 text-fourmiliance-forest',
  livre:        'bg-fourmiliance-mid/10 text-fourmiliance-mid',
  perdu:        'bg-red-100 text-red-700',
}

// Statuts quick-pick après un appel (les plus fréquents)
export const CALL_OUTCOME_STATUSES: LeadStatus[] = [
  'pas_repondu',
  'refus',
  'rappel',
  'rdv_pris',
  'proposition',
]

// ─── Sources de génération de leads ──────────────────────────────────────────
export const LEAD_SOURCES = [
  'sirene',
  'google_places',
  'pappers',
  'csv',
  'manuel',
] as const

export type LeadSource = typeof LEAD_SOURCES[number]

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  sirene:        'INSEE Sirene',
  google_places: 'Google Maps',
  pappers:       'Pappers',
  csv:           'Import CSV',
  manuel:        'Saisie manuelle',
}

// ─── Statuts campagne ─────────────────────────────────────────────────────────
export const CAMPAIGN_STATUSES = [
  'brouillon',
  'active',
  'pausee',
  'terminee',
] as const

export type CampaignStatus = typeof CAMPAIGN_STATUSES[number]

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  brouillon: 'Brouillon',
  active:    'Active',
  pausee:    'En pause',
  terminee:  'Terminée',
}

export const CAMPAIGN_STATUS_COLORS: Record<CampaignStatus, string> = {
  brouillon: 'bg-gray-100 text-gray-600',
  active:    'bg-emerald-50 text-emerald-700',
  pausee:    'bg-yellow-50 text-yellow-700',
  terminee:  'bg-gray-200 text-gray-500',
}

// ─── Catalogue produits ───────────────────────────────────────────────────────
export const PRODUCT_CATEGORIES = [
  'site_web',
  'agent_ia',
  'automatisation',
  'cle_en_main',
  'formation',
] as const

export type ProductCategory = typeof PRODUCT_CATEGORIES[number]

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  site_web:       'Site Web',
  agent_ia:       'Agent IA',
  automatisation: 'Automatisation',
  cle_en_main:    'Solution Clé en main',
  formation:      'Formation',
}

export const PRODUCT_CATEGORY_COLORS: Record<ProductCategory, string> = {
  site_web:       'bg-blue-50 text-blue-700',
  agent_ia:       'bg-purple-50 text-purple-700',
  automatisation: 'bg-teal-50 text-teal-700',
  cle_en_main:    'bg-fourmiliance-light/20 text-fourmiliance-forest',
  formation:      'bg-fourmiliance-earth/10 text-fourmiliance-earth',
}

// Tranches d'effectifs entreprise
export const EMPLOYEE_RANGES = [
  '1',
  '2-9',
  '10-49',
  '50-249',
  '250+',
] as const

export type EmployeeRange = typeof EMPLOYEE_RANGES[number]
