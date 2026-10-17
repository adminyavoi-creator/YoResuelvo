export type Category = { slug: string; name: string; position: number };
export type Municipality = { slug: string; name: string; position: number };
export type Provider = {
  id: string; display_name: string; bio: string; municipality_slug: string;
  approval_status: 'pending' | 'approved' | 'rejected' | 'suspended'; available: boolean;
  categories: string[];
  years_experience?: number | null; specialties?: string[]; photo_paths?: string[];
};
export type ServiceRequest = {
  id: string; client_id: string; category_slug: string; municipality_slug: string;
  title: string; description: string; preferred_at: string | null;
  status: string; created_at: string;
};
export type Quote = {
  id: string; request_id: string; provider_id: string; version: number; scope: string;
  materials_note: string; exclusions: string; labor_amount: number;
  materials_amount: number; travel_amount: number; total_amount: number;
  expires_at: string; proposed_at: string | null; created_at: string;
};
export type Job = {
  id: string; request_id: string; quote_version_id: string; client_id: string;
  provider_id: string; scheduled_at: string | null; status: string; created_at: string;
};
export type Ticket = {
  id: string; job_id: string | null; client_id: string | null; provider_id: string | null;
  folio: string; agreement: Record<string, unknown>; issued_at: string;
  archived_status: string | null; archived_at: string | null;
};
export type PendingProvider = Pick<Provider, 'id' | 'display_name' | 'bio' | 'municipality_slug'>;
export type Address = { request_id: string; client_id: string; address: string };
export type Review = { provider_id: string; rating: number; body: string; created_at: string };
export type OwnReview = Review & { job_id: string; client_id: string; published: boolean };
export type ModerationReview = Review & { job_id: string; published: boolean };
export type Notification = { id: number; recipient_id: string; title: string; body: string; read_at: string | null; created_at: string };
export type Report = { id: string; job_id: string; reason: string; created_at: string };
export type JobEvent = { id: number; job_id: string; actor_id: string; previous_status: string | null; next_status: string; reason: string | null; created_at: string };
export type JobMessage = { id: number; job_id: string; sender_id: string; body: string; created_at: string };
export type NotificationPreferences = {
  user_id: string; in_app: boolean; email_updates: boolean; push_updates: boolean; updated_at: string;
};
export type Appeal = {
  report_id: string; job_id: string; resolved_at: string; appeal_id: string | null;
  appeal_reason: string | null; appeal_status: 'pending' | 'accepted' | 'rejected' | null;
  response: string | null; appeal_created_at: string | null; can_appeal: boolean;
};
export type PendingAppeal = {
  id: string; report_id: string; job_id: string; appellant_id: string; reason: string; created_at: string;
};
export type ProviderAreaCount = { municipality_slug: string; category_slug: string; provider_count: number };
export type OperationalMetrics = {
  requests_total: number; requests_open: number; requests_contracted: number; conversion_pct: number | null;
  providers_active: number; jobs_completed: number; jobs_disputed: number; reports_open: number;
  appeals_open: number; quote_sample_size: number; median_first_quote_minutes: number | null;
  providers_by_area: ProviderAreaCount[];
};
