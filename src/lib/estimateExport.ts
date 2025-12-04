// Estimate Export Utilities - CSV and PDF generation

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

function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return "$0";
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

function computeTotals(items: ExportItem[]): PDFTotals {
  const totals: PDFTotals = { labor: 0, subs: 0, materials: 0, other: 0, total: 0 };
  for (const item of items) {
    const lineTotal = (item.quantity || 0) * (item.unit_price || 0) * (1 + (item.markup_percent || 0) / 100);
    totals[item.category] += lineTotal;
    totals.total += lineTotal;
  }
  return totals;
}

export function generateEstimatePDF(data: EstimateExportData): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  // Helper to add new page if needed
  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // ---- Cover Section ----
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("ESTIMATE", margin, y);
  y += 12;

  doc.setFontSize(16);
  doc.setFont("helvetica", "normal");
  doc.text(data.title || "Untitled Estimate", margin, y);
  y += 8;

  if (data.projectName) {
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Project: ${data.projectName}`, margin, y);
    y += 6;
  }

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Status: ${data.status}`, margin, y);
  y += 4;
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, y);
  doc.setTextColor(0);
  y += 12;

  // ---- Summary Totals ----
  const allItems = data.blocks.flatMap((b) => b.items);
  const grandTotals = computeTotals(allItems);

  checkPageBreak(25);
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y, pageWidth - margin * 2, 20, "F");
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  const summaryY = y + 7;
  doc.text("SUMMARY", margin + 4, summaryY);
  
  doc.setFont("helvetica", "normal");
  const cols = [
    { label: "Labor", value: grandTotals.labor },
    { label: "Subs", value: grandTotals.subs },
    { label: "Materials", value: grandTotals.materials },
    { label: "Other", value: grandTotals.other },
    { label: "TOTAL", value: grandTotals.total },
  ];
  
  const colWidth = (pageWidth - margin * 2 - 60) / cols.length;
  cols.forEach((col, i) => {
    const x = margin + 60 + i * colWidth;
    doc.setFontSize(8);
    doc.text(col.label, x, summaryY - 2);
    doc.setFontSize(10);
    doc.setFont("helvetica", i === cols.length - 1 ? "bold" : "normal");
    doc.text(formatCurrency(col.value), x, summaryY + 5);
  });
  
  y += 28;

  // ---- Sections ----
  for (const block of data.blocks) {
    checkPageBreak(20);

    // Section header
    doc.setFillColor(235, 235, 235);
    doc.rect(margin, y, pageWidth - margin * 2, 8, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(block.block.title || "Untitled Section", margin + 4, y + 5.5);

    const sectionTotals = computeTotals(block.items);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(formatCurrency(sectionTotals.total), pageWidth - margin - 4, y + 5.5, { align: "right" });
    y += 12;

    // Group items by area
    const areaMap = new Map<string | null, ExportItem[]>();
    for (const item of block.items) {
      const key = item.area_label;
      if (!areaMap.has(key)) areaMap.set(key, []);
      areaMap.get(key)!.push(item);
    }

    for (const [areaLabel, areaItems] of areaMap) {
      checkPageBreak(15);

      // Area header (if not null)
      if (areaLabel) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(60);
        doc.text(`► ${areaLabel}`, margin + 4, y + 4);
        const areaTotals = computeTotals(areaItems);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(formatCurrency(areaTotals.total), pageWidth - margin - 4, y + 4, { align: "right" });
        doc.setTextColor(0);
        y += 8;
      }

      // Group items by group_label within area
      const groupMap = new Map<string | null, ExportItem[]>();
      for (const item of areaItems) {
        const key = item.group_label;
        if (!groupMap.has(key)) groupMap.set(key, []);
        groupMap.get(key)!.push(item);
      }

      for (const [groupLabel, groupItems] of groupMap) {
        // Group header (if not null)
        if (groupLabel) {
          checkPageBreak(10);
          doc.setFontSize(9);
          doc.setFont("helvetica", "italic");
          doc.setTextColor(80);
          doc.text(`   ${groupLabel}`, margin + 8, y + 3);
          doc.setTextColor(0);
          doc.setFont("helvetica", "normal");
          y += 6;
        }

        // Items table header
        checkPageBreak(8);
        doc.setFontSize(7);
        doc.setTextColor(100);
        const headerY = y + 3;
        doc.text("Description", margin + 12, headerY);
        doc.text("Qty", margin + 100, headerY);
        doc.text("Unit", margin + 115, headerY);
        doc.text("Rate", margin + 130, headerY);
        doc.text("Total", pageWidth - margin - 4, headerY, { align: "right" });
        doc.setTextColor(0);
        y += 5;

        // Items
        for (const item of groupItems) {
          checkPageBreak(6);
          doc.setFontSize(8);
          
          // Truncate description if too long
          let desc = item.description || "";
          if (desc.length > 50) desc = desc.substring(0, 47) + "...";
          
          doc.text(desc, margin + 12, y + 3);
          doc.text(String(item.quantity || 0), margin + 100, y + 3);
          doc.text(item.unit || "ea", margin + 115, y + 3);
          doc.text(formatCurrency(item.unit_price || 0), margin + 130, y + 3);
          
          const lineTotal = (item.quantity || 0) * (item.unit_price || 0) * (1 + (item.markup_percent || 0) / 100);
          doc.text(formatCurrency(lineTotal), pageWidth - margin - 4, y + 3, { align: "right" });
          
          y += 5;
        }
        y += 2;
      }
      y += 3;
    }
    y += 5;
  }

  // ---- Grand Total Footer ----
  checkPageBreak(15);
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("GRAND TOTAL", margin + 4, y + 4);
  doc.text(formatCurrency(grandTotals.total), pageWidth - margin - 4, y + 4, { align: "right" });

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
