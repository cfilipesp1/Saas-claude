export type UserRole = "OWNER" | "ADMIN" | "MANAGER" | "RECEPTION" | "PROFESSIONAL";

export type WaitlistStatus =
  | "NEW"
  | "CONTACTING"
  | "SCHEDULED"
  | "UNREACHABLE"
  | "NO_SHOW"
  | "CANCELLED"
  | "DONE";

export interface Profile {
  user_id: string;
  clinic_id: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface Clinic {
  id: string;
  name: string;
  created_at: string;
}

export interface Professional {
  id: string;
  clinic_id: string;
  name: string;
  specialty: string;
  active: boolean;
  created_at: string;
}

export interface Patient {
  id: string;
  clinic_id: string;
  codigo: string;
  name: string;
  phone: string;
  email: string;
  birth_date: string | null;
  address: string;
  responsavel_clinico_id: string;
  responsavel_orto_id: string;
  created_at: string;
}

export interface Anamnesis {
  id: string;
  clinic_id: string;
  patient_id: string;
  has_allergy: boolean;
  allergy_details: string;
  has_heart_disease: boolean;
  heart_details: string;
  has_diabetes: boolean;
  diabetes_details: string;
  has_hypertension: boolean;
  hypertension_details: string;
  has_bleeding_disorder: boolean;
  bleeding_details: string;
  uses_medication: boolean;
  medication_details: string;
  is_pregnant: boolean;
  is_smoker: boolean;
  other_conditions: string;
  has_alert: boolean;
  alert_message: string;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
}

export interface WaitlistEntry {
  id: string;
  clinic_id: string;
  patient_id: string;
  specialty: string;
  preferred_professional_id: string | null;
  priority: number;
  status: WaitlistStatus;
  notes: string;
  created_at: string;
  // joined
  patient?: Patient;
  professional?: Professional;
}

export interface WaitlistEvent {
  id: string;
  clinic_id: string;
  waitlist_entry_id: string;
  from_status: WaitlistStatus | null;
  to_status: WaitlistStatus;
  actor_user_id: string | null;
  note: string;
  created_at: string;
}

// ─── Financial Module ────────────────────────────────────────

export type FinancialType = "IN" | "OUT";
export type ReceivableStatus = "open" | "paid" | "overdue" | "renegotiated";
export type PayableStatus = "open" | "paid" | "overdue";
export type OriginType = "ortho_contract" | "procedure" | "manual" | "installment";
export type OrthoStatus = "active" | "completed" | "cancelled";
export type PaymentMethod =
  | "cash"
  | "credit_card"
  | "debit_card"
  | "pix"
  | "bank_transfer"
  | "check"
  | "other";

export interface Category {
  id: string;
  clinic_id: string;
  name: string;
  type: FinancialType;
  created_at: string;
}

export interface CostCenter {
  id: string;
  clinic_id: string;
  name: string;
  created_at: string;
}

export interface FinancialTransaction {
  id: string;
  clinic_id: string;
  type: FinancialType;
  patient_id: string | null;
  total_amount: number;
  payment_method: PaymentMethod;
  transaction_date: string;
  description: string;
  created_by: string | null;
  created_at: string;
  patient?: Patient | null;
  entries?: FinancialEntry[];
}

export interface FinancialEntry {
  id: string;
  clinic_id: string;
  transaction_id: string;
  category_id: string | null;
  cost_center_id: string | null;
  amount: number;
  created_at: string;
  category?: Category | null;
  cost_center?: CostCenter | null;
}

export interface Receivable {
  id: string;
  clinic_id: string;
  patient_id: string | null;
  origin_type: OriginType;
  origin_id: string | null;
  installment_num: number | null;
  total_installments: number | null;
  due_date: string;
  amount: number;
  status: ReceivableStatus;
  paid_amount: number;
  paid_at: string | null;
  description: string;
  created_at: string;
  patient?: Patient | null;
}

export interface Payable {
  id: string;
  clinic_id: string;
  supplier: string;
  due_date: string;
  amount: number;
  status: PayableStatus;
  paid_amount: number;
  paid_at: string | null;
  category_id: string | null;
  cost_center_id: string | null;
  description: string;
  created_at: string;
  category?: Category | null;
  cost_center?: CostCenter | null;
}

export interface OrthoContract {
  id: string;
  clinic_id: string;
  patient_id: string;
  monthly_amount: number;
  total_months: number;
  due_day: number;
  start_date: string;
  status: OrthoStatus;
  notes: string;
  created_at: string;
  patient?: Patient | null;
}

export interface RecurringRule {
  id: string;
  clinic_id: string;
  type: "receivable" | "payable";
  entity_id: string;
  frequency: "monthly";
  next_run: string;
  active: boolean;
  created_at: string;
}

// ─── Schedule / Appointments Module ─────────────────────────

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export interface Appointment {
  id: string;
  clinic_id: string;
  patient_id: string | null;
  professional_id: string;
  title: string;
  start_at: string;
  end_at: string;
  status: AppointmentStatus;
  notes: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // joined
  patient?: Patient | null;
  professional?: Professional | null;
}

// ─── Budgets Module ──────────────────────────────────────────

export type BudgetType = "ORTHO" | "SPECIALTY";
export type OrthoType = "TRADICIONAL" | "INVISALIGN";
export type BudgetStatus = "pending" | "approved" | "cancelled";

export interface BudgetUpsell {
  id: string;
  title: string;
  type: "mandatory" | "optional";
  monthlyDelta: number;
  oneTimeDelta: number;
}

export interface BudgetItem {
  id: string;
  procedure: string;
  benefit: string;
  entry: number;
  qty: number;
  total: number;
  totalCash: number;
}

export interface Budget {
  id: string;
  clinic_id: string;
  patient_id: string | null;
  type: BudgetType;
  ortho_type: OrthoType | null;
  model: string;
  monthly_value: number;
  installments: number;
  total: number;
  cash_value: number;
  upsells: BudgetUpsell[];
  items: BudgetItem[];
  due_day: number | null;
  is_cash: boolean;
  is_plan_complement: boolean;
  notes: string;
  status: BudgetStatus;
  created_by: string | null;
  created_at: string;
  patient?: Patient | null;
}
