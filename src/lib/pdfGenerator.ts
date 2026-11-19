// src/lib/pdfGenerator.ts
import { jsPDF } from 'jspdf';
import { Business, Invoice, Party } from '@/types';
import {
  formatIndianDecimals,
  formatIndianNumber,
  amountToIndianWords,
} from './formatters';
import { formatTallyDateIST } from './dates';

/**
 * Generates an authentic Tally Prime-style vector Tax Invoice PDF.
 * Uses pure vector drawing (rectangles, lines, text) so it is ultra-light (~20KB),
 * crystal sharp at any zoom level, and 100% reliable across all mobile browsers.
 */
export function generateTallyInvoicePDF(
  invoice: Invoice,
  business: Business,
  buyerParty?: Party
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // A4 = 210 x 297 mm
  const margin = 10;
  const pageWidth = 210;
  const contentWidth = pageWidth - margin * 2; // 190 mm
  let y = margin;

  // Thin black borders per Tally standards
  doc.setLineWidth(0.2);
  doc.setDrawColor(0, 0, 0);
  doc.setTextColor(0, 0, 0);

  // Outer Box Top Border
  const pageTop = y;

  // 1. Header: TAX INVOICE
  doc.rect(margin, y, contentWidth, 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('TAX INVOICE', margin + contentWidth / 2, y + 6, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('(See Rule 46 of the Central Goods and Services Tax Rules, 2017)', margin + contentWidth / 2, y + 10, { align: 'center' });
  y += 12;

  // 2. Seller (Left 105mm) and Invoice Details (Right 85mm)
  const metaHeight = 36;
  doc.rect(margin, y, 105, metaHeight); // Seller box
  doc.rect(margin + 105, y, 85, metaHeight); // Invoice metadata box

  // Seller Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(business.name || 'RTC MANDI TRADERS', margin + 3, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const sellerAddr = doc.splitTextToSize(business.address || 'Shop No. 14, Main Market Yard, Grain Market', 98);
  doc.text(sellerAddr, margin + 3, y + 9);

  const addrLines = Array.isArray(sellerAddr) ? sellerAddr.length : 1;
  const sellerMetaY = y + 10 + addrLines * 3.5;
  doc.text(`GSTIN/UIN: ${business.gstin || '36AABCR1234F1Z5'}`, margin + 3, sellerMetaY);
  doc.text(`State Name: ${business.state || 'Telangana'}, Code: ${business.state_code || '36'}`, margin + 3, sellerMetaY + 4);
  if (business.phone) {
    doc.text(`Contact: ${business.phone}`, margin + 3, sellerMetaY + 8);
  }

  // Invoice Metadata (Right)
  const rightX = margin + 108;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Invoice No.', rightX, y + 5);
  doc.text('Dated', rightX + 42, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`#${business.bill_prefix || 'RTC'}-${invoice.bill_no}`, rightX, y + 9);
  doc.text(formatTallyDateIST(invoice.bill_date), rightX + 42, y + 9);

  doc.line(margin + 105, y + 12, margin + contentWidth, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Transporter:', rightX, y + 17);
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.transporter_name || 'Direct / Self', rightX + 22, y + 17);

  doc.setFont('helvetica', 'normal');
  doc.text('Vehicle No:', rightX, y + 22);
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.vehicle_no || '—', rightX + 22, y + 22);

  doc.line(margin + 105, y + 25, margin + contentWidth, y + 25);

  doc.setFont('helvetica', 'normal');
  doc.text('Place of Supply:', rightX, y + 30);
  doc.setFont('helvetica', 'bold');
  doc.text(buyerParty?.state || business.state || 'Telangana (36)', rightX + 25, y + 30);

  y += metaHeight;

  // 3. Buyer Block (Bill To / Ship To)
  const buyerHeight = 22;
  doc.rect(margin, y, contentWidth, buyerHeight);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Buyer (Bill To & Consignee):', margin + 3, y + 4);

  doc.setFontSize(10);
  doc.text(invoice.buyer_name || 'Cash Buyer', margin + 3, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const buyerTownStr = invoice.buyer_town ? `${invoice.buyer_town}` : '';
  const buyerPhoneStr = invoice.buyer_phone ? ` · Ph: ${invoice.buyer_phone}` : '';
  doc.text(`${buyerTownStr}${buyerPhoneStr}`, margin + 3, y + 13.5);

  const buyerGstin = buyerParty?.gstin ? `GSTIN/UIN: ${buyerParty.gstin} · ` : '';
  const buyerState = `State Name: ${buyerParty?.state || 'Telangana'}, Code: ${buyerParty?.state_code || '36'}`;
  doc.text(`${buyerGstin}${buyerState}`, margin + 3, y + 17.5);

  y += buyerHeight;

  // 4. Item Table Column Definitions
  // Total width: 190 mm
  // Sl: 10, Description: 68, HSN: 22, Qty: 30, Rate: 22, per: 13, Amount: 25 = 190
  const cols = [
    { header: 'Sl', width: 10, align: 'center' },
    { header: 'Description of Goods', width: 68, align: 'left' },
    { header: 'HSN/SAC', width: 22, align: 'center' },
    { header: 'Quantity', width: 30, align: 'right' },
    { header: 'Rate', width: 22, align: 'right' },
    { header: 'per', width: 13, align: 'center' },
    { header: 'Amount (INR)', width: 25, align: 'right' },
  ];

  // Table Header
  const tableHeaderHeight = 7;
  doc.rect(margin, y, contentWidth, tableHeaderHeight);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);

  let curX = margin;
  cols.forEach((col, idx) => {
    if (idx > 0) doc.line(curX, y, curX, y + tableHeaderHeight);
    let textX = curX + 2;
    if (col.align === 'center') textX = curX + col.width / 2;
    if (col.align === 'right') textX = curX + col.width - 2;
    doc.text(col.header, textX, y + 5, { align: col.align as any });
    curX += col.width;
  });
  y += tableHeaderHeight;

  // Table Body (Min 55mm height to match Tally blank grid layout)
  const bodyStartY = y;
  const lines = invoice.lines || [];
  const minTableBodyHeight = Math.max(55, lines.length * 10 + 15);

  // Draw vertical grid lines for the full body height
  curX = margin;
  cols.forEach((col, idx) => {
    if (idx > 0) doc.line(curX, bodyStartY, curX, bodyStartY + minTableBodyHeight);
    curX += col.width;
  });
  doc.rect(margin, bodyStartY, contentWidth, minTableBodyHeight);

  // Print line items
  let itemY = bodyStartY + 5;
  let totalPieces = 0;
  let totalKg = 0;

  lines.forEach((line, i) => {
    const pieces = Number(line.pieces) || 0;
    const kg = Number(line.kg_per_piece) || 0;
    const qtl = (pieces * kg) / 100;
    const rate = Number(line.rate) || 0;
    const amt = Number(line.amount) || 0;
    totalPieces += pieces;
    totalKg += pieces * kg;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    // Sl
    doc.text(String(i + 1), margin + 5, itemY, { align: 'center' });

    // Description
    doc.setFont('helvetica', 'bold');
    doc.text(line.item_name || 'Commodity', margin + 12, itemY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`(${kg} kg per bag packing)`, margin + 12, itemY + 3.5);

    // HSN/SAC
    doc.setFontSize(8);
    doc.text('0713', margin + 80 + 11, itemY, { align: 'center' });

    // Quantity (Pieces & Quintals)
    doc.setFont('helvetica', 'bold');
    doc.text(`${pieces} Bags`, margin + 102 + 28, itemY, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`(${qtl.toFixed(2)} Qtl)`, margin + 102 + 28, itemY + 3.5, { align: 'right' });

    // Rate
    doc.setFontSize(8);
    doc.text(formatIndianDecimals(rate), margin + 132 + 20, itemY, { align: 'right' });

    // per
    const perUnit = line.rate_unit === 'per_quintal' ? 'Qtl' : line.rate_unit === 'per_kg' ? 'kg' : 'Bag';
    doc.text(perUnit, margin + 154 + 6.5, itemY, { align: 'center' });

    // Amount
    doc.setFont('helvetica', 'bold');
    doc.text(formatIndianDecimals(amt), margin + 165 + 23, itemY, { align: 'right' });

    itemY += 9;
  });

  // Extra charges if any
  if (invoice.extra_charges && invoice.extra_charges > 0) {
    const chargeLabel = invoice.charges?.[0]?.label || 'Hamali / Extra Charges';
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text(chargeLabel, margin + 12, itemY);
    doc.text('1 Item', margin + 102 + 28, itemY, { align: 'right' });
    doc.text(formatIndianDecimals(invoice.extra_charges), margin + 165 + 23, itemY, { align: 'right' });
    itemY += 8;
  }

  y = bodyStartY + minTableBodyHeight;

  // 5. Total Row
  const totalRowHeight = 7;
  doc.rect(margin, y, contentWidth, totalRowHeight);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Total', margin + 12, y + 5);

  // Total Quantity
  doc.text(`${totalPieces} Bags (${(totalKg / 100).toFixed(2)} Qtl)`, margin + 102 + 28, y + 5, { align: 'right' });

  // Grand Total Amount
  doc.text(`INR ${formatIndianDecimals(invoice.total)}`, margin + 165 + 23, y + 5, { align: 'right' });
  y += totalRowHeight;

  // 6. Amount in Words Box
  const wordsHeight = 11;
  doc.rect(margin, y, contentWidth, wordsHeight);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Amount Chargeable (in words):', margin + 3, y + 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  const wordsText = doc.splitTextToSize(amountToIndianWords(invoice.total, 'Indian Rupees'), contentWidth - 6);
  doc.text(wordsText, margin + 3, y + 8);
  y += wordsHeight;

  // 7. Bank Details (Left 105mm) & Declaration / Signature (Right 85mm)
  const bottomHeight = 35;
  doc.rect(margin, y, 105, bottomHeight);
  doc.rect(margin + 105, y, 85, bottomHeight);

  // Bank Info (Left)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text("Company's Bank Details", margin + 3, y + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Bank Name  : ${business.bank_name || 'State Bank of India (SBI)'}`, margin + 3, y + 9);
  doc.text(`A/c No.    : ${business.bank_account || '398201948210'}`, margin + 3, y + 13.5);
  doc.text(`Branch     : ${business.bank_branch || 'Mandi Yard Branch'}`, margin + 3, y + 18);
  doc.text(`IFS Code   : ${business.bank_ifsc || 'SBIN0001234'}`, margin + 3, y + 22.5);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.text('Goods once sold will not be taken back or exchanged.', margin + 3, y + 29);

  // Declaration & Signature (Right)
  const rightSignX = margin + 108;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`for ${business.name || 'RTC MANDI TRADERS'}`, rightSignX, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const declText = doc.splitTextToSize('We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.', 80);
  doc.text(declText, rightSignX, y + 9);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Authorised Signatory', rightSignX, y + 30);

  y += bottomHeight;

  // 8. Footer Note
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.text('This is a Computer Generated Tax Invoice · Subject to Mandi Jurisdiction', margin + contentWidth / 2, y + 4, { align: 'center' });

  return doc;
}

/**
 * Robust cross-browser PDF downloader with special handling for iOS Safari and mobile Chrome.
 */
export function downloadInvoicePDF(invoice: Invoice, business: Business, buyerParty?: Party): boolean {
  try {
    const doc = generateTallyInvoicePDF(invoice, business, buyerParty);
    const filename = `Tax-Invoice-${business.bill_prefix || 'RTC'}-${invoice.bill_no}.pdf`;

    // Detect iOS
    const isIOS =
      typeof navigator !== 'undefined' &&
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as any).MSStream;

    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);

    if (isIOS) {
      // In iOS Safari, open blob in a new tab where user can save or share
      const win = window.open(blobUrl, '_blank');
      if (!win) {
        // Pop-up blocked, fallback to direct save
        doc.save(filename);
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      return true;
    }

    // Standard download for Android, Chrome, Edge, Safari Desktop
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    }, 2000);

    return true;
  } catch (err) {
    console.error('Vector PDF export error:', err);
    return false;
  }
}
