# Scrappy-frontend
## Customer, franchise, and team workspace

Customer and franchise registers use the server-provided scope and preserve
record attribution in their detail views. Managers can add team members and,
where delegated, edit role/contact assignments, disable or re-enable access,
and queue an access reset. Every action is sent with an idempotency key and
refreshes the scoped register after completion.

Catalogue and control screens follow capability checks for product, category,
and pricing changes. Pricing is presented as append-only history with reason
and effective timestamp, while settings and audit views remain read or write
restricted by the server-provided capabilities rather than navigation alone.

Collectors get a focused home view with assigned pickups, safe Call and
Location links only when contact data exists, current load and cash context,
and paid-pickup totals. Administrative controls are omitted from the collector
navigation and detail actions.

HQ managers get a network overview with franchise health, an assignment queue,
lead and import entry points, and persistent franchise filters. The shared
connection indicator distinguishes live, reconnecting, delayed, and offline
states while committed events refresh the current scoped view.

The HQ operations panel links directly to pickups, bills, loads and weighing,
stock, requests, cash, and team registers. Each destination keeps its existing
server scope and action checks, including matched-weight review, request
progress, cash state, and restricted target accounts.

Warehouse managers get a local operations view for reconciliation queue,
inventory history, open HQ requests, and driver cash reviews. The overview
links only to local receipt, stock, release, and handover actions; lead details
remain read-only outside the receipt workflow.

Domain events now invalidate matching scoped queries and dashboard metrics,
with broad refresh reserved for resync or malformed events. Metric links open
the corresponding register, while local draft state remains in the active form
during background refreshes.

Workspace surfaces include keyboard-visible focus, loading skeletons, empty
states, error/conflict alerts, access-denied states, responsive tables, and
reduced-motion support. The connection status is announced politely to assistive
technology and remains visible during reconnect or delayed-update periods.
