'use client';
import {useRef,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {api,ApiError} from '@/lib/api';

type Job={id:string;state:string;error:string};
export default function PDFJob({billId}:{billId:string}){
 const key=useRef(crypto.randomUUID());
 const [job,setJob]=useState<Job|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const status=useQuery({queryKey:['pdf-job',job?.id],queryFn:()=>api<Job>(`jobs/${job!.id}/`),enabled:!!job,refetchInterval:query=>query.state.data?.state==='pending'?2000:false,initialData:job||undefined});
 async function enqueue(){setBusy(true);setError('');try{setJob(await api<Job>(`documents/${billId}/pdf-jobs/`,{},key.current));}catch(error){setError(error instanceof ApiError&&error.status<500?error.message:'Request result unknown. Retry to recover the same PDF job.');}finally{setBusy(false);}}
 const current=status.data||job;
 return <div><button className="secondary" disabled={busy||!!job} onClick={enqueue}>{busy?'Requesting PDF…':error?'Retry PDF request':'Prepare downloadable PDF'}</button>
 {error&&<p role="alert">{error}</p>}{status.error&&<p role="alert">{status.error.message}</p>}
 {current?.state==='pending'&&<p role="status">PDF queued. Waiting for the document worker.</p>}
 {current?.state==='done'&&<a className="button secondary" href={`/api/v1/jobs/${current.id}/download/`}>Download prepared PDF</a>}
 {['failed','expired'].includes(current?.state||'')&&<p role="alert">PDF {current?.state}. <button className="text-button" onClick={()=>{setJob(null);key.current=crypto.randomUUID();}}>Prepare a new copy</button></p>}
 </div>;
}
