import { Card } from '@/components/ui/card';

interface ProposalCanvasProps {
  proposal: any;
  sections: any[];
}

export function ProposalCanvas({ proposal, sections }: ProposalCanvasProps) {
  return (
    <div className="max-w-4xl mx-auto">
      <Card className="p-12 bg-background">
        {/* Header */}
        <div className="mb-12 border-b pb-8">
          <h1 className="text-4xl font-bold mb-4">{proposal.title}</h1>
          <div className="flex justify-between text-sm text-muted-foreground">
            <div>
              <p className="font-medium">Client: {proposal.client_name || 'N/A'}</p>
              <p>Project: {proposal.projects?.project_name || 'N/A'}</p>
            </div>
            <div className="text-right">
              <p>Date: {new Date(proposal.proposal_date || proposal.created_at).toLocaleDateString()}</p>
              <p>Valid for: {proposal.validity_days || 30} days</p>
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-12">
          {sections.map((section) => (
            <div key={section.id} className="prose prose-sm max-w-none">
              <h2 className="text-2xl font-semibold mb-4">{section.title}</h2>
              <div className="whitespace-pre-wrap text-muted-foreground">
                {section.content_richtext || 'No content'}
              </div>
            </div>
          ))}
          
          {sections.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>No sections added yet</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-3xl font-bold">
                ${proposal.total_amount?.toLocaleString() || '0.00'}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
