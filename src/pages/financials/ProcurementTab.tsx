import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Package, FileText, Truck, Database } from 'lucide-react';

export default function ProcurementTab() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Procurement</h1>
        <p className="text-muted-foreground">
          Purchase orders, delivery receipts, and material requests
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Purchase Orders
            </CardTitle>
            <CardDescription>
              Create and manage purchase orders for materials and equipment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Coming soon</p>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" />
              Delivery Receipts
            </CardTitle>
            <CardDescription>
              Track deliveries and match with purchase orders
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Coming soon</p>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Material Requests
            </CardTitle>
            <CardDescription>
              Field requests for materials from project sites
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Coming soon</p>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              Vendor SKUs
            </CardTitle>
            <CardDescription>
              Catalog of vendor products and pricing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Coming soon</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
