import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  db, configured, catalog, workspace, saveProvider, createRequest, submitQuote,
  acceptQuote, pendingProviders, reviewProvider, saveAddress, setJobStatus,
  createReview, markNotificationRead, pendingReports, reviewQueue, moderateReview, sendJobMessage,
  saveNotificationPreferences, exportMyData, fileReportAppeal, pendingAppeals, reviewReportAppeal, operationalMetrics
} from './lib/api';
import { demoCategories, demoMunicipalities, demoProviders } from './lib/demo';
import type {
  Category, Municipality, Provider, ServiceRequest, Quote, Job, Ticket, PendingProvider,
  Address, Review, OwnReview, ModerationReview, Notification, Report, JobEvent, JobMessage,
  NotificationPreferences, Appeal, PendingAppeal, OperationalMetrics
} from './lib/types';

type Page = 'explorar' | 'solicitudes' | 'ofrecer' | 'tickets' | 'moderacion' | 'cuenta';
type AuthIntent = 'cliente' | 'prestador';
const money = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
const date = (v: string | null) => v
  ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Chihuahua' }).format(new Date(v))
  : 'Por acordar';
const label = (items: { slug: string; name: string }[], slug: string) => items.find(i => i.slug === slug)?.name ?? slug;
const errText = (error: unknown) => error instanceof Error ? error.message : 'No se pudo completar la operación.';

export default function App() {
  const [page, setPage] = useState<Page>('explorar');
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<Category[]>(demoCategories);
  const [municipalities, setMunicipalities] = useState<Municipality[]>(demoMunicipalities);
  const [providers, setProviders] = useState<Provider[]>(configured ? [] : demoProviders);
  const [ownProvider, setOwnProvider] = useState<Provider | null>(null);
  const [staffRole, setStaffRole] = useState<string | null>(null);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [pending, setPending] = useState<PendingProvider[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [moderationReviews, setModerationReviews] = useState<ModerationReview[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [ownReviews, setOwnReviews] = useState<OwnReview[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [events, setEvents] = useState<JobEvent[]>([]);
  const [messages, setMessages] = useState<JobMessage[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [appealsQueue, setAppealsQueue] = useState<PendingAppeal[]>([]);
  const [metrics, setMetrics] = useState<OperationalMetrics | null>(null);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const [compared, setCompared] = useState<string[]>([]);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestCategory, setRequestCategory] = useState('');
  const [requestCity, setRequestCity] = useState('');
  const [requestIds, setRequestIds] = useState<string[]>([]);
  const [recovery, setRecovery] = useState(false);
  const [authIntent, setAuthIntent] = useState<AuthIntent>('cliente');

  async function refresh(currentUser: User | null = user) {
    if (!configured) return;
    const c = await catalog();
    setCategories(c.categories);
    setMunicipalities(c.municipalities);
    setProviders(c.providers);
    setReviews(c.reviews);
    if (currentUser) {
      const w = await workspace(currentUser.id);
      setRequests(w.requests);
      setQuotes(w.quotes);
      setJobs(w.jobs);
      setTickets(w.tickets);
      setOwnProvider(w.ownProvider);
      setStaffRole(w.staffRole);
      setAddresses(w.addresses); setOwnReviews(w.ownReviews);
      setNotifications(w.notifications); setEvents(w.events); setMessages(w.messages);
      setPreferences(w.preferences); setAppeals(w.appeals);
      if (w.staffRole) {
        const [p, r, reviewItems, appealItems, operational] = await Promise.all([
          pendingProviders(), pendingReports(), reviewQueue(), pendingAppeals(), operationalMetrics()
        ]);
        setPending(p); setReports(r); setModerationReviews(reviewItems);
        setAppealsQueue(appealItems); setMetrics(operational);
      } else {
        setPending([]); setReports([]); setModerationReviews([]); setAppealsQueue([]); setMetrics(null);
      }
    } else {
      setRequests([]); setQuotes([]); setJobs([]); setTickets([]);
      setOwnProvider(null); setStaffRole(null); setPending([]); setReports([]); setModerationReviews([]);
      setAddresses([]); setOwnReviews([]); setNotifications([]); setEvents([]); setMessages([]);
      setPreferences(null); setAppeals([]); setAppealsQueue([]); setMetrics(null);
    }
  }
  useEffect(() => {
    let active = true;
    async function initialize() {
      try {
        const currentUser = db ? (await db.auth.getUser()).data.user : null;
        if (!active) return;
        setUser(currentUser);
        await refresh(currentUser);
      } catch (e) { if (active) setError(errText(e)); }
      finally { if (active) setReady(true); }
    }
    void initialize();
    const subscription = db?.auth.onAuthStateChange((event, session) => {
      if (active) {
        setUser(session?.user ?? null);
        if (event === 'PASSWORD_RECOVERY') { setRecovery(true); setPage('cuenta'); }
      }
    }).data.subscription;
    return () => { active = false; subscription?.unsubscribe(); };
    // One initial load; refresh after explicit mutations and auth changes below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!ready || !configured) return;
    void refresh(user).catch(e => setError(errText(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function authAction(task: () => Promise<unknown>, success: string, next?: Page): Promise<boolean> {
    setBusy(true); setMessage(''); setError('');
    try {
      await task();
      const current = configured ? (await db!.auth.getUser()).data.user : null;
      setUser(current);
      await refresh(current);
      setMessage(success);
      if (next) setPage(next);
      return true;
    } catch (e) { setError(errText(e)); return false; }
    finally { setBusy(false); }
  }
  function action(task: () => Promise<unknown>, success: string, next?: Page): Promise<void> {
    return authAction(task, success, next).then(() => undefined);
  }
  function navigate(next: Page) {
    setPage(next); setMessage(''); setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  const filtered = useMemo(() => providers.filter(p => {
    const q = search.trim().toLocaleLowerCase('es');
    return (!city || p.municipality_slug === city) && (!category || p.categories.includes(category))
      && (!q || (p.display_name + ' ' + p.bio + ' ' + p.categories.map(c => label(categories, c)).join(' '))
        .toLocaleLowerCase('es').includes(q));
  }), [providers, city, category, search, categories]);
  function startRequest(selected: Provider[]) {
    if (!configured) { window.location.href = '/demo/#catalogo'; return; }
    if (!user) { setAuthIntent('cliente'); navigate('cuenta'); return; }
    const first = selected[0];
    if (!first) return;
    setRequestCategory(category || first.categories[0] || '');
    setRequestCity(city || first.municipality_slug);
    setRequestIds(selected.map(p => p.id));
    setRequestOpen(true);
    setTimeout(() => document.getElementById('request-form')?.scrollIntoView({ behavior: 'smooth' }), 0);
  }

  return <div className="app-shell">
    <header className="header wrap">
      <button type="button" className="brand" onClick={() => navigate('explorar')} aria-label="YoResuelvo!, inicio">
        <img src="/logo.svg" alt="" /><span>YoResuelvo<span className="brand-mark">!</span><small>DELICIAS Y LA REGIÓN</small></span>
      </button>
      <nav aria-label="Navegación principal">
        <button type="button" aria-current={page === 'explorar' ? 'page' : undefined} onClick={() => navigate('explorar')}>Explorar</button>
        <button type="button" aria-current={page === 'solicitudes' ? 'page' : undefined} onClick={() => navigate('solicitudes')}>Solicitudes</button>
        <button type="button" aria-current={page === 'ofrecer' ? 'page' : undefined} onClick={() => navigate('ofrecer')}>Ofrecer</button>
        <button type="button" aria-current={page === 'tickets' ? 'page' : undefined} onClick={() => navigate('tickets')}>Tickets</button>
        {staffRole && <button type="button" aria-current={page === 'moderacion' ? 'page' : undefined} onClick={() => navigate('moderacion')}>Revisión</button>}
      </nav>
      <button type="button" className="button outline account-button" onClick={() => navigate('cuenta')}>{user ? 'Mi cuenta' : 'Ingresar'}</button>
    </header>
    <main className="wrap">
      {!configured && <div className="demo-banner" role="status"><span>●</span> Vista de diseño · perfiles ficticios. <a href="/demo/">Abrir demo interactiva</a></div>}
      {!ready && <p role="status">Cargando…</p>}
      {error && <p className="alert error" role="alert">{error}</p>}
      {message && <p className="alert success" role="status">{message}</p>}
      {page === 'explorar' && <>
        <section className="hero">
          <div>
            <p className="eyebrow">GENTE CAPAZ, CERCA DE TI</p>
            <h1>Eso que necesitas.<br /><em>Alguien lo resuelve.</em></h1>
            <p>Descubre personas de tu región, compara opciones y acuerda el alcance antes de empezar.</p>
            <div className="hero-actions"><a className="button primary" href="#catalogo">Buscar un servicio <span aria-hidden="true">→</span></a><button className="button light" type="button" onClick={() => navigate('ofrecer')}>Quiero ofrecer servicios</button></div>
            <small>Sin pagos dentro de la app. El acuerdo se realiza directamente entre las partes.</small>
          </div>
          <div className="hero-visual" aria-hidden="true"><div className="symbol"><img src="/logo.svg" alt="" /></div><span className="visual-tag tag-a">Talento local</span><span className="visual-tag tag-b">Delicias · tu región</span></div>
        </section>
        <section id="catalogo" className="section">
          <div className="section-head"><div><p className="eyebrow">ENCUENTRA A TU PERSONA</p><h2>¿Qué quieres resolver?</h2><p>Busca por oficio, municipio o tarea.</p></div><span className="count">{filtered.length} perfiles {configured ? 'disponibles' : 'de ejemplo'}</span></div>
          <div className="filters">
            <label>Buscar tarea<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Ej. reparar una fuga" /></label>
            <label>Municipio<select value={city} onChange={e => { setCity(e.target.value); setCompared([]); }}><option value="">Toda la región</option>{municipalities.map(m => <option key={m.slug} value={m.slug}>{m.name}</option>)}</select></label>
            <label>Servicio<select value={category} onChange={e => { setCategory(e.target.value); setCompared([]); }}><option value="">Todos</option>{categories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></label>
          </div>
          {filtered.length ? <div className="cards">{filtered.map(p => <article className="card" key={p.id}>
            <div className="card-head"><span className="avatar" aria-hidden="true">{p.display_name.slice(0, 1)}</span><div><h3>{p.display_name}</h3><small>{p.categories.map(c => label(categories, c)).join(' · ')}</small></div></div>
            <p className="place">⌖ {label(municipalities, p.municipality_slug)} · {configured ? 'Perfil aprobado' : 'Ejemplo visual'}</p>
            {configured && (() => { const ratings = reviews.filter(r => r.provider_id === p.id); return ratings.length
              ? <p className="rating">★ {(ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)} · {ratings.length} reseña{ratings.length === 1 ? '' : 's'}</p>
              : <p className="fine">Aún sin reseñas en la plataforma</p>; })()}
            <p>{p.bio}</p><p className="fine">Cotización según tarea, materiales y traslado. {configured ? 'Precio según propuesta aceptada.' : 'Datos ficticios.'}</p>
            <div className="card-actions"><button type="button" className="button outline" aria-pressed={compared.includes(p.id)}
              disabled={compared.length >= 3 && !compared.includes(p.id)}
              onClick={() => setCompared(ids => ids.includes(p.id) ? ids.filter(id => id !== p.id) : [...ids, p.id])}>
              {compared.includes(p.id) ? '✓ Elegido' : '＋ Comparar'}
            </button><button type="button" className="button primary" onClick={() => startRequest([p])}>Solicitar</button></div>
          </article>)}</div> : <div className="empty"><h3>Sin perfiles para estos filtros</h3><p>Prueba otro municipio o servicio. Una cuenta nueva puede tardar en ser aprobada.</p><button className="button outline" type="button" onClick={() => { setSearch(''); setCity(''); setCategory(''); }}>Limpiar filtros</button></div>}
          {compared.length > 0 && <section className="compare" aria-label="Comparación de prestadores"><div className="section-head"><h3>Compara hasta tres</h3><button className="text-button" onClick={() => setCompared([])}>Limpiar</button></div><div className="compare-grid">{compared.map(id => {
            const p = providers.find(item => item.id === id);
            return p && <div key={id}><strong>{p.display_name}</strong><span>{label(municipalities, p.municipality_slug)}</span><span>{p.categories.map(c => label(categories, c)).join(', ')}</span><p>{p.bio}</p></div>;
          })}</div><p className="fine">Compara alcance y materiales cuando recibas cotizaciones. Aquí no se muestran calificaciones ni precios inventados.</p><button type="button" className="button primary" onClick={() => startRequest(compared.map(id => providers.find(p => p.id === id)).filter((p): p is Provider => Boolean(p)))}>Solicitar cotización</button></section>}
          {requestOpen && <RequestForm key={requestIds.join(',')} providers={providers} categories={categories} municipalities={municipalities}
            initialCategory={requestCategory} initialCity={requestCity} initialIds={requestIds} busy={busy}
            onCancel={() => setRequestOpen(false)} onSubmit={async input => {
              await action(() => createRequest(input), 'Solicitud enviada a los prestadores elegidos.', 'solicitudes');
            }} />}
        </section>
      </>}
      {page === 'cuenta' && <Account user={user} notifications={notifications} preferences={preferences}
        authIntent={authIntent} onAuthIntentChange={setAuthIntent}
        onRead={id => action(() => markNotificationRead(id), 'Aviso marcado como leído.', 'cuenta')}
        onSavePreferences={inApp => action(() => saveNotificationPreferences(user!.id, inApp), 'Preferencias actualizadas.', 'cuenta')}
        onExport={() => action(async () => {
          const content = await exportMyData(user!.id, user!.email ?? undefined);
          const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url; link.download = `YoResuelvo-datos-${new Date().toISOString().slice(0,10)}.json`;
          document.body.append(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        }, 'Tu archivo de datos está listo para guardar.', 'cuenta')}
        recovery={recovery} onRecovered={() => setRecovery(false)} busy={busy} onAction={authAction} />}
      {page === 'ofrecer' && <ProviderPage user={user} current={ownProvider} categories={categories} municipalities={municipalities}
        configured={configured} busy={busy} onSignIn={() => { setAuthIntent('prestador'); navigate('cuenta'); }}
        onSave={input => action(() => saveProvider(input), 'Perfil guardado. La aprobación depende de una revisión.', 'ofrecer')} />}
      {page === 'solicitudes' && <RequestsPage user={user} requests={requests} quotes={quotes} jobs={jobs} providers={providers}
        categories={categories} municipalities={municipalities} busy={busy} configured={configured} onSignIn={() => navigate('cuenta')}
        onExplore={() => navigate('explorar')}
        onQuote={input => action(() => submitQuote(input), 'Cotización enviada; el cliente ya puede revisarla.', 'solicitudes')}
        onAccept={id => action(() => acceptQuote(id), 'Cotización aceptada. El ticket quedó disponible.', 'tickets')} />}
      {page === 'tickets' && <TicketsPage user={user} jobs={jobs} tickets={tickets} requests={requests} addresses={addresses} ownReviews={ownReviews} events={events} messages={messages} appeals={appeals} busy={busy}
        configured={configured} onSignIn={() => navigate('cuenta')}
        onAddress={(requestId, address, exists) => action(() => saveAddress(requestId, user!.id, address, exists), 'Dirección guardada para las partes del servicio.', 'tickets')}
        onStatus={(jobId, next, reason) => action(() => setJobStatus(jobId, next, reason), 'Estado actualizado y registrado.', 'tickets')}
        onReview={(jobId, rating, body) => action(() => createReview(jobId, rating, body), 'Reseña publicada para este trabajo.', 'tickets')}
        onMessage={(jobId, body) => action(() => sendJobMessage(jobId, body), 'Mensaje enviado de forma privada.', 'tickets')}
        onAppeal={(reportId, reason) => action(() => fileReportAppeal(reportId, reason), 'Apelación registrada para revisión.', 'tickets')} />}
      {page === 'moderacion' && staffRole && <section className="section"><p className="eyebrow">OPERACIÓN</p><h1>Perfiles por revisar</h1>
        {metrics && <OperationalMetricsPanel metrics={metrics} municipalities={municipalities} categories={categories} />}
        <h2>Apelaciones</h2>
        {appealsQueue.length ? <div className="request-list">{appealsQueue.map(appeal => <AppealReviewCard key={appeal.id} appeal={appeal} busy={busy}
          onReview={(status, response) => action(() => reviewReportAppeal(appeal.id, status, response), 'Decisión de apelación registrada.', 'moderacion')} />)}</div>
          : <p className="empty">No hay apelaciones pendientes.</p>}
        {pending.length ? <div className="cards">{pending.map(p => <ReviewCard key={p.id} provider={p} busy={busy} onReview={(status, reason) => action(
          () => reviewProvider(p.id, status, reason), 'Decisión registrada con motivo.', 'moderacion'
        )} />)}</div> : <p className="empty">No hay perfiles pendientes.</p>}
        <h2>Incidencias abiertas</h2>
        {reports.length ? <div className="request-list">{reports.map(report => <ReportCard key={report.id} report={report} busy={busy}
          onResolve={(next, reason) => action(() => setJobStatus(report.job_id, next, reason), 'Incidencia resuelta con motivo auditado.', 'moderacion')} />)}</div> : <p className="empty">No hay incidencias abiertas.</p>}
        <h2>Reseñas</h2>
        {moderationReviews.length ? <div className="request-list">{moderationReviews.map(review => <ModerationReviewCard key={review.job_id} review={review} busy={busy}
          onModerate={(published, reason) => action(() => moderateReview(review.job_id, published, reason), 'Reseña revisada con motivo auditado.', 'moderacion')} />)}</div> : <p className="empty">Aún no hay reseñas.</p>}
      </section>}
    </main>
    <footer className="wrap"><span>YoResuelvo! · Delicias y la región</span><small>Los tickets registran acuerdos de servicio; no son facturas ni comprobantes de pago.</small></footer>
  </div>;
}

function Account({ user, notifications, preferences, onRead, onSavePreferences, onExport, recovery, onRecovered, busy, onAction, authIntent, onAuthIntentChange }: {
  user: User | null; notifications: Notification[]; preferences: NotificationPreferences | null;
  onRead: (id: number) => Promise<void>; onSavePreferences: (inApp: boolean) => Promise<void>; onExport: () => Promise<void>;
  recovery: boolean; onRecovered: () => void; busy: boolean;
  authIntent: AuthIntent; onAuthIntentChange: (intent: AuthIntent) => void;
  onAction: (task: () => Promise<unknown>, success: string, next?: Page) => Promise<boolean>;
}) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [localNotice, setLocalNotice] = useState('');
  const [inApp, setInApp] = useState(true);
  useEffect(() => { if (preferences) setInApp(preferences.in_app); }, [preferences?.in_app]);
  useEffect(() => {
    if (recovery) { setMode('signin'); setPassword(''); setPasswordConfirm(''); setLocalNotice(''); }
  }, [recovery]);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalNotice('');
    const emailAddress = email.trim().toLowerCase();
    const client = db;
    if (!client) { setLocalNotice('El acceso estará disponible cuando se restablezca la conexión.'); return; }
    if (recovery) {
      if (password.length < 8) { setLocalNotice('Usa una contraseña de al menos 8 caracteres.'); return; }
      if (password !== passwordConfirm) { setLocalNotice('Las contraseñas no coinciden.'); return; }
      const saved = await onAction(async () => {
        const { error } = await client.auth.updateUser({ password });
        if (error) throw error;
        onRecovered();
      }, 'Contraseña actualizada.', 'cuenta');
      if (saved) { setPassword(''); setPasswordConfirm(''); }
      return;
    }
    if (mode === 'signup') {
      if (name.trim().length < 2) { setLocalNotice('Escribe tu nombre para crear la cuenta.'); return; }
      if (password.length < 8) { setLocalNotice('Usa una contraseña de al menos 8 caracteres.'); return; }
      if (password !== passwordConfirm) { setLocalNotice('Las contraseñas no coinciden.'); return; }
      const created = await onAction(async () => {
        const { error } = await client.auth.signUp({ email: emailAddress, password, options: { data: { full_name: name.trim(), display_name: name.trim() } } });
        if (error) throw error;
      }, 'Cuenta creada. Revisa tu correo para confirmar el acceso.');
      if (created) { setPassword(''); setPasswordConfirm(''); setLocalNotice('Abre el mensaje de confirmación en tu correo y después inicia sesión con esta misma cuenta.'); }
      return;
    }
    if (mode === 'reset') {
      const sent = await onAction(async () => {
        const { error } = await client.auth.resetPasswordForEmail(emailAddress, { redirectTo: window.location.origin });
        if (error) throw error;
      }, 'Si existe una cuenta con ese correo, recibirás un enlace para recuperar el acceso.', 'cuenta');
      if (sent) setLocalNotice('Revisa tu bandeja de entrada y spam. El enlace volverá a YoResuelvo para que definas una contraseña nueva.');
      return;
    }
    const signedIn = await onAction(async () => {
      const { error } = await client.auth.signInWithPassword({ email: emailAddress, password });
      if (error) throw error;
    }, 'Sesión iniciada.', authIntent === 'prestador' ? 'ofrecer' : 'explorar');
    if (signedIn) setPassword('');
  }

  const displayName = String(user?.user_metadata.display_name ?? user?.user_metadata.full_name ?? user?.email ?? 'Tu cuenta');
  return <section className="section auth-section">
    <aside className="auth-aside">
      <div className="auth-brand"><img src="/logo.svg" alt="" /><span>YoResuelvo<span>!</span><small>DELICIAS Y LA REGIÓN</small></span></div>
      <p className="auth-kicker">GENTE CAPAZ, CERCA DE TI</p>
      <h1>{recovery ? 'Recupera el control de tu cuenta.' : user ? 'Qué bueno tenerte aquí.' : mode === 'signup' ? 'Tu siguiente paso empieza aquí.' : mode === 'reset' ? 'Volvamos a abrirte el camino.' : 'Resuelve lo que sigue.'}</h1>
      <p className="auth-lead">{user ? 'Tu cuenta te sirve para encontrar ayuda y también ofrecer tus servicios.' : 'Conecta con personas de confianza de Delicias y la región, con un acceso sencillo y seguro.'}</p>
      {!user && !recovery && <div className="auth-intent-picker" aria-label="Elige cómo quieres empezar">
        <button type="button" className={authIntent === 'cliente' ? 'auth-intent selected' : 'auth-intent'} aria-pressed={authIntent === 'cliente'} onClick={() => onAuthIntentChange('cliente')}>
          <span className="auth-intent-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.4"/><path d="m16 16 4.3 4.3"/></svg></span>
          <span><strong>Busco resolver algo</strong><small>Comparar y solicitar un servicio</small></span>
        </button>
        <button type="button" className={authIntent === 'prestador' ? 'auth-intent selected' : 'auth-intent'} aria-pressed={authIntent === 'prestador'} onClick={() => onAuthIntentChange('prestador')}>
          <span className="auth-intent-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 8.5h16v11H4zM8 8.5V5h8v3.5M4 13h16M10 12v2h4v-2"/></svg></span>
          <span><strong>Quiero ofrecer servicios</strong><small>Crear un perfil profesional</small></span>
        </button>
        <p>Una sola cuenta puede hacer ambas cosas. Esta elección solo te lleva a la sección indicada.</p>
      </div>}
      <div className="auth-trust"><span aria-hidden="true">✓</span><p><strong>Acceso de Supabase Auth</strong><small>Tu contraseña no se guarda en YoResuelvo.</small></p></div>
    </aside>

    <div className="auth-main">
      {!recovery && user ? <div className="panel account-panel">
        <p className="eyebrow">TU ESPACIO</p><div className="account-identity"><span className="account-avatar" aria-hidden="true">{displayName.slice(0, 1).toUpperCase()}</span><div><h2>Sesión activa</h2><p>{displayName}{displayName !== user.email && user.email ? <small>{user.email}</small> : null}</p></div></div>
        <p className="fine">Una misma cuenta te permite solicitar y ofrecer servicios cuando quieras.</p>
        <button className="button outline" type="button" disabled={busy} onClick={() => void onAction(async () => {
          const { error } = await db!.auth.signOut(); if (error) throw error;
        }, 'Sesión cerrada.', 'explorar')}>Cerrar sesión</button>
        <div className="privacy-panel">
          <h2>Preferencias de avisos</h2>
          <form className="form" onSubmit={e => { e.preventDefault(); void onSavePreferences(inApp); }}>
            <label className="inline"><input type="checkbox" checked={inApp} onChange={e => setInApp(e.target.checked)} /> Avisos dentro de la aplicación</label>
            <label className="inline locked"><input type="checkbox" defaultChecked={false} disabled /> Correo electrónico · proveedor pendiente</label>
            <label className="inline locked"><input type="checkbox" defaultChecked={false} disabled /> Notificaciones push · pruebas pendientes</label>
            <button className="button outline" type="submit" disabled={busy}>Guardar preferencias</button>
          </form>
          <p className="fine">Correo y push permanecen apagados hasta configurar proveedores y validar el consentimiento.</p>
        </div>
        <div className="privacy-panel">
          <h2>Descargar mis datos</h2>
          <p className="fine">Prepara un archivo JSON con tus datos y los registros de servicios en que participas, respetando los permisos de tu cuenta. El archivo se descarga en este dispositivo.</p>
          <button type="button" className="button outline" disabled={busy} onClick={() => void onExport()}>Descargar archivo de datos</button>
        </div>
        <h2>Avisos</h2>{notifications.length ? <div className="notice-list">{notifications.map(n => <div key={n.id} className="notice"><strong>{n.title}</strong><p>{n.body}</p><small>{date(n.created_at)}</small>{!n.read_at && <button type="button" className="text-button" onClick={() => void onRead(n.id)}>Marcar leído</button>}</div>)}</div> : <p className="fine">Sin avisos todavía.</p>}
      </div> : <div className="panel auth-card">
        <p className="eyebrow">{recovery ? 'ACTUALIZA TU ACCESO' : mode === 'signup' ? 'CREAR CUENTA' : mode === 'reset' ? 'RECUPERACIÓN' : 'INICIAR SESIÓN'}</p>
        <h2>{recovery ? 'Define una contraseña nueva' : mode === 'signup' ? 'Crea tu cuenta' : mode === 'reset' ? 'Recupera tu acceso' : 'Bienvenido de nuevo'}</h2>
        <p className="auth-card-lead">{recovery ? 'Elige una contraseña segura para volver a entrar.' : mode === 'signup' ? 'Empieza con una cuenta que te sirve para pedir y ofrecer servicios.' : mode === 'reset' ? 'Te enviaremos un enlace para recuperar tu cuenta.' : 'Entra para continuar con tus solicitudes y servicios.'}</p>
        {!recovery && <div className="auth-tabs" role="tablist" aria-label="Acceso a tu cuenta">
          <button type="button" role="tab" aria-selected={mode === 'signin'} className={mode === 'signin' ? 'active' : ''} onClick={() => { setMode('signin'); setLocalNotice(''); }}>Iniciar sesión</button>
          <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setLocalNotice(''); }}>Crear cuenta</button>
        </div>}
        <form className="form auth-form" onSubmit={event => void submitAuth(event)}>
          {mode === 'signup' && !recovery && <label>Nombre para mostrar<input type="text" required minLength={2} autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre" /></label>}
          {!recovery && <label>Correo electrónico<input type="email" required autoCapitalize="none" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nombre@correo.com" /></label>}
          {(recovery || mode !== 'reset') && <label>{recovery ? 'Nueva contraseña' : 'Contraseña'}<input type="password" required minLength={8} autoComplete={recovery || mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Al menos 8 caracteres" /></label>}
          {(recovery || mode === 'signup') && <label>Confirma tu contraseña<input type="password" required minLength={8} autoComplete="new-password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} placeholder="Escríbela de nuevo" /></label>}
          <button className="button primary auth-submit" disabled={busy || !configured} type="submit">{busy ? 'Un momento…' : recovery ? 'Actualizar contraseña' : mode === 'signup' ? 'Crear cuenta' : mode === 'reset' ? 'Enviar enlace' : 'Ingresar'}</button>
          {!configured && <p className="auth-local-notice" role="status">El acceso se habilita al conectar el proyecto de Supabase.</p>}
          {localNotice && <p className="auth-local-notice" role="status">{localNotice}</p>}
        </form>
        <div className="auth-card-footer">
          {recovery ? <button type="button" onClick={onRecovered}>Volver al acceso</button> : mode === 'reset' ? <button type="button" onClick={() => { setMode('signin'); setLocalNotice(''); }}>Volver al acceso</button> : mode === 'signin' ? <button type="button" onClick={() => { setMode('reset'); setLocalNotice(''); }}>Olvidé mi contraseña</button> : <span>Al crear la cuenta, confirma tu correo para proteger el acceso.</span>}
          <span>Protegido con Supabase Auth</span>
        </div>
      </div>}
    </div>
  </section>;
}

function RequestForm({ providers, categories, municipalities, initialCategory, initialCity, initialIds, busy, onCancel, onSubmit }: {
  providers: Provider[]; categories: Category[]; municipalities: Municipality[]; initialCategory: string; initialCity: string;
  initialIds: string[]; busy: boolean; onCancel: () => void;
  onSubmit: (input: { category: string; municipality: string; title: string; description: string; providerIds: string[]; preferredAt: string | null }) => Promise<void>;
}) {
  const [category, setCategory] = useState(initialCategory);
  const [municipality, setMunicipality] = useState(initialCity);
  const [ids, setIds] = useState(initialIds);
  const [title, setTitle] = useState(''); const [description, setDescription] = useState('');
  const [preferred, setPreferred] = useState('');
  const eligible = providers.filter(p => p.categories.includes(category) && p.municipality_slug === municipality);
  const selected = ids.filter(id => eligible.some(p => p.id === id));
  return <form id="request-form" className="panel form" onSubmit={e => {
    e.preventDefault();
    if (!selected.length) return;
    void onSubmit({ category, municipality, title, description, providerIds: selected, preferredAt: preferred ? new Date(preferred).toISOString() : null });
  }}>
    <div className="section-head"><div><p className="eyebrow">NUEVA SOLICITUD</p><h2>Cuéntanos qué necesitas</h2></div><button type="button" className="text-button" onClick={onCancel}>Cerrar</button></div>
    <div className="form-row"><label>Servicio<select required value={category} onChange={e => { setCategory(e.target.value); setIds([]); }}>{categories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></label><label>Municipio<select required value={municipality} onChange={e => { setMunicipality(e.target.value); setIds([]); }}>{municipalities.map(m => <option key={m.slug} value={m.slug}>{m.name}</option>)}</select></label></div>
    <fieldset><legend>Prestadores a invitar (hasta cinco)</legend><div className="checks">{eligible.map(p => <label key={p.id}><input type="checkbox" checked={selected.includes(p.id)} disabled={selected.length >= 5 && !selected.includes(p.id)} onChange={() => setIds(current => current.includes(p.id) ? current.filter(id => id !== p.id) : [...current, p.id])} /> {p.display_name}</label>)}</div>{!eligible.length && <p className="fine">No hay prestadores aprobados para esa combinación.</p>}</fieldset>
    <label>Título de la tarea<input minLength={10} maxLength={120} required value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej. Revisar tres contactos eléctricos" /></label>
    <label>Descripción y alcance<textarea minLength={20} maxLength={2000} required value={description} onChange={e => setDescription(e.target.value)} placeholder="Explica el problema y qué resultado esperas. Evita poner tu dirección exacta aquí." /></label>
    <label>Horario preferido (opcional)<input type="datetime-local" value={preferred} onChange={e => setPreferred(e.target.value)} /></label>
    <p className="fine">El prestador verá tu descripción. La dirección exacta se compartirá solo después de contratar.</p>
    <button className="button primary" type="submit" disabled={busy || !selected.length}>Enviar solicitud</button>
  </form>;
}

function ProviderPage({ user, current, categories, municipalities, configured: active, busy, onSignIn, onSave }: {
  user: User | null; current: Provider | null; categories: Category[]; municipalities: Municipality[];
  configured: boolean; busy: boolean; onSignIn: () => void;
  onSave: (input: { id: string; display_name: string; bio: string; municipality_slug: string; available: boolean; categories: string[]; exists: boolean }) => Promise<void>;
}) {
  const [name, setName] = useState(''); const [bio, setBio] = useState('');
  const [city, setCity] = useState('delicias'); const [selected, setSelected] = useState<string[]>([]);
  const [available, setAvailable] = useState(true);
  useEffect(() => { if (current) { setName(current.display_name); setBio(current.bio); setCity(current.municipality_slug); setSelected(current.categories); setAvailable(current.available); } }, [current]);
  return <section className="section"><p className="eyebrow">QUIERO OFRECER SERVICIOS</p><h1>Lo que sabes hacer,<br />alguien lo necesita.</h1>
    <div className="steps"><div><b>01</b><h3>Presenta tus habilidades</h3><p>Oficio, municipio, disponibilidad y experiencia.</p></div><div><b>02</b><h3>Recibe solicitudes</h3><p>Solo tras la revisión del perfil y según tu oficio y zona.</p></div><div><b>03</b><h3>Propón un alcance</h3><p>Explica materiales, traslado, vigencia y total antes de acordar.</p></div></div>
    {!active ? <p className="alert">El alta real se habilita con el proyecto independiente. <a href="/demo/">Ver la demo</a>.</p>
      : !user ? <button type="button" className="button primary" onClick={onSignIn}>Ingresar para crear perfil</button>
      : <form className="panel form" onSubmit={e => { e.preventDefault(); void onSave({
        id: user.id, display_name: name, bio, municipality_slug: city, available, categories: selected, exists: Boolean(current)
      }); }}>
        <div className="section-head"><h2>{current ? 'Edita tu perfil' : 'Crea tu perfil'}</h2>{current && <span className="status">Estado: {({ pending: 'En revisión', approved: 'Aprobado', rejected: 'Rechazado', suspended: 'Suspendido' } as Record<string,string>)[current.approval_status]}</span>}</div>
        <label>Nombre público o nombre comercial<input required minLength={3} maxLength={80} value={name} onChange={e => setName(e.target.value)} /></label>
        <label>Experiencia y servicios<textarea required minLength={20} maxLength={800} value={bio} onChange={e => setBio(e.target.value)} placeholder="Describe lo que haces sin compartir teléfono ni domicilio." /></label>
        <label>Municipio de cobertura<select value={city} onChange={e => setCity(e.target.value)}>{municipalities.map(m => <option key={m.slug} value={m.slug}>{m.name}</option>)}</select></label>
        <fieldset><legend>Oficios</legend><div className="checks">{categories.map(c => <label key={c.slug}><input type="checkbox" checked={selected.includes(c.slug)} onChange={() => setSelected(current => current.includes(c.slug) ? current.filter(id => id !== c.slug) : [...current, c.slug])} /> {c.name}</label>)}</div></fieldset>
        <label className="inline"><input type="checkbox" checked={available} onChange={e => setAvailable(e.target.checked)} /> Disponible para nuevas solicitudes</label>
        <p className="fine">Cambiar el nombre, descripción o municipio de un perfil aprobado lo devuelve a revisión. No publiques datos de contacto privados.</p>
        <button type="submit" className="button primary" disabled={busy || !selected.length}>Guardar perfil</button>
      </form>}
  </section>;
}

function RequestsPage({ user, requests, quotes, jobs, providers, categories, municipalities, busy, configured: active, onSignIn, onExplore, onQuote, onAccept }: {
  user: User | null; requests: ServiceRequest[]; quotes: Quote[]; jobs: Job[]; providers: Provider[];
  categories: Category[]; municipalities: Municipality[]; busy: boolean; configured: boolean;
  onSignIn: () => void; onExplore: () => void;
  onQuote: (input: { requestId: string; scope: string; materialsNote: string; exclusions: string; labor: number; materials: number; travel: number; expiresAt: string; proposedAt: string | null }) => Promise<void>;
  onAccept: (id: string) => Promise<void>;
}) {
  return <section className="section"><p className="eyebrow">ACUERDOS CLAROS</p><h1>Solicitudes y cotizaciones</h1>
    {!active ? <p className="empty">Esta vista necesita el proyecto real. <a href="/demo/">Prueba el flujo de la demo</a>.</p>
      : !user ? <button className="button primary" type="button" onClick={onSignIn}>Ingresar para consultar</button>
      : requests.length ? <div className="request-list">{requests.map(request => {
        const mine = request.client_id === user.id;
        const versions = quotes.filter(q => q.request_id === request.id);
        const job = jobs.find(j => j.request_id === request.id);
        return <article className="panel" key={request.id}>
          <div className="section-head"><div><span className="eyebrow">{mine ? 'MI SOLICITUD' : 'INVITACIÓN RECIBIDA'}</span><h2>{request.title}</h2></div><span className="status">{request.status === 'open' ? 'Abierta' : request.status === 'contracted' ? 'Contratada' : request.status}</span></div>
          <p className="fine">{label(categories, request.category_slug)} · {label(municipalities, request.municipality_slug)} · Creada {date(request.created_at)} · Preferencia {date(request.preferred_at)}</p>
          <p>{request.description}</p>
          {versions.length > 0 && <div className="quote-list">{versions.map(q => {
            const latest = !versions.some(other => other.provider_id === q.provider_id && other.version > q.version);
            const valid = latest && new Date(q.expires_at) > new Date() && request.status === 'open';
            return <div className="quote" key={q.id}>
              <div className="section-head"><strong>{providers.find(p => p.id === q.provider_id)?.display_name ?? (mine ? 'Prestador invitado' : 'Tu propuesta')} · versión {q.version}</strong><b>{money(q.total_amount)}</b></div>
              <p>{q.scope}</p><small>Mano de obra {money(q.labor_amount)} · Materiales {money(q.materials_amount)} · Traslado {money(q.travel_amount)}</small>
              <small>Materiales: {q.materials_note || 'Sin detalle'} · Exclusiones: {q.exclusions || 'Ninguna declarada'}</small>
              <small>Vigencia hasta {date(q.expires_at)} · Horario propuesto {date(q.proposed_at)}</small>
              {mine && valid && <button type="button" className="button primary" disabled={busy} onClick={() => void onAccept(q.id)}>Aceptar esta versión</button>}
              {job?.quote_version_id === q.id && <span className="status">Versión aceptada</span>}
              {!latest && <span className="fine">Sustituida por una versión posterior.</span>}
            </div>;
          })}</div>}
          {!mine && request.status === 'open' && <QuoteForm requestId={request.id} busy={busy} onSubmit={onQuote} />}
        </article>;
      })}</div> : <div className="empty"><h3>Aún no tienes solicitudes</h3><p>Cuando invites prestadores o recibas una invitación, aparecerá aquí.</p><button className="button primary" onClick={onExplore}>Explorar servicios</button></div>}
  </section>;
}

function QuoteForm({ requestId, busy, onSubmit }: {
  requestId: string; busy: boolean;
  onSubmit: (input: { requestId: string; scope: string; materialsNote: string; exclusions: string; labor: number; materials: number; travel: number; expiresAt: string; proposedAt: string | null }) => Promise<void>;
}) {
  const [scope, setScope] = useState(''); const [materialsNote, setMaterialsNote] = useState('');
  const [exclusions, setExclusions] = useState(''); const [labor, setLabor] = useState('');
  const [materials, setMaterials] = useState('0'); const [travel, setTravel] = useState('0');
  const [proposed, setProposed] = useState('');
  return <form className="form quote-form" onSubmit={e => { e.preventDefault(); void onSubmit({
    requestId, scope, materialsNote, exclusions, labor: Number(labor), materials: Number(materials),
    travel: Number(travel), expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    proposedAt: proposed ? new Date(proposed).toISOString() : null
  }); }}>
    <h3>Enviar una cotización</h3>
    <label>Trabajo incluido<textarea minLength={20} maxLength={1500} required value={scope} onChange={e => setScope(e.target.value)} /></label>
    <div className="form-row"><label>Materiales incluidos<input maxLength={500} value={materialsNote} onChange={e => setMaterialsNote(e.target.value)} /></label><label>Exclusiones<input maxLength={500} value={exclusions} onChange={e => setExclusions(e.target.value)} /></label></div>
    <div className="form-row three"><label>Mano de obra MXN<input type="number" min="0" step="0.01" required value={labor} onChange={e => setLabor(e.target.value)} /></label><label>Materiales MXN<input type="number" min="0" step="0.01" required value={materials} onChange={e => setMaterials(e.target.value)} /></label><label>Traslado MXN<input type="number" min="0" step="0.01" required value={travel} onChange={e => setTravel(e.target.value)} /></label></div>
    <label>Horario propuesto (opcional)<input type="datetime-local" value={proposed} onChange={e => setProposed(e.target.value)} /></label>
    <p className="fine">Total: {money(Number(labor || 0) + Number(materials || 0) + Number(travel || 0))} · Vigencia: siete días. Una corrección crea una versión nueva.</p>
    <button className="button primary" type="submit" disabled={busy || Number(labor) + Number(materials) + Number(travel) <= 0}>Enviar propuesta</button>
  </form>;
}

function TicketsPage({ user, jobs, tickets, requests, addresses, ownReviews, events, messages, appeals, busy, configured: active, onSignIn, onAddress, onStatus, onReview, onMessage, onAppeal }: {
  user: User | null; jobs: Job[]; tickets: Ticket[]; requests: ServiceRequest[]; addresses: Address[];
  ownReviews: OwnReview[]; events: JobEvent[]; messages: JobMessage[]; appeals: Appeal[]; busy: boolean; configured: boolean; onSignIn: () => void;
  onAddress: (requestId: string, address: string, exists: boolean) => Promise<void>;
  onStatus: (jobId: string, next: string, reason: string | null) => Promise<void>;
  onReview: (jobId: string, rating: number, body: string) => Promise<void>;
  onMessage: (jobId: string, body: string) => Promise<void>;
  onAppeal: (reportId: string, reason: string) => Promise<void>;
}) {
  return <section className="section"><p className="eyebrow">ACUERDOS A LA VISTA</p><h1>Mis tickets</h1>
    {!active ? <p className="empty"><a href="/demo/#tickets">Ver tickets de demostración</a></p>
      : !user ? <button className="button primary" onClick={onSignIn}>Ingresar para consultar</button>
      : tickets.length ? <div className="ticket-list">{tickets.map(t => {
        const job = jobs.find(j => j.id === t.job_id);
        return job && <TicketCard key={t.job_id} ticket={t} job={job} user={user}
          request={requests.find(r => r.id === job.request_id)}
          address={addresses.find(a => a.request_id === job.request_id)}
          review={ownReviews.find(r => r.job_id === job.id)}
          events={events.filter(e => e.job_id === job.id)}
          messages={messages.filter(m => m.job_id === job.id)} appeals={appeals.filter(a => a.job_id === job.id)}
          busy={busy} onAddress={onAddress} onStatus={onStatus} onReview={onReview} onMessage={onMessage} onAppeal={onAppeal} />;
      })}</div> : <p className="empty">Los tickets aparecen después de aceptar una cotización.</p>}
  </section>;
}

function TicketCard({ ticket, job, user, request, address, review, events, messages, appeals, busy, onAddress, onStatus, onReview, onMessage, onAppeal }: {
  ticket: Ticket; job: Job; user: User; request?: ServiceRequest; address?: Address; review?: OwnReview;
  events: JobEvent[]; messages: JobMessage[]; appeals: Appeal[]; busy: boolean;
  onAddress: (requestId: string, address: string, exists: boolean) => Promise<void>;
  onStatus: (jobId: string, next: string, reason: string | null) => Promise<void>;
  onReview: (jobId: string, rating: number, body: string) => Promise<void>;
  onMessage: (jobId: string, body: string) => Promise<void>;
  onAppeal: (reportId: string, reason: string) => Promise<void>;
}) {
  const [addressText, setAddressText] = useState(address?.address ?? '');
  const [reason, setReason] = useState(''); const [rating, setRating] = useState(5);
  const [reviewBody, setReviewBody] = useState('');
  const [messageBody, setMessageBody] = useState('');
  useEffect(() => { setAddressText(address?.address ?? ''); }, [address?.address]);
  const client = user.id === job.client_id;
  const provider = user.id === job.provider_id;
  const a = ticket.agreement;
  const options: { next: string; label: string; requiresReason?: boolean }[] = [];
  if (provider) {
    if (job.status === 'confirmed' && job.scheduled_at) options.push({ next: 'scheduled', label: 'Confirmar agenda' });
    if (['confirmed','scheduled'].includes(job.status)) options.push({ next: 'in_progress', label: 'Iniciar trabajo' });
    if (job.status === 'in_progress') options.push({ next: 'completion_reported', label: 'Reportar terminación' });
  }
  if (client) {
    if (job.status === 'completion_reported') options.push({ next: 'completed', label: 'Confirmar terminado' });
    if (['confirmed','scheduled'].includes(job.status)) options.push({ next: 'cancelled', label: 'Cancelar', requiresReason: true });
  }
  if (['confirmed','scheduled','in_progress','completion_reported'].includes(job.status)) options.push({ next: 'disputed', label: 'Reportar problema', requiresReason: true });
  return <article className="ticket panel">
    <div className="section-head"><div><p className="eyebrow">TICKET DE SERVICIO</p><h2>{ticket.folio}</h2></div><span className="status">{({
      confirmed:'Confirmado',scheduled:'Agendado',in_progress:'En curso',completion_reported:'Terminación reportada',
      completed:'Completado',cancelled:'Cancelado',disputed:'En disputa'
    } as Record<string,string>)[job.status] ?? job.status}</span></div>
    <h3>{String(a.request_title ?? request?.title ?? 'Servicio')}</h3>
    <p>{String(a.scope ?? '')}</p>
    <dl><div><dt>Mano de obra</dt><dd>{money(Number(a.labor_amount ?? 0))}</dd></div><div><dt>Materiales</dt><dd>{money(Number(a.materials_amount ?? 0))}</dd></div><div><dt>Traslado</dt><dd>{money(Number(a.travel_amount ?? 0))}</dd></div><div className="total"><dt>Total acordado</dt><dd>{money(Number(a.total_amount ?? 0))}</dd></div></dl>
    <p className="fine">Materiales: {String(a.materials_note || 'Sin detalle')} · Exclusiones: {String(a.exclusions || 'Ninguna declarada')}</p>
    <p className="fine">Versión {String(a.quote_version ?? '')} · Horario {a.scheduled_at ? date(String(a.scheduled_at)) : 'Por acordar'} · Emitido {date(ticket.issued_at)}</p>
    <p className="fine">El pago se acuerda fuera de la plataforma. Este ticket no es factura ni comprobante de pago.</p>
    {address && <p className="private-address"><strong>Dirección de servicio:</strong> {address.address} <small>Visible solo a las partes contratantes.</small></p>}
    {client && job.status !== 'cancelled' && <form className="form no-print" onSubmit={e => { e.preventDefault(); void onAddress(job.request_id,addressText,Boolean(address)); }}>
      <label>Dirección exacta para el prestador contratado<textarea minLength={10} maxLength={300} required value={addressText} onChange={e => setAddressText(e.target.value)} /></label>
      <button className="button outline" type="submit" disabled={busy}>Guardar dirección privada</button>
    </form>}
    {options.length > 0 && <div className="ticket-actions no-print">
      {options.some(o => o.requiresReason) && <label>Motivo para cancelar o reportar un problema<textarea minLength={10} maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} /></label>}
      <div>{options.map(o => <button key={o.next} className={o.requiresReason ? 'button outline' : 'button primary'} type="button"
        disabled={busy || (o.requiresReason && reason.trim().length < 10)}
        onClick={() => void onStatus(job.id,o.next,o.requiresReason ? reason : null)}>{o.label}</button>)}</div>
    </div>}
    {client && job.status === 'completed' && !review && <form className="form no-print review-form" onSubmit={e => { e.preventDefault(); void onReview(job.id,rating,reviewBody); }}>
      <h3>Reseña de este trabajo</h3><label>Calificación<select value={rating} onChange={e => setRating(Number(e.target.value))}>{[5,4,3,2,1].map(n => <option key={n} value={n}>{n} de 5</option>)}</select></label>
      <label>Tu experiencia<textarea required minLength={20} maxLength={1000} value={reviewBody} onChange={e => setReviewBody(e.target.value)} /></label>
      <button className="button primary" disabled={busy} type="submit">Publicar reseña</button>
    </form>}
    {review && <p className="fine">Reseña del trabajo: {review.rating}/5 · {review.published ? 'Publicada' : 'Oculta por moderación'}</p>}
    {appeals.length > 0 && <section className="appeals no-print" aria-label="Apelación de resolución">
      <h3>Resoluciones y apelaciones</h3>
      {appeals.map(appeal => <AppealTicketCard key={appeal.report_id} appeal={appeal} busy={busy} onAppeal={onAppeal} />)}
      <p className="fine">La apelación solicita una segunda revisión operativa; no arbitra pagos ni determina reembolsos.</p>
    </section>}
    <section className="conversation no-print" aria-label="Mensajes privados del servicio"><h3>Mensajes privados</h3>
      {messages.length ? <div className="notice-list">{messages.map(m => <div className="notice" key={m.id}><strong>{m.sender_id === user.id ? 'Tú' : 'La otra parte'}</strong><p>{m.body}</p><small>{date(m.created_at)}</small></div>)}</div> : <p className="fine">Aún no hay mensajes. No compartas datos bancarios ni información innecesaria.</p>}
      <form className="form" onSubmit={e => { e.preventDefault(); if (messageBody.trim()) { void onMessage(job.id, messageBody); setMessageBody(''); } }}><label>Escribe a la otra parte<textarea required minLength={1} maxLength={1500} value={messageBody} onChange={e => setMessageBody(e.target.value)} /></label><button className="button outline" type="submit" disabled={busy}>Enviar mensaje</button></form>
    </section>
    {events.length > 0 && <details className="history no-print"><summary>Historial de estados</summary><ol>{events.map(e => <li key={e.id}>{date(e.created_at)} · {e.previous_status ?? 'Inicio'} → {e.next_status}{e.reason ? ` · ${e.reason}` : ''}</li>)}</ol></details>}
    <button className="button outline no-print" type="button" onClick={event => {
      const target = event.currentTarget.closest('.ticket');
      document.querySelectorAll('.ticket').forEach(node => node.classList.remove('print-target'));
      target?.classList.add('print-target');
      window.print();
    }}>Imprimir ticket</button>
  </article>;
}

function AppealTicketCard({ appeal, busy, onAppeal }: {
  appeal: Appeal; busy: boolean; onAppeal: (reportId: string, reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  return <article className="appeal-item">
    <p className="fine">Resolución del {date(appeal.resolved_at)}</p>
    {appeal.appeal_id ? <>
      <span className="status">{appeal.appeal_status === 'pending' ? 'En revisión' : appeal.appeal_status === 'accepted' ? 'Aceptada' : 'No aceptada'}</span>
      {appeal.appeal_reason && <p><strong>Tu solicitud:</strong> {appeal.appeal_reason}</p>}
      {appeal.response && <p><strong>Respuesta:</strong> {appeal.response}</p>}
    </> : appeal.can_appeal ? <form className="form" onSubmit={e => { e.preventDefault(); void onAppeal(appeal.report_id, reason); }}>
      <label>Solicita una segunda revisión<textarea required minLength={20} maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} /></label>
      <button className="button outline" type="submit" disabled={busy || reason.trim().length < 20}>Enviar apelación</button>
    </form> : <p className="fine">La resolución no está disponible para apelación en este momento.</p>}
  </article>;
}

function ReviewCard({ provider, busy, onReview }: {
  provider: PendingProvider; busy: boolean; onReview: (status: 'approved' | 'rejected', reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  return <article className="card"><h3>{provider.display_name}</h3><p>{provider.bio}</p><p className="fine">{provider.municipality_slug}</p>
    <label>Motivo de la decisión<textarea minLength={10} maxLength={500} required value={reason} onChange={e => setReason(e.target.value)} /></label>
    <div className="card-actions"><button type="button" className="button outline" disabled={busy || reason.trim().length < 10} onClick={() => void onReview('rejected', reason)}>Rechazar</button><button type="button" className="button primary" disabled={busy || reason.trim().length < 10} onClick={() => void onReview('approved', reason)}>Aprobar</button></div>
  </article>;
}

function ReportCard({ report, busy, onResolve }: {
  report: Report; busy: boolean; onResolve: (next: 'completed' | 'cancelled', reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  return <article className="panel"><p className="eyebrow">INCIDENCIA · {date(report.created_at)}</p><h3>Servicio {report.job_id.slice(0,8)}</h3><p>{report.reason}</p>
    <label>Motivo de resolución<textarea minLength={10} maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} /></label>
    <div className="card-actions"><button className="button outline" disabled={busy || reason.trim().length < 10} onClick={() => void onResolve('cancelled',reason)}>Cerrar cancelado</button><button className="button primary" disabled={busy || reason.trim().length < 10} onClick={() => void onResolve('completed',reason)}>Cerrar completado</button></div>
  </article>;
}

function ModerationReviewCard({ review, busy, onModerate }: {
  review: ModerationReview; busy: boolean;
  onModerate: (published: boolean, reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  return <article className="panel"><p className="eyebrow">RESEÑA · {date(review.created_at)}</p>
    <h3>{review.rating}/5 · {review.published ? 'Publicada' : 'Oculta'}</h3><p>{review.body}</p>
    <label>Motivo de moderación<textarea minLength={10} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></label>
    <div className="card-actions"><button className="button outline" type="button" disabled={busy || reason.trim().length < 10 || !review.published}
      onClick={() => void onModerate(false, reason)}>Ocultar</button>
      <button className="button primary" type="button" disabled={busy || reason.trim().length < 10 || review.published}
        onClick={() => void onModerate(true, reason)}>Publicar</button></div>
  </article>;
}

function AppealReviewCard({ appeal, busy, onReview }: {
  appeal: PendingAppeal; busy: boolean;
  onReview: (status: 'accepted' | 'rejected', response: string) => Promise<void>;
}) {
  const [response, setResponse] = useState('');
  return <article className="panel"><p className="eyebrow">APELACIÓN · {date(appeal.created_at)}</p>
    <h3>Servicio {appeal.job_id.slice(0,8)}</h3><p className="fine">Solicitante {appeal.appellant_id.slice(0,8)} · resolución {appeal.report_id.slice(0,8)}</p>
    <p>{appeal.reason}</p>
    <label>Respuesta para las partes<textarea required minLength={10} maxLength={1000} value={response} onChange={e => setResponse(e.target.value)} /></label>
    <div className="card-actions">
      <button className="button outline" type="button" disabled={busy || response.trim().length < 10}
        onClick={() => void onReview('rejected', response)}>No aceptar</button>
      <button className="button primary" type="button" disabled={busy || response.trim().length < 10}
        onClick={() => void onReview('accepted', response)}>Aceptar y reabrir servicio</button>
    </div>
  </article>;
}

function OperationalMetricsPanel({ metrics, municipalities, categories }: {
  metrics: OperationalMetrics; municipalities: Municipality[]; categories: Category[];
}) {
  const median = metrics.median_first_quote_minutes === null
    ? 'Sin muestra' : `${Math.round(metrics.median_first_quote_minutes)} min`;
  return <section className="metrics-panel" aria-label="Indicadores operativos agregados">
    <h2>Indicadores operativos</h2>
    <div className="metric-grid">
      <div><strong>{metrics.requests_open}</strong><span>Solicitudes abiertas</span></div>
      <div><strong>{metrics.providers_active}</strong><span>Prestadores disponibles aprobados</span></div>
      <div><strong>{metrics.conversion_pct === null ? '—' : `${metrics.conversion_pct}%`}</strong><span>Solicitudes con contratación · {metrics.requests_total} en total</span></div>
      <div><strong>{median}</strong><span>Mediana a primera cotización · muestra {metrics.quote_sample_size}</span></div>
      <div><strong>{metrics.jobs_completed}</strong><span>Servicios completados</span></div>
      <div><strong>{metrics.reports_open + metrics.appeals_open}</strong><span>Casos por revisar · {metrics.reports_open} incidencias y {metrics.appeals_open} apelaciones</span></div>
      <div><strong>{metrics.jobs_disputed}</strong><span>Servicios en disputa</span></div>
    </div>
    <h3>Cobertura activa por oficio y municipio</h3>
    {metrics.providers_by_area.length ? <div className="area-list">{metrics.providers_by_area.map(row => <div key={`${row.municipality_slug}-${row.category_slug}`}>
      <span>{label(categories, row.category_slug)} · {label(municipalities, row.municipality_slug)}</span><strong>{row.provider_count}</strong>
    </div>)}</div> : <p className="fine">Aún no hay prestadores aprobados y disponibles.</p>}
    <p className="fine">Métricas agregadas del proyecto; no incluyen datos personales. La mediana se calcula solo sobre {metrics.quote_sample_size} solicitudes con cotización y no garantiza tiempos futuros.</p>
  </section>;
}
