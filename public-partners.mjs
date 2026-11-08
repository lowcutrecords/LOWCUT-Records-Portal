import {artistKey} from './public-artists.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function publicPartner(input){
  const text=k=>String(input[k]||'').trim();
  const id=text('id')||artistKey(text('name')),name=text('name').slice(0,120),imagePath=text('imagePath');
  if(!/^[a-z0-9_-]+$/i.test(id)||!name)throw new Error('Completá el nombre y un ID válido.');
  const url=new URL(text('url'));if(url.protocol!=='https:')throw new Error('El enlace debe empezar con https://.');
  if(!/^assets\/[a-zA-Z0-9_./ -]+\.webp$/.test(imagePath)&&!/^https:\/\/[^\s]+\.webp(?:[?#].*)?$/i.test(imagePath))throw new Error('Usá una imagen .webp existente en assets/ o una URL HTTPS .webp.');
  if(imagePath.includes('..'))throw new Error('Ruta de imagen inválida.');
  return {id,name,imagePath,url:url.href,taglineEn:text('taglineEn').slice(0,240),taglineEs:text('taglineEs').slice(0,240),visible:input.visible===true,displayOrder:Math.max(0,Number(input.displayOrder)||0)};
}
export function mountPublicPartners(container,api){
  container.classList.add('public-artist-editor');let rows=[],editing=null;
  container.innerHTML=`<div class="web-manager-head"><div><div class="index">ADMIN / WEBSITE</div><h2>PARTNERS</h2><p class="section-note">Colaboradores que aparecen en la web.</p></div><button type="button" class="web-btn" data-new>+ AGREGAR PARTNER</button></div><p class="web-help">Editá el nombre, logo WebP, enlace y textos en español e inglés. Ocultá un partner sin borrarlo. La sincronización se activa después de revisar las reglas de Firebase.</p><div data-status class="web-status" role="status"></div><div class="web-list" data-list></div><form class="web-panel web-form hidden" data-form><div class="web-form-grid">${[['id','ID ESTABLE'],['name','NOMBRE'],['imagePath','LOGO .WEBP'],['url','ENLACE HTTPS'],['taglineEs','DESCRIPCIÓN ES'],['taglineEn','DESCRIPCIÓN EN'],['displayOrder','ORDEN']].map(([key,label])=>`<div class="field"><label>${label}<input name="${key}" ${['name','imagePath','url'].includes(key)?'required':''} ${key==='displayOrder'?'type="number" min="0"':''}></label></div>`).join('')}<div class="field"><label><input type="checkbox" name="visible"> VISIBLE EN WEB</label></div></div><div class="web-form-actions"><button class="web-btn" type="submit">GUARDAR PARTNER</button><button class="web-btn alt" type="button" data-cancel>CANCELAR</button></div></form>`;
  const q=s=>container.querySelector(s),form=q('form'),field=k=>form.elements.namedItem(k),status=q('[data-status]');
  function open(row){editing=row;form.reset();for(const k of ['id','name','imagePath','url','taglineEs','taglineEn','displayOrder'])field(k).value=row?.[k]??(k==='displayOrder'?rows.length+1:'');field('visible').checked=row?.visible??true;field('id').readOnly=!!row;form.classList.remove('hidden');}
  async function refresh(){if(!api.isAdmin()){container.classList.add('hidden');return;}container.classList.remove('hidden');try{rows=(await api.list()).sort((a,b)=>a.displayOrder-b.displayOrder);q('[data-list]').innerHTML=rows.map((r,i)=>`<article class="web-release-item"><div class="mini">${r.visible?'VISIBLE':'OCULTO'}</div><h3>${esc(r.name)}</h3><p>${esc(r.taglineEs||r.taglineEn)}</p><button class="web-btn alt" type="button" data-edit="${i}">EDITAR PARTNER</button></article>`).join('')||'<p>No hay partners cargados. Agregá el primero.</p>';for(const b of q('[data-list]').querySelectorAll('button'))b.onclick=()=>open(rows[Number(b.dataset.edit)]);}catch(e){status.textContent='Partners pendiente de activación en Firebase: '+e.message;}}
  q('[data-new]').onclick=()=>{if(api.isAdmin())open(null);};q('[data-cancel]').onclick=()=>form.classList.add('hidden');field('name').oninput=()=>{if(!editing)field('id').value=artistKey(field('name').value);};
  const seedButton=document.createElement('button');seedButton.type='button';seedButton.className='web-btn alt';seedButton.textContent='IMPORTAR PARTNER ACTUAL';q('[data-list]').before(seedButton);
  seedButton.onclick=async()=>{
    if(!api.isAdmin())return;seedButton.disabled=true;
    try{const response=await fetch('./initial-public-partners.json');if(!response.ok)throw new Error('No se encontró la importación inicial.');let count=0;
      for(const input of await response.json()){const data=publicPartner(input);if(rows.some(p=>p.id===data.id))continue;await api.save(data,true);count++;}
      await refresh();status.textContent=`${count} partner importado. Los existentes no se reemplazaron.${api.preview?' Solo en esta demostración.':''}`;
    }catch(e){status.textContent='No se completó la importación: '+e.message;}finally{seedButton.disabled=false;}
  };
  form.onsubmit=async e=>{e.preventDefault();if(!api.isAdmin())return;const b=form.querySelector('[type=submit]');b.disabled=true;try{const input=Object.fromEntries(new FormData(form));input.visible=field('visible').checked;await api.save(publicPartner(input),!editing);await refresh();form.classList.add('hidden');status.textContent=api.preview?'Guardado solo en esta demostración.':'Guardado en Firebase. La web lo recogerá en el próximo ciclo activo.';}catch(err){status.textContent='No se guardó: '+err.message;}finally{b.disabled=false;}};
  return {refresh};
}
