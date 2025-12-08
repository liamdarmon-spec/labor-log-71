// src/components/proposals/ProposalPDFPreview.tsx
// Professional, ERP-safe proposal PDF preview & download

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

export function ProposalPDFPreview({
  proposal,
  onClose,
}: ProposalPDFPreviewProps) {
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

      // First page
      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;

      // Additional pages
      while (heightLeft > 0) {
        position = margin - (imgHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - margin * 2;
      }

      // Page numbers
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

      const filename = `${proposal.title
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase()}.pdf`;
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

  const proposalDate = proposal.proposal_date
    ? new Date(proposal.proposal_date)
    : new Date(proposal.created_at);

  const validUntil = new Date(proposalDate);
  validUntil.setDate(validUntil.getDate() + (proposal.validity_days || 0));

  const project = proposal.project;
  const estimate = proposal.estimate;

  const clientName =
    proposal.client_name || project?.client_name || 'Client';

  // Use estimate title as "Job Type" – e.g., "Full Home Remodel"
  const jobType = estimate?.title || 'Remodel / Construction Work';

  // Category color backgrounds for scope chips
  const getCategoryBgColor = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'labor':
        return '#EFF6FF';
      case 'subs':
        return '#F3E8FF';
      case 'materials':
        return '#FFFBEB';
      default:
        return '#F3F4F6';
    }
  };

  // Helper to format money safely
  const fmtMoney = (value: number | null | undefined) =>
    `$${(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col p-0">
        {/* Toolbar */}
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

        {/* Scrollable preview */}
        <div className="flex-1 overflow-auto bg-muted/50 p-6">
          <div
            ref={contentRef}
            className="bg-white mx-auto shadow-xl print:shadow-none"
            style={{ width: '210mm', minHeight: '297mm', padding: '24mm 20mm' }}
          >
            {/* ===================== PAGE 1 – COVER & SNAPSHOT ===================== */}
            {/* Header */}
            <div className="mb-10">
              <div className="flex justify-between items-start gap-6">
                <div className="min-w-0">
                  <h1 className="text-3xl font-bold text-gray-900 tracking-tight break-words">
                    {proposal.title}
                  </h1>
                  <p className="text-sm text-gray-500 mt-1">
                    Proposal #{proposal.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
                <div className="text-right text-sm text-gray-600">
                  <p>
                    Date:{' '}
                    {format(proposalDate, 'MMMM d, yyyy')}
                  </p>
                  {proposal.validity_days ? (
                    <p>
                      Valid Until:{' '}
                      {format(validUntil, 'MMMM d, yyyy')}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Company info – static shell, later can be wired to settings */}
              <div className="flex justify-between items-center mt-4 text-xs text-gray-500">
                <div>FORMA Homes</div>
                <div className="flex gap-4">
                  <span>License #</span>
                  <span>info@yourcompany.com</span>
                  <span>(000) 000-0000</span>
                </div>
              </div>

              <div className="h-1 bg-gray-900 mt-6 rounded-full" />
            </div>

            {/* Project snapshot */}
            <div className="mb-8 bg-gray-50 rounded-xl p-6">
              <div className="grid grid-cols-2 gap-8 text-sm">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 font-medium">
                      Project
                    </p>
                    <p className="text-lg font-semibold text-gray-900 mt-1">
                      {project?.project_name || 'Project'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 font-medium">
                      Job Type
                    </p>
                    <p className="text-gray-800 mt-1">{jobType}</p>
                  </div>
                  {settings.show_address && project?.address && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500 font-medium">
                        Job Site Address
                      </p>
                      <p className="text-gray-800 mt-1">{project.address}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {settings.show_client_info && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500 font-medium">
                        Prepared For
                      </p>
                      <p className="text-lg font-semibold text-gray-900 mt-1">
                        {clientName}
                      </p>
                      {proposal.client_email && (
                        <p className="text-gray-700 mt-1">
                          {proposal.client_email}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500 font-medium">
                        Proposal Total
                      </p>
                      <p className="text-xl font-bold text-gray-900 mt-1">
                        {fmtMoney(proposal.total_amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500 font-medium">
                        Estimate Source
                      </p>
                      <p className="text-gray-800 mt-1">
                        {estimate?.title || 'Linked Estimate'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Overview */}
            {proposal.intro_text && settings.show_scope_summary && (
              <div className="mb-10">
                <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b">
                  Project Overview
                </h2>
                <div className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                  {proposal.intro_text}
                </div>
              </div>
            )}

            {/* ===================== SCOPE & PRICING ===================== */}
            <div className="mb-10">
              <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b">
                Scope of Work & Pricing
              </h2>

              {settings.group_line_items_by_area ? (
                <div className="space-y-4">
                  {proposal.scopeByArea.map((area) => (
                    <div
                      key={area.area_label}
                      className="border rounded-lg overflow-hidden"
                    >
                      <div className="bg-gray-900 text-white px-4 py-3 flex justify-between items-center">
                        <span className="font-semibold">
                          {area.area_label}
                        </span>
                        {settings.show_line_item_totals && (
                          <span className="font-mono font-semibold">
                            {fmtMoney(area.subtotal)}
                          </span>
                        )}
                      </div>
                      {settings.show_line_items && (
                        <div className="divide-y divide-gray-100">
                          {area.items.map((item, idx) => (
                            <div
                              key={item.id}
                              className="px-4 py-3 flex justify-between items-start text-sm"
                              style={{
                                backgroundColor:
                                  idx % 2 === 0 ? '#FAFAFA' : '#FFFFFF',
                              }}
                            >
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <span
                                  className="px-2 py-0.5 rounded text-xs font-medium shrink-0"
                                  style={{
                                    backgroundColor: getCategoryBgColor(
                                      item.category
                                    ),
                                  }}
                                >
                                  {item.category
                                    ?.slice(0, 3)
                                    .toUpperCase() || 'OTH'}
                                </span>
                                <span className="text-gray-700">
                                  {item.description}
                                </span>
                              </div>
                              {settings.show_line_item_totals && (
                                <span className="font-mono text-gray-600 ml-4 shrink-0">
                                  {fmtMoney(item.line_total)}
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
                  {proposal.allItems.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-gray-500 text-center">
                      No scope items found. Link an estimate to populate this
                      section.
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {proposal.allItems.map((item, idx) => (
                        <div
                          key={item.id}
                          className="px-4 py-3 flex justify-between items-start text-sm"
                          style={{
                            backgroundColor:
                              idx % 2 === 0 ? '#FAFAFA' : '#FFFFFF',
                          }}
                        >
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <span
                              className="px-2 py-0.5 rounded text-xs font-medium shrink-0"
                              style={{
                                backgroundColor: getCategoryBgColor(
                                  item.category
                                ),
                              }}
                            >
                              {item.category
                                ?.slice(0, 3)
                                .toUpperCase() || 'OTH'}
                            </span>
                            <span className="text-gray-700">
                              {item.description}
                            </span>
                          </div>
                          {settings.show_line_item_totals && (
                            <span className="font-mono text-gray-600 ml-4 shrink-0">
                              {fmtMoney(item.line_total)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Investment summary band */}
              <div className="mt-6 flex justify-end">
                <div className="bg-gray-900 text-white px-8 py-4 rounded-xl">
                  <p className="text-gray-400 text-xs mb-1">
                    Total Investment
                  </p>
                  <p className="text-3xl font-bold tracking-tight">
                    {fmtMoney(proposal.total_amount)}
                  </p>
                </div>
              </div>
            </div>

            {/* ===================== ALLOWANCES & EXCLUSIONS ===================== */}
            {(settings.show_allowances && settings.allowances_text) ||
            (settings.show_exclusions && settings.exclusions_text) ? (
              <div className="mb-10">
                <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b">
                  Allowances & Exclusions
                </h2>

                {settings.show_allowances && settings.allowances_text && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">
                      Allowances
                    </h3>
                    <div className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed bg-blue-50 p-4 rounded-lg border border-blue-100">
                      {settings.allowances_text}
                    </div>
                  </div>
                )}

                {settings.show_exclusions && settings.exclusions_text && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">
                      Exclusions & Clarifications
                    </h3>
                    <div className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed bg-amber-50 p-4 rounded-lg border border-amber-100">
                      {settings.exclusions_text}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* ===================== PAYMENT SCHEDULE ===================== */}
            {settings.show_payment_schedule &&
            settings.payment_schedule &&
            settings.payment_schedule.length > 0 ? (
              <div className="mb-10">
                <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b">
                  Payment Schedule
                </h2>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-2 text-left font-semibold text-gray-700 border">
                        Milestone
                      </th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-700 border w-20">
                        %
                      </th>
                      <th className="px-4 py-2 text-right font-semibold text-gray-700 border w-32">
                        Amount
                      </th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700 border">
                        Due
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {settings.payment_schedule.map((row, index) => {
                      const pct = row.percentage || 0;
                      const amount =
                        (proposal.total_amount || 0) * (pct / 100);

                      return (
                        <tr
                          key={row.id || index}
                          className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                        >
                          <td className="px-4 py-2 border text-gray-800">
                            {row.label}
                          </td>
                          <td className="px-4 py-2 border text-right font-mono text-gray-700">
                            {pct ? `${pct}%` : ''}
                          </td>
                          <td className="px-4 py-2 border text-right font-mono font-medium text-gray-900">
                            {fmtMoney(amount)}
                          </td>
                          <td className="px-4 py-2 border text-gray-700">
                            {row.due_on}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}

            {/* ===================== TERMS & CONDITIONS ===================== */}
            {settings.show_terms && settings.terms_text && (
              <div className="mb-10">
                <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b">
                  Terms & Conditions
                </h2>
                <div className="text-gray-600 whitespace-pre-wrap text-sm leading-relaxed">
                  {settings.terms_text}
                </div>
              </div>
            )}

            {/* ===================== SIGNATURES & NEXT STEPS ===================== */}
            {settings.show_signature_block && (
              <div className="mt-12 pt-8 border-t-2 border-gray-200">
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  Acceptance & Authorization
                </h2>
                <p className="text-sm text-gray-600 mb-8">
                  By signing below, the Client authorizes FORMA Homes to
                  proceed with the work described in this proposal and agrees
                  to the investment, payment schedule, allowances, exclusions,
                  and terms outlined above.
                </p>

                <div className="grid grid-cols-2 gap-12 mb-10">
                  <div>
                    <p className="font-semibold text-gray-900 mb-6">
                      Client
                    </p>
                    <div className="border-b-2 border-gray-400 h-12 mb-2" />
                    <div className="flex justify-between text-xs text-gray-500 mb-6">
                      <span>Authorized Signature</span>
                      <span>Date</span>
                    </div>
                    <div className="border-b border-gray-300 h-8 mb-1" />
                    <p className="text-xs text-gray-500">Printed Name</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-6">
                      Contractor
                    </p>
                    <div className="border-b-2 border-gray-400 h-12 mb-2" />
                    <div className="flex justify-between text-xs text-gray-500 mb-6">
                      <span>Authorized Signature</span>
                      <span>Date</span>
                    </div>
                    <div className="border-b border-gray-300 h-8 mb-1" />
                    <p className="text-xs text-gray-500">
                      Printed Name / Title
                    </p>
                  </div>
                </div>

                {/* Next steps checklist – static text, no numbers */}
                <div className="text-xs text-gray-500">
                  <p className="font-semibold mb-1">Next Steps</p>
                  <ol className="list-decimal list-inside space-y-0.5">
                    <li>Review the scope of work and terms.</li>
                    <li>Sign and date this proposal.</li>
                    <li>
                      Coordinate with our team to schedule start date and
                      initial payment as outlined in the payment schedule.
                    </li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
