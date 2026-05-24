import type {
  Role,
  PipelineStage,
  ServiceType,
  ProjectStatus,
  TaskStatus,
  TaskPriority,
  InvoiceStatus,
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
