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
  name: string;
  phone: string;
  email: string;
  cpf: string;
  birth_date: string | null;
  notes: string;
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
