import { createClient } from '@supabase/supabase-js';
import type { Category, Municipality, Provider, ServiceRequest, Quote, Job, Ticket, PendingProvider, Address, Review, OwnReview, ModerationReview, Notification, Report, JobEvent, JobMessage } from './types';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const configured = Boolean(url && key);
export const db = configured ? createClient(url, key) : null;

function requireDb() {
  if (!db) throw new Error('Falta configurar el proyecto independiente de YoResuelvo!.');
  return db;
}
function value<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null) throw new Error('No se recibió respuesta.');
  return result.data;
}

export async function catalog(): Promise<{ categories: Category[]; municipalities: Municipality[]; providers: Provider[]; reviews: Review[] }> {
  const client = requireDb();
  const [categoriesResult, municipalitiesResult, providersResult, linksResult, reviewsResult] = await Promise.all([
    client.from('categories').select('slug,name,position').order('position'),
    client.from('municipalities').select('slug,name,position').order('position'),
    client.from('provider_profiles').select('id,display_name,bio,municipality_slug,approval_status,available')
      .eq('approval_status', 'approved').eq('available', true).order('created_at', { ascending: false }).limit(100),
    client.from('provider_categories').select('provider_id,category_slug'),
    client.rpc('published_reviews')
  ]);
  const categories = value(categoriesResult) as Category[];
  const municipalities = value(municipalitiesResult) as Municipality[];
  const links = value(linksResult) as { provider_id: string; category_slug: string }[];
  const providers = (value(providersResult) as Omit<Provider, 'categories'>[]).map(p => ({
    ...p, categories: links.filter(link => link.provider_id === p.id).map(link => link.category_slug)
  }));
  return { categories, municipalities, providers, reviews: value(reviewsResult) as Review[] };
}

export async function saveProvider(input: {
  id: string; display_name: string; bio: string; municipality_slug: string;
  available: boolean; categories: string[]; exists: boolean;
}) {
  const client = requireDb();
  const { categories, exists, ...profile } = input;
  if (!categories.length) throw new Error('Selecciona al menos un oficio.');
  if (exists) {
    const { id: _id, ...editable } = profile;
    void _id;
    value(await client.from('provider_profiles').update(editable).eq('id', input.id).select('id').single());
  }
  else value(await client.from('provider_profiles').insert(profile).select('id').single());
  const { error: deleteError } = await client.from('provider_categories').delete().eq('provider_id', input.id);
  if (deleteError) throw new Error(deleteError.message);
  const { error: insertError } = await client.from('provider_categories')
    .insert(categories.map(category_slug => ({ provider_id: input.id, category_slug })));
  if (insertError) throw new Error(insertError.message);
}

export async function workspace(userId: string) {
  const client = requireDb();
  const [requests, quotes, jobs, tickets, provider, links, staff, addresses, ownReviews, notifications, events, messages] = await Promise.all([
    client.from('service_requests').select('*').order('created_at', { ascending: false }).limit(100),
    client.from('quote_versions').select('*').order('created_at', { ascending: false }).limit(200),
    client.from('jobs').select('*').order('created_at', { ascending: false }).limit(100),
    client.from('tickets').select('*').order('issued_at', { ascending: false }).limit(100),
    client.from('provider_profiles').select('*').eq('id', userId).maybeSingle(),
    client.from('provider_categories').select('provider_id,category_slug').eq('provider_id', userId),
    client.rpc('staff_role'),
    client.from('request_addresses').select('*').limit(100),
    client.from('reviews').select('*').limit(100),
    client.from('notifications').select('*').order('created_at', { ascending: false }).limit(50),
    client.from('job_events').select('*').order('created_at', { ascending: false }).limit(200),
    client.from('conversation_messages').select('*').order('created_at').limit(500)
  ]);
  for (const result of [requests, quotes, jobs, tickets, provider, links, staff, addresses, ownReviews, notifications, events, messages]) {
    if (result.error) throw new Error(result.error.message);
  }
  const ownProvider = provider.data ? {
    ...(provider.data as Omit<Provider, 'categories'>),
    categories: ((links.data ?? []) as { category_slug: string }[]).map(link => link.category_slug)
  } : null;
  return {
    requests: (requests.data ?? []) as ServiceRequest[],
    quotes: (quotes.data ?? []) as Quote[],
    jobs: (jobs.data ?? []) as Job[],
    tickets: (tickets.data ?? []) as Ticket[],
    ownProvider,
    staffRole: staff.data as string | null,
    addresses: (addresses.data ?? []) as Address[],
    ownReviews: (ownReviews.data ?? []) as OwnReview[],
    notifications: (notifications.data ?? []) as Notification[],
    events: (events.data ?? []) as JobEvent[],
    messages: (messages.data ?? []) as JobMessage[]
  };
}

export async function createRequest(input: {
  category: string; municipality: string; title: string; description: string;
  providerIds: string[]; preferredAt: string | null;
}) {
  const result = await requireDb().rpc('create_request', {
    p_category: input.category, p_municipality: input.municipality,
    p_title: input.title, p_description: input.description,
    p_provider_ids: input.providerIds, p_preferred_at: input.preferredAt
  });
  return value(result) as string;
}
export async function submitQuote(input: {
  requestId: string; scope: string; materialsNote: string; exclusions: string;
  labor: number; materials: number; travel: number; expiresAt: string; proposedAt: string | null;
}) {
  return value(await requireDb().rpc('submit_quote', {
    p_request_id: input.requestId, p_scope: input.scope, p_materials_note: input.materialsNote,
    p_exclusions: input.exclusions, p_labor: input.labor, p_materials: input.materials,
    p_travel: input.travel, p_expires_at: input.expiresAt, p_proposed_at: input.proposedAt
  })) as string;
}
export async function acceptQuote(quoteId: string) {
  const result = value(await requireDb().rpc('accept_quote', { p_quote_id: quoteId }));
  return (result as { job_id: string; ticket_folio: string }[])[0];
}
export async function pendingProviders() {
  return value(await requireDb().rpc('pending_providers')) as PendingProvider[];
}
export async function reviewProvider(id: string, status: 'approved' | 'rejected' | 'suspended', reason: string) {
  const { error } = await requireDb().rpc('review_provider', {
    p_provider_id: id, p_status: status, p_reason: reason
  });
  if (error) throw new Error(error.message);
}
export async function saveAddress(requestId: string, clientId: string, address: string, exists: boolean) {
  const client = requireDb();
  const result = exists
    ? await client.from('request_addresses').update({ address }).eq('request_id', requestId)
    : await client.from('request_addresses').insert({ request_id: requestId, client_id: clientId, address });
  if (result.error) throw new Error(result.error.message);
}
export async function setJobStatus(jobId: string, next: string, reason: string | null) {
  const { error } = await requireDb().rpc('set_job_status', { p_job_id: jobId, p_next: next, p_reason: reason });
  if (error) throw new Error(error.message);
}
export async function createReview(jobId: string, rating: number, body: string) {
  const { error } = await requireDb().rpc('create_review', { p_job_id: jobId, p_rating: rating, p_body: body });
  if (error) throw new Error(error.message);
}
export async function markNotificationRead(id: number) {
  const { error } = await requireDb().from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(error.message);
}
export async function pendingReports() {
  return value(await requireDb().rpc('pending_reports')) as Report[];
}
export async function reviewQueue() {
  return value(await requireDb().rpc('review_queue')) as ModerationReview[];
}
export async function moderateReview(jobId: string, published: boolean, reason: string) {
  const { error } = await requireDb().rpc('moderate_review', {
    p_job_id: jobId, p_published: published, p_reason: reason
  });
  if (error) throw new Error(error.message);
}
export async function sendJobMessage(jobId: string, body: string) {
  const { error } = await requireDb().rpc('send_job_message', { p_job_id: jobId, p_body: body });
  if (error) throw new Error(error.message);
}
