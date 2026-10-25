export type Identity = { id:number; name:string; email:string; role:string; role_label:string; access_role?:string; custom_role?:string|null; franchise:string|null; franchise_name:string; manager?:string|null; manager_name?:string|null; warehouse:string|null; permission_version:number; capabilities:string[] };
export type AuthLoginInput = { email:string; password:string };
export type ResetRequestInput = { email:string };
export type PasswordConfirmationInput = { token:string; password:string };
export type Row = { id:string; version?:number; [key:string]:unknown };
export type Register = { count:number; page:number; page_size:number; results:Row[]; summary?:Record<string,string>; date_basis?:string };
let csrf='';
export class ApiError extends Error { constructor(message:string,public status:number){super(message);} }
function explain(value:unknown):string { if(typeof value==='string')return value; if(Array.isArray(value))return value.map(explain).join(' ');if(value&&typeof value==='object')return Object.entries(value).map(([k,v])=>k==='detail'?explain(v):`${k}: ${explain(v)}`).join(' ');return 'Unable to complete this request.'; }
export async function api<T>(path:string,body?:unknown,key?:string,signal?:AbortSignal):Promise<T>{
 if(body!==undefined){const cookie=document.cookie.split('; ').find(c=>c.startsWith('csrftoken='));if(cookie)csrf=decodeURIComponent(cookie.slice(10));}
 if(body!==undefined&&!csrf){const r=await fetch('/api/v1/auth/csrf/',{credentials:'same-origin',cache:'no-store'});if(!r.ok)throw new ApiError('Server unavailable. Please retry.',r.status);const token=await r.json().catch(()=>null);if(!token?.csrfToken)throw new ApiError('Unable to establish a secure session. Please retry.',503);csrf=token.csrfToken;}
 const r=await fetch(`/api/v1/${path}`,{signal,method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',headers:body===undefined?{}:{...(body instanceof FormData?{}:{'Content-Type':'application/json'}),'X-CSRFToken':csrf,'Idempotency-Key':key||crypto.randomUUID()},body:body===undefined?undefined:body instanceof FormData?body:JSON.stringify(body)});
 const data=await r.json().catch(()=>({error:{detail:'Server unavailable. Please retry.'}}));
 if(!r.ok)throw new ApiError(explain(data.error?.detail??data.detail??data),r.status);
 return data as T;
}
export const label=(s:string)=>s.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
export const money=(n:unknown)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(Number(n||0));
export function display(value:unknown):string {if(value===null||value===undefined||value==='')return '—';if(typeof value==='boolean')return value?'Yes':'No';if(typeof value==='object')return JSON.stringify(value);return String(value);}
