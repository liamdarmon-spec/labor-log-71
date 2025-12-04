// Estimate Export Utilities - CSV and PDF generation
// Apple-grade, Procore-quality design

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
  subs: "Subs",
  materials: "Materials",
  other: "Other",
};

const CATEGORY_SHORT: Record<BudgetCategory, string> = {
  labor: "L",
  subs: "S",
  materials: "M",
  other: "O",
};

// RGB colors for categories
const CATEGORY_COLORS: Record<BudgetCategory, { r: number; g: number; b: number }> = {
  labor: { r: 59, g: 130, b: 246 },    // Blue
  subs: { r: 245, g: 158, b: 11 },     // Amber/Yellow
  materials: { r: 16, g: 185, b: 129 }, // Emerald/Green
  other: { r: 107, g: 114, b: 128 },   // Gray
};

const CATEGORY_BG: Record<BudgetCategory, { r: number; g: number; b: number }> = {
  labor: { r: 239, g: 246, b: 255 },
  subs: { r: 255, g: 251, b: 235 },
  materials: { r: 236, g: 253, b: 245 },
  other: { r: 249, g: 250, b: 251 },
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

function formatCurrencyShort(value: number): string {
  if (!Number.isFinite(value)) return "$0";
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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
  inclusions?: string;
  exclusions?: string;
  timeline?: { phase: string; duration: string; notes?: string }[];
  paymentSchedule?: { milestone: string; description: string; amount: string }[];
  warrantyText?: string;
}

function computeTotals(items: ExportItem[]): PDFTotals {
  const totals: PDFTotals = { labor: 0, subs: 0, materials: 0, other: 0, total: 0 };
  for (const item of items) {
    const lineTotal = (item.quantity || 0) * (item.unit_price || 0) * (1 + (item.markup_percent || 0) / 100);
    totals[item.category] += lineTotal;
    totals.total += lineTotal;
  }
  return totals;
}

// Design constants - Apple-grade typography
const PDF_DESIGN = {
  pageMargin: 20,
  sectionSpacing: 16,
  rowHeight: 7,
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
    title: 24,
    header: 16,
    subtitle: 12,
    body: 10,
    small: 9,
    tiny: 8,
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

  // ======== 1. HEADER SECTION ========
  
  // Logo placeholder (top right) - simple text for now
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(PDF_DESIGN.colors.accent.r, PDF_DESIGN.colors.accent.g, PDF_DESIGN.colors.accent.b);
  doc.text("FORMA HOMES", pageWidth - margin, y + 4, { align: "right" });
  
  // Title
  doc.setFontSize(PDF_DESIGN.fonts.title);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(PDF_DESIGN.colors.text.r, PDF_DESIGN.colors.text.g, PDF_DESIGN.colors.text.b);
  doc.text(data.title || "Project Estimate", margin, y + 8);
  
  y += 14;
  
  // Subtitle info
  doc.setFontSize(PDF_DESIGN.fonts.body);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(PDF_DESIGN.colors.textMuted.r, PDF_DESIGN.colors.textMuted.g, PDF_DESIGN.colors.textMuted.b);
  
  const headerInfo: string[] = [];
  if (extData.clientName) headerInfo.push(`Client: ${extData.clientName}`);
  if (data.projectName) headerInfo.push(`Project: ${data.projectName}`);
  if (extData.projectAddress) headerInfo.push(`Address: ${extData.projectAddress}`);
  
  headerInfo.forEach((line, i) => {
    doc.text(line, margin, y + (i * 5));
  });
  
  y += Math.max(headerInfo.length * 5, 5) + 3;
  
  // Status and date row
  doc.setFontSize(PDF_DESIGN.fonts.small);
  const statusLine = `Status: ${data.status} • Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} • ID: ${data.estimateId.slice(0, 8)}`;
  doc.text(statusLine, margin, y);
  
  y += 12;
  
  // Divider
  doc.setDrawColor(PDF_DESIGN.colors.border.r, PDF_DESIGN.colors.border.g, PDF_DESIGN.colors.border.b);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  
  y += 10;

  // ======== 2. PROJECT OVERVIEW (if available) ========
  
  if (extData.projectDescription || extData.projectManager || extData.scopeSummary) {
    doc.setFontSize(PDF_DESIGN.fonts.subtitle);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(PDF_DESIGN.colors.text.r, PDF_DESIGN.colors.text.g, PDF_DESIGN.colors.text.b);
    doc.text("Project Overview", margin, y);
    y += 6;
    
    doc.setFontSize(PDF_DESIGN.fonts.body);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(PDF_DESIGN.colors.textMuted.r, PDF_DESIGN.colors.textMuted.g, PDF_DESIGN.colors.textMuted.b);
    
    if (extData.projectDescription) {
      const descLines = doc.splitTextToSize(extData.projectDescription, contentWidth);
      doc.text(descLines, margin, y);
      y += descLines.length * 4 + 3;
    }
    
    if (extData.projectManager) {
      doc.text(`Project Lead: ${extData.projectManager}`, margin, y);
      y += 5;
    }
    
    if (extData.scopeSummary) {
      const scopeLines = doc.splitTextToSize(`Scope: ${extData.scopeSummary}`, contentWidth);
      doc.text(scopeLines, margin, y);
      y += scopeLines.length * 4 + 3;
    }
    
    y += 8;
  }

  // ======== 3. TOTALS SUMMARY BAR ========
  
  const tileWidth = (contentWidth - 12) / 4;
  const tileHeight = 22;
  const categories: BudgetCategory[] = ["labor", "subs", "materials", "other"];
  
  categories.forEach((cat, i) => {
    const tx = margin + i * (tileWidth + 4);
    const color = CATEGORY_COLORS[cat];
    const bg = CATEGORY_BG[cat];
    const value = grandTotals[cat];
    
    // Tile background
    doc.setFillColor(bg.r, bg.g, bg.b);
    drawRoundedRectPDF(doc, tx, y, tileWidth, tileHeight, 4);
    
    // Category label
    doc.setFontSize(PDF_DESIGN.fonts.tiny);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(color.r, color.g, color.b);
    doc.text(CATEGORY_LABELS[cat].toUpperCase(), tx + tileWidth / 2, y + 7, { align: "center" });
    
    // Value
    doc.setFontSize(PDF_DESIGN.fonts.subtitle);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(PDF_DESIGN.colors.text.r, PDF_DESIGN.colors.text.g, PDF_DESIGN.colors.text.b);
    doc.text(formatCurrency(value), tx + tileWidth / 2, y + 15, { align: "center" });
  });
  
  y += tileHeight + 8;
  
  // Grand Total
  doc.setFillColor(PDF_DESIGN.colors.cardBg.r, PDF_DESIGN.colors.cardBg.g, PDF_DESIGN.colors.cardBg.b);
  drawRoundedRectPDF(doc, margin, y, contentWidth, 18, 4);
  
  doc.setFontSize(PDF_DESIGN.fonts.small);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(PDF_DESIGN.colors.textMuted.r, PDF_DESIGN.colors.textMuted.g, PDF_DESIGN.colors.textMuted.b);
  doc.text("GRAND TOTAL", margin + contentWidth / 2, y + 6, { align: "center" });
  
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(PDF_DESIGN.colors.text.r, PDF_DESIGN.colors.text.g, PDF_DESIGN.colors.text.b);
  doc.text(formatCurrency(grandTotals.total), margin + contentWidth / 2, y + 14, { align: "center" });
  
  y += 28;

  // ======== 4. SCOPE OF WORK SECTION ========
  
  if (data.blocks.length > 0) {
    checkPageBreak(20);
    
    doc.setFontSize(PDF_DESIGN.fonts.header);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(PDF_DESIGN.colors.text.r, PDF_DESIGN.colors.text.g, PDF_DESIGN.colors.text.b);
    doc.text("Scope of Work", margin, y);
    y += 8;
    
    doc.setFontSize(PDF_DESIGN.fonts.body);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(PDF_DESIGN.colors.textMuted.r, PDF_DESIGN.colors.textMuted.g, PDF_DESIGN.colors.textMuted.b);
    
    for (const block of data.blocks) {
      checkPageBreak(12);
      
      doc.setFont("helvetica", "bold");
      doc.setTextColor(PDF_DESIGN.colors.text.r, PDF_DESIGN.colors.text.g, PDF_DESIGN.colors.text.b);
      doc.text(`• ${block.block.title}`, margin + 2, y);
      y += 5;
      
      // List first few item descriptions
      const itemDescs = block.items
        .filter(item => item.description && item.description.trim())
        .slice(0, 5);
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(PDF_DESIGN.colors.textMuted.r, PDF_DESIGN.colors.textMuted.g, PDF_DESIGN.colors.textMuted.b);
      
      for (const item of itemDescs) {
        checkPageBreak(5);
        const shortDesc = item.description.length > 60 ? item.description.slice(0, 60) + "..." : item.description;
        doc.text(`   – ${shortDesc}`, margin + 4, y);
        y += 4;
      }
      
      if (block.items.length > 5) {
        doc.text(`   + ${block.items.length - 5} more items...`, margin + 4, y);
        y += 4;
      }
      
      y += 3;
    }
    
    y += 8;
  }

  // ======== 5. DETAILED COST SECTIONS ========
  
  for (const block of data.blocks) {
    checkPageBreak(30);
    
    const sectionTotals = computeTotals(block.items);
    
    // Section header card
    doc.setFillColor(PDF_DESIGN.colors.cardBg.r, PDF_DESIGN.colors.cardBg.g, PDF_DESIGN.colors.cardBg.b);
    drawRoundedRectPDF(doc, margin, y, contentWidth, 12, 4);
    
    doc.setFontSize(PDF_DESIGN.fonts.subtitle);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(PDF_DESIGN.colors.text.r, PDF_DESIGN.colors.text.g, PDF_DESIGN.colors.text.b);
    doc.text(block.block.title || "Cost Items", margin + 4, y + 8);
    
    // Section total right
    doc.setFontSize(PDF_DESIGN.fonts.body);
    doc.text(`Total: ${formatCurrency(sectionTotals.total)}`, pageWidth - margin - 4, y + 8, { align: "right" });
    
    y += 16;
    
    // Column headers
    const cols = {
      desc: margin + 2,
      qty: margin + 95,
      unit: margin + 115,
      rate: margin + 135,
      markup: margin + 155,
      total: pageWidth - margin - 2,
    };
    
    doc.setFillColor(245, 245, 247);
    doc.rect(margin, y, contentWidth, 6, "F");
    
    doc.setFontSize(PDF_DESIGN.fonts.tiny);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(PDF_DESIGN.colors.textMuted.r, PDF_DESIGN.colors.textMuted.g, PDF_DESIGN.colors.textMuted.b);
    
    doc.text("DESCRIPTION", cols.desc, y + 4);
    doc.text("QTY", cols.qty, y + 4, { align: "right" });
    doc.text("UNIT", cols.unit, y + 4, { align: "right" });
    doc.text("RATE", cols.rate, y + 4, { align: "right" });
    doc.text("M/U", cols.markup, y + 4, { align: "right" });
    doc.text("TOTAL", cols.total, y + 4, { align: "right" });
    
    y += 8;
    
    // Items
    if (block.items.length === 0) {
      doc.setFontSize(PDF_DESIGN.fonts.body);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(PDF_DESIGN.colors.textLight.r, PDF_DESIGN.colors.textLight.g, PDF_DESIGN.colors.textLight.b);
      doc.text("No cost items added yet.", margin + contentWidth / 2, y + 3, { align: "center" });
      y += 10;
    } else {
      let rowIdx = 0;
      for (const item of block.items) {
        checkPageBreak(PDF_DESIGN.rowHeight + 1);
        
        // Alternate row bg
        if (rowIdx % 2 === 1) {
          doc.setFillColor(252, 252, 253);
          doc.rect(margin, y, contentWidth, PDF_DESIGN.rowHeight, "F");
        }
        
        const rowY = y + PDF_DESIGN.rowHeight / 2 + 1.5;
        
        // Category tag
        const catColor = CATEGORY_COLORS[item.category];
        const catBg = CATEGORY_BG[item.category];
        doc.setFillColor(catBg.r, catBg.g, catBg.b);
        drawRoundedRectPDF(doc, cols.desc, rowY - 2.5, 6, 5, 1);
        doc.setFontSize(6);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(catColor.r, catColor.g, catColor.b);
        doc.text(CATEGORY_SHORT[item.category], cols.desc + 3, rowY + 0.5, { align: "center" });
        
        // Description
        doc.setFontSize(PDF_DESIGN.fonts.small);
        doc.setFont("helvetica", "normal");
        
        let desc = item.description || "";
        const costCode = data.costCodes?.get(item.cost_code_id || "");
        const codeStr = costCode?.code || item.cost_code_code || "";
        if (codeStr && !desc.startsWith(codeStr)) {
          desc = `${codeStr} – ${desc}`;
        }
        
        // Truncate
        const maxDescWidth = cols.qty - cols.desc - 12;
        while (doc.getTextWidth(desc) > maxDescWidth && desc.length > 10) {
          desc = desc.substring(0, desc.length - 4) + "...";
        }
        
        if (!item.cost_code_id || item.cost_code_id === "UNASSIGNED") {
          doc.setTextColor(PDF_DESIGN.colors.textLight.r, PDF_DESIGN.colors.textLight.g, PDF_DESIGN.colors.textLight.b);
          doc.setFont("helvetica", "italic");
        } else {
          doc.setTextColor(PDF_DESIGN.colors.text.r, PDF_DESIGN.colors.text.g, PDF_DESIGN.colors.text.b);
        }
        doc.text(desc || "No description", cols.desc + 8, rowY);
        
        doc.setFont("helvetica", "normal");
        doc.setTextColor(PDF_DESIGN.colors.text.r, PDF_DESIGN.colors.text.g, PDF_DESIGN.colors.text.b);
        
        // Qty, Unit, Rate, Markup, Total
        doc.text(String(item.quantity || 0), cols.qty, rowY, { align: "right" });
        
        doc.setTextColor(PDF_DESIGN.colors.textMuted.r, PDF_DESIGN.colors.textMuted.g, PDF_DESIGN.colors.textMuted.b);
        doc.text(item.unit || "ea", cols.unit, rowY, { align: "right" });
        
        doc.setTextColor(PDF_DESIGN.colors.text.r, PDF_DESIGN.colors.text.g, PDF_DESIGN.colors.text.b);
        doc.text(formatCurrency(item.unit_price || 0), cols.rate, rowY, { align: "right" });
        
        doc.setTextColor(PDF_DESIGN.colors.textMuted.r, PDF_DESIGN.colors.textMuted.g, PDF_DESIGN.colors.textMuted.b);
        doc.text(item.markup_percent > 0 ? `${item.markup_percent}%` : "—", cols.markup, rowY, { align: "right" });
        
        const lineTotal = (item.quantity || 0) * (item.unit_price || 0) * (1 + (item.markup_percent || 0) / 100);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(PDF_DESIGN.colors.text.r, PDF_DESIGN.colors.text.g, PDF_DESIGN.colors.text.b);
        doc.text(formatCurrency(lineTotal), cols.total, rowY, { align: "right" });
        
        y += PDF_DESIGN.rowHeight;
        rowIdx++;
      }
    }
    
    // Section subtotal bar
    if (block.items.length > 0) {
      y += 2;
      doc.setFillColor(245, 245, 247);
      drawRoundedRectPDF(doc, margin, y, contentWidth, 8, 2);
      
      const subY = y + 5.5;
      let subX = margin + 4;
      
      categories.forEach((cat) => {
        const val = sectionTotals[cat];
        if (val > 0) {
          const color = CATEGORY_COLORS[cat];
          doc.setFontSize(7);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(color.r, color.g, color.b);
          const catText = `${CATEGORY_LABELS[cat]}: ${formatCurrency(val)}`;
          doc.text(catText, subX, subY);
          subX += doc.getTextWidth(catText) + 6;
        }
      });
      
      doc.setFontSize(PDF_DESIGN.fonts.small);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(PDF_DESIGN.colors.text.r, PDF_DESIGN.colors.text.g, PDF_DESIGN.colors.text.b);
      doc.text(`Section Total: ${formatCurrency(sectionTotals.total)}`, cols.total, subY, { align: "right" });
      
      y += 12;
    }
    
    y += PDF_DESIGN.sectionSpacing;
  }

  // ======== 6. OPTIONS / ADD-ONS (if any optional items) ========
  
  const optionalItems = allItems.filter(item => (item as any).is_optional);
  if (optionalItems.length > 0) {
    checkPageBreak(20);
    
    doc.setFontSize(PDF_DESIGN.fonts.header);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(PDF_DESIGN.colors.text.r, PDF_DESIGN.colors.text.g, PDF_DESIGN.colors.text.b);
    doc.text("Optional Upgrades", margin, y);
    y += 8;
    
    for (const item of optionalItems) {
      checkPageBreak(8);
      doc.setFontSize(PDF_DESIGN.fonts.body);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(PDF_DESIGN.colors.text.r, PDF_DESIGN.colors.text.g, PDF_DESIGN.colors.text.b);
      const lineTotal = (item.quantity || 0) * (item.unit_price || 0) * (1 + (item.markup_percent || 0) / 100);
      doc.text(`• ${item.description} — ${formatCurrency(lineTotal)}`, margin + 2, y);
      y += 5;
    }
    
    y += 10;
  }

  // ======== 7. INCLUSIONS & EXCLUSIONS ========
  
  if (extData.inclusions || extData.exclusions) {
    checkPageBreak(30);
    
    const colWidth = (contentWidth - 8) / 2;
    
    if (extData.inclusions) {
      doc.setFontSize(PDF_DESIGN.fonts.subtitle);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(PDF_DESIGN.colors.text.r, PDF_DESIGN.colors.text.g, PDF_DESIGN.colors.text.b);
      doc.text("Inclusions", margin, y);
      
      doc.setFontSize(PDF_DESIGN.fonts.body);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(PDF_DESIGN.colors.textMuted.r, PDF_DESIGN.colors.textMuted.g, PDF_DESIGN.colors.textMuted.b);
      const incLines = doc.splitTextToSize(extData.inclusions, colWidth);
      doc.text(incLines, margin, y + 6);
    }
    
    if (extData.exclusions) {
      const exX = margin + colWidth + 8;
      doc.setFontSize(PDF_DESIGN.fonts.subtitle);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(PDF_DESIGN.colors.text.r, PDF_DESIGN.colors.text.g, PDF_DESIGN.colors.text.b);
      doc.text("Exclusions", exX, y);
      
      doc.setFontSize(PDF_DESIGN.fonts.body);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(PDF_DESIGN.colors.textMuted.r, PDF_DESIGN.colors.textMuted.g, PDF_DESIGN.colors.textMuted.b);
      const exLines = doc.splitTextToSize(extData.exclusions, colWidth);
      doc.text(exLines, exX, y + 6);
    }
    
    y += 30;
  }

  // ======== 8. TIMELINE (if available) ========
  
  if (extData.timeline && extData.timeline.length > 0) {
    checkPageBreak(25);
    
    doc.setFontSize(PDF_DESIGN.fonts.header);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(PDF_DESIGN.colors.text.r, PDF_DESIGN.colors.text.g, PDF_DESIGN.colors.text.b);
    doc.text("Project Timeline", margin, y);
    y += 8;
    
    // Table header
    doc.setFillColor(245, 245, 247);
    doc.rect(margin, y, contentWidth, 6, "F");
    
    doc.setFontSize(PDF_DESIGN.fonts.tiny);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(PDF_DESIGN.colors.textMuted.r, PDF_DESIGN.colors.textMuted.g, PDF_DESIGN.colors.textMuted.b);
    doc.text("PHASE", margin + 4, y + 4);
    doc.text("DURATION", margin + 70, y + 4);
    doc.text("NOTES", margin + 110, y + 4);
    y += 8;
    
    for (const row of extData.timeline) {
      checkPageBreak(6);
      doc.setFontSize(PDF_DESIGN.fonts.body);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(PDF_DESIGN.colors.text.r, PDF_DESIGN.colors.text.g, PDF_DESIGN.colors.text.b);
      doc.text(row.phase, margin + 4, y + 3);
      doc.text(row.duration, margin + 70, y + 3);
      doc.setTextColor(PDF_DESIGN.colors.textMuted.r, PDF_DESIGN.colors.textMuted.g, PDF_DESIGN.colors.textMuted.b);
      doc.text(row.notes || "—", margin + 110, y + 3);
      y += 6;
    }
    
    y += 10;
  }

  // ======== 9. PAYMENT SCHEDULE ========
  
  checkPageBreak(35);
  
  doc.setFontSize(PDF_DESIGN.fonts.header);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(PDF_DESIGN.colors.text.r, PDF_DESIGN.colors.text.g, PDF_DESIGN.colors.text.b);
  doc.text("Payment Schedule", margin, y);
  y += 8;
  
  const paymentSchedule = extData.paymentSchedule || [
    { milestone: "Deposit", description: "Due upon contract signing", amount: "20%" },
    { milestone: "After Rough Trades", description: "Plumbing, electrical, HVAC rough-in complete", amount: "40%" },
    { milestone: "After Cabinets/Countertops", description: "Cabinets installed, countertops templated", amount: "30%" },
    { milestone: "Final Payment", description: "Project completion and walkthrough", amount: "10%" },
  ];
  
  for (const payment of paymentSchedule) {
    checkPageBreak(10);
    
    doc.setFillColor(PDF_DESIGN.colors.cardBg.r, PDF_DESIGN.colors.cardBg.g, PDF_DESIGN.colors.cardBg.b);
    drawRoundedRectPDF(doc, margin, y, contentWidth, 10, 3);
    
    doc.setFontSize(PDF_DESIGN.fonts.body);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(PDF_DESIGN.colors.text.r, PDF_DESIGN.colors.text.g, PDF_DESIGN.colors.text.b);
    doc.text(payment.milestone, margin + 4, y + 6);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(PDF_DESIGN.colors.textMuted.r, PDF_DESIGN.colors.textMuted.g, PDF_DESIGN.colors.textMuted.b);
    doc.text(payment.description, margin + 50, y + 6);
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(PDF_DESIGN.colors.accent.r, PDF_DESIGN.colors.accent.g, PDF_DESIGN.colors.accent.b);
    doc.text(payment.amount, pageWidth - margin - 4, y + 6, { align: "right" });
    
    y += 12;
  }
  
  y += 10;

  // ======== 10. WARRANTY SECTION ========
  
  checkPageBreak(25);
  
  doc.setFontSize(PDF_DESIGN.fonts.header);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(PDF_DESIGN.colors.text.r, PDF_DESIGN.colors.text.g, PDF_DESIGN.colors.text.b);
  doc.text("Warranty", margin, y);
  y += 8;
  
  const warrantyText = extData.warrantyText || 
    "Forma Homes provides a 1-year workmanship warranty on all labor performed. Manufacturer warranties apply to materials, cabinets, appliances, and fixtures as provided by the respective manufacturers.";
  
  doc.setFontSize(PDF_DESIGN.fonts.body);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(PDF_DESIGN.colors.textMuted.r, PDF_DESIGN.colors.textMuted.g, PDF_DESIGN.colors.textMuted.b);
  const warrantyLines = doc.splitTextToSize(warrantyText, contentWidth);
  doc.text(warrantyLines, margin, y);
  
  y += warrantyLines.length * 4 + 15;

  // ======== 11. SIGNATURE BLOCK ========
  
  checkPageBreak(40);
  
  doc.setFontSize(PDF_DESIGN.fonts.header);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(PDF_DESIGN.colors.text.r, PDF_DESIGN.colors.text.g, PDF_DESIGN.colors.text.b);
  doc.text("Acceptance", margin, y);
  y += 10;
  
  // Signature lines
  doc.setFontSize(PDF_DESIGN.fonts.body);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(PDF_DESIGN.colors.textMuted.r, PDF_DESIGN.colors.textMuted.g, PDF_DESIGN.colors.textMuted.b);
  
  doc.text("Client Name:", margin, y);
  doc.setDrawColor(PDF_DESIGN.colors.border.r, PDF_DESIGN.colors.border.g, PDF_DESIGN.colors.border.b);
  doc.line(margin + 30, y, margin + 100, y);
  y += 12;
  
  doc.text("Signature:", margin, y);
  doc.line(margin + 30, y, margin + 100, y);
  y += 12;
  
  doc.text("Date:", margin, y);
  doc.line(margin + 30, y, margin + 70, y);

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
