// src/components/proposals/ProposalPDFPreview.tsx
// Professional PDF preview with download - all data from estimate/project

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

  // Category colors for styling
  const getCategoryBgColor = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'labor': return '#EFF6FF';
      case 'subs': return '#F3E8FF';
      case 'materials': return '#FFFBEB';
      default: return '#F3F4F6';
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 flex flex-row items-center justify-between px-6 py-4 border-b">
          <DialogTitle>Proposal Preview</DialogTitle>
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
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto bg-muted/50 p-6">
          <div
            ref={contentRef}
            className="bg-white mx-auto shadow-xl print:shadow-none"
            style={{ width: '210mm', minHeight: '297mm', padding: '24mm 20mm' }}
          >
            {/* Professional Header */}
            <div className="mb-10">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                    {proposal.title}
                  </h1>
                  <p className="text-sm text-gray-500 mt-1">
                    Proposal #{proposal.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">
                    Date: {format(new Date(proposal.proposal_date), 'MMMM d, yyyy')}
                  </p>
                  <p className="text-sm text-gray-500">
                    Valid Until: {format(validUntil, 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>
              <div className="h-1 bg-gradient-to-r from-gray-800 to-gray-400 mt-6 rounded-full" />
            </div>

            {/* Project & Client Info */}
            {(settings.show_project_info || settings.show_client_info || settings.show_address) && (
              <div className="mb-8 bg-gray-50 rounded-xl p-6">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    {settings.show_project_info && (
                      <div className="mb-4">
                        <p className="text-xs uppercase tracking-wider text-gray-500 font-medium">Project</p>
                        <p className="text-lg font-semibold text-gray-900 mt-1">
                          {proposal.project?.project_name}
                        </p>
                      </div>
                    )}
                    {settings.show_address && proposal.project?.address && (
                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-500 font-medium">Job Site Address</p>
                        <p className="text-gray-700 mt-1">{proposal.project.address}</p>
                      </div>
                    )}
                  </div>
                  {settings.show_client_info && (
                    <div>
                      <p className="text-xs uppercase tracking-wider text-gray-500 font-medium">Prepared For</p>
                      <p className="text-lg font-semibold text-gray-900 mt-1">
                        {proposal.client_name || proposal.project?.client_name || 'Client'}
                      </p>
                      {proposal.client_email && (
                        <p className="text-gray-600 mt-1">{proposal.client_email}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Introduction */}
            {proposal.intro_text && (
              <div className="mb-8">
                <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b">
                  Project Overview
                </h2>
                <div className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                  {proposal.intro_text}
                </div>
              </div>
            )}

            {/* Scope & Pricing */}
            <div className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b">
                Scope of Work & Pricing
              </h2>
              
              {settings.group_line_items_by_area ? (
                <div className="space-y-4">
                  {proposal.scopeByArea.map((area) => (
                    <div key={area.area_label} className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-800 text-white px-4 py-3 flex justify-between items-center">
                        <span className="font-semibold">{area.area_label}</span>
                        {settings.show_line_item_totals && (
                          <span className="font-mono font-semibold">
                            ${area.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                      {settings.show_line_items && (
                        <div className="divide-y divide-gray-100">
                          {area.items.map((item, idx) => (
                            <div 
                              key={item.id} 
                              className="px-4 py-3 flex justify-between items-start text-sm"
                              style={{ backgroundColor: idx % 2 === 0 ? '#FAFAFA' : '#FFFFFF' }}
                            >
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <span 
                                  className="px-2 py-0.5 rounded text-xs font-medium shrink-0"
                                  style={{ backgroundColor: getCategoryBgColor(item.category) }}
                                >
                                  {item.category?.slice(0, 3).toUpperCase() || 'OTH'}
                                </span>
                                <span className="text-gray-700">{item.description}</span>
                              </div>
                              {settings.show_line_item_totals && (
                                <span className="font-mono text-gray-600 ml-4 shrink-0">
                                  ${item.line_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
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
                  <div className="divide-y divide-gray-100">
                    {proposal.allItems.map((item, idx) => (
                      <div 
                        key={item.id} 
                        className="px-4 py-3 flex justify-between items-start text-sm"
                        style={{ backgroundColor: idx % 2 === 0 ? '#FAFAFA' : '#FFFFFF' }}
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <span 
                            className="px-2 py-0.5 rounded text-xs font-medium shrink-0"
                            style={{ backgroundColor: getCategoryBgColor(item.category) }}
                          >
                            {item.category?.slice(0, 3).toUpperCase() || 'OTH'}
                          </span>
                          <span className="text-gray-700">{item.description}</span>
                        </div>
                        {settings.show_line_item_totals && (
                          <span className="font-mono text-gray-600 ml-4 shrink-0">
                            ${item.line_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Grand Total */}
              <div className="mt-6 flex justify-end">
                <div className="bg-gray-900 text-white px-8 py-4 rounded-xl">
                  <p className="text-gray-400 text-sm mb-1">Total Investment</p>
                  <p className="text-3xl font-bold tracking-tight">
                    ${proposal.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            {/* Allowances */}
            {settings.show_allowances && settings.allowances_text && (
              <div className="mb-8">
                <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b">
                  Allowances
                </h2>
                <div className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed bg-blue-50 p-4 rounded-lg border border-blue-100">
                  {settings.allowances_text}
                </div>
              </div>
            )}

            {/* Exclusions */}
            {settings.show_exclusions && settings.exclusions_text && (
              <div className="mb-8">
                <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b">
                  Exclusions & Clarifications
                </h2>
                <div className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed bg-amber-50 p-4 rounded-lg border border-amber-100">
                  {settings.exclusions_text}
                </div>
              </div>
            )}

            {/* Payment Schedule */}
            {settings.show_payment_schedule && settings.payment_schedule.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b">
                  Payment Schedule
                </h2>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border">Milestone</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 border w-24">%</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 border w-32">Amount</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border">Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settings.payment_schedule.map((row, index) => (
                      <tr key={row.id || index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 text-sm border text-gray-700">{row.label}</td>
                        <td className="px-4 py-3 text-sm border text-right font-mono">{row.percentage}%</td>
                        <td className="px-4 py-3 text-sm border text-right font-mono font-medium">
                          ${((proposal.total_amount * (row.percentage || 0)) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-sm border text-gray-600">{row.due_on}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Terms & Conditions */}
            {settings.show_terms && settings.terms_text && (
              <div className="mb-8">
                <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b">
                  Terms & Conditions
                </h2>
                <div className="text-gray-600 whitespace-pre-wrap text-sm leading-relaxed">
                  {settings.terms_text}
                </div>
              </div>
            )}

            {/* Signature Block */}
            {settings.show_signature_block && (
              <div className="mt-12 pt-8 border-t-2">
                <h2 className="text-lg font-bold text-gray-900 mb-6">
                  Acceptance & Authorization
                </h2>
                <p className="text-sm text-gray-600 mb-8">
                  By signing below, I authorize the work described in this proposal and agree to the terms and payment schedule outlined above.
                </p>
                <div className="grid grid-cols-2 gap-12">
                  <div>
                    <p className="font-semibold text-gray-900 mb-6">Client</p>
                    <div className="border-b-2 border-gray-400 h-16 mb-2" />
                    <div className="flex justify-between text-xs text-gray-500 mb-6">
                      <span>Authorized Signature</span>
                      <span>Date</span>
                    </div>
                    <div className="border-b border-gray-300 h-10 mb-1" />
                    <p className="text-xs text-gray-500">Printed Name</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-6">Contractor</p>
                    <div className="border-b-2 border-gray-400 h-16 mb-2" />
                    <div className="flex justify-between text-xs text-gray-500 mb-6">
                      <span>Authorized Signature</span>
                      <span>Date</span>
                    </div>
                    <div className="border-b border-gray-300 h-10 mb-1" />
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
