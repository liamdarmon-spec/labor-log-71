import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign } from 'lucide-react';

interface LaborPayRunsPanelProps {
  onStartPayRun: () => void;
}

export const LaborPayRunsPanel = ({ onStartPayRun }: LaborPayRunsPanelProps) => {
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          Labor Pay Runs
        </CardTitle>
        <CardDescription className="text-base">
          Select a date range and a company to generate the total labor owed. Recording a payment will automatically mark all unpaid logs in that range as paid.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={onStartPayRun} size="lg" className="gap-2">
          <DollarSign className="w-4 h-4" />
          Start Labor Pay Run
        </Button>
      </CardContent>
    </Card>
  );
};
