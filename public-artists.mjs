// Receives a Firestore adapter from the authenticated portal; contains no credentials.
export const artistKey=value=>String(value||'').replace(/[Λλ]/g,'a').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function publicArtist(input){
  const text=(key,max=10000)=>String(input[key]||'').trim().slice(0,max);
  const id=text('id',100),slug=text('slug',120)||artistKey(id);
  if(!/^[a-z0-9_-]+$/i.test(id)||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))throw new Error('ID o URL inválidos.');
  const name=text('name',120),imagePath=text('imagePath',2048),bioEn=text('bioEn');
  if(!name||!bioEn||!imagePath)throw new Error('Completá nombre, imagen y biografía en inglés.');
  if(!(/^assets\//.test(imagePath)&&!imagePath.includes('..')&&!imagePath.includes('\\'))&&!/^https:\/\//i.test(imagePath))throw new Error('Usá una ruta assets/ de la web principal o una URL HTTPS para la imagen.');
  const links=(input.links||[]).slice(0,8).map(l=>{const url=new URL(l.url);if(url.protocol!=='https:')throw new Error('Los perfiles oficiales deben usar HTTPS.');return {label:String(l.label||'Perfil').trim().slice(0,60),url:url.href};});
  const aliases=[...new Set((input.aliases||[]).map(x=>String(x).trim().slice(0,120)).filter(Boolean))].slice(0,30);
  return {id,slug,name,aliases,imagePath,bioEn,bioEs:text('bioEs'),taglineEn:text('taglineEn',240),taglineEs:text('taglineEs',240),location:text('location',240),genres:(input.genres||[]).map(x=>String(x).trim().slice(0,80)).filter(Boolean).slice(0,20),links,visible:input.visible===true,displayOrder:Math.max(0,Number(input.displayOrder)||0)};
}
export function mountPublicArtists(container,api){
  container.classList.add('public-artist-editor');
  if(!document.getElementById('public-artist-editor-style')){
    const style=document.createElement('link');style.id='public-artist-editor-style';style.rel='stylesheet';style.href=new URL('./public-artists.css',import.meta.url).href;document.head.append(style);
  }
  let rows=[],editing=null;
  container.innerHTML=`<div class="web-manager-head"><div><div class="index">ADMIN / WEBSITE</div><h2>WEB / ARTISTS</h2><p class="section-note">Perfiles públicos del sello. Solo los marcados como visibles se incluirán en la web.</p></div><div class="web-manager-actions"><button class="web-btn" data-new type="button">+ CREAR ARTISTA</button><button class="web-btn alt" data-reload type="button">ACTUALIZAR LISTA</button></div></div>
  <p class="web-help">Al guardar, Firebase conserva el perfil. Cuando se active la sincronización, la web lo recogerá en el próximo ciclo (aproximadamente cada 30 minutos; puede demorar más). No crea usuarios ni modifica contratos. Para ocultar un perfil, desmarcá «Visible».</p>
  <button class="web-btn alt" data-import type="button">IMPORTAR LOS CUATRO PERFILES ACTUALES</button>
  <div data-status role="status" class="web-status"></div><div data-list class="web-list"></div>
  <form data-form class="web-panel web-form hidden"><div class="web-form-grid">
  <div class="field"><label>ID ESTABLE<input name="id" required pattern="[a-zA-Z0-9_-]+"></label></div>
  <div class="field"><label>URL ESTABLE<input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*"></label><div class="web-help">Se conserva al cambiar el nombre.</div></div>
  <div class="field"><label>NOMBRE ARTÍSTICO *<input name="name" required maxlength="120"></label></div>
  <div class="field"><label>UBICACIÓN<input name="location" maxlength="240"></label></div>
  <div class="field full"><label>GÉNEROS (SEPARADOS POR COMA)<input name="genres"></label></div>
  <div class="field full"><label>IMAGEN *<input name="imagePath" required placeholder="assets/artist-nombre.png o https://..."></label><div class="web-help">La imagen debe existir. El portal actual selecciona archivos existentes; no sube archivos nuevos.</div></div>
  <div class="field"><label>SUBTÍTULO EN<input name="taglineEn"></label></div><div class="field"><label>SUBTÍTULO ES<input name="taglineEs"></label></div>
  <div class="field full"><label>BIOGRAFÍA EN INGLÉS *<textarea name="bioEn" rows="5" required maxlength="10000"></textarea></label></div>
  <div class="field full"><label>BIOGRAFÍA EN ESPAÑOL<textarea name="bioEs" rows="5" maxlength="10000"></textarea></label></div>
  <div class="field full"><label>PERFILES OFICIALES (UNO POR LÍNEA: NOMBRE | URL HTTPS)<textarea name="links" rows="3" placeholder="Spotify | https://open.spotify.com/artist/..."></textarea></label></div>
  <div class="field"><label>ORDEN<input name="displayOrder" type="number" min="0" value="1"></label></div>
  <div class="field"><label class="web-check"><input name="visible" type="checkbox"> VISIBLE EN WEB</label></div></div>
  <div class="web-form-actions"><button class="web-btn" data-save type="submit">GUARDAR PERFIL PÚBLICO</button><button class="web-btn alt" data-cancel type="button">CANCELAR</button></div></form>`;
  const q=s=>container.querySelector(s),form=q('[data-form]'),status=q('[data-status]');
  const field=name=>form.elements.namedItem(name);
  const message=(text,error=false)=>{status.textContent=text;status.className='web-status '+(error?'err':'ok');};
  function open(row){
    editing=row;form.reset();
    for(const name of ['id','slug','name','location','imagePath','taglineEn','taglineEs','bioEn','bioEs'])field(name).value=row?.[name]||'';
    field('genres').value=(row?.genres||[]).join(', ');field('links').value=(row?.links||[]).map(l=>l.label+' | '+l.url).join('\n');
    field('visible').checked=row?.visible===true;field('displayOrder').value=row?.displayOrder??rows.length+1;
    field('id').readOnly=!!row;field('slug').readOnly=!!row;form.classList.remove('hidden');message('');
  }
  function render(){
    q('[data-list]').innerHTML=rows.length?rows.map((a,i)=>`<article class="web-release-item"><div class="mini">${a.visible?'VISIBLE':'OCULTO'} · ${esc(a.slug||a.id)}</div><h3>${esc(a.name)}</h3><p>${esc(a.location||'')}</p><button class="web-btn alt" type="button" data-edit="${i}">EDITAR PERFIL</button></article>`).join(''):'<p class="web-empty">Todavía no hay perfiles en publicArtists. La importación inicial se prepara por separado.</p>';
    q('[data-list]').querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>open(rows[Number(b.dataset.edit)])));
  }
  async function refresh(){
    if(!api.isAdmin()){container.classList.add('hidden');return;}
    container.classList.remove('hidden');
    try{rows=await api.list();rows.sort((a,b)=>(a.displayOrder||0)-(b.displayOrder||0));render();}
    catch(e){message('No se pudieron leer los perfiles públicos: '+e.message,true);}
  }
  q('[data-new]').addEventListener('click',()=>{if(api.isAdmin())open(null);});
  q('[data-cancel]').addEventListener('click',()=>form.classList.add('hidden'));
  q('[data-reload]').addEventListener('click',refresh);
  q('[data-import]').addEventListener('click',async()=>{
    if(!api.isAdmin()||!confirm('Se crearán únicamente los perfiles actuales que todavía no existan. Los perfiles importados estarán visibles en la web cuando la sincronización esté activa. ¿Continuar?'))return;
    const button=q('[data-import]');button.disabled=true;
    try{
      const response=await fetch('./initial-public-artists.json');if(!response.ok)throw new Error('No se encontró la importación inicial.');
      const seed=await response.json();let count=0;
      for(const input of seed){const data=publicArtist(input);if(rows.some(a=>a.id===data.id))continue;await api.save(data,true);count++;}
      await refresh();message(`${api.preview?'SOLO EN DEMOSTRACIÓN LOCAL · ':''}${count} perfiles importados. Los existentes no fueron reemplazados.`);
    }catch(e){await refresh();message('Importación incompleta: '+e.message+'. Podés reintentar; no sobrescribe perfiles existentes.',true);}
    finally{button.disabled=false;}
  });
  field('name').addEventListener('input',()=>{if(!editing){field('id').value=artistKey(field('name').value);field('slug').value=artistKey(field('name').value);}});
  form.addEventListener('submit',async e=>{
    e.preventDefault();if(!api.isAdmin())return;
    const button=q('[data-save]');button.disabled=true;
    try{
      const input=Object.fromEntries(new FormData(form));input.visible=field('visible').checked;
      input.aliases=[...(editing?.aliases||[]),...(editing?[editing.name]:[])];
      input.genres=field('genres').value.split(',');
      input.links=field('links').value.split('\n').filter(x=>x.trim()).map(line=>{const at=line.indexOf('|');if(at<1)throw new Error('Usá Nombre | URL para cada perfil.');return {label:line.slice(0,at).trim(),url:line.slice(at+1).trim()};});
      const data=publicArtist(input);
      if(!editing && rows.some(a=>a.id===data.id||a.slug===data.slug))throw new Error('Ya existe ese artista o URL. Usá Editar perfil.');
      if(rows.some(a=>a.id!==data.id&&a.slug===data.slug))throw new Error('La URL pertenece a otro artista.');
      await api.save(data,!editing);await refresh();editing=data;field('id').readOnly=true;field('slug').readOnly=true;
      message(api.preview?'GUARDADO SOLO EN ESTA DEMOSTRACIÓN LOCAL.':'PERFIL GUARDADO EN FIREBASE. La web se actualizará en el próximo ciclo cuando la sincronización esté activa.');
    }catch(e){message('No se guardó el perfil: '+e.message,true);}
    finally{button.disabled=false;}
  });
  return {refresh};
}
