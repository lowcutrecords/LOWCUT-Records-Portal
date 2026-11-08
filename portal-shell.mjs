export function mountPortalShell(root,profile){
  for(const [id,label] of [['releasesGrid','Consultar catálogo y metadata'],['contractsGrid','Consultar documentos y estados']]){
    const section=root.querySelector('#'+id)?.closest('section');if(!section)continue;
    const details=document.createElement('details');details.className='portal-inspector';details.dataset.inspector=id;
    const summary=document.createElement('summary');summary.textContent=label;details.append(summary);section.before(details);details.append(section);
  }
  const definitions=[['overview','Resumen','.dash-head,.stats,#adminDashboardSection,#adminNote'],['artists','Artistas','#publicArtistManager'],['releases','Releases','#webReleaseManager'],['contracts','Contratos','#contractManager'],['partners','Partners','#publicPartnerManager'],['security','Accesos','#loginActivitySection']];
  const nav=document.createElement('nav');nav.className='portal-tabs';nav.setAttribute('aria-label','Secciones del portal');root.prepend(nav);
  let selected='overview';
  const nodes=()=>definitions.map(([key,label,selector])=>[key,label,[...root.querySelectorAll(selector),...(key==='releases'?[root.querySelector('[data-inspector="releasesGrid"]')]:key==='contracts'?[root.querySelector('[data-inspector="contractsGrid"]')]:[])].filter(Boolean)]);
  function refresh(){
    const admin=profile()?.role==='admin';const options=definitions.filter(([k])=>admin||['overview','releases','contracts'].includes(k));
    for(const details of root.querySelectorAll('.portal-inspector')){if(!admin)details.open=true;details.querySelector('summary').hidden=!admin;}
    if(!options.some(([k])=>k===selected))selected='overview';
    nav.innerHTML=options.map(([k,label])=>`<button type="button" data-pane="${k}" aria-pressed="${k===selected}">${label}</button>`).join('');
    for(const [key,,items] of nodes())for(const item of items)item.classList.toggle('portal-pane-hidden',key!==selected);
    for(const button of nav.querySelectorAll('button'))button.onclick=()=>{selected=button.dataset.pane;refresh();};
  }
  refresh();return {refresh};
}
