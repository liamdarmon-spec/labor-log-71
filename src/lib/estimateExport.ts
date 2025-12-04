// Estimate Export Utilities - CSV and PDF generation
// Forma Homes Client Estimate (Pre-Proposal) Format

import { jsPDF } from "jspdf";

export type BudgetCategory = "labor" | "subs" | "materials" | "other";

export interface ExportItem {
  id: string;
  area_label: string | null;
  group_label: string | null;
  category: BudgetCategory;
  cost_code_id: string | null;
  cost_code_name?: string;
  cost_code_code?: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  markup_percent: number;
  line_total: number;
  is_allowance?: boolean;
}

export interface ExportBlock {
  block: {
    id: string;
    title: string;
    description?: string | null;
  };
  items: ExportItem[];
}

export interface EstimateExportData {
  estimateId: string;
  title: string;
  projectName?: string;
  status: string;
  blocks: ExportBlock[];
  costCodes?: Map<string, { code: string; name: string }>;
}

const CATEGORY_LABELS: Record<BudgetCategory, string> = {
  labor: "Labor",
  subs: "Subcontractors",
  materials: "Materials",
  other: "Other",
};

// RGB colors for categories
const CATEGORY_COLORS: Record<BudgetCategory, { r: number; g: number; b: number }> = {
  labor: { r: 59, g: 130, b: 246 },
  subs: { r: 245, g: 158, b: 11 },
  materials: { r: 16, g: 185, b: 129 },
  other: { r: 107, g: 114, b: 128 },
};

function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return "$0.00";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function escapeCSV(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ============ CSV Export ============

export function generateEstimateCSV(data: EstimateExportData): string {
  const headers = [
    "Section",
    "Area",
    "Group",
    "Category",
    "Cost Code",
    "Cost Code Name",
    "Description",
    "Quantity",
    "Unit",
    "Rate",
    "Markup %",
    "Line Total",
  ];

  const rows: string[][] = [headers];

  for (const block of data.blocks) {
    for (const item of block.items) {
      const costCode = data.costCodes?.get(item.cost_code_id || "");
      rows.push([
        escapeCSV(block.block.title),
        escapeCSV(item.area_label),
        escapeCSV(item.group_label),
        escapeCSV(CATEGORY_LABELS[item.category] || item.category),
        escapeCSV(costCode?.code || item.cost_code_code || ""),
        escapeCSV(costCode?.name || item.cost_code_name || ""),
        escapeCSV(item.description),
        String(item.quantity || 0),
        escapeCSV(item.unit),
        String(item.unit_price || 0),
        String(item.markup_percent || 0),
        String(item.line_total || 0),
      ]);
    }
  }

  return rows.map((row) => row.join(",")).join("\n");
}

export function downloadCSV(data: EstimateExportData): void {
  const csv = generateEstimateCSV(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `estimate-${data.estimateId}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============ PDF Export ============

interface PDFTotals {
  labor: number;
  subs: number;
  materials: number;
  other: number;
  total: number;
}

// Extended data interface for proposal-style PDF
export interface EstimateExportDataExtended extends EstimateExportData {
  clientName?: string;
  projectAddress?: string;
  projectDescription?: string;
  projectManager?: string;
  scopeSummary?: string;
  inclusions?: string[];
  exclusions?: string[];
  projectNotes?: string;
  companyName?: string;
  companyLicense?: string;
  companyEmail?: string;
  companyPhone?: string;
}

function computeTotals(items: ExportItem[]): PDFTotals {
  const totals: PDFTotals = { labor: 0, subs: 0, materials: 0, other: 0, total: 0 };
  for (const item of items) {
    const lineTotal = item.line_total || (item.quantity || 0) * (item.unit_price || 0) * (1 + (item.markup_percent || 0) / 100);
    totals[item.category] += lineTotal;
    totals.total += lineTotal;
  }
  return totals;
}

// Design constants
const PDF_DESIGN = {
  pageMargin: 20,
  sectionSpacing: 12,
  rowHeight: 6,
  colors: {
    text: { r: 17, g: 24, b: 39 },
    textMuted: { r: 107, g: 114, b: 128 },
    textLight: { r: 156, g: 163, b: 175 },
    border: { r: 229, g: 231, b: 235 },
    cardBg: { r: 249, g: 250, b: 251 },
    white: { r: 255, g: 255, b: 255 },
    accent: { r: 59, g: 130, b: 246 },
  },
  fonts: {
    title: 20,
    header: 14,
    subtitle: 11,
    body: 9,
    small: 8,
    tiny: 7,
  },
};

function drawRoundedRectPDF(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: boolean = true,
  stroke: boolean = false
) {
  const r = Math.min(radius, height / 2, width / 2);
  doc.roundedRect(x, y, width, height, r, r, fill ? (stroke ? "FD" : "F") : "S");
}

// Group items by area and then by group
interface GroupedItems {
  areaLabel: string;
  areaTotal: number;
  groups: {
    groupLabel: string;
    groupTotal: number;
    items: ExportItem[];
  }[];
}

function groupItemsByAreaAndGroup(items: ExportItem[]): GroupedItems[] {
  const areaMap = new Map<string, Map<string, ExportItem[]>>();
  
  for (const item of items) {
    const area = item.area_label || "General";
    const group = item.group_label || "General Tasks";
    
    if (!areaMap.has(area)) {
      areaMap.set(area, new Map());
    }
    const groupMap = areaMap.get(area)!;
    if (!groupMap.has(group)) {
      groupMap.set(group, []);
    }
    groupMap.get(group)!.push(item);
  }
  
  const result: GroupedItems[] = [];
  
  for (const [areaLabel, groupMap] of areaMap) {
    const groups: GroupedItems["groups"] = [];
    let areaTotal = 0;
    
    for (const [groupLabel, groupItems] of groupMap) {
      const groupTotal = groupItems.reduce((sum, item) => {
        const lineTotal = item.line_total || (item.quantity || 0) * (item.unit_price || 0) * (1 + (item.markup_percent || 0) / 100);
        return sum + lineTotal;
      }, 0);
      areaTotal += groupTotal;
      
      groups.push({
        groupLabel,
        groupTotal,
        items: groupItems,
      });
    }
    
    result.push({
      areaLabel,
      areaTotal,
      groups,
    });
  }
  
  return result;
}

export function generateEstimatePDF(data: EstimateExportData | EstimateExportDataExtended): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
  });

  const extData = data as EstimateExportDataExtended;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = PDF_DESIGN.pageMargin;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const checkPageBreak = (neededHeight: number): boolean => {
    if (y + neededHeight > pageHeight - margin - 15) {
      doc.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  const allItems = data.blocks.flatMap((b) => b.items);
  const grandTotals = computeTotals(allItems);
  const allowanceItems = allItems.filter(item => item.is_allowance);
  
  const companyName = extData.companyName || "FORMA HOMES";
  const companyLicense = extData.companyLicense || "#######";
  const companyEmail = extData.companyEmail || "hello@formahomes.com";
  const companyPhone = extData.companyPhone || "(###) ###-####";

  // ======== HEADER - COMPANY INFO ========
  
  doc.setFontSize(PDF_DESIGN.fonts.title);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(PDF_DESIGN.colors.text.r, PDF_DESIGN.colors.text.g, PDF_DESIGN.colors.text.b);
  doc.text(companyName, margin, y + 6);
  
  doc.setFontSize(PDF_DESIGN.fonts.small);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(PDF_DESIGN.colors.textMuted.r, PDF_DESIGN.colors.textMuted.g, PDF_DESIGN.colors.textMuted.b);
  doc.text("Licensed, Bonded & Insured", margin, y + 12);
  doc.text(`Contractor License: ${companyLicense}`, margin, y + 16);
  doc.text(`${companyEmail} | ${companyPhone}`, margin, y + 20);
  
  y += 28;
  
  // Divider
  doc.setDrawColor(PDF_DESIGN.colors.border.r, PDF_DESIGN.colors.border.g, PDF_DESIGN.colors.border.b);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ======== PROJECT ESTIMATE (PRE-PROPOSAL) HEADER ========
  
  doc.setFontSize(PDF_DESIGN.fonts.header);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(PDF_DESIGN.colors.text.r, PDF_DESIGN.colors.text.g, PDF_DESIGN.colors.text.b);
  doc.text("PROJECT ESTIMATE (PRE-PROPOSAL)", margin, y);
  y += 6;
  
  doc.setFontSize(PDF_DESIGN.fonts.body);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(PDF_DESIGN.colors.textMuted.r, PDF_DESIGN.colors.textMuted.g, PDF_DESIGN.colors.textMuted.b);
  doc.text("This is not a contract.", margin, y);
  y += 4;
  
  doc.setFont("helvetica", "normal");
  const disclaimerText = "This document outlines the anticipated project scope and estimated pricing. A formal Home Improvement Contract will follow upon approval.";
  const disclaimerLines = doc.splitTextToSize(disclaimerText, contentWidth);
  doc.text(disclaimerLines, margin, y);
  y += disclaimerLines.length * 3.5 + 8;
  
  // Divider
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ======== PROJECT INFORMATION ========
  
  doc.setFontSize(PDF_DESIGN.fonts.subtitle);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(PDF_DESIGN.colors.text.r, PDF_DESIGN.colors.text.g, PDF_DESIGN.colors.text.b);
  doc.text("PROJECT INFORMATION", margin, y);
  y += 6;
  
  doc.setFontSize(PDF_DESIGN.fonts.body);
  doc.setFont("helvetica", "normal");
  
  const projectInfo = [
    { label: "Client", value: extData.clientName || "—" },
    { label: "Property Address", value: extData.projectAddress || "—" },
    { label: "Estimate Date", value: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) },
    { label: "Project Name", value: data.projectName || data.title || "—" },
    { label: "Prepared By", value: companyName },
  ];
  
  for (const info of projectInfo) {
    doc.setTextColor(PDF_DESIGN.colors.textMuted.r, PDF_DESIGN.colors.textMuted.g, PDF_DESIGN.colors.textMuted.b);
    doc.setFont("helvetica", "bold");
    doc.text(`${info.label}:`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(PDF_DESIGN.colors.text.r, PDF_DESIGN.colors.text.g, PDF_DESIGN.colors.text.b);
    doc.text(info.value, margin + 35, y);
    y += 5;
  }
  
  y += 8;
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // ======== EXECUTIVE SUMMARY ========
  
  doc.setFontSize(PDF_DESIGN.fonts.header);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(PDF_DESIGN.colors.text.r, PDF_DESIGN.colors.text.g, PDF_DESIGN.colors.text.b);
  doc.text("EXECUTIVE SUMMARY", margin, y);
  y += 7;
  
  doc.setFontSize(PDF_DESIGN.fonts.body);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(PDF_DESIGN.colors.textMuted.r, PDF_DESIGN.colors.textMuted.g, PDF_DESIGN.colors.textMuted.b);
  
  const summaryText1 = `Thank you for considering ${companyName} for your upcoming project. Below is a detailed pre-proposal estimate based on the current project scope and selections. This document is intended to verify scope and general pricing before contract execution.`;
  const summaryLines1 = doc.splitTextToSize(summaryText1, contentWidth);
  doc.text(summaryLines1, margin, y);
  y += summaryLines1.length * 3.5 + 4;
  
  const summaryText2 = "Once approved, we will prepare a formal contract with defined payment schedule, terms, permitting requirements, schedule constraints, and final material selections.";
  const summaryLines2 = doc.splitTextToSize(summaryText2, contentWidth);
  doc.text(summaryLines2, margin, y);
  y += summaryLines2.length * 3.5 + 10;
  
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // ======== ESTIMATE SUMMARY TABLE ========
  
  doc.setFontSize(PDF_DESIGN.fonts.header);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(PDF_DESIGN.colors.text.r, PDF_DESIGN.colors.text.g, PDF_DESIGN.colors.text.b);
  doc.text("ESTIMATE SUMMARY", margin, y);
  y += 8;
  
  // Summary table
  const categories: { key: BudgetCategory; label: string }[] = [
    { key: "labor", label: "Labor (Estimated)" },
    { key: "subs", label: "Subcontractors" },
    { key: "materials", label: "Materials" },
    { key: "other", label: "Other" },
  ];
  
  // Table header
  doc.setFillColor(PDF_DESIGN.colors.cardBg.r, PDF_DESIGN.colors.cardBg.g, PDF_DESIGN.colors.cardBg.b);
  doc.rect(margin, y, contentWidth, 7, "F");
  
  doc.setFontSize(PDF_DESIGN.fonts.small);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(PDF_DESIGN.colors.textMuted.r, PDF_DESIGN.colors.textMuted.g, PDF_DESIGN.colors.textMuted.b);
  doc.text("Category", margin + 4, y + 5);
  doc.text("Amount", pageWidth - margin - 4, y + 5, { align: "right" });
  y += 9;
  
  // Category rows
  doc.setFontSize(PDF_DESIGN.fonts.body);
  for (const cat of categories) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(PDF_DESIGN.colors.text.r, PDF_DESIGN.colors.text.g, PDF_DESIGN.colors.text.b);
    doc.text(cat.label, margin + 4, y + 4);
    
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(grandTotals[cat.key]), pageWidth - margin - 4, y + 4, { align: "right" });
    
    y += 7;
    
    // Light divider
    doc.setDrawColor(240, 240, 240);
    doc.line(margin, y, pageWidth - margin, y);
  }
  
  // Grand total row
  y += 2;
  doc.setFillColor(PDF_DESIGN.colors.text.r, PDF_DESIGN.colors.text.g, PDF_DESIGN.colors.text.b);
  doc.rect(margin, y, contentWidth, 10, "F");
  
  doc.setFontSize(PDF_DESIGN.fonts.body);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Estimated Project Total", margin + 4, y + 7);
  doc.setFontSize(PDF_DESIGN.fonts.subtitle);
  doc.text(formatCurrency(grandTotals.total), pageWidth - margin - 4, y + 7, { align: "right" });
  
  y += 18;
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // ======== DETAILED SCOPE OF WORK ========
  
  checkPageBreak(30);
  
  doc.setFontSize(PDF_DESIGN.fonts.header);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(PDF_DESIGN.colors.text.r, PDF_DESIGN.colors.text.g, PDF_DESIGN.colors.text.b);
  doc.text("DETAILED SCOPE OF WORK", margin, y);
  y += 6;
  
  // Hybrid view notice
  doc.setFontSize(PDF_DESIGN.fonts.small);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(PDF_DESIGN.colors.textMuted.r, PDF_DESIGN.colors.textMuted.g, PDF_DESIGN.colors.textMuted.b);
  doc.text("Hybrid View: Line items are shown with descriptions and totals only.", margin, y);
  doc.text("Unit pricing, internal labor rates, and markup breakdowns are hidden.", margin, y + 4);
  y += 12;
  
  // Process each section (block)
  for (const block of data.blocks) {
    checkPageBreak(25);
    
    const sectionTotals = computeTotals(block.items);
    const groupedItems = groupItemsByAreaAndGroup(block.items);
    
    // Section header
    doc.setFillColor(PDF_DESIGN.colors.cardBg.r, PDF_DESIGN.colors.cardBg.g, PDF_DESIGN.colors.cardBg.b);
    drawRoundedRectPDF(doc, margin, y, contentWidth, 10, 3);
    
    doc.setFontSize(PDF_DESIGN.fonts.subtitle);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(PDF_DESIGN.colors.text.r, PDF_DESIGN.colors.text.g, PDF_DESIGN.colors.text.b);
    doc.text(block.block.title || "Cost Items", margin + 4, y + 7);
    
    doc.text(`Section Total: ${formatCurrency(sectionTotals.total)}`, pageWidth - margin - 4, y + 7, { align: "right" });
    y += 14;
    
    if (block.items.length === 0) {
      doc.setFontSize(PDF_DESIGN.fonts.body);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(PDF_DESIGN.colors.textLight.r, PDF_DESIGN.colors.textLight.g, PDF_DESIGN.colors.textLight.b);
      doc.text("No cost items added yet.", margin + 4, y);
      y += 8;
    } else {
      // Process areas and groups
      for (const area of groupedItems) {
        checkPageBreak(18);
        
        // Area header
        doc.setFontSize(PDF_DESIGN.fonts.body);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(PDF_DESIGN.colors.accent.r, PDF_DESIGN.colors.accent.g, PDF_DESIGN.colors.accent.b);
        doc.text(`▸ ${area.areaLabel}`, margin + 2, y);
        
        doc.setTextColor(PDF_DESIGN.colors.textMuted.r, PDF_DESIGN.colors.textMuted.g, PDF_DESIGN.colors.textMuted.b);
        doc.setFont("helvetica", "normal");
        doc.text(`Area Total: ${formatCurrency(area.areaTotal)}`, pageWidth - margin - 4, y, { align: "right" });
        y += 6;
        
        for (const group of area.groups) {
          checkPageBreak(15);
          
          // Group header
          doc.setFontSize(PDF_DESIGN.fonts.small);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(PDF_DESIGN.colors.text.r, PDF_DESIGN.colors.text.g, PDF_DESIGN.colors.text.b);
          doc.text(`• ${group.groupLabel}`, margin + 6, y);
          
          doc.setFont("helvetica", "normal");
          doc.setTextColor(PDF_DESIGN.colors.textMuted.r, PDF_DESIGN.colors.textMuted.g, PDF_DESIGN.colors.textMuted.b);
          doc.text(`Group Total: ${formatCurrency(group.groupTotal)}`, pageWidth - margin - 4, y, { align: "right" });
          y += 5;
          
          // Table header for items
          doc.setFillColor(250, 250, 252);
          doc.rect(margin + 8, y, contentWidth - 8, 5, "F");
          
          doc.setFontSize(PDF_DESIGN.fonts.tiny);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(PDF_DESIGN.colors.textMuted.r, PDF_DESIGN.colors.textMuted.g, PDF_DESIGN.colors.textMuted.b);
          doc.text("Description", margin + 10, y + 3.5);
          doc.text("Total", pageWidth - margin - 4, y + 3.5, { align: "right" });
          y += 6;
          
          // Items (description + total only)
          for (const item of group.items) {
            checkPageBreak(6);
            
            const lineTotal = item.line_total || (item.quantity || 0) * (item.unit_price || 0) * (1 + (item.markup_percent || 0) / 100);
            
            doc.setFontSize(PDF_DESIGN.fonts.small);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(PDF_DESIGN.colors.text.r, PDF_DESIGN.colors.text.g, PDF_DESIGN.colors.text.b);
            
            // Truncate description if too long
            let desc = item.description || "No description";
            const maxDescWidth = contentWidth - 45;
            while (doc.getTextWidth(desc) > maxDescWidth && desc.length > 10) {
              desc = desc.substring(0, desc.length - 4) + "...";
            }
            
            doc.text(desc, margin + 10, y + 3);
            
            doc.setFont("helvetica", "bold");
            doc.text(formatCurrency(lineTotal), pageWidth - margin - 4, y + 3, { align: "right" });
            
            y += 5;
          }
          
          y += 3;
        }
        
        // Subtle divider between areas
        doc.setDrawColor(PDF_DESIGN.colors.border.r, PDF_DESIGN.colors.border.g, PDF_DESIGN.colors.border.b);
        doc.line(margin + 4, y, pageWidth - margin - 4, y);
        y += 5;
      }
    }
    
    y += PDF_DESIGN.sectionSpacing;
  }

  // ======== ALLOWANCES (IF APPLICABLE) ========
  
  if (allowanceItems.length > 0) {
    checkPageBreak(25);
    
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;
    
    doc.setFontSize(PDF_DESIGN.fonts.header);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(PDF_DESIGN.colors.text.r, PDF_DESIGN.colors.text.g, PDF_DESIGN.colors.text.b);
    doc.text("ALLOWANCES (IF APPLICABLE)", margin, y);
    y += 6;
    
    doc.setFontSize(PDF_DESIGN.fonts.small);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(PDF_DESIGN.colors.textMuted.r, PDF_DESIGN.colors.textMuted.g, PDF_DESIGN.colors.textMuted.b);
    doc.text("These amounts represent flexible allocations. Final pricing may vary depending on selections.", margin, y);
    y += 8;
    
    // Table header
    doc.setFillColor(PDF_DESIGN.colors.cardBg.r, PDF_DESIGN.colors.cardBg.g, PDF_DESIGN.colors.cardBg.b);
    doc.rect(margin, y, contentWidth, 6, "F");
    
    doc.setFontSize(PDF_DESIGN.fonts.tiny);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(PDF_DESIGN.colors.textMuted.r, PDF_DESIGN.colors.textMuted.g, PDF_DESIGN.colors.textMuted.b);
    doc.text("Allowance Item", margin + 4, y + 4);
    doc.text("Amount", pageWidth - margin - 4, y + 4, { align: "right" });
    y += 8;
    
    for (const item of allowanceItems) {
      checkPageBreak(6);
      const lineTotal = item.line_total || (item.quantity || 0) * (item.unit_price || 0) * (1 + (item.markup_percent || 0) / 100);
      
      doc.setFontSize(PDF_DESIGN.fonts.body);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(PDF_DESIGN.colors.text.r, PDF_DESIGN.colors.text.g, PDF_DESIGN.colors.text.b);
      doc.text(item.description || "Allowance", margin + 4, y + 3);
      doc.text(formatCurrency(lineTotal), pageWidth - margin - 4, y + 3, { align: "right" });
      y += 6;
    }
    
    y += 8;
  }

  // ======== WHAT'S INCLUDED ========
  
  checkPageBreak(30);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;
  
  doc.setFontSize(PDF_DESIGN.fonts.header);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(PDF_DESIGN.colors.text.r, PDF_DESIGN.colors.text.g, PDF_DESIGN.colors.text.b);
  doc.text("WHAT'S INCLUDED", margin, y);
  y += 8;
  
  const defaultInclusions = extData.inclusions || [
    "Labor, materials, and subcontractors as outlined above",
    "Site protection, dust barriers, and cleanup",
    "Project management and scheduling",
    "Communication via project portal",
    "Standard disposal of construction debris",
  ];
  
  doc.setFontSize(PDF_DESIGN.fonts.body);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(PDF_DESIGN.colors.text.r, PDF_DESIGN.colors.text.g, PDF_DESIGN.colors.text.b);
  
  for (const item of defaultInclusions) {
    checkPageBreak(5);
    doc.text(`✓ ${item}`, margin + 2, y);
    y += 5;
  }
  
  y += 8;

  // ======== EXCLUSIONS & ASSUMPTIONS ========
  
  checkPageBreak(30);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;
  
  doc.setFontSize(PDF_DESIGN.fonts.header);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(PDF_DESIGN.colors.text.r, PDF_DESIGN.colors.text.g, PDF_DESIGN.colors.text.b);
  doc.text("EXCLUSIONS & ASSUMPTIONS", margin, y);
  y += 8;
  
  const defaultExclusions = extData.exclusions || [
    "Engineering fees (unless listed)",
    "HOA fees / city special assessments",
    "Unseen conditions (rot, plumbing issues, electrical hazards, etc.)",
    "Material upgrades beyond allowances",
    "After-hours or weekend work",
    "Changes requested after contract signing",
  ];
  
  doc.setFontSize(PDF_DESIGN.fonts.body);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(PDF_DESIGN.colors.text.r, PDF_DESIGN.colors.text.g, PDF_DESIGN.colors.text.b);
  
  for (const item of defaultExclusions) {
    checkPageBreak(5);
    doc.text(`✗ ${item}`, margin + 2, y);
    y += 5;
  }
  
  y += 4;
  doc.setFont("helvetica", "italic");
  doc.setTextColor(PDF_DESIGN.colors.textMuted.r, PDF_DESIGN.colors.textMuted.g, PDF_DESIGN.colors.textMuted.b);
  doc.text("If anything listed is unclear, please ask — clarity avoids change orders later.", margin + 2, y);
  y += 10;

  // ======== PROJECT NOTES ========
  
  if (extData.projectNotes) {
    checkPageBreak(25);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;
    
    doc.setFontSize(PDF_DESIGN.fonts.header);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(PDF_DESIGN.colors.text.r, PDF_DESIGN.colors.text.g, PDF_DESIGN.colors.text.b);
    doc.text("PROJECT NOTES", margin, y);
    y += 8;
    
    doc.setFontSize(PDF_DESIGN.fonts.body);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(PDF_DESIGN.colors.textMuted.r, PDF_DESIGN.colors.textMuted.g, PDF_DESIGN.colors.textMuted.b);
    const notesLines = doc.splitTextToSize(extData.projectNotes, contentWidth);
    doc.text(notesLines, margin, y);
    y += notesLines.length * 4 + 8;
  }

  // ======== NEXT STEPS ========
  
  checkPageBreak(35);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;
  
  doc.setFontSize(PDF_DESIGN.fonts.header);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(PDF_DESIGN.colors.text.r, PDF_DESIGN.colors.text.g, PDF_DESIGN.colors.text.b);
  doc.text("NEXT STEPS", margin, y);
  y += 8;
  
  const nextSteps = [
    "Review the scope above",
    "Confirm general accuracy",
    "Approve the estimate to proceed",
    `${companyName} will generate your formal Home Improvement Contract`,
    "Upon contract signing and deposit, scheduling begins",
  ];
  
  doc.setFontSize(PDF_DESIGN.fonts.body);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(PDF_DESIGN.colors.text.r, PDF_DESIGN.colors.text.g, PDF_DESIGN.colors.text.b);
  
  for (let i = 0; i < nextSteps.length; i++) {
    checkPageBreak(5);
    doc.text(`${i + 1}. ${nextSteps[i]}`, margin + 2, y);
    y += 5;
  }
  
  y += 10;

  // ======== CLIENT APPROVAL (NON-BINDING) ========
  
  checkPageBreak(50);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;
  
  doc.setFontSize(PDF_DESIGN.fonts.header);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(PDF_DESIGN.colors.text.r, PDF_DESIGN.colors.text.g, PDF_DESIGN.colors.text.b);
  doc.text("CLIENT APPROVAL (NON-BINDING)", margin, y);
  y += 6;
  
  doc.setFontSize(PDF_DESIGN.fonts.body);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(PDF_DESIGN.colors.textMuted.r, PDF_DESIGN.colors.textMuted.g, PDF_DESIGN.colors.textMuted.b);
  doc.text("This pre-proposal is intended to confirm direction.", margin, y);
  y += 4;
  doc.text("A formal contract will follow in accordance with CSLB requirements.", margin, y);
  y += 12;
  
  // Signature lines
  doc.setTextColor(PDF_DESIGN.colors.text.r, PDF_DESIGN.colors.text.g, PDF_DESIGN.colors.text.b);
  doc.setFont("helvetica", "bold");
  
  doc.text("Client Name:", margin, y);
  doc.setDrawColor(PDF_DESIGN.colors.border.r, PDF_DESIGN.colors.border.g, PDF_DESIGN.colors.border.b);
  doc.line(margin + 30, y + 1, margin + 120, y + 1);
  y += 14;
  
  doc.text("Signature:", margin, y);
  doc.line(margin + 30, y + 1, margin + 120, y + 1);
  y += 14;
  
  doc.text("Date:", margin, y);
  doc.line(margin + 30, y + 1, margin + 80, y + 1);
  y += 16;

  // ======== FOOTER ========
  
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;
  
  doc.setFontSize(PDF_DESIGN.fonts.small);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(PDF_DESIGN.colors.accent.r, PDF_DESIGN.colors.accent.g, PDF_DESIGN.colors.accent.b);
  doc.text(`${companyName} — BUILT WITH CARE`, margin + contentWidth / 2, y, { align: "center" });
  y += 4;
  
  doc.setFont("helvetica", "italic");
  doc.setTextColor(PDF_DESIGN.colors.textMuted.r, PDF_DESIGN.colors.textMuted.g, PDF_DESIGN.colors.textMuted.b);
  doc.text("This estimate was generated by Forma's project management system.", margin + contentWidth / 2, y, { align: "center" });

  return doc;
}

export function downloadPDF(data: EstimateExportData | EstimateExportDataExtended): void {
  try {
    const doc = generateEstimatePDF(data);
    doc.save(`estimate-${data.estimateId}.pdf`);
  } catch (error) {
    console.error("PDF generation error:", error);
    throw new Error("Failed to generate PDF");
  }
}
