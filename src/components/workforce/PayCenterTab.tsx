import { useState } from 'react';
import { LaborPayRunsPanel } from '@/components/payments/LaborPayRunsPanel';
import { GlobalUnpaidLaborView } from '@/components/payments/GlobalUnpaidLaborView';

export function PayCenterTab() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold mb-2">Pay Center</h3>
        <p className="text-muted-foreground">
          Manage labor payments, unpaid queue, and reimbursements
        </p>
      </div>

      <LaborPayRunsPanel onStartPayRun={() => {
        // Navigate to payments page for full pay run flow
        window.location.href = '/payments';
      }} />

      <GlobalUnpaidLaborView key={refreshKey} />
    </div>
  );
}
