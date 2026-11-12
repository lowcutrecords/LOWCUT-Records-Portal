export const TEMPLATE_URL='https://lowcutrecords.github.io/LOWCUT-Contratos-Template/';
export const pending = c => ['pending','pending-signature'].includes(c.status);
export const available = c => c.active !== false;
// Explicit cleanup exception for the owner's two signed prueba2 records.
export const disposableTestContract = c => c?.title==='prueba2' && ['prueba2sdfsfda3gmailcom','prueba2sdfsfda3gmailcomv1794345602835'].includes(c.id);
export function signatureUrl(id){const url=new URL(TEMPLATE_URL);url.searchParams.set('contract',id);return url.href;}
export function buildContract(previous, input, id){
  const email=String(input.invitationEmail||'').trim().toLowerCase();
  const title=String(input.title||'').trim();
  if(!title)throw new Error('Completá el título.');
  if(!input.artistId&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Elegí un artista o ingresá el email de invitación.');
  const page={es:String(input.pageEs||'').trim(),en:String(input.pageEn||'').trim()};
  if(Boolean(page.es)!==Boolean(page.en))throw new Error('Completá ambos idiomas del texto o dejá ambos vacíos para usar el template.');
  if(page.es.length>40000||page.en.length>40000)throw new Error('El texto admite hasta 40.000 caracteres por idioma.');
  const type=String(input.type||previous.type||'release_contract');
  if(!['release_contract','band_agreement'].includes(type)&&type!==previous.type)throw Error('Elegí un tipo de contrato válido.');
  if(type==='band_agreement'&&(!page.es||!page.en))throw Error('Los acuerdos de banda requieren el texto completo en español e inglés.');
  const typeChanged=type!==(previous.type||'release_contract');
  const pageChanged=JSON.stringify(page)!==JSON.stringify(previous.pageContent||{es:'',en:''});
  const data={...previous,title,artistId:input.artistId||'',artistIds:input.artistId?[input.artistId]:[],
    authorizedUids:input.uid?[input.uid]:(previous.authorizedUids||[]),invitationEmail:email,
    active:input.active!==false,status:input.status, signedAt:input.signedAt||'',type,
    contractUrl:String(input.contractUrl||'').trim()||signatureUrl(id),pageContent:page,
    pageRevision:Math.max(1,Number(previous.pageRevision)||1)+(pageChanged||typeChanged?1:0)};
  if(!['pending','signed'].includes(data.status))throw new Error('Estado inválido.');
  if(data.status==='signed'&&!data.signedAt)throw new Error('Indicá la fecha de firma.');
  if(previous.status==='signed'){
    // A signature belongs to its exact document. Corrections require a new agreement.
    const keys=['title','artistId','status','signedAt','type','contractUrl','invitationEmail'];
    if(pageChanged||keys.some(k=>String(data[k]||'')!==String(previous[k]||'')))throw new Error('El contrato firmado se conserva. Creá uno nuevo para cambiar sus datos o texto.');
    return {...previous,active:data.active};
  }
  if(typeChanged)data.draftData={};
  return data;
}

