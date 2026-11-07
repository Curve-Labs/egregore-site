import {createHash, randomBytes, pbkdf2Sync, timingSafeEqual} from 'node:crypto';

const COOKIE='eg-cem-drafts';
const hash=value=>createHash('sha256').update(value).digest('hex');
const json=(data,status=200,extra={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store, private','Netlify-CDN-Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',...extra}});
class HttpError extends Error {constructor(status,message){super(message);this.status=status}}
const reject=(status,message)=>{throw new HttpError(status,message)};
const cookie=(value,age)=>`${COOKIE}=${value}; Path=/api/research-drafts; Secure; HttpOnly; SameSite=Strict; Max-Age=${age}`;
const same=(a,b)=>a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
const token=req=>req.headers.get('Cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||'';

export function createHandler(store,bootstrapHash){
 async function read(){return store.getWithMetadata('desk',{type:'json'})}
 async function write(key,value,options){
  const result=await store.setJSON(key,value,options);
  if(!result.modified)return false;
  // Confirm durable storage before acknowledging a save, including SDK/API failures.
  const saved=await store.getWithMetadata(key,{type:'json'});
  if(!saved||JSON.stringify(saved.data)!==JSON.stringify(value))reject(503,'The save could not be confirmed. Reload before trying again.');
  return true;
 }
 async function auth(req,state){
  const t=token(req);if(!/^[a-f0-9]{64}$/.test(t))reject(401,'Please unlock the drafts desk.');
  const session=await store.get('sessions/'+hash(t),{type:'json'});
  if(!session||session.expires<=Date.now()||session.authVersion!==state.auth.hash.slice(0,24))reject(401,'Please unlock the drafts desk.');
 }
 async function limit(ip){
  const key='attempts/'+hash(ip+':'+Math.floor(Date.now()/900000));
  for(let i=0;i<8;i++){
   const prior=await store.getWithMetadata(key,{type:'json'});
   if((prior?.data.count||0)>=8)reject(429,'Too many attempts. Please try again in 15 minutes.');
   const value={count:(prior?.data.count||0)+1};
   if(await write(key,value,prior?{onlyIfMatch:prior.etag}:{onlyIfNew:true}))return key;
  }
  reject(429,'Too many attempts. Please try again in 15 minutes.');
 }
 return async function handle(req,context={}){try{
  const action=new URL(req.url).pathname.split('/').filter(Boolean).at(-1);
  if(!['GET','POST'].includes(req.method))return json({error:'Method not allowed.'},405,{'Allow':'GET, POST'});
  let body;
  if(req.method==='POST'){
   if(req.headers.get('Origin')!==new URL(req.url).origin)reject(403,'Please submit from the drafts page.');
   if(!req.headers.get('Content-Type')?.startsWith('application/json'))reject(415,'Use the drafts form to submit.');
   const cap=action==='initialize'?2_000_000:18000;
   if(Number(req.headers.get('Content-Length')||0)>cap)reject(413,'That request is too large.');
   const raw=await req.text();if(Buffer.byteLength(raw)>cap)reject(413,'That request is too large.');
   try{body=JSON.parse(raw)}catch{reject(400,'Please try that again.')}
   if(!body||typeof body!=='object'||Array.isArray(body))reject(400,'Please try that again.');
  }
  if(action==='initialize'&&req.method==='POST'){
   const supplied=req.headers.get('Authorization')?.replace(/^Bearer /,'')||'';
   if(!same(hash(supplied),bootstrapHash))reject(403,'Not authorized.');
   if(await read())reject(409,'This desk is already initialized.');
   if(!/^[a-f0-9]{64}$/.test(body.auth?.hash)||!/^[a-f0-9]{32}$/.test(body.auth?.salt)||!Array.isArray(body.desk?.drafts)||body.desk.drafts.length!==10||!Array.isArray(body.desk.reviews)||!Array.isArray(body.desk.comments))reject(400,'Invalid migration.');
   if(!await write('desk',{auth:body.auth,desk:body.desk},{onlyIfNew:true}))reject(409,'This desk is already initialized.');
   return json({ok:true});
  }
  const snapshot=await read();if(!snapshot)reject(503,'The drafts desk is being moved. Please try again shortly.');
  const state=snapshot.data;
  if(req.method==='GET'){
   if(action!=='desk')reject(404,'Not found.');
   await auth(req,state);return json(state.desk);
  }
  if(action==='login'){
   if(typeof body.password!=='string'||body.password.length>256)reject(400,'Enter the drafts password.');
   const attempt=await limit(context.ip||'unknown');
   const digest=pbkdf2Sync(body.password,Buffer.from(state.auth.salt,'hex'),100000,32,'sha256').toString('hex');
   if(!same(digest,state.auth.hash))reject(401,'That password did not match.');
   const t=randomBytes(32).toString('hex');
   await write('sessions/'+hash(t),{expires:Date.now()+14*86400000,authVersion:state.auth.hash.slice(0,24)},{onlyIfNew:true});
   await store.delete(attempt);
   return json({ok:true},200,{'Set-Cookie':cookie(t,14*86400)});
  }
  await auth(req,state);
  if(action==='logout'){
   await store.delete('sessions/'+hash(token(req)));
   return json({ok:true},200,{'Set-Cookie':cookie('',0)});
  }
  const draft=state.desk.drafts.find(d=>d.id===body.draftId);if(!draft)reject(404,'This draft could not be found.');
  if(action==='review'){
   if(!['pending','accepted','revision','rejected'].includes(body.status)||!Number.isSafeInteger(body.expectedRevision)||body.expectedRevision<0)reject(400,'Choose a valid review decision.');
   if(body.draftVersion!==draft.version)reject(409,'This draft has changed. Reload before reviewing it.');
   const prior=state.desk.reviews.find(r=>r.draftId===draft.id);
   if((prior?.revision||0)!==body.expectedRevision)reject(409,'The decision changed in another visit. Reload before saving again.');
   const result={draftId:draft.id,draftVersion:draft.version,status:body.status,revision:body.expectedRevision+1,updatedAt:new Date().toISOString()};
   state.desk.reviews=[...state.desk.reviews.filter(r=>r.draftId!==draft.id),result];
   if(!await write('desk',state,{onlyIfMatch:snapshot.etag}))reject(409,'The desk changed in another visit. Reload before saving again.');
   return json(result);
  }
  if(action==='comment'){
   if(typeof body.body!=='string'||!body.body.trim()||body.body.length>12000||typeof body.id!=='string'||!/^[0-9a-f-]{36}$/.test(body.id))reject(400,'Write a comment of 12,000 characters or fewer.');
   const prior=state.desk.comments.find(c=>c.id===body.id);
   if(prior){if(prior.draftId!==draft.id||prior.body!==body.body.trim())reject(409,'Please retry with a new comment.');return json(prior)}
   const result={id:body.id,draftId:draft.id,body:body.body.trim(),createdAt:new Date().toISOString()};
   state.desk.comments.push(result);
   if(!await write('desk',state,{onlyIfMatch:snapshot.etag}))reject(409,'The desk changed in another visit. Reload before saving again.');
   return json(result);
  }
  reject(404,'Not found.');
 }catch(error){
  if(error instanceof HttpError)return json({error:error.message},error.status);
  console.error('Research drafts storage error:',error?.name||'Error');
  return json({error:'The drafts desk could not save right now. Please try again.'},503);
 }};
}
