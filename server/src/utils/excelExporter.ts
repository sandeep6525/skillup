import { Response } from 'express';
import ExcelJS from 'exceljs';

export interface ReportSummaryItem {
  label: string;
  value: string | number;
}

export interface ReportColumn {
  header: string;
  key: string;
  width?: number;
  format?: 'currency' | 'date' | 'percent' | 'text' | 'number';
  alignment?: 'left' | 'center' | 'right';
}

export interface ExcelSheetOptions {
  sheetName: string;
  title: string;
  subtitle?: string;
  category?: string;
  summaryItems?: ReportSummaryItem[];
  columns: ReportColumn[];
  rows: Record<string, any>[];
  freezeColumnKey?: string;
}

export interface ExportWorkbookOptions {
  res: Response;
  filenameBase: string;
  sheets: ExcelSheetOptions[];
}

// Brand Colors
const COLOR_NAVY = '142B4F'; // Dark Navy (#142B4F)
const COLOR_GREEN = '55B957'; // Primary Green (#55B957)
const COLOR_LIGHT_BG = 'F8FAFC'; // Light Background (#F8FAFC)
const COLOR_BORDER = 'E2E8F0'; // Border (#E2E8F0)
const COLOR_WHITE = 'FFFFFF';
const COLOR_TEXT_MUTED = '64748B';
const COLOR_TEXT_DARK = '111111';
const COLOR_SUMMARY_BG = 'EDF2F7';

/**
 * Creates and streams a corporate-branded multi-worksheet Excel report.
 */
export async function generateCorporateExcelWorkbook(options: ExportWorkbookOptions): Promise<void> {
  const { res, filenameBase, sheets } = options;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SkillUp Learning Platform';
  workbook.lastModifiedBy = 'SkillUp Admin Intelligence';
  workbook.created = new Date();
  workbook.modified = new Date();

  const formattedDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  sheets.forEach((sheetConfig) => {
    const ws = workbook.addWorksheet(sheetConfig.sheetName.substring(0, 31), {
      pageSetup: {
        orientation: 'landscape',
        paperSize: 9, // A4
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
      },
      views: [{ showGridLines: true }],
    });

    const numCols = Math.max(sheetConfig.columns.length, 6);

    // ==========================================
    // 1. BRAND HEADER BANNER (Rows 1 & 2)
    // ==========================================
    ws.mergeCells(1, 1, 1, numCols);
    const topBar = ws.getCell(1, 1);
    topBar.value = '   SKILLUP LEARNING PLATFORM  |  EXECUTIVE INTELLIGENCE REPORT';
    topBar.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLOR_WHITE } };
    topBar.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLOR_NAVY },
    };
    topBar.alignment = { vertical: 'middle', horizontal: 'left' };
    ws.getRow(1).height = 24;

    // Report Title & Meta
    ws.mergeCells(2, 1, 2, numCols);
    const titleCell = ws.getCell(2, 1);
    titleCell.value = `   ${sheetConfig.title}`;
    titleCell.font = { name: 'Calibri', size: 15, bold: true, color: { argb: COLOR_WHITE } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLOR_NAVY },
    };
    titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
    ws.getRow(2).height = 32;

    // Subtitle & Export Metadata Bar (Row 3)
    ws.mergeCells(3, 1, 3, numCols);
    const subCell = ws.getCell(3, 1);
    const categoryText = sheetConfig.category ? `Category: ${sheetConfig.category}  |  ` : '';
    const descText = sheetConfig.subtitle ? `${sheetConfig.subtitle}  |  ` : '';
    subCell.value = `   ${descText}${categoryText}Generated: ${formattedDate} at ${formattedTime}`;
    subCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'CBD5E1' } };
    subCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLOR_NAVY },
    };
    subCell.alignment = { vertical: 'middle', horizontal: 'left' };
    ws.getRow(3).height = 20;

    // Thin Green Accent Ribbon (Row 4)
    ws.mergeCells(4, 1, 4, numCols);
    const accentCell = ws.getCell(4, 1);
    accentCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLOR_GREEN },
    };
    ws.getRow(4).height = 4;

    let currentRowIndex = 6;

    // ==========================================
    // 2. SUMMARY DASHBOARD CARDS (If provided)
    // ==========================================
    if (sheetConfig.summaryItems && sheetConfig.summaryItems.length > 0) {
      const items = sheetConfig.summaryItems;
      const cardRow = currentRowIndex;
      ws.getRow(cardRow).height = 16;
      ws.getRow(cardRow + 1).height = 24;

      const cardWidth = Math.max(1, Math.floor(numCols / items.length));
      items.forEach((item, idx) => {
        const startCol = idx * cardWidth + 1;
        const endCol = idx === items.length - 1 ? numCols : (idx + 1) * cardWidth;

        if (startCol < endCol) {
          ws.mergeCells(cardRow, startCol, cardRow, endCol);
          ws.mergeCells(cardRow + 1, startCol, cardRow + 1, endCol);
        }

        const labelCell = ws.getCell(cardRow, startCol);
        labelCell.value = item.label.toUpperCase();
        labelCell.font = { name: 'Calibri', size: 8, bold: true, color: { argb: COLOR_TEXT_MUTED } };
        labelCell.alignment = { horizontal: 'center', vertical: 'middle' };
        labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SUMMARY_BG } };

        const valCell = ws.getCell(cardRow + 1, startCol);
        valCell.value = item.value;
        valCell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: COLOR_NAVY } };
        valCell.alignment = { horizontal: 'center', vertical: 'middle' };
        valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SUMMARY_BG } };

        // Apply borders around the card
        for (let r = cardRow; r <= cardRow + 1; r++) {
          for (let c = startCol; c <= endCol; c++) {
            const cell = ws.getCell(r, c);
            cell.border = {
              top: { style: 'thin', color: { argb: COLOR_BORDER } },
              bottom: { style: 'thin', color: { argb: COLOR_BORDER } },
              left: c === startCol ? { style: 'thin', color: { argb: COLOR_BORDER } } : undefined,
              right: c === endCol ? { style: 'thin', color: { argb: COLOR_BORDER } } : undefined,
            };
          }
        }
      });

      currentRowIndex += 3;
    }

    // ==========================================
    // 3. TABLE DATA HEADERS
    // ==========================================
    const headerRowIndex = currentRowIndex;
    const headerRow = ws.getRow(headerRowIndex);
    headerRow.height = 28;

    sheetConfig.columns.forEach((col, colIdx) => {
      const cell = headerRow.getCell(colIdx + 1);
      cell.value = col.header;
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLOR_WHITE } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLOR_NAVY },
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: col.alignment || (col.format === 'currency' || col.format === 'number' ? 'right' : 'left'),
        wrapText: true,
      };
      cell.border = {
        top: { style: 'medium', color: { argb: COLOR_NAVY } },
        bottom: { style: 'medium', color: { argb: COLOR_GREEN } },
        left: { style: 'thin', color: { argb: '334155' } },
        right: { style: 'thin', color: { argb: '334155' } },
      };
    });

    // ==========================================
    // 4. DATA ROWS WITH ZEBRA STRIPING & FORMATTING
    // ==========================================
    currentRowIndex++;
    sheetConfig.rows.forEach((rowData, rIdx) => {
      const row = ws.getRow(currentRowIndex);
      row.height = 20;
      const isZebra = rIdx % 2 === 1;

      sheetConfig.columns.forEach((col, colIdx) => {
        const cell = row.getCell(colIdx + 1);
        let rawVal = rowData[col.key];

        // Format and render cell values
        if (rawVal === undefined || rawVal === null || rawVal === '') {
          cell.value = 'N/A';
          cell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: '94A3B8' } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else if (col.format === 'currency') {
          const num = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal).replace(/[^0-9.-]/g, ''));
          cell.value = isNaN(num) ? rawVal : num;
          cell.numFmt = '₹#,##0.00;[Red](₹#,##0.00);"-"';
          cell.font = { name: 'Calibri', size: 9.5, bold: false, color: { argb: COLOR_TEXT_DARK } };
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
        } else if (col.format === 'percent') {
          const num = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal).replace('%', ''));
          if (!isNaN(num)) {
            cell.value = num > 1 ? num / 100 : num;
            cell.numFmt = '0.0%';
          } else {
            cell.value = rawVal;
          }
          cell.font = { name: 'Calibri', size: 9.5, color: { argb: COLOR_TEXT_DARK } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else if (col.format === 'date') {
          const d = new Date(rawVal);
          if (!isNaN(d.getTime())) {
            cell.value = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
          } else {
            cell.value = String(rawVal);
          }
          cell.font = { name: 'Calibri', size: 9.5, color: { argb: COLOR_TEXT_DARK } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else if (col.format === 'number') {
          const num = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal));
          cell.value = isNaN(num) ? rawVal : num;
          cell.numFmt = '#,##0';
          cell.font = { name: 'Calibri', size: 9.5, color: { argb: COLOR_TEXT_DARK } };
          cell.alignment = { vertical: 'middle', horizontal: col.alignment || 'right' };
        } else {
          cell.value = String(rawVal);
          cell.font = { name: 'Calibri', size: 9.5, color: { argb: COLOR_TEXT_DARK } };
          cell.alignment = { vertical: 'middle', horizontal: col.alignment || 'left' };
        }

        // Zebra Fill & Borders
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isZebra ? COLOR_LIGHT_BG : COLOR_WHITE },
        };
        cell.border = {
          top: { style: 'thin', color: { argb: COLOR_BORDER } },
          bottom: { style: 'thin', color: { argb: COLOR_BORDER } },
          left: { style: 'thin', color: { argb: COLOR_BORDER } },
          right: { style: 'thin', color: { argb: COLOR_BORDER } },
        };
      });

      currentRowIndex++;
    });

    // ==========================================
    // 5. COLUMN WIDTH AUTO-SIZING & FREEZE PANES
    // ==========================================
    sheetConfig.columns.forEach((col, colIdx) => {
      let maxLen = col.header.length;
      sheetConfig.rows.slice(0, 100).forEach((row) => {
        const val = row[col.key];
        if (val !== undefined && val !== null) {
          maxLen = Math.max(maxLen, String(val).length);
        }
      });
      const targetWidth = col.width || Math.min(Math.max(maxLen + 4, 12), 40);
      ws.getColumn(colIdx + 1).width = targetWidth;
    });

    // Auto-filter on header row
    const lastColLetter = ws.getColumn(sheetConfig.columns.length).letter;
    ws.autoFilter = {
      from: { row: headerRowIndex, column: 1 },
      to: { row: Math.max(headerRowIndex, currentRowIndex - 1), column: sheetConfig.columns.length },
    };

    // Freeze panes below header row
    ws.views = [
      {
        state: 'frozen',
        ySplit: headerRowIndex,
        showGridLines: true,
      },
    ];
  });

  // ==========================================
  // 6. RESPONSE STREAMING
  // ==========================================
  const dateStr = new Date().toISOString().split('T')[0];
  const safeBase = filenameBase.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${safeBase}_${dateStr}.xlsx`;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  await workbook.xlsx.write(res);
  res.end();
}

