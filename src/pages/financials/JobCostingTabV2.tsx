import { JobCostingTab } from '@/components/financials/JobCostingTab';

export default function JobCostingTabV2() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Job Costing</h1>
        <p className="text-muted-foreground">
          Analytics and insights - Budget vs Actual performance by project
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          This page pulls data from Revenue (AR), Costs (AP), Time Logs, and Materials. 
          For data entry, use the respective sections.
        </p>
      </div>

      <JobCostingTab />
    </div>
  );
}
