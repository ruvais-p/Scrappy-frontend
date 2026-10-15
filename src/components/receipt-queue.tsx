'use client';

import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {api, display, label, Register, Row} from '@/lib/api';

export default function ReceiptQueue({ready, userId, open}: {ready: boolean; userId: number; open: (lead: Row) => void}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const query = useQuery({queryKey: ['receipt-queue', userId, search, page], queryFn: () => api<Register>('reconciliation-queue/?' + new URLSearchParams({search, page: String(page)})), enabled: ready});
  return <section className="panel">
    <div className="panel-heading"><div><h2>Waiting for reconciliation</h2><p className="muted">Includes paid pickups. Saving a draft does not receive stock.</p></div></div>
    <div className="toolbar"><label>Find a pickup<input value={search} onChange={event => {setSearch(event.target.value); setPage(1);}} placeholder="Customer name or phone"/></label><button className="secondary" onClick={() => query.refetch()}>Refresh queue</button></div>
    {query.isError ? <div role="alert" className="notice error">{query.error.message}</div> : query.isPending ? <p role="status">Loading reconciliation queue…</p> : <>
      <div className="table-scroll"><table><thead><tr><th>Customer</th><th>Pickup date</th><th>Collector</th><th>Warehouse</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>{query.data.results.map(lead => <tr key={lead.id}><td>{display(lead.customer_name)}<small>{display(lead.bill_number)}</small></td><td>{display(lead.pickup_date)}</td><td>{display(lead.driver_name)}</td><td>{display(lead.warehouse_name)}</td><td><span className="badge">{label(String(lead.state))}</span></td><td><button className="secondary" onClick={() => open(lead)}>{lead.state === 'draft' ? 'Resume measurements' : lead.state === 'awaiting_unload' ? 'View eligibility' : 'Enter measurements'}</button></td></tr>)}</tbody>
      </table></div>
      {query.data.count === 0 && <div className="empty"><h3>No pickups awaiting reconciliation</h3><p>Issued pickups with a warehouse load association appear here.</p></div>}
      <div className="pagination"><span>{query.data.count} pickups · Page {page}</span><div><button className="secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button><button className="secondary" disabled={page * 50 >= query.data.count} onClick={() => setPage(page + 1)}>Next</button></div></div>
    </>}
  </section>;
}
