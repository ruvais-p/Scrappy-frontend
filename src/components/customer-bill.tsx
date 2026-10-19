'use client';

import {useCallback,useEffect,useState} from 'react';
import {ArrowDownToLine,CheckCircle2,LoaderCircle,ShieldCheck} from 'lucide-react';
import {api,ApiError,money} from '@/lib/api';

type BillLine={name:string;quantity:string|number;unit:string;rate:string|number;amount:string|number};
type CustomerBillData={number:string;customer_name:string;lines:BillLine[];total:string;settled:string;paid:boolean;agreed:boolean};

export default function CustomerBill({token}:{token:string}){
 const [bill,setBill]=useState<CustomerBillData|null>(null);
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const load=useCallback(async()=>{
  try{setError('');setBill(await api<CustomerBillData>(`customer-bill/${token}/details/`));}
  catch(e){setError(e instanceof ApiError?e.message:'This bill link is unavailable or has expired.');}
 },[token]);
 useEffect(()=>{void load();},[load]);
 async function agree(){
  setBusy(true);setError('');
  try{await api(`customer-bill/${token}/agree/`,{action:'agree'});await load();}
  catch(e){setError(e instanceof ApiError?e.message:'We could not record your agreement. Please try again.');}
  finally{setBusy(false);}
 }
 if(error&&!bill)return <main className="customer-bill-page"><section className="customer-bill-card"><div className="customer-bill-brand">SCRAPPY</div><h1>Bill link unavailable</h1><p>{error}</p></section></main>;
 if(!bill)return <main className="customer-bill-page"><section className="customer-bill-card customer-bill-loading"><LoaderCircle size={20}/>Loading your bill…</section></main>;
 const pdf=`/api/v1/customer-bill/${token}/`;
 return <main className="customer-bill-page"><section className="customer-bill-card">
  <header className="customer-bill-header"><div className="customer-bill-brand">SCRAPPY</div><span className={'customer-bill-status '+(bill.paid?'is-paid':'')}>{bill.paid?'PAID':'PAYMENT PENDING'}</span></header>
  <p className="customer-bill-eyebrow">Customer bill</p><h1>{bill.number}</h1><p className="customer-bill-greeting">Hello {bill.customer_name},</p>
  <div className="customer-bill-items">{bill.lines.map((line,index)=><div className="customer-bill-item" key={`${line.name}-${index}`}><div><strong>{line.name}</strong><small>{Number(line.quantity).toFixed(2)} {line.unit} × {money(line.rate)}</small></div><strong>{money(line.amount)}</strong></div>)}</div>
  <div className="customer-bill-total"><span>Total</span><strong>{money(bill.total)}</strong><small>Paid {money(bill.settled)}{bill.paid?' · Thank you!':''}</small></div>
  {error&&<p className="customer-bill-error" role="alert">{error}</p>}
  <div className="customer-bill-actions"><a className="customer-bill-download" href={pdf}><ArrowDownToLine size={18}/>Download bill (PDF)</a>{bill.agreed?<div className="customer-bill-agreed" role="status"><CheckCircle2 size={19}/>You have agreed to these rates.</div>:<button className="customer-bill-agree" disabled={busy} onClick={agree}>{busy?<LoaderCircle size={18} className="customer-bill-spin"/>:<ShieldCheck size={18}/>}I agree to these rates</button>}</div>
  <p className="customer-bill-note">Rates are fixed by Scrappy HQ. Questions? Reply to the message that shared this bill.</p>
  <p className="customer-bill-link-note">This page updates to show PAID after your payment is recorded.</p>
 </section></main>;
}
