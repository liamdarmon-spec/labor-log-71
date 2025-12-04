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

function computeTotals(items: ExportItem[]): PDFTotals {
  const totals: PDFTotals = { labor: 0, subs: 0, materials: 0, other: 0, total: 0 };
  for (const item of items) {
    const lineTotal = (item.quantity || 0) * (item.unit_price || 0) * (1 + (item.markup_percent || 0) / 100);
    totals[item.category] += lineTotal;
    totals.total += lineTotal;
  }
  return totals;
}

// Design constants
const DESIGN = {
  pageMargin: 15, // ~40px at 72dpi
  sectionSpacing: 10,
  rowHeight: 5.5,
  cardRadius: 3,
  colors: {
    text: { r: 17, g: 24, b: 39 },           // Gray-900
    textMuted: { r: 107, g: 114, b: 128 },   // Gray-500
    textLight: { r: 156, g: 163, b: 175 },   // Gray-400
    border: { r: 229, g: 231, b: 235 },      // Gray-200
    borderLight: { r: 243, g: 244, b: 246 }, // Gray-100
    cardBg: { r: 250, g: 250, b: 250 },      // Gray-50
    headerBg: { r: 249, g: 250, b: 251 },    // Gray-50
    white: { r: 255, g: 255, b: 255 },
    accent: { r: 59, g: 130, b: 246 },       // Blue-500
  },
  fonts: {
    header: 18,
    title: 14,
    subtitle: 11,
    body: 9,
    small: 8,
    tiny: 7,
  },
};

// Helper to draw rounded rectangle
function drawRoundedRect(
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

export function generateEstimatePDF(data: EstimateExportData): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = DESIGN.pageMargin;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Helper to add new page with header
  const checkPageBreak = (neededHeight: number): boolean => {
    if (y + neededHeight > pageHeight - margin - 10) {
      doc.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  // Draw category pill
  const drawCategoryPill = (x: number, cy: number, category: BudgetCategory) => {
    const color = CATEGORY_COLORS[category];
    const bg = CATEGORY_BG[category];
    const label = CATEGORY_SHORT[category];
    
    doc.setFillColor(bg.r, bg.g, bg.b);
    drawRoundedRect(doc, x, cy - 2, 6, 4, 1);
    doc.setFontSize(6);
    doc.setTextColor(color.r, color.g, color.b);
    doc.setFont("helvetica", "bold");
    doc.text(label, x + 3, cy + 0.3, { align: "center" });
    doc.setTextColor(DESIGN.colors.text.r, DESIGN.colors.text.g, DESIGN.colors.text.b);
  };

  // ======== HEADER SECTION ========
  
  // Left side - Title
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(DESIGN.colors.accent.r, DESIGN.colors.accent.g, DESIGN.colors.accent.b);
  doc.text("ESTIMATE", margin, y + 3);
  
  y += 8;
  
  doc.setFontSize(DESIGN.fonts.header);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(DESIGN.colors.text.r, DESIGN.colors.text.g, DESIGN.colors.text.b);
  doc.text(data.title || "Untitled Estimate", margin, y + 3);
  
  y += 9;
  
  doc.setFontSize(DESIGN.fonts.body);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(DESIGN.colors.textMuted.r, DESIGN.colors.textMuted.g, DESIGN.colors.textMuted.b);
  
  const metaItems: string[] = [];
  if (data.projectName) metaItems.push(data.projectName);
  metaItems.push(`Status: ${data.status}`);
  metaItems.push(`Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`);
  doc.text(metaItems.join("  •  "), margin, y + 2);
  
  y += 10;

  // ======== SUMMARY CARD ========
  
  const allItems = data.blocks.flatMap((b) => b.items);
  const grandTotals = computeTotals(allItems);
  
  // Summary card background
  doc.setFillColor(DESIGN.colors.cardBg.r, DESIGN.colors.cardBg.g, DESIGN.colors.cardBg.b);
  doc.setDrawColor(DESIGN.colors.border.r, DESIGN.colors.border.g, DESIGN.colors.border.b);
  drawRoundedRect(doc, margin, y, contentWidth, 28, DESIGN.cardRadius, true, true);
  
  // Total estimate (left side)
  const cardY = y + 6;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(DESIGN.colors.textMuted.r, DESIGN.colors.textMuted.g, DESIGN.colors.textMuted.b);
  doc.text("TOTAL ESTIMATE", margin + 6, cardY);
  
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(DESIGN.colors.text.r, DESIGN.colors.text.g, DESIGN.colors.text.b);
  doc.text(formatCurrency(grandTotals.total), margin + 6, cardY + 10);
  
  // Category breakdown (right side)
  const categories: BudgetCategory[] = ["labor", "subs", "materials", "other"];
  const pillStartX = margin + 75;
  const pillSpacing = 32;
  
  categories.forEach((cat, i) => {
    const px = pillStartX + i * pillSpacing;
    const color = CATEGORY_COLORS[cat];
    const bg = CATEGORY_BG[cat];
    const value = grandTotals[cat];
    
    // Category pill background
    doc.setFillColor(bg.r, bg.g, bg.b);
    drawRoundedRect(doc, px, cardY - 1, 28, 18, 2);
    
    // Category label
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(color.r, color.g, color.b);
    doc.text(CATEGORY_LABELS[cat].toUpperCase(), px + 14, cardY + 3, { align: "center" });
    
    // Category value
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(DESIGN.colors.text.r, DESIGN.colors.text.g, DESIGN.colors.text.b);
    doc.text(formatCurrencyShort(value), px + 14, cardY + 10, { align: "center" });
  });
  
  y += 34;

  // ======== SECTIONS ========
  
  for (const block of data.blocks) {
    checkPageBreak(35);
    
    const sectionTotals = computeTotals(block.items);
    
    // Section card
    doc.setFillColor(DESIGN.colors.white.r, DESIGN.colors.white.g, DESIGN.colors.white.b);
    doc.setDrawColor(DESIGN.colors.border.r, DESIGN.colors.border.g, DESIGN.colors.border.b);
    
    // Calculate section height dynamically
    let sectionContentHeight = 0;
    
    // Section header bar
    doc.setFillColor(DESIGN.colors.headerBg.r, DESIGN.colors.headerBg.g, DESIGN.colors.headerBg.b);
    drawRoundedRect(doc, margin, y, contentWidth, 10, DESIGN.cardRadius);
    
    // Section title
    doc.setFontSize(DESIGN.fonts.subtitle);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(DESIGN.colors.text.r, DESIGN.colors.text.g, DESIGN.colors.text.b);
    doc.text(block.block.title || "Untitled Section", margin + 5, y + 6.5);
    
    // Section totals (right side)
    let totalX = pageWidth - margin - 5;
    doc.setFontSize(DESIGN.fonts.body);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(sectionTotals.total), totalX, y + 6.5, { align: "right" });
    
    totalX -= 35;
    
    // Category mini-totals in header
    [...categories].reverse().forEach((cat) => {
      const val = sectionTotals[cat];
      if (val > 0) {
        const color = CATEGORY_COLORS[cat];
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(color.r, color.g, color.b);
        const catText = `${CATEGORY_SHORT[cat]} ${formatCurrencyShort(val)}`;
        doc.text(catText, totalX, y + 6.5, { align: "right" });
        totalX -= doc.getTextWidth(catText) + 5;
      }
    });
    
    y += 12;
    
    // Table header
    doc.setFillColor(DESIGN.colors.borderLight.r, DESIGN.colors.borderLight.g, DESIGN.colors.borderLight.b);
    doc.rect(margin, y, contentWidth, 6, "F");
    
    doc.setFontSize(DESIGN.fonts.tiny);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(DESIGN.colors.textMuted.r, DESIGN.colors.textMuted.g, DESIGN.colors.textMuted.b);
    
    // Column positions
    const cols = {
      cat: margin + 3,
      desc: margin + 12,
      qty: margin + 110,
      unit: margin + 125,
      rate: margin + 140,
      markup: margin + 155,
      total: pageWidth - margin - 3,
    };
    
    doc.text("", cols.cat, y + 4);
    doc.text("DESCRIPTION", cols.desc, y + 4);
    doc.text("QTY", cols.qty, y + 4, { align: "right" });
    doc.text("UNIT", cols.unit, y + 4, { align: "right" });
    doc.text("RATE", cols.rate, y + 4, { align: "right" });
    doc.text("MARKUP", cols.markup, y + 4, { align: "right" });
    doc.text("TOTAL", cols.total, y + 4, { align: "right" });
    
    y += 7;
    
    // Group items by area
    const areaMap = new Map<string | null, ExportItem[]>();
    const areaOrder: (string | null)[] = [];
    for (const item of block.items) {
      const key = item.area_label;
      if (!areaMap.has(key)) {
        areaMap.set(key, []);
        areaOrder.push(key);
      }
      areaMap.get(key)!.push(item);
    }
    
    // Empty section handling
    if (block.items.length === 0) {
      checkPageBreak(10);
      doc.setFontSize(DESIGN.fonts.body);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(DESIGN.colors.textLight.r, DESIGN.colors.textLight.g, DESIGN.colors.textLight.b);
      doc.text("No cost items added yet", margin + contentWidth / 2, y + 4, { align: "center" });
      y += 10;
    }
    
    let rowIndex = 0;
    
    for (const areaLabel of areaOrder) {
      const areaItems = areaMap.get(areaLabel)!;
      
      // Area header
      if (areaLabel) {
        checkPageBreak(10);
        
        doc.setFillColor(252, 252, 253);
        doc.rect(margin, y, contentWidth, 6, "F");
        
        doc.setFontSize(DESIGN.fonts.small);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(DESIGN.colors.text.r, DESIGN.colors.text.g, DESIGN.colors.text.b);
        doc.text(`▸ ${areaLabel}`, margin + 5, y + 4);
        
        const areaTotals = computeTotals(areaItems);
        doc.setFontSize(DESIGN.fonts.small);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(DESIGN.colors.textMuted.r, DESIGN.colors.textMuted.g, DESIGN.colors.textMuted.b);
        doc.text(formatCurrency(areaTotals.total), cols.total, y + 4, { align: "right" });
        
        y += 7;
      }
      
      // Group items by group_label
      const groupMap = new Map<string | null, ExportItem[]>();
      const groupOrder: (string | null)[] = [];
      for (const item of areaItems) {
        const key = item.group_label;
        if (!groupMap.has(key)) {
          groupMap.set(key, []);
          groupOrder.push(key);
        }
        groupMap.get(key)!.push(item);
      }
      
      for (const groupLabel of groupOrder) {
        const groupItems = groupMap.get(groupLabel)!;
        
        // Group header
        if (groupLabel) {
          checkPageBreak(8);
          
          doc.setFontSize(DESIGN.fonts.small);
          doc.setFont("helvetica", "italic");
          doc.setTextColor(DESIGN.colors.textMuted.r, DESIGN.colors.textMuted.g, DESIGN.colors.textMuted.b);
          doc.text(`    ${groupLabel}`, margin + 8, y + 3);
          
          y += 5;
        }
        
        // Items
        for (const item of groupItems) {
          checkPageBreak(DESIGN.rowHeight + 1);
          
          // Alternate row background
          if (rowIndex % 2 === 1) {
            doc.setFillColor(252, 252, 253);
            doc.rect(margin, y, contentWidth, DESIGN.rowHeight, "F");
          }
          
          const rowY = y + DESIGN.rowHeight / 2 + 1;
          
          // Category tag
          drawCategoryPill(cols.cat, rowY, item.category);
          
          // Description
          doc.setFontSize(DESIGN.fonts.small);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(DESIGN.colors.text.r, DESIGN.colors.text.g, DESIGN.colors.text.b);
          
          let desc = item.description || "";
          const costCode = data.costCodes?.get(item.cost_code_id || "");
          const codeStr = costCode?.code || item.cost_code_code || "";
          if (codeStr && !desc.startsWith(codeStr)) {
            desc = `${codeStr} - ${desc}`;
          }
          
          // Truncate if too long
          const maxDescWidth = cols.qty - cols.desc - 8;
          while (doc.getTextWidth(desc) > maxDescWidth && desc.length > 10) {
            desc = desc.substring(0, desc.length - 4) + "...";
          }
          
          // Show "Unassigned" for missing cost codes
          if (!item.cost_code_id || item.cost_code_id === "UNASSIGNED") {
            doc.setTextColor(DESIGN.colors.textLight.r, DESIGN.colors.textLight.g, DESIGN.colors.textLight.b);
            doc.setFont("helvetica", "italic");
          }
          doc.text(desc || "No description", cols.desc, rowY);
          
          // Reset text color
          doc.setFont("helvetica", "normal");
          doc.setTextColor(DESIGN.colors.text.r, DESIGN.colors.text.g, DESIGN.colors.text.b);
          
          // Qty
          doc.text(String(item.quantity || 0), cols.qty, rowY, { align: "right" });
          
          // Unit
          doc.setTextColor(DESIGN.colors.textMuted.r, DESIGN.colors.textMuted.g, DESIGN.colors.textMuted.b);
          doc.text(item.unit || "ea", cols.unit, rowY, { align: "right" });
          
          // Rate
          doc.setTextColor(DESIGN.colors.text.r, DESIGN.colors.text.g, DESIGN.colors.text.b);
          doc.text(formatCurrency(item.unit_price || 0), cols.rate, rowY, { align: "right" });
          
          // Markup
          doc.setTextColor(DESIGN.colors.textMuted.r, DESIGN.colors.textMuted.g, DESIGN.colors.textMuted.b);
          const markupStr = item.markup_percent > 0 ? `${item.markup_percent}%` : "—";
          doc.text(markupStr, cols.markup, rowY, { align: "right" });
          
          // Total
          const lineTotal = (item.quantity || 0) * (item.unit_price || 0) * (1 + (item.markup_percent || 0) / 100);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(DESIGN.colors.text.r, DESIGN.colors.text.g, DESIGN.colors.text.b);
          doc.text(formatCurrency(lineTotal), cols.total, rowY, { align: "right" });
          
          y += DESIGN.rowHeight;
          rowIndex++;
        }
      }
    }
    
    // Section subtotal bar
    if (block.items.length > 0) {
      y += 2;
      
      doc.setFillColor(DESIGN.colors.borderLight.r, DESIGN.colors.borderLight.g, DESIGN.colors.borderLight.b);
      drawRoundedRect(doc, margin, y, contentWidth, 8, 2);
      
      const subY = y + 5;
      let subX = margin + 5;
      
      // Category subtotals
      categories.forEach((cat) => {
        const val = sectionTotals[cat];
        if (val > 0) {
          const color = CATEGORY_COLORS[cat];
          doc.setFontSize(7);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(color.r, color.g, color.b);
          const catText = `${CATEGORY_LABELS[cat]}: ${formatCurrency(val)}`;
          doc.text(catText, subX, subY);
          subX += doc.getTextWidth(catText) + 8;
        }
      });
      
      // Section total
      doc.setFontSize(DESIGN.fonts.body);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(DESIGN.colors.text.r, DESIGN.colors.text.g, DESIGN.colors.text.b);
      doc.text(`Section Total: ${formatCurrency(sectionTotals.total)}`, cols.total, subY, { align: "right" });
      
      y += 12;
    }
    
    y += DESIGN.sectionSpacing;
  }

  // ======== GRAND TOTAL FOOTER ========
  
  checkPageBreak(30);
  
  // Top border
  doc.setDrawColor(DESIGN.colors.border.r, DESIGN.colors.border.g, DESIGN.colors.border.b);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  
  y += 8;
  
  // Grand total card
  doc.setFillColor(DESIGN.colors.cardBg.r, DESIGN.colors.cardBg.g, DESIGN.colors.cardBg.b);
  doc.setDrawColor(DESIGN.colors.border.r, DESIGN.colors.border.g, DESIGN.colors.border.b);
  drawRoundedRect(doc, margin, y, contentWidth, 25, DESIGN.cardRadius, true, true);
  
  const footerY = y + 8;
  
  // Category breakdown
  let catX = margin + 8;
  categories.forEach((cat) => {
    const val = grandTotals[cat];
    const color = CATEGORY_COLORS[cat];
    const pct = grandTotals.total > 0 ? ((val / grandTotals.total) * 100).toFixed(1) : "0.0";
    
    // Category pill
    doc.setFillColor(CATEGORY_BG[cat].r, CATEGORY_BG[cat].g, CATEGORY_BG[cat].b);
    drawRoundedRect(doc, catX, footerY - 3, 30, 15, 2);
    
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(color.r, color.g, color.b);
    doc.text(CATEGORY_LABELS[cat].toUpperCase(), catX + 15, footerY, { align: "center" });
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(DESIGN.colors.text.r, DESIGN.colors.text.g, DESIGN.colors.text.b);
    doc.text(formatCurrencyShort(val), catX + 15, footerY + 6, { align: "center" });
    
    doc.setFontSize(6);
    doc.setTextColor(DESIGN.colors.textMuted.r, DESIGN.colors.textMuted.g, DESIGN.colors.textMuted.b);
    doc.text(`${pct}%`, catX + 15, footerY + 10, { align: "center" });
    
    catX += 35;
  });
  
  // Grand total
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(DESIGN.colors.textMuted.r, DESIGN.colors.textMuted.g, DESIGN.colors.textMuted.b);
  doc.text("GRAND TOTAL", pageWidth - margin - 8, footerY - 1, { align: "right" });
  
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(DESIGN.colors.text.r, DESIGN.colors.text.g, DESIGN.colors.text.b);
  doc.text(formatCurrency(grandTotals.total), pageWidth - margin - 8, footerY + 9, { align: "right" });

  return doc;
}

export function downloadPDF(data: EstimateExportData): void {
  try {
    const doc = generateEstimatePDF(data);
    doc.save(`estimate-${data.estimateId}.pdf`);
  } catch (error) {
    console.error("PDF generation error:", error);
    throw new Error("Failed to generate PDF");
  }
}
