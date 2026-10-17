'use client';

import {useEffect, useRef, useState} from 'react';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {api, ApiError} from '@/lib/api';

type Measurement = {
  product: string; name: string; billed: string; actual: string;
  difference: string; percent: string | null; flagged: boolean; check: string;
};
type Receipt = {
  id: string; lines: Measurement[]; note: string; state: 'draft' | 'submitted'; lead_version: number;
};
type Reconciliation = {
  lead: string; version: number; can_edit: boolean; unavailable_reason: string;
  reweigh_required?: boolean; previous_lines?: Measurement[];
  lines: {product: string; name: string; billed: string; unit: string}[];
  materials: {id: string; name: string}[]; receipt: Receipt | null;
};
type Preview = {lines: Measurement[]; complete: boolean; actual_total: string; billed_total: string};
type Entry = {product: string; name: string; billed: string; actual: string; extra: boolean};
type Attempt = {action: string; body: unknown; key: string};

export default function ReceiptEditor({leadId, close, blockClose}: {leadId: string; close: () => void; blockClose: (blocked: boolean) => void}) {
  const qc = useQueryClient();
  const query = useQuery({queryKey: ['reconciliation', leadId], queryFn: () => api<Reconciliation>(`reconciliation/${leadId}/`)});
  const [baseline, setBaseline] = useState<Reconciliation | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [note, setNote] = useState('');
  const [extra, setExtra] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const attempt = useRef<Attempt | null>(null);
  const initialized = useRef(false);
  useEffect(() => { blockClose(busy || uncertain); }, [busy, uncertain, blockClose]);

  function restore(data: Reconciliation) {
    const saved = data.receipt?.lines || [];
    const lines: Entry[] = data.lines.map(line => ({...line, actual: saved.find(item => item.product === line.product)?.actual ?? '', extra: false}));
    for (const line of saved) {
      if (!lines.some(item => item.product === line.product)) lines.push({...line, extra: true});
    }
    setEntries(lines); setNote(data.receipt?.note || ''); setBaseline(data);
    setPreview(null); setError(''); setMessage(''); setExtra('');
  }
  useEffect(() => {
    if (query.data && !initialized.current) { initialized.current = true; restore(query.data); }
  }, [query.data]);

  const stale = !!baseline && !!query.data && baseline.version !== query.data.version;
  const disabled = busy || uncertain || !baseline?.can_edit;
  function edited() { setPreview(null); setMessage(''); setError(''); }
  const body = () => ({version: baseline?.version, note, lines: entries.filter(line => line.actual !== '').map(({product, actual}) => ({product, actual}))});
  const dirty = !!baseline && (JSON.stringify(body().lines) !== JSON.stringify(baseline.receipt?.lines?.filter(item => item.actual !== '').map(({product, actual}) => ({product, actual})) || []) || note !== (baseline.receipt?.note || ''));
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);

  async function review() {
    setBusy(true); setError('');
    try { setPreview(await api<Preview>(`reconciliation/${leadId}/`, body())); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to review measurements.'); }
    finally { setBusy(false); }
  }

  async function save(action: 'save-reconciliation' | 'receive') {
    if (!attempt.current) attempt.current = {action, body: body(), key: crypto.randomUUID()};
    const pending = attempt.current;
    setBusy(true); setError('');
    try {
      const receipt = await api<Receipt>(`leads/${leadId}/${pending.action}/`, pending.body, pending.key);
      attempt.current = null; setUncertain(false);
      if (pending.action === 'receive') { void qc.invalidateQueries(); close(); return; }
      const updated = {...baseline!, version: receipt.lead_version, receipt};
      setBaseline(updated); qc.setQueryData(['reconciliation', leadId], updated);
      setMessage('Draft saved. Inventory has not changed.');
      void qc.invalidateQueries({predicate: item => item.queryKey[0] !== 'reconciliation'});
    } catch (cause) {
      const unknown = !(cause instanceof ApiError) || cause.status >= 500;
      setUncertain(unknown);
      if (!unknown) attempt.current = null;
      setError(unknown ? 'The save result is unknown. Retry the same request to recover its result before changing these measurements.' : cause.message);
      if (cause instanceof ApiError && cause.status === 409) void query.refetch();
    } finally { setBusy(false); }
  }

  if (query.isError && !baseline) return <div role="alert" className="notice error">{query.error.message}<button className="secondary" onClick={() => query.refetch()}>Retry</button></div>;
  if (!baseline) return <p role="status">Loading reconciliation…</p>;
  return <form className="receipt-editor" onSubmit={event => {event.preventDefault(); void save('receive');}}>
    {error && <div role="alert" className="notice error">{error}</div>}
    {message && <div role="status" className="notice">{message}</div>}
    {!baseline.can_edit && <div className="notice receipt-blocked" role="status"><strong>Measurements are locked</strong><span>{baseline.unavailable_reason || 'This reconciliation is read-only for your role.'}</span>{baseline.unavailable_reason.includes('unloading')&&<span>Go to Loads and weighing, open this route, record its unloading evidence, then refresh this dialog.</span>}</div>}
    {baseline.reweigh_required&&<div className="notice" role="status"><strong>HQ requested a reweigh.</strong><span>Enter the new physical measurements. The previous submitted weights remain in the audit history and stock will be adjusted by the measured difference.</span></div>}
    <button type="button" className="text-button" disabled={busy || uncertain} onClick={() => query.refetch()}>Check for updates</button>
    {stale && !uncertain && <div role="alert" className="notice">This record changed while you were editing. Your input has been preserved.<button type="button" className="secondary" onClick={() => restore(query.data!)}>Reload saved measurements (discards edits)</button></div>}
    <div className="table-scroll receipt-measurements"><table className="receipt-measurement-table"><colgroup><col className="material-col"/><col className="billed-col"/><col className="measured-col"/><col className="difference-col"/><col className="percent-col"/><col className="check-col"/></colgroup>
      <thead><tr><th>Material</th><th>Billed kg</th>{baseline.reweigh_required&&<th>Previous kg</th>}<th>Measured kg</th><th>Difference kg</th><th>Difference %</th><th>Check</th></tr></thead>
      <tbody>{entries.map((line, index) => {
        const result = preview?.lines.find(item => item.product === line.product);
        return <tr key={line.product}>
          <td data-label="Material">{line.name}{line.extra && <small>Unbilled material</small>}</td><td data-label="Billed kg">{line.billed}</td>
          {baseline.reweigh_required&&<td data-label="Previous kg">{baseline.previous_lines?.find(item=>item.product===line.product)?.actual??'—'}</td>}
          <td data-label="Measured kg"><input aria-label={`Measured ${line.name} kg`} type="number" min="0" step="0.001" value={line.actual} disabled={disabled}
            onChange={event => {setEntries(entries.map((item, i) => i === index ? {...item, actual: event.target.value} : item)); edited();}}/></td>
          <td data-label="Difference kg">{result?.difference ?? '—'}</td><td data-label="Difference %">{result ? result.percent === null ? 'N/A' : Number(result.percent).toFixed(2) + '%' : '—'}</td>
          <td data-label="Check">{result ? <span className={'badge ' + (result.flagged ? 'warning' : 'success')}>{result.check}</span> : line.actual === '' ? 'Enter weight' : 'Review required'}
            {line.extra && <button type="button" className="text-button" disabled={disabled} onClick={() => {setEntries(entries.filter(item => item.product !== line.product)); edited();}}>Remove {line.name}</button>}</td>
        </tr>;
      })}</tbody>
    </table></div>
    <div className="form-grid"><label>Unbilled material<select value={extra} disabled={disabled} onChange={event => setExtra(event.target.value)}>
      <option value="">Select material found at unloading</option>
      {baseline.materials.filter(material => !entries.some(line => line.product === material.id)).map(material => <option key={material.id} value={material.id}>{material.name}</option>)}
    </select></label><button type="button" className="secondary" disabled={disabled || !extra} onClick={() => {
      const material = baseline.materials.find(item => item.id === extra)!;
      setEntries([...entries, {product: material.id, name: material.name, billed: '0', actual: '', extra: true}]); setExtra(''); edited();
    }}>Add unbilled material</button></div>
    <label>Warehouse note<textarea maxLength={1000} disabled={disabled} value={note} onChange={event => {setNote(event.target.value); setMessage('');}}/></label>
    {preview && <div className="notice"><strong>{preview.complete && entries.every(line => line.actual !== '') ? 'Reviewed totals' : 'Provisional totals — measurements are incomplete'}</strong><p>Billed: {preview.billed_total} kg · Measured: {preview.actual_total} kg</p></div>}
    <p className="muted">Review uses server-calculated differences and the exact ±2% tolerance. Explicit zero records a shortage. Submission receives actual stock, including flagged measurements, and preserves the customer bill.{baseline.reweigh_required?' A downward adjustment is blocked if it would make available stock negative.':''}</p>
    <div className="dialog-actions">
      <button type="button" className="secondary" onClick={close} disabled={busy || uncertain}>Close</button>
      {uncertain ? <button type="button" disabled={busy} onClick={() => save(attempt.current!.action as 'save-reconciliation' | 'receive')}>{busy ? 'Recovering…' : 'Recover save result'}</button> : <>
        <button type="button" className="secondary" disabled={disabled || stale} onClick={() => save('save-reconciliation')}>Save draft</button>
        <button type="button" className="secondary" disabled={disabled || stale} onClick={review}>Review measurements</button>
        <button type="submit" disabled={disabled || stale || !preview?.complete || entries.some(line => line.actual === '')}>{busy ? 'Saving…' : 'Submit reconciliation'}</button>
      </>}
    </div>
  </form>;
}
