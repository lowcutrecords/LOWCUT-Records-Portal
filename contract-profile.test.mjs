import {dateKey,minimumReleaseDate,addCalendarDays} from './contract-dates.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {buildContract} from './contract-model.mjs';
const require=createRequire(process.env.LOWCUT_TEST_DEPS||import.meta.url);
const {initializeTestEnvironment,assertFails,assertSucceeds}=require('@firebase/rules-unit-testing');
const {doc,setDoc,getDoc,updateDoc,deleteDoc,getDocs,collection,query,where,writeBatch,serverTimestamp}=require('firebase/firestore');
const common=`function signedIn(){return request.auth != null;} function myProfile(){return get(/databases/$(database)/documents/users/$(request.auth.uid));} function isActive(){return signedIn() && myProfile().data.active == true;} function isAdmin(){return isActive() && myProfile().data.role == 'admin';} function authorized(){return isActive() && request.auth.uid in resource.data.get('authorizedUids',[]);}`;
const rules=`rules_version = '2'; service cloud.firestore { match /databases/{database}/documents { ${common} ${fs.readFileSync(new URL('./contract-profile.rules.fragment',import.meta.url),'utf8')} } }`;
const env=await initializeTestEnvironment({projectId:'demo-lowcut-contracts',firestore:{host:'127.0.0.1',port:8099,rules}});
const contract={title:'Release',status:'pending',active:true,artistId:'',artistIds:[],authorizedUids:[],invitationEmail:'new@example.com',pageRevision:1};
const identity={uid:'new',email:'new@example.com',emailVerified:true};
let checks=0;async function pass(action){await assertSucceeds(action);checks++;}async function fail(action){await assertFails(action);checks++;}
const db=env.authenticatedContext('new',{email:'new@example.com',email_verified:true}).firestore();
const admin=env.authenticatedContext('admin',{email:'admin@example.com',email_verified:true}).firestore();
const wrong=env.authenticatedContext('other',{email:'other@example.com',email_verified:true}).firestore();
try{
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx=>{
    const d=ctx.firestore();await setDoc(doc(d,'users','admin'),{active:true,role:'admin'});
    await setDoc(doc(d,'contracts','invite'),contract);await setDoc(doc(d,'contracts','second'),{...contract});
    await setDoc(doc(d,'contracts','disabled'),{...contract,active:false});
  });
  await pass(getDoc(doc(db,'contracts','invite')));
  await fail(getDoc(doc(wrong,'contracts','invite')));
  await fail(getDocs(collection(db,'contracts')));
  await fail(getDoc(doc(env.unauthenticatedContext().firestore(),'contracts','invite')));
  await fail(getDoc(doc(env.authenticatedContext('new',{email:'new@example.com',email_verified:false}).firestore(),'contracts','invite')));
  const docs={artistId:'new',user:{active:true,artistId:'new',email:'new@example.com',name:'Artist',role:'artist',registrationContractId:'invite'},artist:{active:true,name:'Artist'}};
  await fail(setDoc(doc(db,'users','new'),docs.user)); // Must create artist atomically.
  await fail(setDoc(doc(db,'users','other'),{...docs.user,role:'admin'}));
  const batch=writeBatch(db);batch.set(doc(db,'users','new'),docs.user);batch.set(doc(db,'artists',docs.artistId),docs.artist);batch.update(doc(db,'contracts','invite'),{artistId:'new',artistIds:['new'],authorizedUids:['new'],updatedAt:serverTimestamp()});await pass(batch.commit());
  await pass(updateDoc(doc(db,'contracts','invite'),{artistId:'new',artistIds:['new'],authorizedUids:['new'],updatedAt:serverTimestamp()}));
  const visible=await assertSucceeds(getDocs(query(collection(db,'contracts'),where('authorizedUids','array-contains','new'))));assert.equal(visible.size,1);checks++;
  await pass(updateDoc(doc(db,'users','new'),{name:'Edited'}));
  await pass(updateDoc(doc(db,'artists','new'),{name:'Edited'}));
  await fail(updateDoc(doc(db,'users','new'),{role:'admin'}));
  await fail(updateDoc(doc(db,'users','new'),{artistId:'someone-else'}));
  await fail(updateDoc(doc(db,'artists','new'),{active:false}));
  const sign={status:'signed',artistId:'new',artistIds:['new'],authorizedUids:['new'],signedAt:dateKey(),signedAtTimestamp:serverTimestamp(),signedBy:'new',updatedAt:serverTimestamp(),
    signature:{name:'Legal Name',legalName:'Legal Name',email:'new@example.com',contactEmail:'contact@example.com',language:'es',acceptedText:'Accepted contract',pageRevision:1},
    releaseData:{legal_name:'Legal Name',electronic_signature:'Legal Name',email:'contact@example.com',signature_date:dateKey(),release_date:minimumReleaseDate(new Date()),contract_accept:'Sí',signature_confirm:'Sí',rights_confirm:'Sí',third_party_confirm:'Sí',fraud_confirm:'Sí'}};
  await fail(updateDoc(doc(db,'contracts','disabled'),sign));
  await fail(updateDoc(doc(db,'contracts','invite'),{...sign,signature:{...sign.signature,pageRevision:2}}));
  await fail(updateDoc(doc(db,'contracts','invite'),{...sign,pageContent:{es:'tampered'}}));
  await fail(updateDoc(doc(db,'contracts','invite'),{...sign,authorizedUids:['new','other']}));
  await fail(updateDoc(doc(db,'contracts','invite'),{...sign,releaseData:{...sign.releaseData,release_date:addCalendarDays(minimumReleaseDate(new Date()),-1)}}));
  await fail(updateDoc(doc(db,'contracts','invite'),{...sign,signedAt:addCalendarDays(dateKey(),-1),releaseData:{...sign.releaseData,signature_date:addCalendarDays(dateKey(),-1)}}));
  await pass(updateDoc(doc(db,'contracts','invite'),sign));
  await fail(updateDoc(doc(db,'contracts','invite'),sign));
  await fail(updateDoc(doc(admin,'contracts','invite'),{pageContent:{es:'rewrite'}}));
  await fail(deleteDoc(doc(admin,'contracts','invite')));
  const labelSignature={name:'Label Representative',uid:'admin',email:'admin@example.com',statement:'Declaro que actúo como representante autorizado de LOWCUT// Records y acepto este contrato en nombre del sello.',signedAtTimestamp:serverTimestamp()};
  await fail(updateDoc(doc(db,'contracts','invite'),{labelSignature:{...labelSignature,uid:'new',email:'new@example.com'},updatedAt:serverTimestamp()}));
  await fail(updateDoc(doc(admin,'contracts','invite'),{labelSignature:{...labelSignature,statement:''},updatedAt:serverTimestamp()}));
  await pass(updateDoc(doc(admin,'contracts','invite'),{labelSignature,updatedAt:serverTimestamp()}));
  assert.equal((await getDoc(doc(admin,'contracts','invite'))).data().signature.name,'Legal Name');
  await fail(updateDoc(doc(admin,'contracts','invite'),{labelSignature:{...labelSignature,name:'Replacement'},updatedAt:serverTimestamp()}));
  await pass(updateDoc(doc(admin,'contracts','invite'),{active:false,updatedAt:serverTimestamp()}));
  await pass(updateDoc(doc(admin,'users','new'),{active:false}));
  await fail(getDoc(doc(db,'contracts','second')));
  await fail(updateDoc(doc(db,'contracts','second'),sign));
  const input={title:'Release',artistId:'',invitationEmail:'new@example.com',status:'pending',active:true};
  const draft=buildContract({},input,'new-id');assert.match(draft.contractUrl,/contract=new-id/);
  assert.throws(()=>buildContract({...draft,status:'signed',signedAt:'2026-11-10'},{...input,status:'pending'},'new-id'));
  console.log(`PASS: ${checks} Firestore checks, plus contract model checks. No live data modified.`);
}finally{await env.cleanup();}

