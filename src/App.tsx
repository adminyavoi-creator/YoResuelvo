import {ServiceRequestDialog,ServiceCases} from './ServiceCases';
import {ExpertVisibility,VisibilityOperations,SponsoredExperts} from './Visibility';
import ScheduleAgreement from './ScheduleAgreement';
import WorkingHours from './WorkingHours';
import {profileRole} from './lib/profile';
import AppNavigation, {type AppPage} from './AppNavigation';
import CategoryPicker from './CategoryPicker';
import Agenda from './Agenda';
import Onboarding from './Onboarding';
import { useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from 'react';
import type { User } from '@supabase/supabase-js';
import { savedAuthIntent, saveAuthIntent, signInWithGoogle, type AuthIntent } from './lib/auth';
import { activePushForThisDevice, disableAllPushForUser, disablePushForThisDevice, enablePushForUser, forgetPushOnSignOut, pushDeliveryConfigured } from './lib/push';
import {
  db, configured, catalog, workspace, saveProvider, createRequest, submitQuote,
  acceptQuote, pendingProviders, reviewProvider, saveAddress, setJobStatus,
  createReview, markNotificationRead, pendingReports, reviewQueue, moderateReview, sendJobMessage,
  saveNotificationPreferences, exportMyData, fileReportAppeal, pendingAppeals, reviewReportAppeal, operationalMetrics, uploadProviderPhoto, providerPhotoUrl, supportInbox, sendSupportMessage,
  operationsQueue, operationHistory, reviewOperationItem, providerIntakes, createProviderIntake, updateProviderIntake, operationsPromotions, createPromotion, setPromotionStatus
} from './lib/api';
import { demoCategories, demoMunicipalities, demoProviders, demoReviews } from './lib/demo';
import type {
  Category, Municipality, Provider, ServiceRequest, Quote, Job, Ticket, PendingProvider,
  Address, Review, OwnReview, ModerationReview, Notification, Report, JobEvent, JobMessage,
  NotificationPreferences, Appeal, PendingAppeal, OperationalMetrics, SupportMessage, SupportThread, OperationQueueItem, OperationDecision, ProviderIntake, Promotion
} from './lib/types';

type Page = AppPage;
const money = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
const demoMapMode = new URLSearchParams(window.location.search).get('demo') === 'mapa';
const date = (v: string | null) => v
  ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Chihuahua' }).format(new Date(v))
  : 'Por acordar';
const label = (items: { slug: string; name: string }[], slug: string) => items.find(i => i.slug === slug)?.name ?? slug;
const serviceImage = (slug: string) => slug.includes('plom') ? '/images/plomeria.jpg' : slug.includes('electric') ? '/images/electricidad.jpg' : '/images/reparaciones.jpg';
const providerImage = (p: Provider) => (p.profile_photo_path || p.photo_paths?.[0]) ? providerPhotoUrl((p.profile_photo_path || p.photo_paths![0])) : serviceImage(p.categories[0] ?? '');
function ExpertPhoto({provider,cover=false}:{provider:Provider;cover?:boolean}) {
 const source=provider.id.startsWith('demo-')?`/images/expert-${provider.id.slice(5)}.png?v=13`:cover&&provider.photo_paths?.[0]?providerPhotoUrl(provider.photo_paths[0]):providerImage(provider);
 return <img className="expert-photo-image" src={source} alt={cover?`Servicio de ${provider.display_name}`:`Retrato de ${provider.display_name}`} loading="lazy" onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src=serviceImage(provider.categories[0]||'');}}/>;
}

const errText = (error: unknown) => error instanceof Error ? error.message : 'No se pudo completar la operación.';
const requestedPushPage = (): Page | null => {
  const screen = new URLSearchParams(window.location.search).get('screen');
  const allowed: Page[] = ['inicio','explorar','solicitudes','chat','ofrecer','tickets','cuenta'];
  return allowed.includes(screen as Page) ? screen as Page : null;
};

export default function App() {
  const [page, setPage] = useState<Page>(() => demoMapMode ? 'explorar' : 'cuenta');
  const [exploreView, setExploreView] = useState<'tarjetas' | 'lista' | 'mapa'>(() => demoMapMode ? 'mapa' : 'tarjetas');
  const [availabilityFilter,setAvailabilityFilter]=useState('');
  const [minimumRating,setMinimumRating]=useState('');
  const [sortOrder,setSortOrder]=useState('recomendados');
  const [profileEditing,setProfileEditing]=useState(false);
  const [demoBookingProvider,setDemoBookingProvider]=useState<Provider[]|null>(null);
  const [catalogLoading,setCatalogLoading]=useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<Category[]>(demoCategories);
  const [municipalities, setMunicipalities] = useState<Municipality[]>(demoMunicipalities);
  const [providers, setProviders] = useState<Provider[]>(configured && !demoMapMode ? [] : demoProviders);
  const [ownProvider, setOwnProvider] = useState<Provider | null>(null);
  const [staffRole, setStaffRole] = useState<string | null>(null);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [pending, setPending] = useState<PendingProvider[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [moderationReviews, setModerationReviews] = useState<ModerationReview[]>([]);
  const [reviews, setReviews] = useState<Review[]>(configured && !demoMapMode ? [] : demoReviews);
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
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [operationItems, setOperationItems] = useState<OperationQueueItem[]>([]);
  const [operationDecisions, setOperationDecisions] = useState<OperationDecision[]>([]);
  const [intakes, setIntakes] = useState<ProviderIntake[]>([]);
  const [operationsPromos, setOperationsPromos] = useState<Promotion[]>([]);
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

  const expertMode = profileRole(user?.user_metadata?.profile_role ?? authIntent) === 'prestador';
  async function switchProfile(intent: AuthIntent) {
    if (!db || !user) return;
    setBusy(true); setError('');
    try {
      const needsDetails = intent === 'cliente' && !user.user_metadata?.customer_profile;
      const result = await db.auth.updateUser({data:{profile_role:intent, ...(needsDetails ? {onboarding_complete:false} : {})}});
      if (result.error) throw result.error;
      setUser(result.data.user); setAuthIntent(intent); saveAuthIntent(intent);
      setCompared([]); setRequestOpen(false); setProfilePreview(null); setProfileEditing(false); setPage('inicio');
    } catch (error) { setError(errText(error)); }
    finally { setBusy(false); }
  }
  async function refresh(currentUser: User | null = user) {
    if (!configured || demoMapMode) return;
    if (!currentUser) {
      setRequests([]); setQuotes([]); setJobs([]); setTickets([]);
      setOwnProvider(null); setStaffRole(null); setPending([]); setReports([]); setModerationReviews([]);
      setAddresses([]); setOwnReviews([]); setNotifications([]); setEvents([]); setMessages([]);
      setSupportThreads([]); setSupportMessages([]); setSelectedSupportThread('');
      setPreferences(null); setAppeals([]); setAppealsQueue([]); setMetrics(null); setPromotions([]);
      setOperationItems([]); setOperationDecisions([]); setIntakes([]); setOperationsPromos([]);
      return;
    }
    setCatalogLoading(true);
    let c; try { c=await catalog(); } finally {setCatalogLoading(false);}
    setCategories(c.categories);
    setMunicipalities(c.municipalities);
    setProviders(c.providers);
    setReviews(c.reviews);
    setPromotions(c.promotions);
      const w = await workspace(currentUser.id);
      setRequests(w.requests);
      setQuotes(w.quotes);
      setJobs(w.jobs);
      setTickets(w.tickets);
      setOwnProvider(w.ownProvider);
      setStaffRole(w.staffRole);
      setAddresses(w.addresses); setOwnReviews(w.ownReviews);
      setNotifications(w.notifications); setEvents(w.events); setMessages(w.messages);
      const support = await supportInbox(currentUser.id, Boolean(w.staffRole)).catch(() => ({threads: [], messages: []}));
      setSupportThreads(support.threads); setSupportMessages(support.messages);
      setPreferences(w.preferences); setAppeals(w.appeals);
      if (w.staffRole) {
        const [p, r, reviewItems, appealItems, operational, queue, history, providerIntakeRows, promotionRows] = await Promise.all([
          pendingProviders(), pendingReports(), reviewQueue(), pendingAppeals(), operationalMetrics(), operationsQueue(), operationHistory(), providerIntakes(), operationsPromotions()
        ]);
        setPending(p); setReports(r); setModerationReviews(reviewItems);
        setAppealsQueue(appealItems); setMetrics(operational); setOperationItems(queue); setOperationDecisions(history);
        setIntakes(providerIntakeRows); setOperationsPromos(promotionRows);
      } else {
        setPending([]); setReports([]); setModerationReviews([]); setAppealsQueue([]); setMetrics(null);
        setOperationItems([]); setOperationDecisions([]); setIntakes([]); setOperationsPromos([]);
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
        const currentUser = db && !demoMapMode ? (await db.auth.getSession()).data.session?.user ?? null : null;
        if (!active) return;
        setUser(currentUser);
        setPage(demoMapMode ? 'explorar' : currentUser ? requestedPushPage() ?? ('inicio') : 'cuenta');
      } catch (e) { if (active) setError(errText(e)); }
      finally { if (active) setReady(true); }
    }
    void initialize();
    const subscription = demoMapMode ? undefined : db?.auth.onAuthStateChange((event, session) => {
      if (active) {
        setUser(session?.user ?? null);
        if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {setProfileEditing(false);setPage('inicio');}
        if (event === 'SIGNED_OUT') setPage('cuenta');
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
    if (!ready || !configured || (!user && !demoMapMode)) return;
    void refresh(user).catch(e => setError(errText(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user?.id]);
  useEffect(() => {
    if (!['chat','moderacion'].includes(page) || !user || !configured) return;
    const update = () => { if (document.visibilityState === 'visible') void supportInbox(user.id, Boolean(staffRole)).then(data => { setSupportThreads(data.threads); setSupportMessages(data.messages); }).catch(() => {}); };
    window.addEventListener('focus', update);
    const timer = window.setInterval(update, 20000);
    return () => { window.removeEventListener('focus', update); window.clearInterval(timer); };
  }, [page, user?.id, staffRole]);

  useEffect(()=>{const update=()=>{if(user)void refresh(user).catch(e=>setError(errText(e)));};window.addEventListener('yoresuelvo-service-updated',update);return()=>window.removeEventListener('yoresuelvo-service-updated',update);},[user?.id]);
  async function authAction(task: () => Promise<unknown>, success: string, next?: Page): Promise<boolean> {
    setBusy(true); setMessage(''); setError('');
    try {
      await task();
      const current = configured ? (await db!.auth.getUser()).data.user : null;
      setUser(current);
      await refresh(current);
      setMessage(success);
      if (next) setPage(current ? next : 'cuenta');
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
  useEffect(()=>{if(!user)return;const update=()=>{void refresh(user).catch(e=>setError(errText(e)));};window.addEventListener('yoresuelvo-demo-updated',update);return()=>window.removeEventListener('yoresuelvo-demo-updated',update);},[user?.id]);
  function action(task: () => Promise<unknown>, success: string, next?: Page): Promise<void> {
    return authAction(task, success, next).then(() => undefined);
  }
  function navigate(next: Page) {
    if (user && !demoMapMode && ((expertMode && next === 'explorar') || (!expertMode && next === 'ofrecer'))) next = 'inicio';
    setPage(!demoMapMode && !user ? 'cuenta' : next); setMessage(''); setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  const filtered = useMemo(() => providers.filter(p => {
    const scores=reviews.filter(r=>r.provider_id===p.id);
    const average=scores.length?scores.reduce((a,r)=>a+r.rating,0)/scores.length:0;
    if(minimumRating&&average<Number(minimumRating))return false;
    if(availabilityFilter==='now'&&(!p.available||p.availability==='soon'||p.availability==='unavailable'))return false;
    if(availabilityFilter==='soon'&&(!p.available||p.availability!=='soon'))return false;
    if(availabilityFilter==='unavailable'&&p.available&&p.availability!=='unavailable')return false;
    const q = search.trim().toLocaleLowerCase('es');
    return (!city || p.municipality_slug === city) && (!category || p.categories.includes(category))
      && (!q || (p.display_name + ' ' + p.bio + ' ' + p.categories.map(c => label(categories, c)).join(' '))
        .toLocaleLowerCase('es').includes(q));
  }).sort((a,b)=>{const score=(p:Provider)=>{const rr=reviews.filter(r=>r.provider_id===p.id);return rr.length?rr.reduce((sum,r)=>sum+r.rating,0)/rr.length:0;};return sortOrder==='rating'?score(b)-score(a):sortOrder==='name'?a.display_name.localeCompare(b.display_name,'es'):Number(b.available)-Number(a.available);}), [providers, city, category, search, categories,reviews,minimumRating,availabilityFilter,sortOrder]);
  const rated = useMemo(() => [...providers].sort((a, b) => {
    const score = (p: Provider) => { const items = reviews.filter(r => r.provider_id === p.id); return items.length ? items.reduce((sum, r) => sum + r.rating, 0) / items.length : 0; };
    return score(b) - score(a);
  }), [providers, reviews]);
  function startRequest(selected: Provider[]) {

    if (demoMapMode) { setMessage('Esta vista usa perfiles ficticios y no envía solicitudes.'); return; }
    if (!configured) { window.location.href = '/demo/#catalogo'; return; }
    if (!user) { setAuthIntent('cliente'); navigate('cuenta'); return; }
    if (expertMode) {setMessage('Cambia a tu perfil de cliente para solicitar un servicio.');setPage('cuenta');return;}
    if(!selected.length)return;
    setDemoBookingProvider(selected.slice(0,3));

  }

  if (!ready) return <div className="app-shell auth-loading"><p role="status">Cargando tu cuenta…</p></div>;

  return <div className={`app-shell${!user && !demoMapMode ? ' auth-only' : ''}`}>
    {(user || demoMapMode) && <header className="header wrap">
      <button type="button" className="brand" onClick={() => navigate(demoMapMode ? 'explorar' : 'inicio')} aria-label="YoResuelvo!, inicio">
        <img src="/brand/yoresuelvo-icon-512.png" alt="" /><span>YoResuelvo<span className="brand-mark">!</span><small>DELICIAS Y LA REGIÓN</small></span>
      </button>
      {!demoMapMode && <><AppNavigation page={page} expert={expertMode} onNavigate={navigate}/><button type="button" className="header-action messages-action" onClick={()=>navigate('chat')} aria-label="Mensajes">✉</button>{staffRole && <button className="text-button" onClick={()=>navigate('moderacion')}>Operaciones</button>}</>}
      {!demoMapMode && <button type="button" className="header-action" onClick={() => navigate('cuenta')} aria-label={user ? 'Mi cuenta y notificaciones' : 'Ingresar'}>
        {user ? '♧' : '↗'}{notifications.some(item => !item.read_at) && <span className="notification-dot" />}
      </button>}
    </header>}
    <main className="wrap">
      {user && (!user.user_metadata?.onboarding_complete || profileEditing) && !demoMapMode && <Onboarding key={`${user.id}:${profileEditing}`} onClose={profileEditing?()=>setProfileEditing(false):undefined} user={user} categories={categories} onDone={(updated,offering)=>{setUser(updated);setProfileEditing(false);setAuthIntent(offering?'prestador':'cliente');setPage(offering?'ofrecer':'inicio');}}/>}
      {demoMapMode && <div className="demo-banner" role="status"><span>●</span> Demostración · 10 perfiles ilustrativos. <a href="/">Salir de la prueba</a></div>}
      {!configured && !demoMapMode && <div className="demo-banner" role="status"><span>●</span> Vista de diseño · perfiles ficticios. <a href="/demo/">Abrir demo interactiva</a></div>}
      {!ready && <div className="app-loading-mark" role="status" aria-label="Cargando YoResuelvo!"><img src="/brand/yoresuelvo-icon-512.png" alt="" width="160" height="160"/><span>Cargando…</span></div>}
      {error && <p className="alert error" role="alert">{error}</p>}
      {message && <p className="alert success" role="status">{message}</p>}
      {page === 'inicio' && user && expertMode && <section className="section expert-home"><p className="eyebrow">Hola, {user.user_metadata?.display_name || 'experto'}</p><h1>Tu trabajo, en un solo lugar.</h1><div className="expert-shortcuts"><button className="panel" onClick={()=>navigate('solicitudes')}><strong>{requests.filter(r=>r.client_id!==user.id&&r.status==='open').length}</strong><span>Solicitudes recibidas</span></button><button className="panel" onClick={()=>navigate('tickets')}><strong>{jobs.filter(j=>j.provider_id===user.id&&!['completed','cancelled'].includes(j.status)).length}</strong><span>Servicios activos</span></button><button className="panel" onClick={()=>navigate('ofrecer')}><strong>＋</strong><span>Perfil y servicios</span></button></div>{ownProvider ? <button className="button primary" onClick={()=>navigate('agenda')}>Ver mi agenda</button> : <div className="panel"><h2>Completa tu perfil profesional</h2><button className="button primary" onClick={()=>navigate('ofrecer')}>Agregar mis servicios</button></div>}</section>}
      {page === 'inicio' && user && !expertMode && <section className="section home-page">
        <p className="eyebrow">Hola, {user.user_metadata?.display_name || user.user_metadata?.full_name || 'qué gusto verte'}</p><h1>¿Qué necesitas resolver hoy?</h1>
        <SponsoredExperts providers={providers} municipality="" category="" onOpen={setProfilePreview}/>
        <button type="button" className="home-search" onClick={() => navigate('explorar')}>⌕ &nbsp; Busca un servicio o especialista <span>→</span></button>
        <div className="problem-shortcuts" aria-label="Buscar por problema">{[{text:'Tengo una fuga',slug:'plomeria'},{text:'No hay luz',slug:'electricidad'},{text:'Necesito limpieza',slug:'limpieza'},{text:'Mi aire no enfría',slug:'refrigeracion'}].map(item=><button key={item.slug} onClick={()=>{setCategory(item.slug);navigate('explorar');}}>{item.text} →</button>)}</div><div className="browse-heading"><h2>Servicios populares</h2><button type="button" onClick={() => navigate('explorar')}>Ver todos →</button></div>
        <div className="category-grid service-category-rail">{categories.map(item => <button key={item.slug} type="button" className="category-tile" onClick={() => { setCategory(item.slug); navigate('explorar'); }}><span className="category-icon"><CategoryIcon slug={item.slug} /></span>{item.name}</button>)}</div>
        <div className="featured-strip" aria-label="Consejos y promociones"><div className="featured-track">{[
          { image: '/images/electricidad.jpg', title: 'Describe tu tarea con detalle', detail: 'Recibe cotizaciones más claras', slug: 'electricidad' },
          { image: '/images/plomeria.jpg', title: 'Compara el alcance completo', detail: 'Revisa materiales y traslado', slug: 'plomeria' },
          { image: '/images/reparaciones.jpg', title: 'Califica al terminar', detail: 'Ayuda a tu comunidad', slug: '' }
        ].map(slide => <button key={slide.title} type="button" className="featured-slide" onClick={() => { setCategory(slide.slug); navigate('explorar'); }}><img src={slide.image} alt="" /><span className="featured-overlay"><small>CONSEJO YORESUELVO!</small><strong>{slide.title}</strong><span>{slide.detail} ↗</span></span></button>)}</div></div>
        <div className="browse-heading"><h2>Expertos en la región</h2><button type="button" onClick={() => navigate('explorar')}>Explorar →</button></div>
        {rated.length ? <div className="home-providers">{[...rated.filter(p=>!p.id.startsWith('demo-')).slice(0,4),...rated.filter(p=>p.id.startsWith('demo-'))].map(p => { const items = reviews.filter(r => r.provider_id === p.id); return <button key={p.id} type="button" className="home-provider panel" onClick={() => setProfilePreview(p)}><ExpertPhoto provider={p} /><span><strong>{p.display_name}</strong><small>{label(categories, p.categories[0] ?? '')} · {label(municipalities, p.municipality_slug)}</small><small>{items.length ? `★ ${(items.reduce((sum, r) => sum + r.rating, 0) / items.length).toFixed(1)} · ${items.length} ${p.id.startsWith('demo-')?'valoración':'reseñas'}` : '☆ Sin reseñas todavía'}</small></span><b>→</b></button>; })}</div> : <p className="empty">Pronto encontrarás especialistas aprobados aquí.</p>}
        {promotions.length ? <section className="operation-promotions-public" aria-label="Promociones vigentes"><div className="browse-heading"><h2>Promociones vigentes</h2></div>{promotions.map(promotion => <article key={promotion.id} className="promotion-public"><small>{promotion.audience === 'all' ? 'PARA LA COMUNIDAD' : promotion.audience === 'providers' ? 'PARA ESPECIALISTAS' : 'PARA CLIENTES'}</small><strong>{promotion.title}</strong><p>{promotion.body}</p></article>)}</section> : null}
      </section>}
      {page === 'explorar' && (user || demoMapMode) && <>
        <section className="discovery" id="catalogo">
          {!demoMapMode && <SponsoredExperts providers={filtered} municipality={city} category={category} onOpen={setProfilePreview}/>}
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
            <div className="category-grid service-category-rail">{categories.map(item => <button key={item.slug} type="button"
              className={`category-tile${category === item.slug ? ' active' : ''}`} aria-pressed={category === item.slug}
              onClick={() => { setCategory(current => current === item.slug ? '' : item.slug); setCompared([]); }}>
              <span className="category-icon" aria-hidden="true"><CategoryIcon slug={item.slug} /></span><span>{item.name}</span>
            </button>)}</div>
          </div>
          <div className="browse-heading pros-heading"><div><h2>Personas que resuelven</h2><small>{filtered.length} {filtered.length === 1 ? 'perfil' : 'perfiles'} en tu búsqueda</small></div><button type="button" onClick={() => navigate('cuenta')}>Cambiar perfil ↗</button></div>
          <div className="discovery-options"><label>Disponibilidad<select value={availabilityFilter} onChange={e=>setAvailabilityFilter(e.target.value)}><option value="">Cualquier horario</option><option value="now">Disponible ahora</option><option value="soon">Disponible pronto</option><option value="unavailable">No disponible</option></select></label><label>Calificación<select value={minimumRating} onChange={e=>setMinimumRating(e.target.value)}><option value="">Todas</option><option value="4">4 estrellas o más</option><option value="4.5">4.5 estrellas o más</option></select></label><label>Ordenar<select value={sortOrder} onChange={e=>setSortOrder(e.target.value)}><option value="recomendados">Disponibilidad</option><option value="rating">Mejor calificación</option><option value="name">Nombre</option></select></label></div>{catalogLoading&&<p role="status">Buscando expertos…</p>}
          <div className="view-switch" role="group" aria-label="Vista de especialistas">{<button type="button" aria-pressed={exploreView === 'tarjetas'} onClick={() => setExploreView('tarjetas')}>▣ Tarjetas</button>}{<button type="button" aria-pressed={exploreView === 'lista'} onClick={() => setExploreView('lista')}>☷ Lista</button>}<button type="button" aria-pressed={exploreView === 'mapa'} onClick={() => setExploreView('mapa')}>⌖ Mapa</button></div>
          {exploreView === 'mapa' && <ProviderMap providers={filtered} reviews={reviews} categories={categories} municipalities={municipalities} demoMode={demoMapMode || !configured || filtered.every(p=>p.id.startsWith('demo-'))} onOpenProfile={setProfilePreview} />}
          {exploreView !== 'mapa' && <>
          {filtered.length ? <div className={`cards provider-cards ${exploreView === 'tarjetas' ? 'swipe-cards' : 'compact-list'}`}>{filtered.map(p => { const ratings = reviews.filter(r => r.provider_id === p.id); return <article className="card provider-card" key={p.id}>
            <button type="button" className="provider-photo" onClick={() => setProfilePreview(p)} aria-label={`Conocer a ${p.display_name}`}><ExpertPhoto provider={p} />{!p.photo_paths?.length && <span>Foto ilustrativa del servicio</span>}</button>
            <div className="provider-info"><div className="provider-top"><span className="service-pill">{label(categories, p.categories[0] ?? '')}{p.id.startsWith('demo-')?' · Ilustrativo':''}</span><span className={`availability-dot${p.available ? '' : ' paused'}`}>{(!p.available || p.availability==='unavailable') ? '● No disponible hoy' : p.availability === 'soon' ? '● Disponible pronto' : '● Disponible ahora'}</span></div>
            <h3>{p.display_name}</h3><p className="provider-location">⌖ {label(municipalities, p.municipality_slug)} · {city === p.municipality_slug ? 'Tu municipio' : 'En la región'}</p>
            <p className="provider-bio">{p.bio}</p><div className="provider-stats"><span>{ratings.length ? `★ ${(ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)} · ${ratings.length} ${p.id.startsWith('demo-')?'valoración':'reseñas'}` : '☆ Sin reseñas aún'}</span><span>{p.years_experience ? `${p.years_experience} años de experiencia` : 'Experiencia en perfil'}</span></div>
            <div className="card-actions"><button type="button" className="button outline" aria-pressed={compared.includes(p.id)}
              disabled={!p.available || (compared.length >= 3 && !compared.includes(p.id))}
              onClick={() => setCompared(ids => ids.includes(p.id) ? ids.filter(id => id !== p.id) : [...ids, p.id])}>
              {compared.includes(p.id) ? '✓ Elegido' : '＋ Comparar'}
            </button><button type="button" className="button primary" onClick={() => setProfilePreview(p)}>Ver perfil →</button></div></div>
          </article>; })}</div> : <div className="empty"><h3>Sin perfiles para estos filtros</h3><p>Prueba otro municipio o servicio.</p><button className="button outline" type="button" onClick={() => { setSearch(''); setCity(''); setCategory('');setAvailabilityFilter('');setMinimumRating(''); }}>Limpiar filtros</button></div>}
          </>}
          {compared.length > 0 && <section className="compare" aria-label="Comparación de prestadores"><div className="section-head"><h3>Compara hasta tres</h3><button className="text-button" onClick={() => setCompared([])}>Limpiar</button></div><div className="compare-grid">{compared.map(id => {
            const p = providers.find(item => item.id === id);
            return p && <div key={id}><strong>{p.display_name}</strong><span>{label(municipalities, p.municipality_slug)}</span><span>{p.categories.map(c => label(categories, c)).join(', ')}</span><p>{p.bio}</p></div>;
          })}</div><p className="fine">Envía el mismo requerimiento a los expertos elegidos y compara sus propuestas antes de aceptar.</p><button type="button" className="button primary" onClick={() => startRequest(compared.map(id => providers.find(p => p.id === id)).filter((p): p is Provider => Boolean(p)))}>Solicitar cotización</button></section>}
          {requestOpen && <RequestForm key={requestIds.join(',')} providers={providers} categories={categories} municipalities={municipalities}
            initialCategory={requestCategory} initialCity={requestCity} initialIds={requestIds} busy={busy}
            onCancel={() => setRequestOpen(false)} onSubmit={async input => {
              await action(() => createRequest(input), 'Solicitud enviada a los prestadores elegidos.', 'solicitudes');
            }} />}
        </section>
      </>}
      {page === 'cuenta' && user && <button className="button outline profile-edit-action" onClick={()=>setProfileEditing(true)}>Editar mis datos</button>}
      {page === 'cuenta' && <Account operationsRole={staffRole} onOperations={()=>navigate('moderacion')} user={user} notifications={notifications} preferences={preferences}
        authIntent={expertMode ? 'prestador' : 'cliente'} onAuthIntentChange={intent => { setAuthIntent(intent); saveAuthIntent(intent); }}
        onGoogleSignIn={googleSignIn}
        onChooseMode={intent => { void switchProfile(intent); }}
        onPushOpen={data => {
          const screen = data.screen;
          const allowed: Page[] = ['inicio','explorar','solicitudes','chat','ofrecer','tickets','cuenta'];
          navigate(allowed.includes(screen as Page) ? screen as Page : 'cuenta');
        }}
        onPushForeground={item => setMessage(`${item.title}: ${item.body}`)}
        onRead={id => action(() => markNotificationRead(id), 'Aviso marcado como leído.', 'cuenta')}
        onSavePreferences={async inApp => { await saveNotificationPreferences(user!.id, inApp); await refresh(); }}
        onDisableAllPush={async () => { await disableAllPushForUser(user!.id); await refresh(); }}
        onExport={() => action(async () => {
          const content = await exportMyData(user!.id, user!.email ?? undefined);
          const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url; link.download = `YoResuelvo-datos-${new Date().toISOString().slice(0,10)}.json`;
          document.body.append(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        }, 'Tu archivo de datos está listo para guardar.', 'cuenta')}
        recovery={recovery} onRecovered={() => setRecovery(false)} busy={busy} onAction={authAction} />}
      {page === 'agenda' && user && <section className="section"><p className="eyebrow">TUS PRÓXIMOS SERVICIOS</p><h1>{expertMode?'Mi agenda':'Servicios agendados'}</h1>{expertMode ? ownProvider ? <><WorkingHours providerId={user.id}/><Agenda providerId={user.id} jobs={jobs} onChange={()=>void refresh(user)}/></> : <div className="empty"><p>Agrega tus servicios para comenzar.</p><button className="button primary" onClick={()=>navigate('ofrecer')}>Completar perfil</button></div> : <><div className="request-list">{jobs.filter(j=>j.client_id===user.id&&!['cancelled','completed'].includes(j.status)).map(j=><button className="panel agenda-client-card" key={j.id} onClick={()=>navigate('tickets')}><strong>{requests.find(r=>r.id===j.request_id)?.title || 'Servicio'}</strong><span>{date(j.scheduled_at)}{j.scheduled_end_at?` — ${date(j.scheduled_end_at)}`:''}</span><small>Ver ticket →</small></button>)}</div>{!jobs.some(j=>j.client_id===user.id&&!['cancelled','completed'].includes(j.status))&&<div className="empty"><h2>Tu próxima solución empieza aquí</h2><button className="button primary" onClick={()=>navigate('explorar')}>Buscar expertos</button></div>}</>}</section>}
      {page === 'agenda' && user && <ServiceCases userId={user.id} mode={expertMode?'expert':'client'}/>}
      {page === 'solicitudes' && user && <ServiceCases userId={user.id} mode={expertMode?'expert':'client'}/>}
      {page === 'tickets' && user && <ServiceCases userId={user.id} mode={expertMode?'expert':'client'}/>}
      {page === 'moderacion' && user && staffRole==='admin' && <ServiceCases userId={user.id} mode="operations"/>}
      {page === 'ofrecer' && user && ownProvider && <ExpertVisibility key={user.id} userId={user.id}/>}
      {page === 'ofrecer' && <ProviderPage user={user} current={ownProvider} categories={categories} municipalities={municipalities}
        configured={configured} busy={busy} onSignIn={() => { setAuthIntent('prestador'); navigate('cuenta'); }}
        onSave={input => action(() => saveProvider(input), 'Perfil guardado. La aprobación depende de una revisión.', 'ofrecer')} />}
      {page === 'solicitudes' && <RequestsPage user={user} requests={requests.filter(r => expertMode ? r.client_id !== user?.id : r.client_id === user?.id)} quotes={quotes} jobs={jobs} providers={providers}
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
      {page === 'tickets' && <TicketsPage user={user} jobs={jobs.filter(j=>expertMode ? j.provider_id===user?.id : j.client_id===user?.id)} tickets={tickets.filter(t=>expertMode ? t.provider_id===user?.id : t.client_id===user?.id)} requests={requests} addresses={addresses} ownReviews={ownReviews} events={events} messages={messages} appeals={appeals} busy={busy}
        configured={configured} onSignIn={() => navigate('cuenta')}
        onAddress={(requestId, address, exists) => action(() => saveAddress(requestId, user!.id, address, exists), 'Dirección guardada para las partes del servicio.', 'tickets')}
        onStatus={(jobId, next, reason) => action(() => setJobStatus(jobId, next, reason), 'Estado actualizado y registrado.', 'tickets')}
        onReview={(jobId, rating, body) => action(() => createReview(jobId, rating, body), 'Reseña publicada para este trabajo.', 'tickets')}
        onMessage={(jobId, body) => action(() => sendJobMessage(jobId, body), 'Mensaje enviado de forma privada.', 'tickets')}
        onAppeal={(reportId, reason) => action(() => fileReportAppeal(reportId, reason), 'Apelación registrada para revisión.', 'tickets')} />}
      {page === 'moderacion' && staffRole && <OperationsCenter adminId={user!.id} adminName={String(user!.user_metadata?.display_name || user!.user_metadata?.full_name || 'Administración')} isAdmin={staffRole==='admin'} metrics={metrics} municipalities={municipalities} categories={categories}
        queue={operationItems} decisions={operationDecisions} pendingProviders={pending} intakes={intakes} promotions={operationsPromos}
        appeals={appealsQueue} reports={reports} reviews={moderationReviews} threads={supportThreads} supportMessages={supportMessages}
        selectedThread={selectedSupportThread} busy={busy} onSelectThread={setSelectedSupportThread}
        onReviewOperation={(itemType, entityId, status, reason) => action(() => reviewOperationItem(itemType, entityId, status, reason), 'Autorización registrada y notificada.', 'moderacion')}
        onReviewProvider={(id, status, reason) => action(() => reviewProvider(id, status, reason), 'Decisión registrada con motivo.', 'moderacion')}
        onCreateIntake={input => authAction(() => createProviderIntake(input), 'Expediente de proveedor registrado.', 'moderacion')}
        onUpdateIntake={(id, status) => action(() => updateProviderIntake(id, status), 'Estado del expediente actualizado.', 'moderacion')}
        onCreatePromotion={input => authAction(() => createPromotion(input), 'Promoción guardada como borrador.', 'moderacion')}
        onPromotionStatus={(id, status) => action(() => setPromotionStatus(id, status), 'Estado de promoción actualizado.', 'moderacion')}
        onSendSupport={(id, body) => authAction(() => sendSupportMessage(id, body), 'Respuesta guardada.', 'moderacion')}
        onAppeal={(id, status, response) => action(() => reviewReportAppeal(id, status, response), 'Decisión de apelación registrada.', 'moderacion')}
        onResolveReport={(jobId, next, reason) => action(() => setJobStatus(jobId, next, reason), 'Incidencia resuelta con motivo auditado.', 'moderacion')}
        onModerateReview={(jobId, published, reason) => action(() => moderateReview(jobId, published, reason), 'Reseña revisada con motivo auditado.', 'moderacion')} />}
      {demoBookingProvider && user && <ServiceRequestDialog userId={user.id} providers={demoBookingProvider} onClose={()=>setDemoBookingProvider(null)} onSaved={()=>{setDemoBookingProvider(null);setPage('solicitudes');setMessage('');window.dispatchEvent(new Event('yoresuelvo-demo-updated'));}}/>}
      {profilePreview && <ProviderProfileDialog provider={profilePreview} categories={categories} municipalities={municipalities} demoMode={profilePreview.id.startsWith('demo-') || demoMapMode || !configured} allowDemoBooking={Boolean(user && !expertMode && !demoMapMode)}
        reviews={reviews.filter(review => review.provider_id === profilePreview.id)} compared={compared.includes(profilePreview.id)}
        canCompare={compared.length < 3 || compared.includes(profilePreview.id)} onClose={() => setProfilePreview(null)}
        onCompare={() => { setCompared(ids => ids.includes(profilePreview.id) ? ids : [...ids, profilePreview.id]); setProfilePreview(null); }}
        onRequest={() => { const selected = profilePreview; setProfilePreview(null); startRequest([selected]); }} />}
    </main>
    <footer className="wrap app-footer"><span>YoResuelvo! · Delicias y la región</span><small>Los tickets registran acuerdos de servicio; no son facturas ni comprobantes de pago.</small><nav className="policy-links" aria-label="Privacidad y ayuda"><a href="/privacy.html">Aviso de privacidad</a><a href="/terms.html">Términos de uso</a><a href="/delete-account.html">Eliminar cuenta</a></nav></footer>
  </div>;
}

function OperationsCenter({ adminId,adminName,isAdmin,metrics, municipalities, categories, queue, decisions, pendingProviders, intakes, promotions, appeals, reports, reviews, threads, supportMessages, selectedThread, busy, onSelectThread, onReviewOperation, onReviewProvider, onCreateIntake, onUpdateIntake, onCreatePromotion, onPromotionStatus, onSendSupport, onAppeal, onResolveReport, onModerateReview }: {
  adminId:string;adminName:string;isAdmin:boolean;
  metrics: OperationalMetrics | null; municipalities: Municipality[]; categories: Category[]; queue: OperationQueueItem[];
  decisions: OperationDecision[];
  pendingProviders: PendingProvider[]; intakes: ProviderIntake[]; promotions: Promotion[]; appeals: PendingAppeal[];
  reports: Report[]; reviews: ModerationReview[]; threads: SupportThread[]; supportMessages: SupportMessage[];
  selectedThread: string; busy: boolean; onSelectThread: (id: string) => void;
  onReviewOperation: (type: 'request' | 'job', id: string, status: 'approved' | 'rejected', reason: string) => Promise<void>;
  onReviewProvider: (id: string, status: 'approved' | 'rejected' | 'suspended', reason: string) => Promise<void>;
  onCreateIntake: (input: { displayName: string; municipalitySlug: string; categorySlugs: string[]; notes: string }) => Promise<boolean>;
  onUpdateIntake: (id: string, status: 'invited' | 'archived') => Promise<void>;
  onCreatePromotion: (input: { title: string; body: string; audience: Promotion['audience']; startsAt: string | null; endsAt: string | null }) => Promise<boolean>;
  onPromotionStatus: (id: string, status: 'draft' | 'active' | 'paused') => Promise<void>;
  onSendSupport: (id: string, body: string) => Promise<boolean>;
  onAppeal: (id: string, status: 'accepted' | 'rejected', response: string) => Promise<void>;
  onResolveReport: (jobId: string, next: string, reason: string) => Promise<void>;
  onModerateReview: (jobId: string, published: boolean, reason: string) => Promise<void>;
}) {
  const [section, setSection] = useState<'resumen' | 'autorizaciones' | 'proveedores' | 'mensajes' | 'promociones' | 'calidad' | 'visibilidad'>('resumen');
  return <section className="section operations-center"><p className="eyebrow">CENTRO DE OPERACIONES</p><h1>Operaciones</h1>

    <div className="operation-tabs" role="tablist" aria-label="Áreas de Operaciones">
      {([['resumen','Resumen'],['autorizaciones',`Autorizaciones (${queue.length})`],['proveedores',`Proveedores (${pendingProviders.length + intakes.length})`],['mensajes',`Mensajes (${threads.length})`],['promociones','Promociones'],['calidad','Calidad']] as const).map(([id, title]) => <button key={id} type="button" role="tab" aria-selected={section === id} onClick={() => setSection(id)}>{title}</button>)}
    </div>
    {isAdmin && <button className="button outline" type="button" aria-pressed={section==='visibilidad'} onClick={()=>setSection('visibilidad')}>Planes y seguimiento</button>}
    {section==='visibilidad' && isAdmin && <VisibilityOperations userId={adminId} name={adminName} onReview={async(id,status,reason)=>{await reviewProvider(id,status,reason);}}/>}
    {section === 'resumen' && <>{metrics && <OperationalMetricsPanel metrics={metrics} municipalities={municipalities} categories={categories} />}<div className="operation-quick-grid"><article><strong>{queue.length}</strong><span>autorizaciones pendientes</span></article><article><strong>{pendingProviders.length}</strong><span>perfiles por aprobar</span></article><article><strong>{threads.length}</strong><span>conversaciones de soporte</span></article></div><h2>Historial de autorizaciones</h2>{decisions.length ? <div className="request-list">{decisions.slice(0,8).map((decision,index) => <article className="panel operation-history" key={`${decision.entity_type}-${decision.entity_id}-${decision.created_at}-${index}`}><div><strong>{decision.entity_type === 'request' ? 'Solicitud' : 'Servicio contratado'} · {decision.status === 'approved' ? 'Autorizado' : 'Rechazado'}</strong><small>{decision.entity_id.slice(0,8)} · {date(decision.created_at)} · operador {decision.reviewer_id.slice(0,8)}</small><p>{decision.reason}</p></div></article>)}</div> : <p className="empty">Las decisiones de este flujo aparecerán aquí.</p>}</>}
    {section === 'autorizaciones' && <div className="request-list"><h2>Solicitudes y servicios por verificar</h2>{queue.length ? queue.map(item => <OperationDecisionCard key={`${item.item_type}-${item.entity_id}`} item={item} categories={categories} municipalities={municipalities} busy={busy} onReview={onReviewOperation} />) : <p className="empty">No hay autorizaciones pendientes.</p>}</div>}
    {section === 'proveedores' && <><ProviderIntakeForm categories={categories} municipalities={municipalities} busy={busy} onSave={onCreateIntake} /><h2>Expedientes de especialistas</h2><p className="fine">El expediente no publica un perfil ni almacena datos de contacto. La persona completa su alta desde la app y después pasa por la aprobación normal.</p>{intakes.length ? <div className="request-list">{intakes.map(item => <article className="panel operation-card" key={item.id}><div><strong>{item.display_name}</strong><p>{label(municipalities,item.municipality_slug)} · {item.category_slugs.map(slug => label(categories,slug)).join(', ')}</p>{item.notes && <p>{item.notes}</p>}<small>Estado: {item.status === 'registered' ? 'registrado' : item.status === 'invited' ? 'en seguimiento' : 'archivado'} · {date(item.created_at)}</small></div><div className="card-actions">{item.status === 'registered' && <button type="button" className="button primary" disabled={busy} onClick={() => void onUpdateIntake(item.id,'invited')}>Marcar en seguimiento</button>}{item.status !== 'archived' && <button type="button" className="button outline" disabled={busy} onClick={() => void onUpdateIntake(item.id,'archived')}>Archivar</button>}</div></article>)}</div> : <p className="empty">Aún no hay expedientes.</p>}<h2>Perfiles enviados por especialistas</h2>{pendingProviders.length ? <div className="cards">{pendingProviders.map(provider => <ReviewCard key={provider.id} provider={provider} busy={busy} onReview={(status, reason) => onReviewProvider(provider.id,status,reason)} />)}</div> : <p className="empty">No hay perfiles pendientes.</p>}</>}
    {section === 'mensajes' && <div className="operations-support"><h2>Comunicación con usuarios y proveedores</h2>{threads.length ? <div className="support-queue">{threads.map(thread => <button type="button" key={thread.user_id} className={selectedThread === thread.user_id ? 'selected' : ''} onClick={() => onSelectThread(thread.user_id)}>{thread.user_id.slice(0,8)} · {date(thread.updated_at)}</button>)}</div> : <p className="empty">No hay consultas todavía.</p>}{selectedThread && <SupportConversation userId={selectedThread} messages={supportMessages.filter(message => message.user_id === selectedThread)} busy={busy} onSend={body => onSendSupport(selectedThread,body)} />}</div>}
    {section === 'promociones' && <><PromotionForm busy={busy} onSave={onCreatePromotion} /><h2>Promociones gestionadas</h2>{promotions.length ? <div className="request-list">{promotions.map(promotion => <article key={promotion.id} className="panel operation-card"><div><strong>{promotion.title}</strong><p>{promotion.body}</p><small>{promotion.audience} · {promotion.status ?? 'draft'} · {promotion.starts_at ? `desde ${date(promotion.starts_at)}` : 'sin fecha de inicio'}{promotion.ends_at ? ` · hasta ${date(promotion.ends_at)}` : ''}</small></div><div className="card-actions">{promotion.status !== 'active' && <button type="button" className="button primary" disabled={busy} onClick={() => void onPromotionStatus(promotion.id,'active')}>Activar</button>}{promotion.status !== 'paused' && <button type="button" className="button outline" disabled={busy} onClick={() => void onPromotionStatus(promotion.id,'paused')}>Pausar</button>}{promotion.status !== 'draft' && <button type="button" className="text-button" disabled={busy} onClick={() => void onPromotionStatus(promotion.id,'draft')}>Borrador</button>}</div></article>)}</div> : <p className="empty">Todavía no hay promociones.</p>}</>}
    {section === 'calidad' && <><h2>Apelaciones</h2>{appeals.length ? <div className="request-list">{appeals.map(appeal => <AppealReviewCard key={appeal.id} appeal={appeal} busy={busy} onReview={(status,response) => onAppeal(appeal.id,status,response)} />)}</div> : <p className="empty">No hay apelaciones pendientes.</p>}<h2>Incidencias abiertas</h2>{reports.length ? <div className="request-list">{reports.map(report => <ReportCard key={report.id} report={report} busy={busy} onResolve={(next,reason) => onResolveReport(report.job_id,next,reason)} />)}</div> : <p className="empty">No hay incidencias abiertas.</p>}<h2>Reseñas</h2>{reviews.length ? <div className="request-list">{reviews.map(review => <ModerationReviewCard key={review.job_id} review={review} busy={busy} onModerate={(published,reason) => onModerateReview(review.job_id,published,reason)} />)}</div> : <p className="empty">Aún no hay reseñas.</p>}</>}
  </section>;
}

function OperationDecisionCard({ item, categories, municipalities, busy, onReview }: { item: OperationQueueItem; categories: Category[]; municipalities: Municipality[]; busy: boolean; onReview: (type: 'request' | 'job', id: string, status: 'approved' | 'rejected', reason: string) => Promise<void> }) {
  const [reason, setReason] = useState('');
  return <article className="panel operation-card"><div><span className="service-pill">{item.item_type === 'request' ? 'Solicitud' : 'Servicio contratado'}</span><h3>{item.title}</h3><p>{item.detail}</p><small>{label(categories,item.category_slug)} · {label(municipalities,item.municipality_slug)} · {date(item.created_at)}</small></div><label>Motivo de decisión<textarea required minLength={10} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></label><div className="card-actions"><button type="button" className="button outline" disabled={busy || reason.trim().length < 10} onClick={() => void onReview(item.item_type,item.entity_id,'rejected',reason)}>Rechazar</button><button type="button" className="button primary" disabled={busy || reason.trim().length < 10} onClick={() => void onReview(item.item_type,item.entity_id,'approved',reason)}>Autorizar</button></div></article>;
}

function ProviderIntakeForm({ categories, municipalities, busy, onSave }: { categories: Category[]; municipalities: Municipality[]; busy: boolean; onSave: (input: { displayName: string; municipalitySlug: string; categorySlugs: string[]; notes: string }) => Promise<boolean> }) {
  const [displayName, setDisplayName] = useState(''); const [municipalitySlug, setMunicipalitySlug] = useState(municipalities[0]?.slug ?? ''); const [categorySlugs, setCategorySlugs] = useState<string[]>([]); const [notes, setNotes] = useState('');
  return <form className="form operation-form" onSubmit={event => { event.preventDefault(); void onSave({ displayName, municipalitySlug, categorySlugs, notes }).then(saved => { if (saved) { setDisplayName(''); setCategorySlugs([]); setNotes(''); } }); }}><h2>Registrar expediente de proveedor</h2><label>Nombre o razón de referencia<input required minLength={3} maxLength={80} value={displayName} onChange={event => setDisplayName(event.target.value)} /></label><label>Municipio<select value={municipalitySlug} onChange={event => setMunicipalitySlug(event.target.value)}>{municipalities.map(item => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label><fieldset><legend>Oficios (1 a 5)</legend><div className="check-grid">{categories.map(item => <label key={item.slug}><input type="checkbox" checked={categorySlugs.includes(item.slug)} onChange={() => setCategorySlugs(current => current.includes(item.slug) ? current.filter(slug => slug !== item.slug) : current.length < 5 ? [...current,item.slug] : current)} />{item.name}</label>)}</div></fieldset><label>Notas internas<textarea maxLength={1000} value={notes} onChange={event => setNotes(event.target.value)} /></label><button type="submit" className="button primary" disabled={busy || displayName.trim().length < 3 || !municipalitySlug || !categorySlugs.length}>Crear expediente</button></form>;
}

function PromotionForm({ busy, onSave }: { busy: boolean; onSave: (input: { title: string; body: string; audience: Promotion['audience']; startsAt: string | null; endsAt: string | null }) => Promise<boolean> }) {
  const [title, setTitle] = useState(''); const [body, setBody] = useState(''); const [audience, setAudience] = useState<Promotion['audience']>('all'); const [startsAt, setStartsAt] = useState(''); const [endsAt, setEndsAt] = useState('');
  return <form className="form operation-form" onSubmit={event => { event.preventDefault(); void onSave({ title, body, audience, startsAt: startsAt ? new Date(startsAt).toISOString() : null, endsAt: endsAt ? new Date(endsAt).toISOString() : null }).then(saved => { if (saved) { setTitle(''); setBody(''); setStartsAt(''); setEndsAt(''); } }); }}><h2>Crear promoción</h2><label>Título<input required minLength={6} maxLength={100} value={title} onChange={event => setTitle(event.target.value)} /></label><label>Mensaje<textarea required minLength={10} maxLength={300} value={body} onChange={event => setBody(event.target.value)} /></label><label>Audiencia<select value={audience} onChange={event => setAudience(event.target.value as Promotion['audience'])}><option value="all">Toda la comunidad</option><option value="clients">Clientes</option><option value="providers">Especialistas</option></select></label><div className="operation-date-grid"><label>Inicio<input type="datetime-local" value={startsAt} onChange={event => setStartsAt(event.target.value)} /></label><label>Fin<input type="datetime-local" value={endsAt} min={startsAt || undefined} onChange={event => setEndsAt(event.target.value)} /></label></div><button type="submit" className="button primary" disabled={busy || title.trim().length < 6 || body.trim().length < 10}>Guardar borrador</button></form>;
}

function SupportConversation({ userId, messages, busy, onSend }: { userId: string; messages: SupportMessage[]; busy: boolean; onSend: (body: string) => Promise<boolean> }) {
  const [draft, setDraft] = useState('');
  return <div className="support-conversation" aria-label="Conversación con Operaciones">
    <div className="support-history" role="log" aria-live="polite">{messages.length ? messages.map(item => <div className={`support-bubble${item.sender_id === userId ? ' customer' : ' operator'}`} key={item.id}><p>{item.body}</p><small>{item.sender_id === userId ? 'Cliente' : 'Operaciones'} · {date(item.created_at)}</small></div>) : <p>Aún no hay mensajes en esta conversación.</p>}</div>
    <form onSubmit={event => { event.preventDefault(); if (!draft.trim()) return; void onSend(draft).then(sent => { if (sent) setDraft(''); }); }}><label className="sr-only" htmlFor={`support-${userId}`}>Escribir mensaje</label><input id={`support-${userId}`} value={draft} maxLength={1500} onChange={event => setDraft(event.target.value)} placeholder="Escribe a Operaciones" /><button type="submit" disabled={busy || !draft.trim()}>Enviar</button></form>
  </div>;
}

type GeoPoint = { latitude: number; longitude: number };
type MapCenter = GeoPoint;

function projectMapPoint(point: GeoPoint, zoom: number) {
  const scale = 256 * 2 ** zoom;
  const latitude = Math.max(-85.0511, Math.min(85.0511, point.latitude)) * Math.PI / 180;
  return {
    x: (point.longitude + 180) / 360 * scale,
    y: (1 - Math.asinh(Math.tan(latitude)) / Math.PI) / 2 * scale
  };
}

function unprojectMapPoint(x: number, y: number, zoom: number): MapCenter {
  const scale = 256 * 2 ** zoom;
  const n = Math.PI - 2 * Math.PI * y / scale;
  return {
    latitude: 180 / Math.PI * Math.atan(Math.sinh(n)),
    longitude: x / scale * 360 - 180
  };
}

function ProviderMap({ providers, reviews, categories, municipalities, demoMode, onOpenProfile }: {
  providers: Provider[]; reviews: Review[]; categories: Category[]; municipalities: Municipality[];
  demoMode: boolean; onOpenProfile: (provider: Provider) => void;
}) {
  const [center, setCenter] = useState<MapCenter>({ latitude: 28.191, longitude: -105.468 });
  const [zoom, setZoom] = useState(13);
  const [size, setSize] = useState({ width: 720, height: 370 });
  const mapRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ pointerId: number; x: number; y: number; centerX: number; centerY: number } | null>(null);
  const centerPoint = projectMapPoint(center, zoom);

  useEffect(() => {
    const element = mapRef.current;
    if (!element) return;
    const observer = new ResizeObserver(entries => {
      const rect = entries[0]?.contentRect;
      if (rect) setSize({ width: rect.width, height: rect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const firstTileX = Math.floor((centerPoint.x - size.width / 2) / 256);
  const lastTileX = Math.floor((centerPoint.x + size.width / 2) / 256);
  const firstTileY = Math.floor((centerPoint.y - size.height / 2) / 256);
  const lastTileY = Math.floor((centerPoint.y + size.height / 2) / 256);
  const tileCount = 2 ** zoom;
  const tiles: { key: string; x: number; y: number; url: string }[] = [];
  for (let tileY = firstTileY; tileY <= lastTileY; tileY += 1) {
    if (tileY < 0 || tileY >= tileCount) continue;
    for (let tileX = firstTileX; tileX <= lastTileX; tileX += 1) {
      const wrappedX = (tileX % tileCount + tileCount) % tileCount;
      tiles.push({
        key: zoom + '-' + wrappedX + '-' + tileY,
        x: tileX * 256 - centerPoint.x + size.width / 2,
        y: tileY * 256 - centerPoint.y + size.height / 2,
        url: 'https://tile.openstreetmap.org/' + zoom + '/' + wrappedX + '/' + tileY + '.png'
      });
    }
  }
  const located = providers.map(p=>({...p,demo_location:p.demo_location ?? (p.public_latitude != null && p.public_longitude != null ? {latitude:Number(p.public_latitude),longitude:Number(p.public_longitude)} : undefined)})).filter(provider => provider.demo_location);
  function changeZoom(next: number) {
    setZoom(Math.max(11, Math.min(18, next)));
  }
  function beginPan(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button, a')) return;
    const projected = projectMapPoint(center, zoom);
    dragStart.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, centerX: projected.x, centerY: projected.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function movePan(event: ReactPointerEvent<HTMLDivElement>) {
    const start = dragStart.current;
    if (!start || start.pointerId !== event.pointerId) return;
    setCenter(unprojectMapPoint(start.centerX - (event.clientX - start.x), start.centerY - (event.clientY - start.y), zoom));
  }
  function endPan(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragStart.current?.pointerId === event.pointerId) dragStart.current = null;
  }
  return <div className="map-panel">
    <div className="osm-map" ref={mapRef} role="group" aria-label="Mapa interactivo de OpenStreetMap de Delicias. Arrastra para moverte; usa los controles para acercar o alejar."
      onPointerDown={beginPan} onPointerMove={movePan} onPointerUp={endPan} onPointerCancel={endPan}>
      <div className="osm-tiles" aria-hidden="true">{tiles.map(tile => <img key={tile.key} src={tile.url} alt="" draggable={false} style={{ left: tile.x, top: tile.y }} />)}</div>
      {located.map(provider => {
        const point = projectMapPoint(provider.demo_location!, zoom);
        const x = point.x - centerPoint.x + size.width / 2;
        const y = point.y - centerPoint.y + size.height / 2;
        if (x < -65 || x > size.width + 65 || y < -55 || y > size.height + 55) return null;
        const items = reviews.filter(review => review.provider_id === provider.id);
        const average = items.length ? (items.reduce((sum, review) => sum + review.rating, 0) / items.length).toFixed(1) : null;
        const service = label(categories, provider.categories[0] ?? '');
        return <button type="button" className="map-provider-marker" key={provider.id} style={{ left: x, top: y }}
          aria-label={'Abrir perfil de ' + provider.display_name + ', ' + service + ', ' + (average ? 'calificación ' + average + ' de 5' : 'sin calificación')}
          onClick={() => onOpenProfile(provider)}>
          <span className="map-pin-icon"><CategoryIcon slug={provider.categories[0] ?? ''} /></span>
          <span className="map-marker-label"><strong>{service} · {average ? `★ ${average}` : '☆ Sin reseñas'}</strong><small>{(!provider.available || provider.availability==='unavailable') ? 'No disponible hoy' : provider.availability === 'soon' ? 'Disponible pronto' : 'Disponible ahora'}</small></span>
        </button>;
      })}
      <div className="osm-controls" aria-label="Controles del mapa">
        <button type="button" aria-label="Acercar mapa" onClick={() => changeZoom(zoom + 1)}>＋</button>
        <button type="button" aria-label="Alejar mapa" onClick={() => changeZoom(zoom - 1)}>−</button>
        <button type="button" aria-label="Centrar mapa en Delicias" onClick={() => { setCenter({ latitude: 28.191, longitude: -105.468 }); setZoom(13); }}>⌖</button>
      </div>
      <a className="osm-attribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a>
    </div>
    <p className="map-disclosure">{demoMode
      ? 'Ubicaciones ficticias de prueba alrededor del centro de Delicias. Las calificaciones también son ejemplos; no representan domicilios ni reseñas reales.'
      : 'Solo se mostrarán perfiles con ubicación aproximada pública y autorizada. No se representa el domicilio particular del especialista.'}</p>
    <div className="map-providers">{providers.map(provider => {
      const items = reviews.filter(review => review.provider_id === provider.id);
      const average = items.length ? (items.reduce((sum, review) => sum + review.rating, 0) / items.length).toFixed(1) : null;
      return <button type="button" key={provider.id} onClick={() => onOpenProfile(provider)}>
        <ExpertPhoto provider={provider} />
        <span><strong>{label(categories, provider.categories[0] ?? '')} · {provider.display_name}</strong>
          <small>{label(municipalities, provider.municipality_slug)} · {average ? '★ ' + average + (demoMode ? ' · prueba' : '') : '☆ Sin reseñas'}</small>
          {!provider.demo_location && <small>Sin ubicación pública</small>}
        </span><b aria-hidden="true">→</b>
      </button>;
    })}</div>
    {!providers.length && <p className="empty map-empty">No hay especialistas para estos filtros. Los marcadores aparecerán cuando existan ubicaciones públicas autorizadas.</p>}
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

function ProviderProfileDialog({ allowDemoBooking=false,provider, categories, municipalities, reviews, compared, canCompare, demoMode, onClose, onCompare, onRequest }: {
  provider: Provider; categories: Category[]; municipalities: Municipality[]; reviews: Review[];
  allowDemoBooking?:boolean;compared: boolean; canCompare: boolean; demoMode: boolean; onClose: () => void; onCompare: () => void; onRequest: () => void;
}) {
  const [tab,setTab]=useState<'works'|'reviews'|'about'>('works');
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const previous=document.activeElement as HTMLElement|null;dialog.current?.showModal();return()=>previous?.focus();},[]);
  const average=reviews.length?reviews.reduce((n,r)=>n+r.rating,0)/reviews.length:null;
  const price=provider.price_min!=null&&provider.price_max!=null?`${money(provider.price_min)} – ${money(provider.price_max)}`:'A cotizar';
  return <dialog ref={dialog} className="profile-dialog expert-detail" onCancel={onClose} aria-labelledby="provider-profile-title">
    <button className="profile-dialog-close" type="button" aria-label="Cerrar perfil" onClick={onClose}>×</button>
    <div className="expert-cover"><ExpertPhoto provider={provider} cover /></div>
    <div className="expert-detail-body"><div className="profile-dialog-head"><span className="avatar profile-avatar"><ExpertPhoto provider={provider}/></span><div><p className="eyebrow">{provider.categories.map(id=>label(categories,id)).join(' · ')}</p><h2 id="provider-profile-title">{provider.display_name}</h2><p>⌖ {label(municipalities,provider.municipality_slug)}</p></div></div>
    <div className="profile-facts"><span className="rating-stars" aria-label={average?`${average.toFixed(1)} de 5 estrellas`:'Sin reseñas'}>{average?'★'.repeat(Math.round(average))+'☆'.repeat(5-Math.round(average)):'☆☆☆☆☆'}</span><strong>{average?.toFixed(1)??'Sin reseñas'}</strong><span>({reviews.length})</span><span className="status">{provider.available?'Recibe solicitudes':'No disponible'}</span>{provider.id.startsWith('demo-')&&<small>Perfil ilustrativo</small>}</div>
    <div className="expert-price"><span>Rango orientativo</span><strong>{price}</strong><small>{provider.price_unit||'Por servicio'} · El importe final se define en la cotización.</small></div>
    <div className="expert-tabs" role="tablist" aria-label="Información del experto">{([['works','Trabajos'],['reviews','Reseñas'],['about','Acerca de']] as const).map(([id,title])=><button key={id} id={`expert-tab-${id}`} role="tab" aria-selected={tab===id} aria-controls={`expert-panel-${id}`} tabIndex={tab===id?0:-1} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const ids=['works','reviews','about'] as const;const next=e.key==='Home'?0:e.key==='End'?2:(ids.indexOf(tab)+(e.key==='ArrowRight'?1:2))%3;setTab(ids[next]);document.getElementById(`expert-tab-${ids[next]}`)?.focus();}}} onClick={()=>setTab(id)}>{title}</button>)}</div>
    <section className="expert-tab-panel" role="tabpanel" id={`expert-panel-${tab}`} aria-labelledby={`expert-tab-${tab}`}>
    {tab==='works'&&<>{provider.photo_paths?.length?<div className="expert-work-grid">{provider.photo_paths.map((path,i)=><img key={path} src={providerPhotoUrl(path)} alt={`${provider.id.startsWith('demo-')?'Imagen ilustrativa':'Trabajo'} de ${provider.display_name} ${i+1}`} loading="lazy"/>)}</div>:<p>Este experto aún no ha agregado fotografías de sus trabajos.</p>}</>}
    {tab==='reviews'&&<div className="profile-reviews">{reviews.length?[...reviews].sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at)).map((r,i)=><article key={i}><strong className="rating-stars" aria-label={`${r.rating} de 5 estrellas`}>{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</strong><p>{r.body||'Sin comentario'}</p><small>{date(r.created_at)}</small></article>):<p>Aún no hay reseñas de servicios completados.</p>}</div>}
    {tab==='about'&&<div><h3>Experiencia y servicios</h3><p>{provider.bio}</p>{provider.years_experience!=null&&<p>{provider.years_experience} años de experiencia</p>}<div className="specialty-tags">{provider.specialties?.map(x=><span key={x}>{x}</span>)}</div><p>Cobertura: {label(municipalities,provider.municipality_slug)}</p></div>}
    </section></div><div className="profile-dialog-actions"><button type="button" className="button outline" aria-pressed={compared} disabled={!provider.available||(!canCompare&&!compared)} onClick={onCompare}>{compared?'✓ En comparación':'＋ Comparar'}</button><button type="button" className="button primary" disabled={!provider.available||(demoMode&&!allowDemoBooking)} onClick={onRequest}>Solicitar cotización</button></div>
  </dialog>;
}

function Account({ operationsRole,onOperations,user, notifications, preferences, onRead, onSavePreferences, onDisableAllPush, onExport, recovery, onRecovered, busy, onAction, authIntent, onAuthIntentChange, onGoogleSignIn, onChooseMode, onPushOpen, onPushForeground }: {
  operationsRole:string|null;onOperations:()=>void;
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
  const [preferencesBusy, setPreferencesBusy] = useState(false);
  useEffect(() => { if (preferences) setInApp(preferences.in_app); }, [preferences?.in_app]);
  useEffect(() => { if (preferences) setPushAllowed(preferences.push_updates); }, [preferences?.push_updates]);
  useEffect(() => {
    let active = true;
    if (user && pushDeliveryConfigured) void activePushForThisDevice(user.id).then(value => { if (active) setPushActive(value); }).catch(error => { if (active) setLocalNotice(errText(error)); });
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
    }, 'Sesión iniciada.', 'inicio');
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
      setPushAllowed(false); setPushActive(false); setLocalNotice('Los avisos push quedaron pausados en todos tus dispositivos.');
    } catch (e) { setLocalNotice(errText(e)); }
    finally { setPushBusy(false); }
  }

  const displayName = String(user?.user_metadata.display_name ?? user?.user_metadata.full_name ?? user?.email ?? 'Tu cuenta');
  return <section className={`section auth-section${user ? " account-view" : ""}`}>
    <aside className="auth-aside">
      <div className="auth-brand"><img src="/brand/yoresuelvo-icon-512.png" alt="" /><span>YoResuelvo<span>!</span><small>DELICIAS Y LA REGIÓN</small></span></div>
      <p className="auth-kicker">GENTE CAPAZ, CERCA DE TI</p>
      <h1>{recovery ? 'Recupera el control de tu cuenta.' : user ? 'Qué bueno tenerte aquí.' : mode === 'signup' ? 'Tu siguiente paso empieza aquí.' : mode === 'reset' ? 'Volvamos a abrirte el camino.' : 'Resuelve lo que sigue.'}</h1>
      <p className="auth-lead">{user ? 'Administra tu perfil y tus preferencias.' : 'Conecta con personas de confianza de Delicias y la región, con un acceso sencillo y seguro.'}</p>
      {!user && !recovery && <div className="auth-intent-picker" aria-label="Elige cómo quieres empezar">
        <button type="button" className={authIntent === 'cliente' ? 'auth-intent selected' : 'auth-intent'} aria-pressed={authIntent === 'cliente'} onClick={() => onAuthIntentChange('cliente')}>
          <span className="auth-intent-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.4"/><path d="m16 16 4.3 4.3"/></svg></span>
          <span><strong>Busco resolver algo</strong><small>Comparar y solicitar un servicio</small></span>
        </button>
        <button type="button" className={authIntent === 'prestador' ? 'auth-intent selected' : 'auth-intent'} aria-pressed={authIntent === 'prestador'} onClick={() => onAuthIntentChange('prestador')}>
          <span className="auth-intent-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 8.5h16v11H4zM8 8.5V5h8v3.5M4 13h16M10 12v2h4v-2"/></svg></span>
          <span><strong>Quiero ofrecer servicios</strong><small>Crear un perfil profesional</small></span>
        </button>
        <p>Una sola cuenta puede hacer ambas cosas. Puedes cambiar de perfil desde tu cuenta.</p>
      </div>}
      <div className="auth-trust"><span aria-hidden="true">✓</span><p><strong>Acceso seguro</strong><small>Tu contraseña no se guarda en YoResuelvo.</small></p></div>
    </aside>

    <div className="auth-main">
      {!recovery && user ? <div className="panel account-panel">
        <p className="eyebrow">TU ESPACIO</p><div className="account-identity"><span className="account-avatar" aria-hidden="true">{displayName.slice(0, 1).toUpperCase()}</span><div><h2>Mi cuenta</h2><p>{displayName}{displayName !== user.email && user.email ? <small>{user.email}</small> : null}</p></div></div>
        

        <div className="account-mode-choice">
          <h2>Cambiar de perfil</h2>
          <div role="group" aria-label="Experiencias de tu cuenta">
            <button type="button" className={authIntent === 'cliente' ? 'mode-choice active' : 'mode-choice'} disabled={busy} aria-pressed={authIntent === 'cliente'} onClick={() => onChooseMode('cliente')}><strong>Cliente</strong><small>Comparar y solicitar cotizaciones</small></button>
            <button type="button" className={authIntent === 'prestador' ? 'mode-choice active' : 'mode-choice'} disabled={busy} aria-pressed={authIntent === 'prestador'} onClick={() => onChooseMode('prestador')}><strong>Experto</strong><small>Ofrecer mis servicios</small></button>
            {operationsRole && <button type="button" className="mode-choice" disabled={busy} onClick={onOperations}><strong>Operaciones</strong><small>Administración</small></button>}
          </div>
        </div>
        <button className="button outline" type="button" disabled={busy} onClick={() => void onAction(async () => {
          await forgetPushOnSignOut(user.id);
          const { error } = await db!.auth.signOut(); if (error) throw error;
        }, 'Sesión cerrada.', 'explorar')}>Cerrar sesión</button>
        <div className="privacy-panel notification-settings">
          <h2>Notificaciones</h2>
          <div className="setting-row"><span id="in-app-label">Avisos en la aplicación</span><button type="button" role="switch" aria-checked={inApp} aria-labelledby="in-app-label" className="setting-switch" disabled={preferencesBusy || busy} onClick={async () => {
            const next = !inApp; setPreferencesBusy(true); setLocalNotice('');
            try { await onSavePreferences(next); setInApp(next); } catch (error) { setLocalNotice(errText(error)); } finally { setPreferencesBusy(false); }
          }}><span aria-hidden="true"/><span className="switch-caption">{inApp ? 'Encendido' : 'Apagado'}</span></button></div>
          {pushDeliveryConfigured && <>
            <div className="setting-row"><span id="push-label">Push en este dispositivo</span><button type="button" role="switch" aria-checked={pushActive && pushAllowed} aria-labelledby="push-label" aria-busy={pushBusy} className="setting-switch" disabled={pushBusy} onClick={() => void (pushActive && pushAllowed ? turnOffPushHere() : turnOnPush())}><span aria-hidden="true"/><span className="switch-caption">{pushBusy ? 'Guardando…' : pushActive && pushAllowed ? 'Encendido' : 'Apagado'}</span></button></div>
            {pushAllowed && <button className="text-button push-disable-all" type="button" disabled={pushBusy} onClick={() => void turnOffPushEverywhere()}>Apagar en todos mis dispositivos</button>}
          </>}
          {localNotice && <p className="auth-local-notice" role="status">{localNotice}</p>}
        </div>
        <div className="privacy-panel">
          <h2>Descargar mis datos</h2>
          <p className="fine">Descarga una copia de tu información.</p>
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
  const [step,setStep]=useState(1);
  const [category, setCategory] = useState(initialCategory);
  const [municipality, setMunicipality] = useState(initialCity);
  const [ids, setIds] = useState(initialIds);
  const [title, setTitle] = useState(''); const [description, setDescription] = useState('');
  const [preferred, setPreferred] = useState('');
  const eligible = providers.filter(p => p.categories.includes(category) && p.municipality_slug === municipality);
  const selected = ids.filter(id => eligible.some(p => p.id === id));
  return <form id="request-form" className="panel form" onSubmit={e => {
    e.preventDefault();
    if(step<3){setStep(step+1);return;}
    if (!selected.length) return;
    void onSubmit({ category, municipality, title, description, providerIds: selected, preferredAt: preferred ? new Date(preferred).toISOString() : null });
  }}>
    <div className="section-head"><div><p className="eyebrow">NUEVA SOLICITUD</p><h2>Cuéntanos qué necesitas</h2></div><button type="button" className="text-button" onClick={onCancel}>Cerrar</button></div>
    <ol className="flow-steps" aria-label="Pasos de solicitud">{['Tu problema','Lugar y horario','Revisar'].map((t,i)=><li key={t} aria-current={step===i+1?'step':undefined}>{i+1}. {t}</li>)}</ol>
    <div hidden={step!==2}><div className="form-row"><label>Servicio<select required value={category} onChange={e => { setCategory(e.target.value); setIds([]); }}>{categories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></label><label>Municipio<select required value={municipality} onChange={e => { setMunicipality(e.target.value); setIds([]); }}>{municipalities.map(m => <option key={m.slug} value={m.slug}>{m.name}</option>)}</select></label></div>
    <fieldset><legend>Expertos a invitar (hasta tres)</legend><div className="checks">{eligible.map(p => <label key={p.id}><input type="checkbox" checked={selected.includes(p.id)} disabled={selected.length >= 3 && !selected.includes(p.id)} onChange={() => setIds(current => current.includes(p.id) ? current.filter(id => id !== p.id) : [...current, p.id])} /> {p.display_name}</label>)}</div>{!eligible.length && <p className="fine">No hay prestadores aprobados para esa combinación.</p>}</fieldset>
    </div><div hidden={step!==1}><label>Título de la tarea<input minLength={10} maxLength={120} required value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej. Revisar tres contactos eléctricos" /></label>
    <label>Descripción y alcance<textarea minLength={20} maxLength={2000} required value={description} onChange={e => setDescription(e.target.value)} placeholder="Explica el problema y qué resultado esperas. Evita poner tu dirección exacta aquí." /></label>
    </div><div hidden={step!==2}><label>Horario preferido (opcional)<input type="datetime-local" value={preferred} onChange={e => setPreferred(e.target.value)} /></label>
    </div>{step===3&&<div className="request-review"><h3>{title}</h3><p>{description}</p><p>{label(categories,category)} · {label(municipalities,municipality)}</p><p>{preferred?date(new Date(preferred).toISOString()):'Horario por acordar'}</p><p>{selected.map(id=>providers.find(p=>p.id===id)?.display_name).join(' · ')}</p><small>Enviar la solicitud no confirma una cita. La dirección exacta se comparte después del acuerdo.</small></div>}<div className="card-actions">{step>1&&<button className="button outline" type="button" onClick={()=>setStep(step-1)}>Atrás</button>}<button className="button primary" type="submit" disabled={busy || !selected.length}>{step===3?'Enviar solicitud':'Continuar'}</button></div>
  </form>;
}

function LocationPicker({latitude,longitude,onChange}:{latitude:string;longitude:string;onChange:(a:string,b:string)=>void}) {
 const z=13,center=projectMapPoint({latitude:28.191,longitude:-105.468},z),tileX=Math.floor(center.x/256),tileY=Math.floor(center.y/256);
 return <div className="location-picker" role="group" aria-label="Selecciona tu zona en el mapa" onClick={e=>{const r=e.currentTarget.getBoundingClientRect(),p=unprojectMapPoint((tileX-1)*256+(e.clientX-r.left)/r.width*768,(tileY-1)*256+(e.clientY-r.top)/r.height*768,z);onChange(p.latitude.toFixed(3),p.longitude.toFixed(3));}}>{[-1,0,1].flatMap(y=>[-1,0,1].map(x=><img key={`${x}:${y}`} draggable={false} alt="" src={`https://tile.openstreetmap.org/${z}/${tileX+x}/${tileY+y}.png`}/>))}{latitude&&longitude&&<span className="location-picked" style={{left:`${(projectMapPoint({latitude:Number(latitude),longitude:Number(longitude)},z).x-(tileX-1)*256)/768*100}%`,top:`${(projectMapPoint({latitude:Number(latitude),longitude:Number(longitude)},z).y-(tileY-1)*256)/768*100}%`}}>●</span>}<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()}>© OpenStreetMap</a></div>;
}

function ProviderPage({ user, current, categories, municipalities, configured: active, busy, onSignIn, onSave }: {
  user: User | null; current: Provider | null; categories: Category[]; municipalities: Municipality[];
  configured: boolean; busy: boolean; onSignIn: () => void;
  onSave: (input: { id: string; display_name: string; bio: string; municipality_slug: string; available: boolean; categories: string[]; exists: boolean; price_min?:number|null;price_max?:number|null;price_unit?:string; years_experience: number | null; specialties: string[]; photo_paths: string[]; public_latitude?: number | null; public_longitude?: number | null; profile_photo_path?: string | null }) => Promise<void>;
}) {
  const [name, setName] = useState(''); const [bio, setBio] = useState('');
  const [lat,setLat]=useState(current?.public_latitude?.toString() ?? ''); const [lon,setLon]=useState(current?.public_longitude?.toString() ?? ''); const [portrait,setPortrait]=useState(current?.profile_photo_path ?? '');
  const [city, setCity] = useState('delicias'); const [selected, setSelected] = useState<string[]>([]);
  const [priceMin,setPriceMin]=useState(current?.price_min?.toString()??''),[priceMax,setPriceMax]=useState(current?.price_max?.toString()??''),[priceUnit,setPriceUnit]=useState(current?.price_unit??'Por servicio');
  const [available, setAvailable] = useState(true);
  const [years, setYears] = useState(''); const [specialties, setSpecialties] = useState('');
  const [photos, setPhotos] = useState<string[]>([]); const [uploading, setUploading] = useState(false); const [uploadError, setUploadError] = useState('');
  useEffect(() => { if (current) { setPriceMin(current.price_min?.toString()??'');setPriceMax(current.price_max?.toString()??'');setPriceUnit(current.price_unit??'Por servicio'); setLat(current.public_latitude?.toString() ?? ''); setLon(current.public_longitude?.toString() ?? ''); setPortrait(current.profile_photo_path ?? ''); setName(current.display_name); setBio(current.bio); setCity(current.municipality_slug); setSelected(current.categories); setAvailable(current.available); setYears(current.years_experience?.toString() ?? ''); setSpecialties(current.specialties?.join(', ') ?? ''); setPhotos(current.photo_paths ?? []); } }, [current]);
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
    {!active ? <p className="alert">El alta real se habilita con el proyecto independiente. <a href="/demo/">Ver la demo</a>.</p>
      : !user ? <button type="button" className="button primary" onClick={onSignIn}>Ingresar para crear perfil</button>
      : <form className="panel form" onSubmit={e => { e.preventDefault(); void onSave({
        id: user.id, price_min:priceMin?Number(priceMin):null,price_max:priceMax?Number(priceMax):null,price_unit:priceUnit, display_name: name, bio, municipality_slug: city, available, categories: selected, exists: Boolean(current), years_experience: years ? Number(years) : null, specialties: specialties.split(',').map(item => item.trim()).filter(Boolean).slice(0, 8), photo_paths: photos, public_latitude: lat ? Number(lat) : null, public_longitude: lon ? Number(lon) : null, profile_photo_path: portrait || null
      }); }}>
        <div className="section-head"><h2>{current ? 'Edita tu perfil' : 'Mi perfil profesional'}</h2>{current && <span className="status">Estado: {({ pending: 'En revisión', approved: 'Aprobado', rejected: 'Rechazado', suspended: 'Suspendido' } as Record<string,string>)[current.approval_status]}</span>}</div>
        <label>Nombre público o nombre comercial<input required minLength={3} maxLength={80} value={name} onChange={e => setName(e.target.value)} /></label>
        <label>Experiencia y servicios<textarea required minLength={20} maxLength={800} value={bio} onChange={e => setBio(e.target.value)} placeholder="Describe lo que haces sin compartir teléfono ni domicilio." /></label>
        <div className="form-row"><label>Años de experiencia<input type="number" min="0" max="60" value={years} onChange={e => setYears(e.target.value)} placeholder="Ej. 5" /></label><label>Especialidades<input maxLength={240} value={specialties} onChange={e => setSpecialties(e.target.value)} placeholder="Instalación, mantenimiento…" /></label></div>
        {current&&<fieldset><legend>Rango orientativo (opcional)</legend><div className="form-row"><label>Desde MXN<input type="number" min="0" max="1000000" step="0.01" value={priceMin} onChange={e=>setPriceMin(e.target.value)}/></label><label>Hasta MXN<input type="number" min={priceMin||0} max="1000000" step="0.01" value={priceMax} onChange={e=>setPriceMax(e.target.value)}/></label></div><label>Unidad<select value={priceUnit} onChange={e=>setPriceUnit(e.target.value)}><option>Por servicio</option><option>Por hora</option><option>Por visita</option></select></label><small>Completa ambos importes o déjalos vacíos. La cotización define el total final.</small></fieldset>}<div className="provider-photo-editor"><strong>Fotografías de tu trabajo</strong><p className="fine">Hasta 5 fotos de tus trabajos · 4 MB por foto.</p><div className="photo-editor-track">{photos.map(path => <div key={path}><img src={providerPhotoUrl(path)} alt="Trabajo subido" /><button type="button" onClick={() => setPhotos(current => current.filter(item => item !== path))} aria-label="Quitar fotografía del perfil">×</button></div>)}</div>{photos.length < 5 && <label className="button outline">{uploading ? 'Subiendo…' : '＋ Agregar fotos'}<input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden disabled={uploading} onChange={e => { void addPhotos(e.target.files); e.target.value = ''; }} /></label>}{uploadError && <p role="alert" className="alert error">{uploadError}</p>}</div>
        <fieldset><legend>Foto de perfil</legend>{portrait && <img className="portrait-preview" src={providerPhotoUrl(portrait)} alt="Tu perfil"/>}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={async e=>{const file=e.target.files?.[0];if(!file||!user)return;setUploading(true);try{setPortrait(await uploadProviderPhoto(user.id,file));}catch(error){setUploadError(errText(error));}finally{setUploading(false);}}}/></fieldset>
        <fieldset><legend>Zona pública de servicio</legend><p className="fine">Elige una zona aproximada. Será visible en el mapa.</p><div className="form-row"><label>Latitud<input type="number" step="0.0001" min="-90" max="90" value={lat} onChange={e=>setLat(e.target.value)}/></label><label>Longitud<input type="number" step="0.0001" min="-180" max="180" value={lon} onChange={e=>setLon(e.target.value)}/></label></div><LocationPicker latitude={lat} longitude={lon} onChange={(a,b)=>{setLat(a);setLon(b);}}/><button type="button" className="button outline" onClick={()=>navigator.geolocation.getCurrentPosition(p=>{setLat((Math.round(p.coords.latitude*1000)/1000).toString());setLon((Math.round(p.coords.longitude*1000)/1000).toString());},()=>setUploadError('No pudimos obtener tu ubicación. Puedes escribir las coordenadas.'))}>Usar mi zona actual</button>{lat&&lon&&<iframe title="Zona de servicio" className="location-preview" src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(lon)-.01}%2C${Number(lat)-.01}%2C${Number(lon)+.01}%2C${Number(lat)+.01}&layer=mapnik&marker=${lat}%2C${lon}`}/>}<button type="button" className="button outline" onClick={()=>{setLat('');setLon('');}}>Quitar ubicación pública</button></fieldset>
        <label>Municipio de cobertura<select value={city} onChange={e => setCity(e.target.value)}>{municipalities.map(m => <option key={m.slug} value={m.slug}>{m.name}</option>)}</select></label>
        <CategoryPicker categories={categories} value={selected} onChange={setSelected} label="Oficios y servicios"/>
        <label className="inline"><input type="checkbox" checked={available} onChange={e => setAvailable(e.target.checked)} /> Disponible para nuevas solicitudes</label>
        <p className="fine">Cambiar el nombre, descripción o municipio de un perfil aprobado lo devuelve a revisión. No publiques datos de contacto privados.</p>
        <button type="submit" className="button primary" disabled={busy || uploading || !selected.length || Boolean(priceMin)!==Boolean(priceMax) || Boolean(priceMin&&Number(priceMax)<Number(priceMin))}>Guardar perfil</button>
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
  const [accepting,setAccepting]=useState<Quote|null>(null);
  const [filter, setFilter] = useState<'todas' | 'abiertas' | 'contratadas' | 'recibidas'>('todas');
  const visible = requests.filter(request => filter === 'todas' || (filter === 'abiertas' && request.status === 'open') || (filter === 'contratadas' && request.status === 'contracted') || (filter === 'recibidas' && request.client_id !== user?.id));
  return <section className="section"><p className="eyebrow">ACUERDOS CLAROS</p><h1>Solicitudes y propuestas</h1>{accepting&&<div className="profile-dialog-backdrop"><section className="onboarding panel" role="dialog" aria-modal="true" aria-labelledby="accept-title"><h2 id="accept-title">Revisar acuerdo</h2><p>{accepting.scope}</p><strong>{money(accepting.total_amount)}</strong><p>Materiales: {accepting.materials_note||'Sin materiales especificados'}</p><p>Exclusiones: {accepting.exclusions||'Ninguna'}</p><p>Horario propuesto: {date(accepting.proposed_at)}</p><small>El pago se acuerda directamente con el experto. El ticket registra el acuerdo.</small><div className="card-actions"><button className="button outline" disabled={busy} onClick={()=>setAccepting(null)}>Volver</button><button className="button primary" disabled={busy} onClick={async()=>{await onAccept(accepting.id);setAccepting(null);}}>Aceptar y generar ticket</button></div></section></div>}
    {user && requests.length > 0 && <div className="request-filters" role="group" aria-label="Filtrar solicitudes">{([['todas','Todas'],['abiertas','Abiertas'],['contratadas','Contratadas'],['recibidas','Recibidas']] as const).map(([key, title]) => <button type="button" key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}>{title}</button>)}</div>}
    {!active ? <p className="empty">Esta vista necesita el proyecto real. <a href="/demo/">Prueba el flujo de la demo</a>.</p>
      : !user ? <button className="button primary" type="button" onClick={onSignIn}>Ingresar para consultar</button>
      : requests.length ? <div className="request-list">{visible.length ? visible.map(request => {
        const mine = request.client_id === user.id;
        const versions = quotes.filter(q => q.request_id === request.id);
        const job = jobs.find(j => j.request_id === request.id);
        return <article className="panel request-card" key={request.id}>
          <div className="section-head"><div><span className="eyebrow">{mine ? 'MI SOLICITUD' : 'INVITACIÓN RECIBIDA'}</span><h2>{request.title}</h2></div><span className="status">{request.operations_status === 'pending' ? 'En verificación' : request.operations_status === 'rejected' ? 'No autorizada' : request.status === 'open' ? 'Abierta' : request.status === 'contracted' ? 'Contratada' : request.status}</span></div>
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
              {mine && valid && <button type="button" className="button primary" disabled={busy} onClick={() => setAccepting(q)}>Revisar y aceptar</button>}
              {job?.quote_version_id === q.id && <span className="status">Versión aceptada</span>}
              {!latest && <span className="fine">Sustituida por una versión posterior.</span>}
            </div>;
          })}</div>}
          {mine && request.operations_status === 'pending' && <p className="fine">Operaciones verificará la solicitud antes de que los especialistas puedan enviar cotizaciones.</p>}
          {mine && request.operations_status === 'rejected' && <p className="fine">La solicitud no fue autorizada. Puedes escribir a Operaciones desde Mensajes para consultar el seguimiento.</p>}
          {!mine && request.status === 'open' && (request.operations_status ?? 'approved') === 'approved' && <QuoteForm requestId={request.id} busy={busy} onSubmit={onQuote} />}
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

    if ((job.operations_status ?? 'approved') === 'approved' && job.status === 'scheduled') options.push({ next: 'in_progress', label: 'Iniciar trabajo' });
    if ((job.operations_status ?? 'approved') === 'approved' && job.status === 'in_progress') options.push({ next: 'completion_reported', label: 'Reportar terminación' });
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
    <ol className="flow-steps service-progress" aria-label="Avance del servicio">{['confirmed','scheduled','in_progress','completion_reported','completed'].map((status,i)=><li key={status} aria-current={job.status===status?'step':undefined}>{['Acuerdo','Agendado','En curso','Por confirmar','Completado'][i]}</li>)}</ol><p className="fine">Versión {String(a.quote_version ?? '')} · Horario {job.scheduled_at ? date(job.scheduled_at) : 'Por acordar'}{job.scheduled_end_at ? ` — ${date(job.scheduled_end_at)}` : ''} · Emitido {date(ticket.issued_at)}</p>
    {job.operations_status === 'pending' && <p className="request-summary">Servicio en espera de autorización de Operaciones; todavía no debe iniciarse.</p>}
    {job.operations_status === 'rejected' && <p className="alert error">El servicio no fue autorizado. Contacta a Operaciones para el seguimiento.</p>}
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
    <ScheduleAgreement job={job} userId={user.id}/><section className="conversation no-print" aria-label="Mensajes privados del servicio"><div className="conversation-title"><span>☏</span><div><h3>Chat del servicio</h3><small>Solo tú y la otra parte</small></div></div>
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
