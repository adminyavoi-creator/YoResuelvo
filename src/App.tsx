import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { User } from '@supabase/supabase-js';
import { savedAuthIntent, saveAuthIntent, signInWithGoogle, type AuthIntent } from './lib/auth';
import { activePushForThisDevice, disableAllPushForUser, disablePushForThisDevice, enablePushForUser, forgetPushOnSignOut, pushDeliveryConfigured } from './lib/push';
import {
  db, configured, catalog, workspace, saveProvider, createRequest, submitQuote,
  acceptQuote, pendingProviders, reviewProvider, saveAddress, setJobStatus,
  createReview, markNotificationRead, pendingReports, reviewQueue, moderateReview, sendJobMessage,
  saveNotificationPreferences, exportMyData, fileReportAppeal, pendingAppeals, reviewReportAppeal, operationalMetrics, uploadProviderPhoto, providerPhotoUrl, supportInbox, sendSupportMessage
} from './lib/api';
import { demoCategories, demoMunicipalities, demoProviders } from './lib/demo';
import type {
  Category, Municipality, Provider, ServiceRequest, Quote, Job, Ticket, PendingProvider,
  Address, Review, OwnReview, ModerationReview, Notification, Report, JobEvent, JobMessage,
  NotificationPreferences, Appeal, PendingAppeal, OperationalMetrics, SupportMessage, SupportThread
} from './lib/types';

type Page = 'inicio' | 'explorar' | 'solicitudes' | 'chat' | 'ofrecer' | 'tickets' | 'moderacion' | 'cuenta';
const money = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
const date = (v: string | null) => v
  ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Chihuahua' }).format(new Date(v))
  : 'Por acordar';
const label = (items: { slug: string; name: string }[], slug: string) => items.find(i => i.slug === slug)?.name ?? slug;
const serviceImage = (slug: string) => slug.includes('plom') ? '/images/plomeria.jpg' : slug.includes('electric') ? '/images/electricidad.jpg' : '/images/reparaciones.jpg';
const providerImage = (p: Provider) => p.photo_paths?.[0] ? providerPhotoUrl(p.photo_paths[0]) : serviceImage(p.categories[0] ?? '');
const errText = (error: unknown) => error instanceof Error ? error.message : 'No se pudo completar la operación.';
const requestedPushPage = (): Page | null => {
  const screen = new URLSearchParams(window.location.search).get('screen');
  const allowed: Page[] = ['inicio','explorar','solicitudes','chat','ofrecer','tickets','cuenta'];
  return allowed.includes(screen as Page) ? screen as Page : null;
};

export default function App() {
  const [page, setPage] = useState<Page>(() => requestedPushPage() ?? 'inicio');
  const [exploreView, setExploreView] = useState<'lista' | 'mapa'>('lista');
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
  const [supportThreads, setSupportThreads] = useState<SupportThread[]>([]);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [selectedSupportThread, setSelectedSupportThread] = useState('');
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [appealsQueue, setAppealsQueue] = useState<PendingAppeal[]>([]);
  const [metrics, setMetrics] = useState<OperationalMetrics | null>(null);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState(() => new URLSearchParams(window.location.search).get('categoria') ?? '');
  const [compared, setCompared] = useState<string[]>([]);
  const [profilePreview, setProfilePreview] = useState<Provider | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestCategory, setRequestCategory] = useState('');
  const [requestCity, setRequestCity] = useState('');
  const [requestIds, setRequestIds] = useState<string[]>([]);
  const [recovery, setRecovery] = useState(false);
  const [authIntent, setAuthIntent] = useState<AuthIntent>(() => savedAuthIntent());

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
      const support = await supportInbox(currentUser.id, Boolean(w.staffRole));
      setSupportThreads(support.threads); setSupportMessages(support.messages);
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
      setSupportThreads([]); setSupportMessages([]); setSelectedSupportThread('');
      setPreferences(null); setAppeals([]); setAppealsQueue([]); setMetrics(null);
    }
  }
  useEffect(() => {
    let active = true;
    async function initialize() {
      try {
        const callbackUrl = new URL(window.location.href);
        const callbackError = callbackUrl.searchParams.get('error_description') ?? callbackUrl.searchParams.get('error');
        if (callbackError) {
          setError(callbackError.replaceAll('+', ' '));
          callbackUrl.searchParams.delete('error_description'); callbackUrl.searchParams.delete('error');
          window.history.replaceState({}, '', `${callbackUrl.pathname}${callbackUrl.search}${callbackUrl.hash}`);
        }
        const currentUser = db ? (await db.auth.getUser()).data.user : null;
        if (!active) return;
        setUser(currentUser);
        setPage(requestedPushPage() ?? (currentUser && savedAuthIntent() === 'prestador' ? 'ofrecer' : 'inicio'));
        await refresh(currentUser);
      } catch (e) { if (active) setError(errText(e)); }
      finally { if (active) setReady(true); }
    }
    void initialize();
    const subscription = db?.auth.onAuthStateChange((event, session) => {
      if (active) {
        setUser(session?.user ?? null);
        if (event === 'SIGNED_IN') setPage(savedAuthIntent() === 'prestador' ? 'ofrecer' : 'inicio');
        if (event === 'SIGNED_OUT') setPage('inicio');
        if (event === 'PASSWORD_RECOVERY') { setRecovery(true); setPage('cuenta'); }
      }
    }).data.subscription;
    const authError = (event: Event) => setError(String((event as CustomEvent<string>).detail ?? 'No se pudo completar el acceso con Google.'));
    window.addEventListener('yoresuelvo-auth-error', authError);
    return () => { active = false; subscription?.unsubscribe(); window.removeEventListener('yoresuelvo-auth-error', authError); };
    // One initial load; refresh after explicit mutations and auth changes below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!ready || !configured) return;
    void refresh(user).catch(e => setError(errText(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
  useEffect(() => {
    if (page !== 'chat' || !user || !configured) return;
    const update = () => { if (document.visibilityState === 'visible') void supportInbox(user.id, Boolean(staffRole)).then(data => { setSupportThreads(data.threads); setSupportMessages(data.messages); }).catch(() => {}); };
    window.addEventListener('focus', update);
    const timer = window.setInterval(update, 20000);
    return () => { window.removeEventListener('focus', update); window.clearInterval(timer); };
  }, [page, user?.id, staffRole]);

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
  async function googleSignIn(intent: AuthIntent) {
    setBusy(true); setMessage(''); setError('');
    saveAuthIntent(intent);
    try { await signInWithGoogle(intent); }
    catch (e) { setError(errText(e)); }
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
  const rated = useMemo(() => [...providers].sort((a, b) => {
    const score = (p: Provider) => { const items = reviews.filter(r => r.provider_id === p.id); return items.length ? items.reduce((sum, r) => sum + r.rating, 0) / items.length : 0; };
    return score(b) - score(a);
  }), [providers, reviews]);
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
      <button type="button" className="brand" onClick={() => navigate('inicio')} aria-label="YoResuelvo!, inicio">
        <img src="/brand/yoresuelvo-icon-512.png" alt="" /><span>YoResuelvo<span className="brand-mark">!</span><small>DELICIAS Y LA REGIÓN</small></span>
      </button>
      <nav aria-label="Navegación principal">
        <button type="button" aria-current={page === 'explorar' ? 'page' : undefined} onClick={() => navigate('explorar')}>Explorar</button>
        <button type="button" aria-current={page === 'solicitudes' ? 'page' : undefined} onClick={() => navigate('solicitudes')}>Solicitudes</button>
        <button type="button" aria-current={page === 'ofrecer' ? 'page' : undefined} onClick={() => navigate('ofrecer')}>Ofrecer</button>
        <button type="button" aria-current={page === 'tickets' ? 'page' : undefined} onClick={() => navigate('tickets')}>Tickets</button>
        {staffRole && <button type="button" aria-current={page === 'moderacion' ? 'page' : undefined} onClick={() => navigate('moderacion')}>Revisión</button>}
      </nav>
      <button type="button" className="header-action" onClick={() => navigate('cuenta')} aria-label={user ? 'Mi cuenta y notificaciones' : 'Ingresar'}>
        {user ? '♧' : '↗'}{notifications.some(item => !item.read_at) && <span className="notification-dot" />}
      </button>
    </header>
    <main className="wrap">
      {!configured && <div className="demo-banner" role="status"><span>●</span> Vista de diseño · perfiles ficticios. <a href="/demo/">Abrir demo interactiva</a></div>}
      {!ready && <p role="status">Cargando…</p>}
      {error && <p className="alert error" role="alert">{error}</p>}
      {message && <p className="alert success" role="status">{message}</p>}
      {page === 'inicio' && <section className="section home-page">
        <p className="eyebrow">DELICIAS Y LA REGIÓN</p><h1>¿Qué necesitas resolver hoy?</h1>
        <button type="button" className="home-search" onClick={() => navigate('explorar')}>⌕ &nbsp; Busca un servicio o especialista <span>→</span></button>
        <div className="browse-heading"><h2>Servicios populares</h2><button type="button" onClick={() => navigate('explorar')}>Ver todos →</button></div>
        <div className="category-grid">{categories.map(item => <button key={item.slug} type="button" className="category-tile" onClick={() => { setCategory(item.slug); navigate('explorar'); }}><span className="category-icon"><CategoryIcon slug={item.slug} /></span>{item.name}</button>)}</div>
        <div className="featured-strip" aria-label="Consejos y promociones"><div className="featured-track">{[
          { image: '/images/electricidad.jpg', title: 'Describe tu tarea con detalle', detail: 'Recibe cotizaciones más claras', slug: 'electricidad' },
          { image: '/images/plomeria.jpg', title: 'Compara el alcance completo', detail: 'Revisa materiales y traslado', slug: 'plomeria' },
          { image: '/images/reparaciones.jpg', title: 'Califica al terminar', detail: 'Ayuda a tu comunidad', slug: '' }
        ].map(slide => <button key={slide.title} type="button" className="featured-slide" onClick={() => { setCategory(slide.slug); navigate('explorar'); }}><img src={slide.image} alt="" /><span className="featured-overlay"><small>CONSEJO YORESUELVO!</small><strong>{slide.title}</strong><span>{slide.detail} ↗</span></span></button>)}</div></div>
        <div className="browse-heading"><h2>Mejor calificados</h2><button type="button" onClick={() => navigate('explorar')}>Explorar →</button></div>
        {rated.length ? <div className="home-providers">{rated.slice(0, 4).map(p => { const items = reviews.filter(r => r.provider_id === p.id); return <button key={p.id} type="button" className="home-provider panel" onClick={() => setProfilePreview(p)}><img src={providerImage(p)} alt="" /><span><strong>{p.display_name}</strong><small>{label(categories, p.categories[0] ?? '')} · {label(municipalities, p.municipality_slug)}</small><small>{items.length ? `★ ${(items.reduce((sum, r) => sum + r.rating, 0) / items.length).toFixed(1)} · ${items.length} reseñas` : '☆ Sin reseñas todavía'}</small></span><b>→</b></button>; })}</div> : <p className="empty">Pronto encontrarás especialistas aprobados aquí.</p>}
        <p className="fine">Las promociones aparecerán cuando estén vigentes y verificadas.</p>
      </section>}
      {page === 'explorar' && <>
        <section className="discovery" id="catalogo">
          <div className="discovery-intro"><div><span className="location-kicker">⌖ {city ? label(municipalities, city) : 'Delicias y la región'}</span><h1>¿Qué necesitas <em>resolver hoy?</em></h1></div><button type="button" className="intro-avatar" onClick={() => navigate('cuenta')} aria-label="Abrir mi perfil">{user?.user_metadata?.avatar_url ? <img src={user.user_metadata.avatar_url as string} alt="" /> : '☺'}</button></div>
          <div className="search-row"><label className="search-box"><span aria-hidden="true">⌕</span><span className="sr-only">Buscar servicio o persona</span><input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Busca un servicio o persona" /></label><button type="button" className="filter-toggle" aria-expanded={showFilters} aria-controls="discovery-filters" onClick={() => setShowFilters(value => !value)} aria-label="Filtros">☷</button></div>
          <div id="discovery-filters" className={`quick-filters${showFilters ? ' open' : ''}`}>
            <label>Ubicación<select value={city} onChange={e => { setCity(e.target.value); setCompared([]); }}><option value="">Toda la región</option>{municipalities.map(m => <option key={m.slug} value={m.slug}>{m.name}</option>)}</select></label>
            <label>Servicio<select value={category} onChange={e => { setCategory(e.target.value); setCompared([]); }}><option value="">Todos los servicios</option>{categories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></label>
          </div>
          {!search && !category && <div className="featured-strip" aria-label="Servicios destacados"><div className="featured-track">
            {[{ image: '/images/electricidad.jpg', tag: 'Tu hogar en buenas manos', title: 'Encuentra a quien sabe hacerlo', slug: 'electricidad' }, { image: '/images/plomeria.jpg', tag: 'Talento de tu región', title: 'Soluciones cerca de ti', slug: 'plomeria' }, { image: '/images/reparaciones.jpg', tag: 'Conecta y resuelve', title: 'El siguiente proyecto empieza aquí', slug: 'cerrajeria' }].map(slide => <button type="button" className="featured-slide" key={slide.image} onClick={() => setCategory(slide.slug)}>
              <img src={slide.image} alt="" /><span className="featured-overlay"><small>{slide.tag}</small><strong>{slide.title}</strong><span>Explorar servicio <b aria-hidden="true">↗</b></span></span>
            </button>)}
          </div></div>}
          <div className="browse-heading"><h2>Explora servicios</h2><button type="button" onClick={() => { setCategory(''); setSearch(''); }}>Ver todos →</button></div>
          <div className="category-shortcuts" aria-label="Explorar por categoría">
            <div className="category-grid">{categories.map(item => <button key={item.slug} type="button"
              className={`category-tile${category === item.slug ? ' active' : ''}`} aria-pressed={category === item.slug}
              onClick={() => { setCategory(current => current === item.slug ? '' : item.slug); setCompared([]); }}>
              <span className="category-icon" aria-hidden="true"><CategoryIcon slug={item.slug} /></span><span>{item.name}</span>
            </button>)}</div>
          </div>
          <div className="browse-heading pros-heading"><div><h2>Personas que resuelven</h2><small>{filtered.length} {filtered.length === 1 ? 'perfil' : 'perfiles'} en tu búsqueda</small></div><button type="button" onClick={() => navigate('ofrecer')}>Ofrecer servicios ↗</button></div>
          <div className="view-switch" role="group" aria-label="Vista de especialistas"><button type="button" aria-pressed={exploreView === 'lista'} onClick={() => setExploreView('lista')}>☷ Lista</button><button type="button" aria-pressed={exploreView === 'mapa'} onClick={() => setExploreView('mapa')}>⌖ Mapa OSM</button></div>
          {exploreView === 'mapa' && <div className="map-panel"><iframe title="Mapa de OpenStreetMap de Delicias y la región" loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox=-106.12%2C27.80%2C-105.20%2C28.75&layer=mapnik" /><p>Zona de cobertura aproximada por municipio; no representa el domicilio ni la ubicación en tiempo real del especialista. Selecciona una ficha para ver su perfil.</p><div className="map-providers">{filtered.map(p => { const items = reviews.filter(r => r.provider_id === p.id); return <button type="button" key={p.id} onClick={() => setProfilePreview(p)}><span className="category-icon"><CategoryIcon slug={p.categories[0] ?? ''} /></span><span><strong>{label(categories, p.categories[0] ?? '')} · {p.display_name}</strong><small>{label(municipalities, p.municipality_slug)} · {items.length ? `★ ${(items.reduce((sum, r) => sum + r.rating, 0) / items.length).toFixed(1)}` : '☆ Sin reseñas'}</small></span></button>; })}</div></div>}
          {exploreView === 'lista' && <>
          {filtered.length ? <div className="cards provider-cards">{filtered.map(p => { const ratings = reviews.filter(r => r.provider_id === p.id); return <article className="card provider-card" key={p.id}>
            <button type="button" className="provider-photo" onClick={() => setProfilePreview(p)} aria-label={`Conocer a ${p.display_name}`}><img src={providerImage(p)} alt={p.photo_paths?.length ? `Trabajo de ${p.display_name}` : ''} loading="lazy" />{!p.photo_paths?.length && <span>Foto ilustrativa del servicio</span>}</button>
            <div className="provider-info"><div className="provider-top"><span className="service-pill">{label(categories, p.categories[0] ?? '')}</span><span className={`availability-dot${p.available ? '' : ' paused'}`}>{p.available ? '● Disponible' : '● Pausado'}</span></div>
            <h3>{p.display_name}</h3><p className="provider-location">⌖ {label(municipalities, p.municipality_slug)} · {city === p.municipality_slug ? 'Tu municipio' : 'En la región'}</p>
            <p className="provider-bio">{p.bio}</p><div className="provider-stats"><span>{ratings.length ? `★ ${(ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)} · ${ratings.length} reseñas` : '☆ Sin reseñas aún'}</span><span>{p.years_experience ? `${p.years_experience} años de experiencia` : 'Experiencia en perfil'}</span></div>
            <div className="card-actions"><button type="button" className="button outline" aria-pressed={compared.includes(p.id)}
              disabled={!p.available || (compared.length >= 3 && !compared.includes(p.id))}
              onClick={() => setCompared(ids => ids.includes(p.id) ? ids.filter(id => id !== p.id) : [...ids, p.id])}>
              {compared.includes(p.id) ? '✓ Elegido' : '＋ Comparar'}
            </button><button type="button" className="button primary" onClick={() => setProfilePreview(p)}>Ver perfil →</button></div></div>
          </article>; })}</div> : <div className="empty"><h3>Sin perfiles para estos filtros</h3><p>Prueba otro municipio o servicio.</p><button className="button outline" type="button" onClick={() => { setSearch(''); setCity(''); setCategory(''); }}>Limpiar filtros</button></div>}
          </>}
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
        authIntent={authIntent} onAuthIntentChange={intent => { setAuthIntent(intent); saveAuthIntent(intent); }}
        onGoogleSignIn={googleSignIn}
        onChooseMode={intent => { setAuthIntent(intent); saveAuthIntent(intent); navigate(intent === 'prestador' ? 'ofrecer' : 'explorar'); }}
        onPushOpen={data => {
          const screen = data.screen;
          const allowed: Page[] = ['inicio','explorar','solicitudes','chat','ofrecer','tickets','cuenta'];
          navigate(allowed.includes(screen as Page) ? screen as Page : 'cuenta');
        }}
        onPushForeground={item => setMessage(`${item.title}: ${item.body}`)}
        onRead={id => action(() => markNotificationRead(id), 'Aviso marcado como leído.', 'cuenta')}
        onSavePreferences={inApp => action(() => saveNotificationPreferences(user!.id, inApp), 'Preferencias actualizadas.', 'cuenta')}
        onDisableAllPush={() => action(() => disableAllPushForUser(user!.id), 'Se pausaron los avisos push en todos tus dispositivos.', 'cuenta')}
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
      {page === 'chat' && <section className="section"><p className="eyebrow">MENSAJES</p><h1>Conversaciones</h1>
        <div className="operations-chat"><strong>✦ Operaciones YoResuelvo!</strong><p>Consultas y seguimiento dentro de la app.</p><span>Tu mensaje quedará guardado. La respuesta depende de la disponibilidad del equipo; para una urgencia, usa los medios de contacto publicados en los términos.</span>
          {user && !staffRole && <SupportConversation userId={user.id} messages={supportMessages.filter(m => m.user_id === user.id)} busy={busy} onSend={body => authAction(() => sendSupportMessage(user.id, body), 'Mensaje enviado a Operaciones.', 'chat')} />}
          {user && Boolean(staffRole) && <div className="support-queue"><strong>Consultas recibidas</strong>{supportThreads.length ? supportThreads.map(thread => <button type="button" key={thread.user_id} onClick={() => setSelectedSupportThread(thread.user_id)}>{thread.user_id.slice(0, 8)} · {date(thread.updated_at)}</button>) : <p>Sin consultas todavía.</p>}{selectedSupportThread && <SupportConversation userId={selectedSupportThread} messages={supportMessages.filter(m => m.user_id === selectedSupportThread)} busy={busy} onSend={body => authAction(() => sendSupportMessage(selectedSupportThread, body), 'Respuesta guardada.', 'chat')} />}</div>}
        </div>
        {!user ? <button type="button" className="button primary" onClick={() => navigate('cuenta')}>Ingresar para ver conversaciones</button> : jobs.length ? <div className="chat-index">{jobs.map(job => { const request = requests.find(r => r.id === job.request_id); const thread = messages.filter(m => m.job_id === job.id); return <button type="button" className="panel chat-index-item" key={job.id} onClick={() => { navigate('tickets'); window.setTimeout(() => document.getElementById(`job-${job.id}`)?.scrollIntoView({ behavior: 'smooth' }), 80); }}><span><strong>{request?.title ?? 'Servicio contratado'}</strong><small>{job.client_id === user.id ? 'Especialista' : 'Cliente'} · {thread.length} {thread.length === 1 ? 'mensaje' : 'mensajes'}</small><small>{thread.at(-1)?.body ?? 'Abre el ticket para comenzar la conversación.'}</small></span><b>→</b></button>; })}</div> : <p className="empty">Las conversaciones privadas aparecen después de contratar un servicio.</p>}
      </section>}
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
      {profilePreview && <ProviderProfileDialog provider={profilePreview} categories={categories} municipalities={municipalities}
        reviews={reviews.filter(review => review.provider_id === profilePreview.id)} compared={compared.includes(profilePreview.id)}
        canCompare={compared.length < 3 || compared.includes(profilePreview.id)} onClose={() => setProfilePreview(null)}
        onCompare={() => { setCompared(ids => ids.includes(profilePreview.id) ? ids : [...ids, profilePreview.id]); setProfilePreview(null); }}
        onRequest={() => { const selected = profilePreview; setProfilePreview(null); startRequest([selected]); }} />}
    </main>
    <nav className="mobile-tabbar" aria-label="Navegación rápida">
      <button type="button" aria-current={page === 'inicio' ? 'page' : undefined} onClick={() => navigate('inicio')}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" /></svg><span>Inicio</span>
      </button>
      <button type="button" aria-current={page === 'explorar' ? 'page' : undefined} onClick={() => navigate('explorar')}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></svg><span>Explorar</span>
      </button>
      <button type="button" aria-current={page === 'solicitudes' ? 'page' : undefined} onClick={() => navigate('solicitudes')}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12a2 2 0 0 1 2 2v16l-4-2-4 2-4-2-4 2V5a2 2 0 0 1 2-2Z" /><path d="M8 9h8m-8 4h6" /></svg><span>Solicitudes</span>
      </button>
      <button type="button" aria-current={page === 'chat' ? 'page' : undefined} onClick={() => navigate('chat')}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18v13H8l-5 4V5Z" /><path d="M7 10h10m-10 4h7" /></svg><span>Chat</span>
      </button>
      <button type="button" aria-current={page === 'cuenta' ? 'page' : undefined} onClick={() => navigate('cuenta')}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg><span>Perfil</span>
      </button>
    </nav>
    <footer className="wrap app-footer"><span>YoResuelvo! · Delicias y la región</span><small>Los tickets registran acuerdos de servicio; no son facturas ni comprobantes de pago.</small><nav className="policy-links" aria-label="Privacidad y ayuda"><a href="/privacy.html">Aviso de privacidad</a><a href="/terms.html">Términos de uso</a><a href="/delete-account.html">Eliminar cuenta</a></nav></footer>
  </div>;
}

function SupportConversation({ userId, messages, busy, onSend }: { userId: string; messages: SupportMessage[]; busy: boolean; onSend: (body: string) => Promise<boolean> }) {
  const [draft, setDraft] = useState('');
  return <div className="support-conversation" aria-label="Conversación con Operaciones">
    <div className="support-history" role="log" aria-live="polite">{messages.length ? messages.map(item => <div className={`support-bubble${item.sender_id === userId ? ' customer' : ' operator'}`} key={item.id}><p>{item.body}</p><small>{item.sender_id === userId ? 'Cliente' : 'Operaciones'} · {date(item.created_at)}</small></div>) : <p>Aún no hay mensajes en esta conversación.</p>}</div>
    <form onSubmit={event => { event.preventDefault(); if (!draft.trim()) return; void onSend(draft).then(sent => { if (sent) setDraft(''); }); }}><label className="sr-only" htmlFor={`support-${userId}`}>Escribir mensaje</label><input id={`support-${userId}`} value={draft} maxLength={1500} onChange={event => setDraft(event.target.value)} placeholder="Escribe a Operaciones" /><button type="submit" disabled={busy || !draft.trim()}>Enviar</button></form>
  </div>;
}

function CategoryIcon({ slug }: { slug: string }) {
  const type = slug.toLowerCase();
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    {type.includes('electric') ? <path d="m13 2-8 11h6l-1 9 9-13h-6l1-7Z" />
      : type.includes('plom') ? <><path d="M7 3v6a5 5 0 0 0 10 0V3M5 3h4m6 0h4M12 14v2" /><path d="M12 19a2 2 0 1 0 4 0c0-1.2-2-3.2-2-3.2S12 17.8 12 19Z" /></>
        : type.includes('cerraj') ? <><circle cx="8" cy="8" r="4" /><path d="m11 11 9 9m-5-5 2-2m0 5 2-2" /></>
          : type.includes('limp') ? <><path d="m5 20 5-12m4 1 5 11M9 8l7 1m-9 6h12m-10 5h8" /></>
            : type.includes('mand') ? <><path d="M4 8h16l-1 13H5L4 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>
            : type.includes('refriger') ? <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 11h16M8 7h1M8 15h1M16 15h1"/></>
            : type.includes('alban') ? <><path d="M3 7h18v13H3zM3 13h18M9 7v6m6 0v7M4 4h16"/></>
            : type.includes('pint') ? <><path d="M3 4h14v7H3zM17 7h3v6h-8v3m0 0v5m-2-5h4"/></>
            : type.includes('carpint') ? <><path d="M4 18 17 5l3 3L7 21H4v-3ZM12 5l3-3 7 7-3 3"/></>
            : type.includes('jardin') ? <><path d="M12 21V10m0 6c-6 0-9-3-9-9 6 0 9 3 9 9Zm0-3c0-6 3-9 9-9 0 6-3 9-9 9Z"/></>
            : type.includes('mecan') ? <><circle cx="12" cy="12" r="3"/><path d="M10 2h4l1 3 2 1 3-1 2 4-2 2v2l2 2-2 4-3-1-2 1-1 3h-4l-1-3-2-1-3 1-2-4 2-2v-2L2 9l2-4 3 1 2-1 1-3Z"/></>
            : type.includes('soporte') ? <><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4M7 9l2 2-2 2m4 0h5"/></>
              : <><path d="m14.5 6.5 3-3a4 4 0 0 1-5 5l-7.8 7.8a2.1 2.1 0 0 0 3 3l7.8-7.8a4 4 0 0 0 5-5l-3 3-3-3Z" /></>}
  </svg>;
}

function ProviderProfileDialog({ provider, categories, municipalities, reviews, compared, canCompare, onClose, onCompare, onRequest }: {
  provider: Provider; categories: Category[]; municipalities: Municipality[]; reviews: Review[];
  compared: boolean; canCompare: boolean; onClose: () => void; onCompare: () => void; onRequest: () => void;
}) {
  const recentReviews = [...reviews].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)).slice(0, 3);
  const average = reviews.length ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1) : null;
  return <div className="profile-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="profile-dialog" role="dialog" aria-modal="true" aria-labelledby="provider-profile-title" tabIndex={-1}
      onKeyDown={event => { if (event.key === 'Escape') onClose(); }}>
      <button className="profile-dialog-close" type="button" aria-label="Cerrar perfil" autoFocus onClick={onClose}>×</button>
      <div className="profile-gallery" aria-label="Galería de servicios">
        {provider.photo_paths?.length ? provider.photo_paths.map((path, index) => <img key={path} src={providerPhotoUrl(path)} alt={`Foto ${index + 1} de ${provider.display_name}`} />)
          : [provider.categories[0] ?? '', 'plomeria', 'reparaciones'].map((slug, index) => <img key={`${slug}-${index}`} src={serviceImage(slug)} alt={`Imagen ilustrativa del servicio ${index + 1}`} />)}
      </div>{!provider.photo_paths?.length && <p className="image-disclosure">Imágenes ilustrativas del oficio. Este perfil aún no tiene fotos propias.</p>}
      <div className="profile-dialog-head"><span className="avatar profile-avatar" aria-hidden="true">{provider.display_name.slice(0, 1)}</span>
        <div><p className="eyebrow">{provider.categories.map(id => label(categories, id)).join(' · ')}</p><h2 id="provider-profile-title">{provider.display_name}</h2>
          <p>Profesional en {label(municipalities, provider.municipality_slug)}</p></div></div>
      <div className="profile-facts"><span>⌖ {label(municipalities, provider.municipality_slug)}</span>
        <span className={provider.available ? 'status' : 'status paused'}>{provider.available ? 'Recibe solicitudes' : 'No disponible por ahora'}</span>
        {average ? <span className="profile-rating">★ {average} · {reviews.length} reseña{reviews.length === 1 ? '' : 's'}</span> : <span>Aún sin reseñas verificadas</span>}
      </div>
      <div className="profile-highlights"><div><strong>{reviews.length || '—'}</strong><span>Reseñas</span></div><div><strong>{provider.years_experience ? `${provider.years_experience} años` : 'Por agregar'}</strong><span>Experiencia</span></div><div><strong>Por confirmar</strong><span>Tiempo de respuesta</span></div></div>
      <div className="profile-dialog-copy"><h3>Experiencia y servicios</h3><p>{provider.bio}</p>{Boolean(provider.specialties?.length) && <div className="specialty-tags">{provider.specialties?.map(item => <span key={item}>{item}</span>)}</div>}
        <p className="fine">El precio y el alcance se acuerdan mediante una cotización antes de iniciar. YoResuelvo! no procesa el pago.</p></div>
      <div className="profile-reviews"><h3>Reseñas de servicios completados</h3>{recentReviews.length ? recentReviews.map((review, index) => <article key={`${review.created_at}-${index}`}>
        <strong>★ {review.rating}/5</strong><p>{review.body}</p><small>{date(review.created_at)}</small></article>)
        : <p className="fine">Las reseñas aparecerán aquí cuando haya servicios completados y evaluados.</p>}</div>
      <div className="profile-dialog-actions"><button type="button" className="button outline" disabled={!provider.available || (!canCompare && !compared)} onClick={onCompare}>{compared ? '✓ En comparación' : 'Comparar'}</button>
        <button type="button" className="button primary" disabled={!provider.available} onClick={onRequest}>{provider.available ? 'Solicitar cotización' : 'No disponible'}</button></div>
    </section>
  </div>;
}

function Account({ user, notifications, preferences, onRead, onSavePreferences, onDisableAllPush, onExport, recovery, onRecovered, busy, onAction, authIntent, onAuthIntentChange, onGoogleSignIn, onChooseMode, onPushOpen, onPushForeground }: {
  user: User | null; notifications: Notification[]; preferences: NotificationPreferences | null;
  onRead: (id: number) => Promise<void>; onSavePreferences: (inApp: boolean) => Promise<void>; onExport: () => Promise<void>;
  onDisableAllPush: () => Promise<void>;
  recovery: boolean; onRecovered: () => void; busy: boolean;
  authIntent: AuthIntent; onAuthIntentChange: (intent: AuthIntent) => void;
  onGoogleSignIn: (intent: AuthIntent) => Promise<void>;
  onChooseMode: (intent: AuthIntent) => void;
  onPushOpen: (data: Record<string, string>) => void;
  onPushForeground: (notification: { title: string; body: string }) => void;
  onAction: (task: () => Promise<unknown>, success: string, next?: Page) => Promise<boolean>;
}) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [localNotice, setLocalNotice] = useState('');
  const [inApp, setInApp] = useState(true);
  const [pushActive, setPushActive] = useState(false);
  const [pushAllowed, setPushAllowed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  useEffect(() => { if (preferences) setInApp(preferences.in_app); }, [preferences?.in_app]);
  useEffect(() => { if (preferences) setPushAllowed(preferences.push_updates); }, [preferences?.push_updates]);
  useEffect(() => {
    let active = true;
    if (user && pushDeliveryConfigured) void activePushForThisDevice(user.id).then(value => { if (active) setPushActive(value); });
    else setPushActive(false);
    return () => { active = false; };
  }, [user?.id]);
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

  async function turnOnPush() {
    if (!user) return;
    setPushBusy(true); setLocalNotice('');
    try {
      const result = await enablePushForUser(user.id, { onOpen: onPushOpen, onForeground: onPushForeground });
      if (result.enabled) {
        setPushActive(true); setPushAllowed(true); setLocalNotice('Avisos push activados en este dispositivo.');
      } else if (result.reason === 'denied') setLocalNotice('El permiso está bloqueado en este dispositivo. Actívalo desde los ajustes del navegador o de Android.');
      else setLocalNotice('No se pudo registrar este dispositivo. Verifica la configuración de Firebase e inténtalo de nuevo.');
    } catch (e) { setLocalNotice(errText(e)); }
    finally { setPushBusy(false); }
  }
  async function turnOffPushHere() {
    if (!user) return;
    setPushBusy(true); setLocalNotice('');
    try {
      await disablePushForThisDevice(user.id);
      setPushActive(false); setLocalNotice('Avisos push desactivados en este dispositivo.');
    } catch (e) { setLocalNotice(errText(e)); }
    finally { setPushBusy(false); }
  }
  async function turnOffPushEverywhere() {
    setPushBusy(true); setLocalNotice('');
    try {
      await onDisableAllPush();
      setPushAllowed(false); setLocalNotice('Los avisos push quedaron pausados en todos tus dispositivos.');
    } catch (e) { setLocalNotice(errText(e)); }
    finally { setPushBusy(false); }
  }

  const displayName = String(user?.user_metadata.display_name ?? user?.user_metadata.full_name ?? user?.email ?? 'Tu cuenta');
  return <section className="section auth-section">
    <aside className="auth-aside">
      <div className="auth-brand"><img src="/brand/yoresuelvo-icon-512.png" alt="" /><span>YoResuelvo<span>!</span><small>DELICIAS Y LA REGIÓN</small></span></div>
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
        <div className="account-mode-choice">
          <h2>¿Qué quieres hacer ahora?</h2>
          <div>
            <button type="button" className={authIntent === 'cliente' ? 'mode-choice active' : 'mode-choice'} onClick={() => onChooseMode('cliente')}><strong>Buscar un servicio</strong><small>Comparar y solicitar cotizaciones</small></button>
            <button type="button" className={authIntent === 'prestador' ? 'mode-choice active' : 'mode-choice'} onClick={() => onChooseMode('prestador')}><strong>Ofrecer servicios</strong><small>Administrar tu perfil profesional</small></button>
          </div>
        </div>
        <button className="button outline" type="button" disabled={busy} onClick={() => void onAction(async () => {
          await forgetPushOnSignOut(user.id);
          const { error } = await db!.auth.signOut(); if (error) throw error;
        }, 'Sesión cerrada.', 'explorar')}>Cerrar sesión</button>
        <div className="privacy-panel">
          <h2>Preferencias de avisos</h2>
          <form className="form" onSubmit={e => { e.preventDefault(); void onSavePreferences(inApp); }}>
            <label className="inline"><input type="checkbox" checked={inApp} onChange={e => setInApp(e.target.checked)} /> Avisos dentro de la aplicación</label>
            <label className="inline locked"><input type="checkbox" defaultChecked={false} disabled /> Correo electrónico · proveedor pendiente</label>
            <button className="button outline" type="submit" disabled={busy}>Guardar preferencias</button>
          </form>
          <p className="fine">Los avisos por correo permanecen apagados hasta configurar y probar un proveedor.</p>
        </div>
        <div className="privacy-panel push-settings">
          <h2>Notificaciones push</h2>
          <p className="fine">Recibe avisos de solicitudes, cotizaciones, cambios de estado y reseñas en tu PWA o app Android. Tú eliges en qué dispositivos activarlos.</p>
          {!pushDeliveryConfigured ? <p className="push-unavailable" role="status">Firebase y sus credenciales de entrega todavía necesitan configuración.</p> : null}
          {pushDeliveryConfigured ? <>
            <p className="push-state">{pushActive ? 'Este dispositivo está registrado.' : pushAllowed ? 'Este dispositivo está pausado; otros pueden seguir activos.' : 'Los avisos push están apagados.'}</p>
            <button className="button primary" type="button" disabled={pushBusy} onClick={() => void (pushActive ? turnOffPushHere() : turnOnPush())}>
              {pushBusy ? 'Un momento…' : pushActive ? 'Desactivar en este dispositivo' : 'Activar en este dispositivo'}
            </button>
            {pushAllowed ? <button className="text-button push-disable-all" type="button" disabled={pushBusy} onClick={() => void turnOffPushEverywhere()}>Pausar avisos en todos mis dispositivos</button> : null}
          </> : null}
          {localNotice && <p className="auth-local-notice" role="status">{localNotice}</p>}
        </div>
        <div className="privacy-panel">
          <h2>Descargar mis datos</h2>
          <p className="fine">Prepara un archivo JSON con tus datos y los registros de servicios en que participas, respetando los permisos de tu cuenta. El archivo se descarga en este dispositivo.</p>
          <button type="button" className="button outline" disabled={busy} onClick={() => void onExport()}>Descargar archivo de datos</button>
        </div>
        <div className="privacy-panel account-deletion-panel">
          <h2>Eliminar cuenta</h2>
          <p className="fine">Puedes revisar lo que se borrará y confirmar la eliminación de tu cuenta y datos desde una página segura.</p>
          <a className="button outline" href="/delete-account.html">Revisar y eliminar mi cuenta</a>
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
        {!recovery && mode !== 'reset' && <>
          <button type="button" className="button google-button" disabled={busy || !configured} onClick={() => void onGoogleSignIn(authIntent)}>
            <span className="google-g" aria-hidden="true">G</span>{busy ? 'Conectando…' : mode === 'signup' ? 'Crear cuenta con Google' : 'Continuar con Google'}
          </button>
          <div className="auth-divider"><span>o continúa con correo</span></div>
        </>}
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
  onSave: (input: { id: string; display_name: string; bio: string; municipality_slug: string; available: boolean; categories: string[]; exists: boolean; years_experience: number | null; specialties: string[]; photo_paths: string[] }) => Promise<void>;
}) {
  const [name, setName] = useState(''); const [bio, setBio] = useState('');
  const [city, setCity] = useState('delicias'); const [selected, setSelected] = useState<string[]>([]);
  const [available, setAvailable] = useState(true);
  const [years, setYears] = useState(''); const [specialties, setSpecialties] = useState('');
  const [photos, setPhotos] = useState<string[]>([]); const [uploading, setUploading] = useState(false); const [uploadError, setUploadError] = useState('');
  useEffect(() => { if (current) { setName(current.display_name); setBio(current.bio); setCity(current.municipality_slug); setSelected(current.categories); setAvailable(current.available); setYears(current.years_experience?.toString() ?? ''); setSpecialties(current.specialties?.join(', ') ?? ''); setPhotos(current.photo_paths ?? []); } }, [current]);
  async function addPhotos(files: FileList | null) {
    if (!files || !user) return;
    setUploadError(''); setUploading(true);
    try {
      const chosen = Array.from(files).slice(0, 5 - photos.length);
      for (const file of chosen) {
        const path = await uploadProviderPhoto(user.id, file);
        setPhotos(current => [...current, path]);
      }
    } catch (e) { setUploadError(errText(e)); }
    finally { setUploading(false); }
  }
  return <section className="section"><p className="eyebrow">QUIERO OFRECER SERVICIOS</p><h1>Lo que sabes hacer,<br />alguien lo necesita.</h1>
    <div className="steps"><div><b>01</b><h3>Presenta tus habilidades</h3><p>Oficio, municipio, disponibilidad y experiencia.</p></div><div><b>02</b><h3>Recibe solicitudes</h3><p>Solo tras la revisión del perfil y según tu oficio y zona.</p></div><div><b>03</b><h3>Propón un alcance</h3><p>Explica materiales, traslado, vigencia y total antes de acordar.</p></div></div>
    {!active ? <p className="alert">El alta real se habilita con el proyecto independiente. <a href="/demo/">Ver la demo</a>.</p>
      : !user ? <button type="button" className="button primary" onClick={onSignIn}>Ingresar para crear perfil</button>
      : <form className="panel form" onSubmit={e => { e.preventDefault(); void onSave({
        id: user.id, display_name: name, bio, municipality_slug: city, available, categories: selected, exists: Boolean(current), years_experience: years ? Number(years) : null, specialties: specialties.split(',').map(item => item.trim()).filter(Boolean).slice(0, 8), photo_paths: photos
      }); }}>
        <div className="section-head"><h2>{current ? 'Edita tu perfil' : 'Crea tu perfil'}</h2>{current && <span className="status">Estado: {({ pending: 'En revisión', approved: 'Aprobado', rejected: 'Rechazado', suspended: 'Suspendido' } as Record<string,string>)[current.approval_status]}</span>}</div>
        <label>Nombre público o nombre comercial<input required minLength={3} maxLength={80} value={name} onChange={e => setName(e.target.value)} /></label>
        <label>Experiencia y servicios<textarea required minLength={20} maxLength={800} value={bio} onChange={e => setBio(e.target.value)} placeholder="Describe lo que haces sin compartir teléfono ni domicilio." /></label>
        <div className="form-row"><label>Años de experiencia<input type="number" min="0" max="60" value={years} onChange={e => setYears(e.target.value)} placeholder="Ej. 5" /></label><label>Especialidades<input maxLength={240} value={specialties} onChange={e => setSpecialties(e.target.value)} placeholder="Instalación, mantenimiento…" /></label></div>
        <div className="provider-photo-editor"><strong>Fotografías de tu trabajo</strong><p className="fine">Hasta cinco imágenes JPG, PNG o WebP de 4 MB. Serán públicas en tu perfil.</p><div className="photo-editor-track">{photos.map(path => <div key={path}><img src={providerPhotoUrl(path)} alt="Trabajo subido" /><button type="button" onClick={() => setPhotos(current => current.filter(item => item !== path))} aria-label="Quitar fotografía del perfil">×</button></div>)}</div>{photos.length < 5 && <label className="button outline">{uploading ? 'Subiendo…' : '＋ Agregar fotos'}<input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden disabled={uploading} onChange={e => { void addPhotos(e.target.files); e.target.value = ''; }} /></label>}{uploadError && <p role="alert" className="alert error">{uploadError}</p>}</div>
        <label>Municipio de cobertura<select value={city} onChange={e => setCity(e.target.value)}>{municipalities.map(m => <option key={m.slug} value={m.slug}>{m.name}</option>)}</select></label>
        <fieldset><legend>Oficios</legend><div className="checks">{categories.map(c => <label key={c.slug}><input type="checkbox" checked={selected.includes(c.slug)} onChange={() => setSelected(current => current.includes(c.slug) ? current.filter(id => id !== c.slug) : [...current, c.slug])} /> {c.name}</label>)}</div></fieldset>
        <label className="inline"><input type="checkbox" checked={available} onChange={e => setAvailable(e.target.checked)} /> Disponible para nuevas solicitudes</label>
        <p className="fine">Cambiar el nombre, descripción o municipio de un perfil aprobado lo devuelve a revisión. No publiques datos de contacto privados.</p>
        <button type="submit" className="button primary" disabled={busy || uploading || !selected.length}>Guardar perfil</button>
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
  const [filter, setFilter] = useState<'todas' | 'abiertas' | 'contratadas' | 'recibidas'>('todas');
  const visible = requests.filter(request => filter === 'todas' || (filter === 'abiertas' && request.status === 'open') || (filter === 'contratadas' && request.status === 'contracted') || (filter === 'recibidas' && request.client_id !== user?.id));
  return <section className="section"><p className="eyebrow">ACUERDOS CLAROS</p><h1>Solicitudes y cotizaciones</h1>
    {user && requests.length > 0 && <div className="request-filters" role="group" aria-label="Filtrar solicitudes">{([['todas','Todas'],['abiertas','Abiertas'],['contratadas','Contratadas'],['recibidas','Recibidas']] as const).map(([key, title]) => <button type="button" key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}>{title}</button>)}</div>}
    {!active ? <p className="empty">Esta vista necesita el proyecto real. <a href="/demo/">Prueba el flujo de la demo</a>.</p>
      : !user ? <button className="button primary" type="button" onClick={onSignIn}>Ingresar para consultar</button>
      : requests.length ? <div className="request-list">{visible.length ? visible.map(request => {
        const mine = request.client_id === user.id;
        const versions = quotes.filter(q => q.request_id === request.id);
        const job = jobs.find(j => j.request_id === request.id);
        return <article className="panel request-card" key={request.id}>
          <div className="section-head"><div><span className="eyebrow">{mine ? 'MI SOLICITUD' : 'INVITACIÓN RECIBIDA'}</span><h2>{request.title}</h2></div><span className="status">{request.status === 'open' ? 'Abierta' : request.status === 'contracted' ? 'Contratada' : request.status}</span></div>
          <p className="fine">{label(categories, request.category_slug)} · {label(municipalities, request.municipality_slug)} · Creada {date(request.created_at)} · Preferencia {date(request.preferred_at)}</p>
          <p>{request.description}</p><div className="request-summary"><span>{versions.length} {versions.length === 1 ? 'cotización' : 'cotizaciones'}</span><strong>{job ? `Contratado: ${money(versions.find(q => q.id === job.quote_version_id)?.total_amount ?? 0)}` : versions.length ? `Desde ${money(Math.min(...versions.map(q => q.total_amount)))}` : 'Aún sin cotizar'}</strong></div>
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
      }) : <p className="empty">No hay solicitudes con este filtro.</p>}</div> : <div className="empty"><h3>Aún no tienes solicitudes</h3><p>Cuando invites prestadores o recibas una invitación, aparecerá aquí.</p><button className="button primary" onClick={onExplore}>Explorar servicios</button></div>}
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
  return <section className="section"><p className="eyebrow">SERVICIOS EN MARCHA</p><h1>Mis servicios y chat</h1>
    {!active ? <p className="empty"><a href="/demo/#tickets">Ver tickets de demostración</a></p>
      : !user ? <button className="button primary" onClick={onSignIn}>Ingresar para consultar</button>
      : tickets.length ? <div className="ticket-list">{tickets.map(t => {
        const job = jobs.find(j => j.id === t.job_id);
        return job ? <TicketCard key={t.id} ticket={t} job={job} user={user}
          request={requests.find(r => r.id === job.request_id)}
          address={addresses.find(a => a.request_id === job.request_id)}
          review={ownReviews.find(r => r.job_id === job.id)}
          events={events.filter(e => e.job_id === job.id)}
          messages={messages.filter(m => m.job_id === job.id)} appeals={appeals.filter(a => a.job_id === job.id)}
          busy={busy} onAddress={onAddress} onStatus={onStatus} onReview={onReview} onMessage={onMessage} onAppeal={onAppeal} />
          : <ArchivedTicketCard key={t.id} ticket={t} />;
      })}</div> : <p className="empty">Los tickets aparecen después de aceptar una cotización.</p>}
  </section>;
}

function ArchivedTicketCard({ ticket }: { ticket: Ticket }) {
  const a = ticket.agreement;
  const status = ({
    confirmed: 'Confirmado', scheduled: 'Agendado', in_progress: 'En curso',
    completion_reported: 'Terminación reportada', completed: 'Completado',
    cancelled: 'Cancelado', disputed: 'En disputa'
  } as Record<string, string>)[ticket.archived_status ?? ''] ?? 'Archivado';
  return <article className="ticket panel archived-ticket">
    <div className="section-head"><div><p className="eyebrow">TICKET CONSERVADO</p><h2>{ticket.folio}</h2></div><span className="status">{status}</span></div>
    <h3>{String(a.request_title ?? 'Servicio')}</h3>
    <p>{String(a.scope ?? '')}</p>
    <dl><div><dt>Mano de obra</dt><dd>{money(Number(a.labor_amount ?? 0))}</dd></div><div><dt>Materiales</dt><dd>{money(Number(a.materials_amount ?? 0))}</dd></div><div><dt>Traslado</dt><dd>{money(Number(a.travel_amount ?? 0))}</dd></div><div className="total"><dt>Total acordado</dt><dd>{money(Number(a.total_amount ?? 0))}</dd></div></dl>
    <p className="fine">Materiales: {String(a.materials_note || 'Sin detalle')} · Exclusiones: {String(a.exclusions || 'Ninguna declarada')}</p>
    <p className="fine">Emitido {date(ticket.issued_at)} · Archivado {ticket.archived_at ? date(ticket.archived_at) : 'sin fecha registrada'}</p>
    <p className="fine">Se conserva el resumen del acuerdo por seguridad. La dirección exacta, las conversaciones y las reseñas no forman parte de este ticket. No es factura ni comprobante de pago.</p>
    <button className="button outline no-print" type="button" onClick={event => {
      const target = event.currentTarget.closest('.ticket');
      document.querySelectorAll('.ticket').forEach(node => node.classList.remove('print-target'));
      target?.classList.add('print-target');
      window.print();
    }}>Imprimir ticket</button>
  </article>;
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
  return <article className="ticket panel" id={`job-${job.id}`}>
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
    <section className="conversation no-print" aria-label="Mensajes privados del servicio"><div className="conversation-title"><span>☏</span><div><h3>Chat del servicio</h3><small>Solo tú y la otra parte</small></div></div>
      {messages.length ? <div className="chat-messages">{messages.map(m => <div className={`chat-bubble${m.sender_id === user.id ? ' own' : ''}`} key={m.id}><p>{m.body}</p><small>{date(m.created_at)}</small></div>)}</div> : <p className="chat-empty">Aquí podrás conversar cuando haya un servicio confirmado.</p>}
      <form className="chat-composer" onSubmit={e => { e.preventDefault(); if (messageBody.trim()) { void onMessage(job.id, messageBody); setMessageBody(''); } }}><label className="sr-only" htmlFor={`chat-${job.id}`}>Mensaje privado</label><input id={`chat-${job.id}`} required maxLength={1500} value={messageBody} onChange={e => setMessageBody(e.target.value)} placeholder="Escribe un mensaje…" /><button type="submit" disabled={busy || !messageBody.trim()} aria-label="Enviar mensaje">➤</button></form>
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
