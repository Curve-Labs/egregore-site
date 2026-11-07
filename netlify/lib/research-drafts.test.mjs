import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,pbkdf2Sync,randomUUID} from 'node:crypto';
import {createHandler} from './research-drafts.mjs';

const sha=s=>createHash('sha256').update(s).digest('hex');
const password='test-only-password',salt='12'.repeat(16),bootstrap='test-only-bootstrap';
const seed={auth:{salt,hash:pbkdf2Sync(password,Buffer.from(salt,'hex'),100000,32,'sha256').toString('hex')},desk:{drafts:Array.from({length:10},(_,i)=>({id:'draft-'+i,version:'v1',title:'Private draft '+i})),reviews:[],comments:[],screening:{}}};
class MemoryStore{
 data=new Map();rev=0;dropWrites=false;
 async getWithMetadata(key){return structuredClone(this.data.get(key)||null)}
 async get(key){return (await this.getWithMetadata(key))?.data||null}
 async setJSON(key,value,options={}){
  const prior=this.data.get(key);
  if((options.onlyIfNew&&prior)||(options.onlyIfMatch&&options.onlyIfMatch!==prior?.etag))return {modified:false};
  if(!this.dropWrites)this.data.set(key,{data:structuredClone(value),etag:String(++this.rev)});
  return {modified:true};
 }
 async delete(key){this.data.delete(key)}
}
function setup(){
 const store=new MemoryStore(),handle=createHandler(store,sha(bootstrap));
 async function call(action,body,cookie,extra={}){
  return handle(new Request('https://egregore.xyz/api/research-drafts/'+action,{method:body===undefined?'GET':'POST',headers:{Origin:'https://egregore.xyz','Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...extra},body:body===undefined?undefined:JSON.stringify(body)}),{ip:'192.0.2.1'});
 }
 async function initialize(){return call('initialize',seed,null,{Authorization:'Bearer '+bootstrap})}
 async function login(){const r=await call('login',{password});assert.equal(r.status,200);return r.headers.get('Set-Cookie').split(';')[0]}
 return {store,call,initialize,login};
}
test('private content stays unavailable until correct password; initialization is one-time',async()=>{
 const {call,initialize,login}=setup();
 assert.equal((await call('desk')).status,503);
 assert.equal((await call('initialize',seed)).status,403);
 assert.equal((await initialize()).status,200);
 assert.equal((await initialize()).status,409);
 assert.equal((await call('desk')).status,401);
 assert.equal((await call('login',{password:'wrong'})).status,401);
 const cookie=await login(),r=await call('desk',undefined,cookie);
 assert.equal(r.status,200);assert.match(r.headers.get('Cache-Control'),/no-store/);
 const data=await r.json();assert.equal(data.drafts.length,10);assert.equal(data.auth,undefined);
 assert.equal((await call('logout',{},cookie)).status,200);
 assert.equal((await call('desk',undefined,cookie)).status,401);
});
test('comments survive a new session; retries are idempotent and changed bodies conflict',async()=>{
 const {call,initialize,login}=setup();await initialize();const cookie=await login();
 const body={draftId:'draft-0',id:randomUUID(),body:'A durable comment'};
 assert.equal((await call('comment',body,cookie)).status,200);
 assert.equal((await call('comment',body,cookie)).status,200);
 assert.equal((await call('comment',{...body,body:'different'},cookie)).status,409);
 const nextCookie=await login();const saved=await (await call('desk',undefined,nextCookie)).json();
 assert.equal(saved.comments.length,1);assert.equal(saved.comments[0].body,body.body);
});
test('decisions bind to draft version and revision and reject stale updates',async()=>{
 const {call,initialize,login}=setup();await initialize();const cookie=await login();
 const body={draftId:'draft-0',draftVersion:'v1',status:'accepted',expectedRevision:0};
 assert.equal((await call('review',{...body,draftVersion:'old'},cookie)).status,409);
 assert.equal((await call('review',body,cookie)).status,200);
 assert.equal((await call('review',{...body,status:'rejected'},cookie)).status,409);
 const data=await (await call('desk',undefined,cookie)).json();assert.equal(data.reviews[0].status,'accepted');
 assert.equal((await call('review',{...body,status:'pending',expectedRevision:1},cookie)).status,200);
});
test('concurrent updates do not silently overwrite each other',async()=>{
 const {call,initialize,login}=setup();await initialize();const cookie=await login();
 const body={draftId:'draft-0',draftVersion:'v1',expectedRevision:0};
 const results=await Promise.all([call('review',{...body,status:'accepted'},cookie),call('review',{...body,status:'rejected'},cookie)]);
 assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
});
test('cross-origin writes, oversized comments and unexpected methods fail closed',async()=>{
 const {call,initialize,login}=setup();await initialize();const cookie=await login();
 assert.equal((await call('logout',{},cookie,{Origin:'https://attacker.example'})).status,403);
 assert.equal((await call('comment',{draftId:'draft-0',id:randomUUID(),body:'x'.repeat(12001)},cookie)).status,400);
 assert.equal((await call('desk')).status,401);
});
test('eight failed logins exhaust the bucket even with a correct next password',async()=>{
 const {call,initialize}=setup();await initialize();
 for(let i=0;i<8;i++)assert.equal((await call('login',{password:'wrong'})).status,401);
 assert.equal((await call('login',{password})).status,429);
});
test('unconfirmed storage writes never report success',async()=>{
 const {call,store,initialize,login}=setup();await initialize();const cookie=await login();store.dropWrites=true;
 assert.equal((await call('comment',{draftId:'draft-0',id:randomUUID(),body:'not stored'},cookie)).status,503);
});
test('a changed verifier invalidates previous sessions',async()=>{
 const {call,store,initialize,login}=setup();await initialize();const cookie=await login();
 store.data.get('desk').data.auth.hash='00'.repeat(32);
 assert.equal((await call('desk',undefined,cookie)).status,401);
});
