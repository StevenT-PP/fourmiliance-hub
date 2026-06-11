import type {
  Role,
  PipelineStage,
  ServiceType,
  ProjectStatus,
  TaskStatus,
  TaskPriority,
  InvoiceStatus,
  LeadStatus,
  LeadSource,
  CampaignStatus,
  ProductCategory,
  EmployeeRange,
} from '../lib/constants'

// ─── Profiles ───────────────────────────────────────────────────────────────

export interface Profile {
  id: string
  full_name: string
  role: Role
  avatar_url: string | null
  phone: string | null
  company: string | null
  status: 'online' | 'offline' | 'away'
  created_at: string
}

// ─── CRM ────────────────────────────────────────────────────────────────────

export interface Contact {
  id: string
  company: string
  contact_name: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  postal_code: string | null
  service_type: ServiceType | null
  pipeline_stage: PipelineStage
  estimated_value: number | null
  assigned_to: string | null
  source: string | null
  created_at: string
  updated_at: string
  // Joined
  assignee?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
}

export interface ContactNote {
  id: string
  contact_id: string
  author_id: string
  content: string
  note_type: 'note' | 'appel' | 'email' | 'rdv'
  created_at: string
  // Joined
  author?: Pick<Profile, 'id' | 'full_name'> | null
}

export interface ContactTask {
  id: string
  contact_id: string
  assigned_to: string | null
  title: string
  due_date: string | null
  done: boolean
  created_at: string
}

// ─── Projects ────────────────────────────────────────────────────────────────

export interface Project {
  id: string
  contact_id: string | null
  client_id: string | null
  name: string
  type: ServiceType | null
  status: ProjectStatus
  progress: number
  start_date: string | null
  end_date: string | null
  budget: number | null
  description: string | null
  created_at: string
  updated_at: string
  // Joined
  contact?: Pick<Contact, 'id' | 'company' | 'contact_name'> | null
  client?: Pick<Profile, 'id' | 'full_name'> | null
}

export interface Task {
  id: string
  project_id: string | null
  contact_id: string | null
  parent_id: string | null
  assigned_to: string | null
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  created_at: string
  updated_at: string
  // Joined
  assignee?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
  subtasks?: Task[]
}

export interface Deliverable {
  id: string
  project_id: string
  name: string
  type: string | null
  status: 'a_venir' | 'en_attente' | 'valide' | 'refuse'
  file_url: string | null
  file_size: number | null
  created_at: string
  updated_at: string
}

// ─── Messages ────────────────────────────────────────────────────────────────

export interface Message {
  id: string
  project_id: string
  sender_id: string
  content: string
  read_by: string[]
  created_at: string
  // Joined
  sender?: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'role'> | null
}

// ─── Finance ─────────────────────────────────────────────────────────────────

export interface InvoiceLineItem {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  total: number
}

export interface Invoice {
  id: string
  number: string
  contact_id: string | null
  project_id: string | null
  type: 'devis' | 'facture'
  status: InvoiceStatus
  amount_ht: number
  tva_rate: number
  amount_ttc: number
  issued_date: string
  due_date: string | null
  paid_date: string | null
  notes: string | null
  line_items: InvoiceLineItem[]
  created_at: string
  // Joined
  contact?: Pick<Contact, 'id' | 'company' | 'contact_name'> | null
}

export interface FundTransaction {
  id: string
  amount: number
  direction: 'versement' | 'retrait'
  description: string | null
  reference: string | null
  date: string
  created_by: string | null
  created_at: string
}

// ─── Incubateur ───────────────────────────────────────────────────────────────

export type IncubatedStage = 'candidature' | 'selection' | 'actif' | 'diplome' | 'archive'

export interface IncubatedCompany {
  id: string
  name: string
  sector: string | null
  contact_name: string | null
  email: string | null
  phone: string | null
  stage: IncubatedStage
  start_date: string | null
  description: string | null
  notes: string | null
  user_id: string | null
  created_at: string
  updated_at: string
}

// ─── Association ──────────────────────────────────────────────────────────────

export interface AssociationMember {
  id: string
  profile_id: string | null
  full_name: string
  email: string | null
  phone: string | null
  role: string | null
  joined_date: string
  active: boolean
}

export interface AssociationEvent {
  id: string
  title: string
  description: string | null
  date: string | null
  location: string | null
  created_at: string
}

// ─── Activity ─────────────────────────────────────────────────────────────────

export interface ActivityLog {
  id: string
  user_id: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  entity_label: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  // Joined
  actor?: Pick<Profile, 'id' | 'full_name'> | null
}

// ─── Campagnes d'appels ───────────────────────────────────────────────────────

export interface Campaign {
  id: string
  name: string
  description: string | null
  target_sector: string | null
  target_naf: string | null
  target_city: string | null
  target_department: string | null
  target_employee_range: EmployeeRange | null
  status: CampaignStatus
  created_by: string | null
  created_at: string
  updated_at: string
  // Computed (joined)
  leads_count?: number
  leads_done?: number
  creator?: Pick<Profile, 'id' | 'full_name'> | null
}

// ─── Leads ────────────────────────────────────────────────────────────────────

export interface Lead {
  id: string
  campaign_id: string | null
  // Identité entreprise
  company_name: string
  siren: string | null
  siret: string | null
  naf_code: string | null
  sector: string | null
  // Contact
  phone: string | null
  email: string | null
  website: string | null
  contact_name: string | null
  // Localisation
  address: string | null
  city: string | null
  postal_code: string | null
  department: string | null
  // Enrichissement
  employee_range: EmployeeRange | null
  revenue_range: string | null
  google_place_id: string | null
  google_rating: number | null
  google_reviews_count: number | null
  has_website: boolean | null
  // Source
  source: LeadSource
  source_data: Record<string, unknown> | null
  // Statut
  status: LeadStatus
  assigned_to: string | null
  next_call_at: string | null
  last_called_at: string | null
  created_at: string
  updated_at: string
  // Joined
  assignee?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
  campaign?: Pick<Campaign, 'id' | 'name'> | null
  call_count?: number
}

// ─── Call logs ────────────────────────────────────────────────────────────────

export interface CallLog {
  id: string
  lead_id: string
  commercial_id: string
  started_at: string
  ended_at: string | null
  duration_seconds: number | null
  status: LeadStatus
  notes: string | null
  next_call_at: string | null
  created_at: string
  // Joined
  commercial?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
  lead?: Pick<Lead, 'id' | 'company_name' | 'phone' | 'sector'> | null
}

// ─── Sessions d'appel actives (supervision temps réel) ────────────────────────

export interface CallSession {
  id: string
  commercial_id: string
  lead_id: string | null
  campaign_id: string | null
  started_at: string
  is_active: boolean
  // Joined
  commercial?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
  lead?: Pick<Lead, 'id' | 'company_name' | 'phone' | 'sector'> | null
}

// ─── Catalogue produits ───────────────────────────────────────────────────────

export interface Product {
  id: string
  name: string
  category: ProductCategory
  description: string | null
  base_price_ht: number
  recurring_price_ht: number | null
  features: string[]
  delivery_days: number | null
  active: boolean
  created_at: string
  updated_at: string
}

// ─── Stats supervision ────────────────────────────────────────────────────────

export interface CommercialStats {
  commercial_id: string
  commercial_name: string
  avatar_url: string | null
  calls_today: number
  duration_today_s: number
  rdv_today: number
  refus_today: number
  rappel_today: number
  production_total: number
  is_on_call: boolean
  current_lead?: Pick<Lead, 'id' | 'company_name' | 'sector'> | null
  call_started_at?: string | null
}

// ─── Misc ────────────────────────────────────────────────────────────────────

export type SortOrder = 'asc' | 'desc'

export interface Pagination {
  page: number
  pageSize: number
  total: number
}

export interface SelectOption<T = string> {
  value: T
  label: string
}
