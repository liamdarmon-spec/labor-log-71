import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { FileText, DollarSign, Users, Package, Building2 } from 'lucide-react';

interface SearchResult {
  type: 'estimate' | 'payment' | 'sub' | 'material' | 'project';
  id: string;
  title: string;
  subtitle: string;
  amount?: number;
  status?: string;
  route: string;
}

interface FinancialSearchResultsProps {
  results: SearchResult[];
  onClose: () => void;
}

export function FinancialSearchResults({ results, onClose }: FinancialSearchResultsProps) {
  const navigate = useNavigate();

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) acc[result.type] = [];
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  const getIcon = (type: string) => {
    switch (type) {
      case 'estimate': return FileText;
      case 'payment': return DollarSign;
      case 'sub': return Users;
      case 'material': return Package;
      case 'project': return Building2;
      default: return FileText;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'estimate': return 'Estimates';
      case 'payment': return 'Payments';
      case 'sub': return 'Subcontractors';
      case 'material': return 'Materials';
      case 'project': return 'Projects';
      default: return type;
    }
  };

  const handleResultClick = (result: SearchResult) => {
    navigate(result.route);
    onClose();
  };

  return (
    <div className="space-y-4">
      {Object.entries(groupedResults).map(([type, items]) => {
        const Icon = getIcon(type);
        return (
          <Card key={type}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Icon className="w-4 h-4" />
                {getTypeLabel(type)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {items.map((result) => (
                <div
                  key={result.id}
                  className="p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleResultClick(result)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{result.title}</p>
                      <p className="text-sm text-muted-foreground">{result.subtitle}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {result.amount && (
                        <span className="font-semibold">${result.amount.toLocaleString()}</span>
                      )}
                      {result.status && (
                        <Badge variant="secondary">{result.status}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
      
      {results.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">No results found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
