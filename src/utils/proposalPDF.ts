import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PDFOptions {
  proposalTitle: string;
  clientName?: string;
  projectName?: string;
  proposalDate: string;
  companyName?: string;
  companyLogo?: string;
}

export async function generateProposalPDF(
  elementId: string,
  options: PDFOptions
): Promise<Blob> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('PDF content element not found');
  }

  // Capture the element as canvas
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    windowWidth: 1200,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth - 20; // 10mm margins
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  
  let heightLeft = imgHeight;
  let position = 10;
  
  // Add first page
  pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
  heightLeft -= (pageHeight - 20);
  
  // Add additional pages if needed
  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
    heightLeft -= (pageHeight - 20);
  }
  
  // Add page numbers
  const pageCount = pdf.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(9);
    pdf.setTextColor(150);
    pdf.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }
  
  return pdf.output('blob');
}

export function downloadPDF(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
