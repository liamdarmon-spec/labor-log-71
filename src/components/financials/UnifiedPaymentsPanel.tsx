import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { DollarSign, Users, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function UnifiedPaymentsPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('labor');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Center</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="labor">Labor</TabsTrigger>
            <TabsTrigger value="subs">Subs</TabsTrigger>
            <TabsTrigger value="materials">Materials</TabsTrigger>
          </TabsList>

          <TabsContent value="labor" className="space-y-4">
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <div className="p-3 rounded-lg bg-primary/10">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold">Labor Payment Run</h4>
                <p className="text-sm text-muted-foreground">
                  Create payment batches for unpaid labor
                </p>
              </div>
              <Button onClick={() => navigate('/payments')}>
                Start
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="subs" className="space-y-4">
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <div className="p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900">
                <Users className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold">Sub Invoice Payment</h4>
                <p className="text-sm text-muted-foreground">
                  Pay approved sub invoices and manage retention
                </p>
              </div>
              <Button onClick={() => navigate('/subs')}>
                View
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="materials" className="space-y-4">
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900">
                <Package className="w-5 h-5 text-amber-700 dark:text-amber-300" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold">Material Receipt Payment</h4>
                <p className="text-sm text-muted-foreground">
                  Mark material receipts as paid
                </p>
              </div>
              <Button onClick={() => navigate('/materials')}>
                View
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
