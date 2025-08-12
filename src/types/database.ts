// Types TypeScript pour les entités de la base de données

export type UserRole = 'admin' | 'client';

export interface Profile {
  user_id: string;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
  avatar_url?: string | null;
  preferences?: Record<string, unknown> | null;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  contact_email: string | null;
  created_at: string;
}

export interface ClientMember {
  id: number;
  user_id: string;
  client_id: string;
  is_primary: boolean;
}

export interface Project {
  id: string;
  client_id: string;
  title: string;
  status: string;
  progress: number;
  created_at: string;
}

export type MilestoneStatus = 'todo' | 'doing' | 'done' | 'blocked';

export interface Milestone {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: MilestoneStatus;
  due_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export type TaskStatus = 'todo' | 'doing' | 'done' | 'blocked';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Task {
  id: string;
  project_id: string;
  milestone_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  position: number;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface TaskChecklistItem {
  id: string;
  task_id: string;
  label: string;
  is_done: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export type DocumentVisibility = 'private' | 'public';

export interface Document {
  id: string;
  project_id: string;
  label: string;
  storage_bucket: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  visibility: DocumentVisibility;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Types étendus avec relations pour l'UI
export interface TaskWithDetails extends Task {
  milestone?: Milestone;
  assignee?: Profile;
  comments?: TaskComment[];
  checklist_items?: TaskChecklistItem[];
}

export interface CommentWithAuthor extends TaskComment {
  author: Profile;
}

export interface ProjectWithDetails extends Project {
  client: Client;
  milestones?: Milestone[];
  tasks?: Task[];
  documents?: Document[];
  members?: Profile[];
}

// Types pour les formulaires
export interface CreateMilestoneData {
  project_id: string;
  title: string;
  description?: string;
  status?: MilestoneStatus;
  due_date?: string;
  position?: number;
}

export interface CreateTaskData {
  project_id: string;
  milestone_id?: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  position?: number;
  assigned_to?: string;
}

export interface CreateCommentData {
  task_id: string;
  body: string;
}

export interface CreateChecklistItemData {
  task_id: string;
  label: string;
  position?: number;
}

export interface UpdateTaskPositionData {
  id: string;
  status: TaskStatus;
  position: number;
}

export interface CreateDocumentData {
  project_id: string;
  label: string;
  storage_path: string;
  mime_type?: string;
  size_bytes?: number;
  visibility?: DocumentVisibility;
}

// ------------------------------
// Finance (Phase 3)
// ------------------------------

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'canceled'
export type InvoiceStatus = 'draft' | 'issued' | 'sent' | 'paid' | 'overdue' | 'canceled'
export type PaymentStatus = 'pending' | 'accepted' | 'refused' | 'canceled'

export interface Quote {
  id: string
  client_id: string
  project_id: string | null
  number: string
  currency: string
  total_ht: number
  total_tva: number
  total_ttc: number
  status: QuoteStatus
  pdf_url: string | null
  expires_at: string | null
  created_at: string
}

export interface QuoteItem {
  id: number
  quote_id: string
  label: string
  qty: number
  unit_price: number
  vat_rate: number
}

export interface Invoice {
  id: string
  client_id: string
  project_id: string | null
  number: string
  currency: string
  total_ht: number
  total_tva: number
  total_ttc: number
  due_date: string | null
  status: InvoiceStatus
  pdf_url: string | null
  external_ref: string | null
  created_at: string
}

export interface InvoiceItem {
  id: number
  invoice_id: string
  label: string
  qty: number
  unit_price: number
  vat_rate: number
}

export interface Payment {
  id: string
  invoice_id: string
  amount: number
  currency: string
  status: PaymentStatus
  method: string | null
  cinetpay_transaction_id: string | null
  operator_id: string | null
  paid_at: string | null
  raw_payload_json: unknown | null
  created_at: string
}

export type PaymentAttemptStatus =
  | 'created'
  | 'redirected'
  | 'webhooked'
  | 'checked'
  | 'completed'
  | 'failed'

export interface PaymentAttempt {
  id: string
  invoice_id: string
  cinetpay_payment_token: string | null
  cinetpay_payment_url: string | null
  transaction_id: string
  status: PaymentAttemptStatus
  channel: 'ALL' | 'MOBILE_MONEY' | 'CREDIT_CARD' | 'WALLET' | null
  amount: number
  currency: string
  notify_count: number
  created_at: string
}

export interface InvoiceWithRelations extends Invoice {
  client?: Client
  project?: Project
}

// Types pour les formulaires de création
export interface CreateQuoteData {
  client_id: string
  project_id?: string
  currency?: string
  total_ht?: number
  total_tva?: number
  total_ttc?: number
  status?: QuoteStatus
  expires_at?: string
}

// ------------------------------
// Phase 4 — Tickets
// ------------------------------

export type TicketStatus = 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed'

export interface TicketCategory {
  id: string
  label: string
}

export interface TicketPriority {
  id: string
  code: 'low' | 'normal' | 'high' | 'urgent'
  response_sla_minutes: number
  resolve_sla_minutes: number
}

export interface Ticket {
  id: string
  client_id: string
  project_id: string | null
  category_id: string | null
  priority_id: string | null
  subject: string
  status: TicketStatus
  first_response_due_at: string | null
  resolve_due_at: string | null
  last_customer_activity: string | null
  last_admin_activity: string | null
  created_by: string | null
  created_at: string
}

export interface TicketMessage {
  id: string
  ticket_id: string
  author_id: string
  body: string
  visibility: 'public' | 'internal'
  created_at: string
}

export interface TicketAttachment {
  id: string
  ticket_id: string
  label: string | null
  storage_bucket: string
  storage_path: string
  mime_type: string | null
  size_bytes: number | null
  created_by: string | null
  created_at: string
}

export interface CreateInvoiceData {
  client_id: string
  project_id?: string
  currency?: string
  total_ht?: number
  total_tva?: number
  total_ttc?: number
  status?: InvoiceStatus
  due_date?: string
  external_ref?: string
}

