import {providers,search,toggleCompare,makeTicket} from './domain.js';

const $=s=>document.querySelector(s);
let compared=[],chosen=null,tickets=[];
try{const saved=JSON.parse(localStorage.getItem('resuelve-demo')||'[]');if(Array.isArray(saved))tickets=saved.filter(t=>t&&typeof t.id==='string'&&typeof t.description==='string'&&typeof t.provider==='string').slice(0,50);}catch{}

function el(tag,text,cls){const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;}
function initials(name){return name.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toLocaleUpperCase('es-MX');}
function render(){
  const found=search(providers,$('#q').value,$('#city').value,$('#category').value);
  $('#count').textContent=`${found.length} ${found.length===1?'profesional':'profesionales'} de demostración`;
  $('#cards').replaceChildren();
  for(const p of found){
    const card=el('article',null,'card'),top=el('div',null,'card-top'),avatar=el('span',initials(p.name),'provider-avatar');
    avatar.setAttribute('aria-hidden','true');
    const name=el('h3',p.name),role=el('p',p.category,'provider-role'),profile=el('div');profile.append(name,role);
    top.append(avatar,profile,el('span','En tu región','tag'));
    card.append(top);
    const meta=el('div',null,'provider-meta');meta.append(el('span',`★ ${p.rating} · ${p.reviews} reseñas demo`,'rating'),el('span',p.city));card.append(meta);
    card.append(el('p',p.about,'provider-about'));
    const price=el('div',null,'price-line');price.append(document.createTextNode(`Desde $${p.price} MXN`),el('small',' · referencia ficticia'));card.append(price);
    card.append(el('p','Precio sujeto a cotización y alcance.','fine'));
    const actions=el('div',null,'actions'),select=el('button',compared.includes(p.id)?'✓ En comparación':'＋ Comparar','button secondary');
    select.type='button';select.disabled=compared.length===3&&!compared.includes(p.id);
    select.onclick=()=>{compared=toggleCompare(compared,p.id);render();};
    const request=el('button','Solicitar','button request-button');request.type='button';request.onclick=()=>{chosen=p;$('#chosen').textContent=`${p.name} · ${p.category}`;$('#description').value='';$('#error').textContent='';$('#request').showModal();};
    actions.append(select,request);card.append(actions);$('#cards').append(card);
  }
  $('#comparison').hidden=!compared.length;$('#compare-body').replaceChildren();
  for(const id of compared){const p=providers.find(x=>x.id===id);if(!p)continue;const row=el('tr');[p.name,p.city,`${p.rating} (${p.reviews})`,`Desde $${p.price} MXN · ficticio`].forEach(v=>row.append(el('td',v)));$('#compare-body').append(row);}
}
function renderTickets(){
  $('#ticket-list').replaceChildren();
  if(!tickets.length){$('#ticket-list').append(el('p','Todavía no hay tickets. Puedes generar uno de demostración desde un perfil.','fine'));return;}
  for(const t of tickets){const card=el('article',null,'ticket');card.append(el('span',t.status||'Solicitud demo','tag'),el('h3',t.provider),el('p',t.id),el('p',t.description),el('p',t.notice||'Ticket local de demostración.','fine'));const print=el('button','Imprimir ticket','button button-quiet');print.type='button';print.onclick=()=>{document.querySelectorAll('.ticket').forEach(n=>n.classList.remove('print-target'));card.classList.add('print-target');window.print();};card.append(print);$('#ticket-list').append(card);}
}

$('#filters').onsubmit=e=>e.preventDefault();
['q','city','category'].forEach(id=>$('#'+id).addEventListener('input',render));
document.querySelectorAll('[data-category]').forEach(link=>link.addEventListener('click',()=>{$('#category').value=link.dataset.category;document.querySelectorAll('[data-category]').forEach(x=>x.classList.toggle('active',x===link));render();}));
$('#clear-compare').onclick=()=>{compared=[];render();};
$('#cancel').onclick=()=>$('#request').close();
$('#request-form').onsubmit=e=>{e.preventDefault();try{const t=makeTicket(chosen,$('#description').value);tickets=[t,...tickets].slice(0,50);try{localStorage.setItem('resuelve-demo',JSON.stringify(tickets));}catch{t.notice+=' El navegador no permitió guardarlo; se perderá al cerrar.';}renderTickets();$('#request').close();location.hash='tickets';}catch(error){$('#error').textContent=error.message;}};
$('#clear').onclick=()=>{tickets=[];try{localStorage.removeItem('resuelve-demo');}catch{}renderTickets();};
render();renderTickets();
