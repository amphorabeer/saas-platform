'use client';

import { KDSColumn } from './KDSColumn';
import type { KitchenTicketData } from './KitchenTicketCard';

export function KDSBoard({
  tickets,
  onStatusChange,
  soundOn = true,
}: {
  tickets: KitchenTicketData[];
  onStatusChange: (id: string, newStatus: string) => void;
  soundOn?: boolean;
}) {
  const newTickets = tickets.filter((t) => t.status === 'NEW');
  const preparingTickets = tickets.filter((t) => t.status === 'PREPARING');
  const readyTickets = tickets.filter((t) => t.status === 'READY');

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0">
      <KDSColumn status="NEW" tickets={newTickets} onStatusChange={onStatusChange} soundOn={soundOn} />
      <KDSColumn status="PREPARING" tickets={preparingTickets} onStatusChange={onStatusChange} soundOn={soundOn} />
      <KDSColumn status="READY" tickets={readyTickets} onStatusChange={onStatusChange} soundOn={soundOn} />
    </div>
  );
}
