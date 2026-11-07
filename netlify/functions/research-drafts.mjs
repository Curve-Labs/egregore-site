import {getStore} from '@netlify/blobs';
import {createHandler} from '../lib/research-drafts.mjs';
// One-time initialization capability. The raw token is never shipped.
const bootstrapHash="745b85a448d9a108c8e6f380b4ff64e0abfe2c23bcd55f72b81192c1e199900b";
export default async function handler(request,context){
 const scope=context.deploy?.context==='production'?'production':context.deploy?.id;
 if(!scope)return Response.json({error:'Hosting context unavailable.'},{status:503});
 return createHandler(getStore({name:'cem-research-drafts-'+scope,consistency:'strong'}),bootstrapHash)(request,context);
}
