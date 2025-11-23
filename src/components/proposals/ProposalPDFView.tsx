import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, FileText } from 'lucide-react';
import { generateProposalPDF, downloadPDF } from '@/utils/proposalPDF';
import { toast } from 'sonner';
import { useLogProposalEvent } from '@/hooks/useProposalEvents';
import { getClientIP } from '@/hooks/useProposalEvents';

interface ProposalPDFViewProps {
  proposal: any;
  sections: any[];
}

export function ProposalPDFView({ proposal, sections }: ProposalPDFViewProps) {
  const [generating, setGenerating] = useState(false);
  const logEvent = useLogProposalEvent();

  const handleDownloadPDF = async () => {
    try {
      setGenerating(true);
      toast.info('Generating PDF...');

      // Generate PDF from the preview content
      const blob = await generateProposalPDF('pdf-content', {
        proposalTitle: proposal.title,
        clientName: proposal.client_name || proposal.projects?.client_name,
        projectName: proposal.projects?.project_name,
        proposalDate: proposal.proposal_date || proposal.created_at,
        companyName: 'Your Company', // TODO: Get from settings
      });

      // Download the PDF
      const filename = `${proposal.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
      downloadPDF(blob, filename);

      // Log the event
      const ip = await getClientIP();
      logEvent.mutate({
        proposal_id: proposal.id,
        event_type: 'pdf_downloaded',
        actor_ip: ip,
      });

      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Card */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-1">Download PDF</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Generate a professional PDF version of this proposal
            </p>
            <Button onClick={handleDownloadPDF} disabled={generating}>
              <Download className="h-4 w-4 mr-2" />
              {generating ? 'Generating...' : 'Download PDF'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Preview Content (hidden, used for PDF generation) */}
      <div id="pdf-content" className="hidden">
        <div className="p-12 bg-white" style={{ width: '210mm' }}>
          {/* Header */}
          <div className="mb-8 pb-6 border-b-2 border-gray-200">
            <h1 className="text-4xl font-bold mb-4 text-gray-900">{proposal.title}</h1>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <p className="font-medium">Client: {proposal.client_name || proposal.projects?.client_name || 'N/A'}</p>
                <p>Project: {proposal.projects?.project_name || 'N/A'}</p>
              </div>
              <div className="text-right">
                <p>Date: {new Date(proposal.proposal_date || proposal.created_at).toLocaleDateString()}</p>
                {proposal.validity_days && <p>Valid for: {proposal.validity_days} days</p>}
              </div>
            </div>
          </div>

          {/* Sections */}
          {sections.map((section) => (
            <div key={section.id} className="mb-8">
              <h2 className="text-2xl font-semibold mb-3 text-gray-900">{section.title}</h2>
              <div className="whitespace-pre-wrap text-gray-700 text-sm leading-relaxed">
                {section.content_richtext || 'No content'}
              </div>
            </div>
          ))}

          {/* Footer */}
          <div className="mt-12 pt-6 border-t-2 border-gray-200">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-3xl font-bold text-gray-900">
                  ${proposal.total_amount?.toLocaleString() || '0.00'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
