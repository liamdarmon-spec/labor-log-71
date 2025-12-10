// src/components/proposals/ProposalPDFPreview.tsx
// Professional, ERP-safe proposal PDF preview & download with company settings
// Upgraded to match exact 4-panel design: Cover, Overview, Narrative, Breakdown

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { X, Download, Printer, Loader2, Home, Clock, User } from 'lucide-react';
import { ProposalData } from '@/hooks/useProposalData';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { useProposalSettings } from '@/hooks/useProposalSettings';
import { format } from 'date-fns';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ProposalPDFPreviewProps {
  proposal: ProposalData;
  onClose: () => void;
}

// Helper to calculate category totals
function calculateCategoryTotals(items: ProposalData['allItems']) {
  const totals = {
    labor: 0,
    materials: 0,
    subs: 0,
    allowances: 0,
    other: 0,
  };

  items.forEach((item) => {
    const cat = item.category?.toLowerCase() || 'other';
    if (cat.includes('labor')) totals.labor += item.line_total;
    else if (cat.includes('material')) totals.materials += item.line_total;
    else if (cat.includes('sub')) totals.subs += item.line_total;
    else if (cat.includes('allowance')) totals.allowances += item.line_total;
    else totals.other += item.line_total;
  });

  return totals;
}

export function ProposalPDFPreview({
  proposal,
  onClose,
}: ProposalPDFPreviewProps) {
  const [generating, setGenerating] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const settings = proposal.settings;

  // Company identity (name, license, contact, logo)
  const { data: company } = useCompanySettings();
  const { data: proposalSettings } = useProposalSettings(undefined, 'proposal');
  const { data: globalSettings } = useProposalSettings(undefined, 'global');
  const activeSettings = proposalSettings || globalSettings;
  
  // Extract tagline and intro heading from template_config
  const templateConfig = (activeSettings?.template_config as Record<string, any>) || {};
  const tagline = templateConfig.tagline || 'TRANSPARENT. RELIABLE. REFRESHINGLY MODERN.';
  const introHeading = templateConfig.intro_heading || proposal.title || 'A Refined Vision for Your Home';

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

      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;

      while (heightLeft > 0) {
        position = margin - (imgHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - margin * 2;
      }

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

  const project = proposal.project;
  const estimate = proposal.estimate;

  const clientName =
    proposal.client_name || project?.client_name || 'Client';

  const companyName = company?.name || 'FORMA Homes';
  const companyLegalName = company?.legal_name || companyName;

  const fmtMoney = (value: number | null | undefined) =>
    `$${(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  // Calculate category totals
  const categoryTotals = calculateCategoryTotals(proposal.allItems);

  // Get project manager if available
  const projectManager = project?.project_manager || 'Forma Homes Team';

  // Derive scope from estimate title or areas
  const scope = estimate?.title || 
                proposal.scopeByArea[0]?.area_label || 
                'General Construction';

  // Get cover image
  const coverImageUrl = (proposal as any).cover_image_url || 
                       (proposal as any).metadata?.cover_image_url ||
                       templateConfig.cover_image_url ||
                       company?.logo_url;

  // Calculate timeline estimate (if validity_days exists, convert to weeks)
  const timelineWeeks = proposal.validity_days 
    ? Math.ceil(proposal.validity_days / 7) 
    : null;

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
            style={{ width: '210mm', minHeight: '297mm', padding: '0' }}
          >
            {/* ============================================
                PAGE 1: COVER PAGE
                ============================================ */}
            <div
              className="relative min-h-[297mm] flex flex-col items-center justify-between py-16 px-12"
              style={{ pageBreakAfter: 'always' }}
            >
              {/* Hero image with white frame */}
              <div className="w-full max-w-[140mm] mb-12">
                {coverImageUrl ? (
                  <div className="relative" style={{ aspectRatio: '3/2' }}>
                    <div className="absolute inset-0 border-4 border-white shadow-lg" />
                    <img
                      src={coverImageUrl}
                      alt="Project"
                      className="w-full h-full object-cover"
                      style={{ aspectRatio: '3/2' }}
                    />
                  </div>
                ) : (
                  <div 
                    className="bg-gradient-to-br from-gray-100 to-gray-200 border-4 border-white shadow-lg"
                    style={{ aspectRatio: '3/2' }}
                  />
                )}
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Prepared by {companyName}
                </p>
              </div>

              {/* Project name and address */}
              {settings.show_project_info ? (
                <div className="text-center mb-auto">
                  <h1 className="text-5xl font-serif font-bold text-gray-900 mb-4 tracking-tight">
                    {project?.project_name || proposal.title}
                  </h1>
                  {settings.show_address && project?.address && (
                    <p className="text-xl text-gray-600 font-light">
                      {project.address}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center mb-auto">
                  <h1 className="text-5xl font-serif font-bold text-gray-900 mb-4 tracking-tight">
                    Project Proposal
                  </h1>
                </div>
              )}

              {/* Tagline at bottom */}
              <div className="mt-auto pt-12">
                <p className="text-xs tracking-widest uppercase text-gray-500 text-center font-medium letter-spacing-wide">
                  {tagline}
                </p>
              </div>
            </div>

            {/* ============================================
                PAGE 2: PROJECT OVERVIEW SNAPSHOT
                ============================================ */}
            <div
              className="min-h-[297mm] px-12 py-16"
              style={{ pageBreakAfter: 'always' }}
            >
              {/* Optional smaller image strip at top */}
              {coverImageUrl && (
                <div className="mb-12 h-32 w-full rounded overflow-hidden">
                  <img
                    src={coverImageUrl}
                    alt="Project"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Section title */}
              <h2 className="text-2xl font-semibold text-gray-900 text-center mb-12">
                Project Overview
              </h2>

              {/* Three stat cards */}
              <div className="grid grid-cols-3 gap-6 max-w-5xl mx-auto">
                {/* Scope card */}
                <div className="border border-gray-200 rounded-lg p-6 bg-white">
                  <div className="flex flex-col items-center text-center">
                    <Home className="h-8 w-8 text-gray-600 mb-3" />
                    <p className="text-xs uppercase tracking-wide text-gray-500 font-medium mb-2">
                      Scope
                    </p>
                    <p className="text-base font-semibold text-gray-900">
                      {scope}
                    </p>
                  </div>
                </div>

                {/* Timeline card */}
                <div className="border border-gray-200 rounded-lg p-6 bg-white">
                  <div className="flex flex-col items-center text-center">
                    <Clock className="h-8 w-8 text-gray-600 mb-3" />
                    <p className="text-xs uppercase tracking-wide text-gray-500 font-medium mb-2">
                      Timeline
                    </p>
                    <p className="text-base font-semibold text-gray-900">
                      {timelineWeeks 
                        ? `${timelineWeeks} Weeks (Est.)`
                        : 'To be determined'}
                    </p>
                  </div>
                </div>

                {/* Leadership card */}
                {settings.show_project_info && (
                  <div className="border border-gray-200 rounded-lg p-6 bg-white">
                    <div className="flex flex-col items-center text-center">
                      <User className="h-8 w-8 text-gray-600 mb-3" />
                      <p className="text-xs uppercase tracking-wide text-gray-500 font-medium mb-2">
                        Leadership
                      </p>
                      <p className="text-base font-semibold text-gray-900">
                        {projectManager}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ============================================
                PAGE 3: NARRATIVE + INVESTMENT SUMMARY
                ============================================ */}
            <div
              className="min-h-[297mm] px-12 py-16"
              style={{ pageBreakAfter: 'always' }}
            >
              {/* Left side: Narrative */}
              <div className="mb-12">
                <p className="text-sm uppercase tracking-wide text-gray-500 font-medium mb-4">
                  Project Overview
                </p>
                <h2 className="text-4xl font-serif font-bold text-gray-900 mb-6">
                  {introHeading}
                </h2>
                {proposal.intro_text && settings.show_scope_summary && (
                  <div className="text-gray-700 text-base leading-relaxed max-w-3xl">
                    <div className="whitespace-pre-wrap mb-6">
                      {proposal.intro_text}
                    </div>
                    {projectManager && (
                      <p className="text-sm text-gray-600 italic">
                        — {projectManager}, {companyName}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Investment Summary Block */}
              <div className="mt-16 flex items-end gap-8">
                {/* Left: Breakdown chips */}
                <div className="flex-1">
                  <p className="text-sm uppercase tracking-wide text-gray-700 font-semibold mb-4">
                    ESTIMATED TOTAL INVESTMENT
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {categoryTotals.labor > 0 && (
                      <div className="bg-gray-100 px-4 py-2 rounded border border-gray-200">
                        <span className="text-xs font-medium text-gray-700">LABOR </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {fmtMoney(categoryTotals.labor)}
                        </span>
                      </div>
                    )}
                    {categoryTotals.materials > 0 && (
                      <div className="bg-gray-100 px-4 py-2 rounded border border-gray-200">
                        <span className="text-xs font-medium text-gray-700">MATERIALS </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {fmtMoney(categoryTotals.materials)}
                        </span>
                      </div>
                    )}
                    {categoryTotals.subs > 0 && (
                      <div className="bg-gray-100 px-4 py-2 rounded border border-gray-200">
                        <span className="text-xs font-medium text-gray-700">SUBCONTRACTOR </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {fmtMoney(categoryTotals.subs)}
                        </span>
                      </div>
                    )}
                    {categoryTotals.allowances > 0 && (
                      <div className="bg-gray-100 px-4 py-2 rounded border border-gray-200">
                        <span className="text-xs font-medium text-gray-700">ALLOWANCES </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {fmtMoney(categoryTotals.allowances)}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-4">
                    Detailed line-by-line breakdown is available in the next section.
                  </p>
                </div>

                {/* Right: Big total box */}
                <div className="border-l-4 border-gray-900 pl-6 pb-2">
                  <p className="text-xs uppercase tracking-wide text-gray-600 font-medium mb-2">
                    ESTIMATED TOTAL INVESTMENT
                  </p>
                  <p className="text-5xl font-bold text-gray-900">
                    {fmtMoney(proposal.total_amount)}
                  </p>
                </div>
              </div>
            </div>

            {/* ============================================
                PAGE 4: FINANCIAL BREAKDOWN TABLE
                ============================================ */}
            <div className="min-h-[297mm] px-12 py-16">
              <h2 className="text-2xl font-semibold text-gray-900 mb-8">
                Financial Transparency: Detailed Breakdown
              </h2>

              {settings.show_line_items ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-800 text-white">
                        <th className="px-4 py-3 text-left font-semibold">
                          COST CODE
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          DESCRIPTION
                        </th>
                        {settings.show_line_item_totals && (
                          <>
                            <th className="px-4 py-3 text-right font-semibold">
                              QTY
                            </th>
                            <th className="px-4 py-3 text-right font-semibold">
                              UNIT
                            </th>
                            <th className="px-4 py-3 text-right font-semibold">
                              UNIT PRICE
                            </th>
                            <th className="px-4 py-3 text-right font-semibold">
                              LINE TOTAL
                            </th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {settings.group_line_items_by_area
                        ? proposal.scopeByArea.map((area) => (
                            <>
                              {/* Area header row */}
                              <tr key={`area-${area.area_label}`} className="bg-gray-100">
                                <td colSpan={settings.show_line_item_totals ? 6 : 2} className="px-4 py-3 font-bold text-gray-900">
                                  {area.area_label}
                                </td>
                              </tr>
                              {/* Area items */}
                              {area.items.map((item, idx) => (
                                <tr
                                  key={item.id}
                                  className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                                >
                                  <td className="px-4 py-3 border-t border-gray-200 text-gray-600">
                                    {item.cost_code?.code || '—'}
                                  </td>
                                  <td className="px-4 py-3 border-t border-gray-200 text-gray-900">
                                    {item.description}
                                  </td>
                                  {settings.show_line_item_totals && (
                                    <>
                                      <td className="px-4 py-3 border-t border-gray-200 text-right text-gray-600">
                                        {item.quantity || '—'}
                                      </td>
                                      <td className="px-4 py-3 border-t border-gray-200 text-right text-gray-600">
                                        {item.unit || '—'}
                                      </td>
                                      <td className="px-4 py-3 border-t border-gray-200 text-right text-gray-600">
                                        {item.unit_price
                                          ? fmtMoney(item.unit_price)
                                          : '—'}
                                      </td>
                                      <td className="px-4 py-3 border-t border-gray-200 text-right font-semibold text-gray-900">
                                        {fmtMoney(item.line_total)}
                                      </td>
                                    </>
                                  )}
                                </tr>
                              ))}
                            </>
                          ))
                        : proposal.allItems.map((item, idx) => (
                            <tr
                              key={item.id}
                              className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                            >
                              <td className="px-4 py-3 border-t border-gray-200 text-gray-600">
                                {item.cost_code?.code || '—'}
                              </td>
                              <td className="px-4 py-3 border-t border-gray-200 text-gray-900">
                                {item.description}
                              </td>
                              {settings.show_line_item_totals && (
                                <>
                                  <td className="px-4 py-3 border-t border-gray-200 text-right text-gray-600">
                                    {item.quantity || '—'}
                                  </td>
                                  <td className="px-4 py-3 border-t border-gray-200 text-right text-gray-600">
                                    {item.unit || '—'}
                                  </td>
                                  <td className="px-4 py-3 border-t border-gray-200 text-right text-gray-600">
                                    {item.unit_price
                                      ? fmtMoney(item.unit_price)
                                      : '—'}
                                  </td>
                                  <td className="px-4 py-3 border-t border-gray-200 text-right font-semibold text-gray-900">
                                    {fmtMoney(item.line_total)}
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Line items are hidden per display settings.
                </div>
              )}

              {/* Footer with total */}
              <div className="mt-12 pt-6 border-t-2 border-gray-300">
                <div className="flex justify-end">
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900 mb-1">
                      TOTAL ESTIMATE:
                    </p>
                    <p className="text-3xl font-bold text-gray-900">
                      {fmtMoney(proposal.total_amount)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ============================================
                ADDITIONAL PAGES: Allowances, Exclusions, Payment Schedule, Terms, Signature
                ============================================ */}

            {/* Allowances & Exclusions */}
            {(settings.show_allowances && settings.allowances_text) ||
            (settings.show_exclusions && settings.exclusions_text) ? (
              <div
                className="min-h-[297mm] px-12 py-16"
                style={{ pageBreakAfter: 'always' }}
              >
                <h2 className="text-2xl font-semibold text-gray-900 mb-8">
                  Allowances & Exclusions
                </h2>

                {settings.show_allowances && settings.allowances_text && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Allowances
                    </h3>
                    <div className="text-gray-700 whitespace-pre-wrap text-base leading-relaxed bg-blue-50 p-6 rounded-lg border border-blue-100">
                      {settings.allowances_text}
                    </div>
                  </div>
                )}

                {settings.show_exclusions && settings.exclusions_text && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Exclusions & Clarifications
                    </h3>
                    <div className="text-gray-700 whitespace-pre-wrap text-base leading-relaxed bg-amber-50 p-6 rounded-lg border border-amber-100">
                      {settings.exclusions_text}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Payment Schedule */}
            {settings.show_payment_schedule &&
            settings.payment_schedule &&
            settings.payment_schedule.length > 0 ? (
              <div
                className="min-h-[297mm] px-12 py-16"
                style={{ pageBreakAfter: 'always' }}
              >
                <h2 className="text-2xl font-semibold text-gray-900 mb-8">
                  Payment Schedule
                </h2>
                <table className="w-full border-collapse text-base">
                  <thead>
                    <tr className="bg-gray-50 border-b-2 border-gray-300">
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        Milestone
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">
                        %
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
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
                          <td className="px-4 py-3 border-b border-gray-200 text-gray-800">
                            {row.label}
                          </td>
                          <td className="px-4 py-3 border-b border-gray-200 text-right font-mono text-gray-700">
                            {pct ? `${pct}%` : ''}
                          </td>
                          <td className="px-4 py-3 border-b border-gray-200 text-right font-mono font-medium text-gray-900">
                            {fmtMoney(amount)}
                          </td>
                          <td className="px-4 py-3 border-b border-gray-200 text-gray-700">
                            {row.due_on}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}

            {/* Terms */}
            {settings.show_terms && settings.terms_text && (
              <div
                className="min-h-[297mm] px-12 py-16"
                style={{ pageBreakAfter: 'always' }}
              >
                <h2 className="text-2xl font-semibold text-gray-900 mb-8">
                  Terms & Conditions
                </h2>
                <div className="text-gray-700 whitespace-pre-wrap text-base leading-relaxed">
                  {settings.terms_text}
                </div>
              </div>
            )}

            {/* Signature Block */}
            {settings.show_signature_block && (
              <div className="min-h-[297mm] px-12 py-16">
                <h2 className="text-2xl font-semibold text-gray-900 mb-8">
                  Acceptance & Authorization
                </h2>
                <p className="text-base text-gray-700 mb-12 leading-relaxed">
                  By signing below, the Client authorizes {companyName} to
                  proceed with the work described in this proposal and agrees
                  to the investment, payment schedule, allowances, exclusions,
                  and terms outlined above.
                </p>

                <div className="grid grid-cols-2 gap-16 mb-12">
                  <div>
                    <p className="font-semibold text-gray-900 mb-8 text-lg">
                      Client
                    </p>
                    <div className="border-b-2 border-gray-400 h-16 mb-4" />
                    <div className="flex justify-between text-sm text-gray-600 mb-8">
                      <span>Authorized Signature</span>
                      <span>Date</span>
                    </div>
                    <div className="border-b border-gray-300 h-10 mb-2" />
                    <p className="text-sm text-gray-600">Printed Name</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-8 text-lg">
                      Contractor
                    </p>
                    <div className="border-b-2 border-gray-400 h-16 mb-4" />
                    <div className="flex justify-between text-sm text-gray-600 mb-8">
                      <span>Authorized Signature</span>
                      <span>Date</span>
                    </div>
                    <div className="border-b border-gray-300 h-10 mb-2" />
                    <p className="text-sm text-gray-600">Printed Name / Title</p>
                  </div>
                </div>

                <div className="text-sm text-gray-600">
                  <p className="font-semibold mb-2">Next Steps</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Review the scope of work and terms.</li>
                    <li>Sign and date this proposal.</li>
                    <li>
                      Coordinate with our team to schedule start date and
                      initial payment as outlined above.
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
