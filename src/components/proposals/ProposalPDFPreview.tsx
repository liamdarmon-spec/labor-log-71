// src/components/proposals/ProposalPDFPreview.tsx
// Full-screen PDF preview with download functionality

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, Download, Printer, Loader2 } from 'lucide-react';
import { ProposalData } from '@/hooks/useProposalData';
import { format } from 'date-fns';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ProposalPDFPreviewProps {
  proposal: ProposalData;
  onClose: () => void;
}

export function ProposalPDFPreview({ proposal, onClose }: ProposalPDFPreviewProps) {
  const [generating, setGenerating] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const settings = proposal.settings;

  const handleDownload = async () => {
    if (!contentRef.current) return;
    
    setGenerating(true);
    toast.info('Generating PDF...');

    try {
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = margin;
      let pageNum = 1;

      // First page
      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - margin * 2);

      // Additional pages
      while (heightLeft > 0) {
        position = margin - (imgHeight - heightLeft);
        pdf.addPage();
        pageNum++;
        pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
        heightLeft -= (pageHeight - margin * 2);
      }

      // Add page numbers
      const totalPages = pdf.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(9);
        pdf.setTextColor(128, 128, 128);
        pdf.text(
          `Page ${i} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 5,
          { align: 'center' }
        );
      }

      // Download
      const filename = `${proposal.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
      pdf.save(filename);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const validUntil = new Date(proposal.proposal_date);
  validUntil.setDate(validUntil.getDate() + proposal.validity_days);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 flex flex-row items-center justify-between">
          <DialogTitle>PDF Preview</DialogTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button size="sm" onClick={handleDownload} disabled={generating}>
              {generating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Download PDF
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto bg-muted/30 p-4">
          <div
            ref={contentRef}
            className="bg-white mx-auto shadow-lg print:shadow-none"
            style={{ width: '210mm', minHeight: '297mm', padding: '20mm' }}
          >
            {/* Header */}
            <div className="border-b-2 border-gray-200 pb-6 mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {proposal.title}
              </h1>
              <div className="flex justify-between text-sm text-gray-600">
                <div>
                  {settings.show_project_info && (
                    <p><strong>Project:</strong> {proposal.project?.project_name}</p>
                  )}
                  {settings.show_client_info && (
                    <p><strong>Client:</strong> {proposal.client_name || proposal.project?.client_name}</p>
                  )}
                  {settings.show_address && proposal.project?.address && (
                    <p><strong>Address:</strong> {proposal.project.address}</p>
                  )}
                </div>
                <div className="text-right">
                  <p><strong>Date:</strong> {format(new Date(proposal.proposal_date), 'MMMM d, yyyy')}</p>
                  <p><strong>Valid Until:</strong> {format(validUntil, 'MMMM d, yyyy')}</p>
                </div>
              </div>
            </div>

            {/* Introduction */}
            {proposal.intro_text && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Introduction</h2>
                <div className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                  {proposal.intro_text}
                </div>
              </div>
            )}

            {/* Scope & Pricing */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Scope of Work</h2>
              
              {settings.group_line_items_by_area ? (
                <div className="space-y-4">
                  {proposal.scopeByArea.map((area) => (
                    <div key={area.area_label} className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 flex justify-between font-medium">
                        <span>{area.area_label}</span>
                        {settings.show_line_item_totals && (
                          <span>${area.subtotal.toLocaleString()}</span>
                        )}
                      </div>
                      {settings.show_line_items && (
                        <div className="divide-y">
                          {area.items.map((item) => (
                            <div key={item.id} className="px-4 py-2 flex justify-between text-sm">
                              <span className="text-gray-700">{item.description}</span>
                              {settings.show_line_item_totals && (
                                <span className="text-gray-600">${item.line_total.toLocaleString()}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <div className="divide-y">
                    {proposal.allItems.map((item) => (
                      <div key={item.id} className="px-4 py-2 flex justify-between text-sm">
                        <span className="text-gray-700">{item.description}</span>
                        {settings.show_line_item_totals && (
                          <span className="text-gray-600">${item.line_total.toLocaleString()}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="mt-4 flex justify-end">
                <div className="bg-gray-900 text-white px-6 py-3 rounded-lg">
                  <span className="text-gray-300 mr-4">Total</span>
                  <span className="text-2xl font-bold">${proposal.total_amount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Allowances */}
            {settings.show_allowances && settings.allowances_text && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Allowances</h2>
                <div className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed bg-gray-50 p-4 rounded-lg">
                  {settings.allowances_text}
                </div>
              </div>
            )}

            {/* Exclusions */}
            {settings.show_exclusions && settings.exclusions_text && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Exclusions</h2>
                <div className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed bg-gray-50 p-4 rounded-lg">
                  {settings.exclusions_text}
                </div>
              </div>
            )}

            {/* Payment Schedule */}
            {settings.show_payment_schedule && settings.payment_schedule.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Payment Schedule</h2>
                <table className="w-full border-collapse border">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border px-4 py-2 text-left text-sm font-medium">Milestone</th>
                      <th className="border px-4 py-2 text-right text-sm font-medium">Percentage</th>
                      <th className="border px-4 py-2 text-right text-sm font-medium">Amount</th>
                      <th className="border px-4 py-2 text-left text-sm font-medium">Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settings.payment_schedule.map((row, index) => (
                      <tr key={row.id || index}>
                        <td className="border px-4 py-2 text-sm">{row.label}</td>
                        <td className="border px-4 py-2 text-sm text-right">{row.percentage}%</td>
                        <td className="border px-4 py-2 text-sm text-right">
                          ${((proposal.total_amount * (row.percentage || 0)) / 100).toLocaleString()}
                        </td>
                        <td className="border px-4 py-2 text-sm">{row.due_on}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Terms & Conditions */}
            {settings.show_terms && settings.terms_text && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Terms & Conditions</h2>
                <div className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                  {settings.terms_text}
                </div>
              </div>
            )}

            {/* Signature Block */}
            {settings.show_signature_block && (
              <div className="mt-12 pt-8 border-t">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Acceptance</h2>
                <div className="grid grid-cols-2 gap-12">
                  <div>
                    <p className="font-medium text-sm mb-4">Client</p>
                    <div className="border-b-2 border-gray-400 h-16 mb-2" />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Signature</span>
                      <span>Date</span>
                    </div>
                    <div className="border-b border-gray-300 h-8 mt-4 mb-1" />
                    <p className="text-xs text-gray-500">Printed Name</p>
                  </div>
                  <div>
                    <p className="font-medium text-sm mb-4">Contractor</p>
                    <div className="border-b-2 border-gray-400 h-16 mb-2" />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Signature</span>
                      <span>Date</span>
                    </div>
                    <div className="border-b border-gray-300 h-8 mt-4 mb-1" />
                    <p className="text-xs text-gray-500">Printed Name / Title</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
