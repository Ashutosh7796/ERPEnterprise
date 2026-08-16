import * as XLSX from 'xlsx'
import dayjs from 'dayjs'

export interface ColumnDefinition {
  title: string
  dataIndex?: string
  key?: string
  width?: number | string
  render?: (value: any, record: any, index: number) => any
}

export interface ExportExcelOptions {
  fileName?: string
  sheetName?: string
  title?: string
  summaryItems?: Array<{ label: string; value: string | number }>
  columns: ColumnDefinition[]
  dataSource: any[]
}

export interface PrintReportOptions {
  title: string
  companyName?: string
  subtitle?: string
  summaryItems?: Array<{ label: string; value: string | number }>
  columns: ColumnDefinition[]
  dataSource: any[]
  orientation?: 'landscape' | 'portrait'
}

/**
 * Extracts raw or rendered cell text for export/print
 */
function extractCellText(col: ColumnDefinition, record: any, rowIndex: number): string | number {
  if (col.key === 'rowIndex' || col.dataIndex === 'rowIndex') {
    return rowIndex + 1
  }

  const rawVal = col.dataIndex ? record[col.dataIndex] : undefined

  if (typeof col.render === 'function') {
    const rendered = col.render(rawVal, record, rowIndex)
    if (rendered === null || rendered === undefined) return '-'
    if (typeof rendered === 'string' || typeof rendered === 'number') return rendered
    if (typeof rendered === 'object' && 'props' in rendered) {
      // If it's a React element, extract children text if possible
      const children = (rendered as any).props?.children
      if (typeof children === 'string' || typeof children === 'number') return children
      if (Array.isArray(children)) {
        return children
          .map((c) => (typeof c === 'string' || typeof c === 'number' ? c : ''))
          .join('')
      }
    }
  }

  if (rawVal === null || rawVal === undefined || rawVal === '') return '-'
  return rawVal
}

/**
 * Exports data to native .xlsx Excel file with formatting
 */
export function exportToExcel(options: ExportExcelOptions): void {
  const {
    fileName = `Report_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`,
    sheetName = 'Sheet1',
    title,
    summaryItems = [],
    columns,
    dataSource,
  } = options

  // Filter out action / operation columns from export
  const exportCols = columns.filter(
    (c) => c.key !== 'action' && c.dataIndex !== 'action' && c.title !== 'Action' && c.title !== 'StockDetails'
  )

  const rows: any[][] = []

  // Add report title if provided
  if (title) {
    rows.push([title])
    rows.push([`Generated on: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`])
  }

  // Add summary KPI banner if provided
  if (summaryItems.length > 0) {
    const summaryText = summaryItems.map((s) => `${s.label}: ${s.value}`).join('  |  ')
    rows.push([summaryText])
    rows.push([]) // blank row
  } else if (title) {
    rows.push([]) // blank row
  }

  // Add column header row
  rows.push(exportCols.map((c) => c.title))

  // Add data rows
  dataSource.forEach((record, rIndex) => {
    const row = exportCols.map((col) => extractCellText(col, record, rIndex))
    rows.push(row)
  })

  // Create worksheet and workbook
  const worksheet = XLSX.utils.aoa_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31))

  // Auto-fit column widths
  const maxCols = Math.max(...rows.map((r) => r.length))
  const colWidths = []
  for (let c = 0; c < maxCols; c++) {
    let maxLen = 10
    rows.forEach((r) => {
      const cellVal = r[c] ? String(r[c]) : ''
      if (cellVal.length > maxLen) maxLen = Math.min(cellVal.length + 3, 50)
    })
    colWidths.push({ wch: maxLen })
  }
  worksheet['!cols'] = colWidths

  // Trigger download
  XLSX.writeFile(workbook, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`)
}

/**
 * Universal browser print engine for reports and bill tables
 */
export function printTableReport(options: PrintReportOptions): void {
  const {
    title,
    companyName = 'jshERP Pro',
    subtitle,
    summaryItems = [],
    columns,
    dataSource,
    orientation = 'landscape',
  } = options

  // Filter out action / button columns
  const printCols = columns.filter(
    (c) => c.key !== 'action' && c.dataIndex !== 'action' && c.title !== 'Action' && c.title !== 'StockDetails'
  )

  const summaryHtml =
    summaryItems.length > 0
      ? `<div class="summary-banner">
          ${summaryItems
            .map(
              (item) =>
                `<span class="summary-item"><strong>${item.label}:</strong> <span class="summary-val">${item.value}</span></span>`
            )
            .join('<span class="divider">|</span>')}
        </div>`
      : ''

  const tableHeaderHtml = printCols.map((col) => `<th>${col.title}</th>`).join('')

  const tableBodyHtml = dataSource
    .map((record, rIndex) => {
      const cells = printCols
        .map((col) => {
          const val = extractCellText(col, record, rIndex)
          const isNumber = typeof val === 'number' || (typeof val === 'string' && /^[₹$]?\d+(\.\d+)?$/.test(val.trim()))
          return `<td class="${isNumber ? 'align-right' : 'align-left'}">${val}</td>`
        })
        .join('')
      return `<tr>${cells}</tr>`
    })
    .join('')

  const printHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          @page {
            size: ${orientation};
            margin: 12mm 15mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #262626;
            margin: 0;
            padding: 10px;
            font-size: 12px;
          }
          .header {
            text-align: center;
            margin-bottom: 16px;
            border-bottom: 2px solid #1890ff;
            padding-bottom: 10px;
          }
          .company {
            font-size: 14px;
            font-weight: 500;
            color: #595959;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .title {
            font-size: 20px;
            font-weight: 700;
            color: #1890ff;
            margin: 4px 0;
          }
          .meta {
            font-size: 11px;
            color: #8c8c8c;
            display: flex;
            justify-content: space-between;
            margin-top: 6px;
          }
          .summary-banner {
            background-color: #f6ffed;
            border: 1px solid #b7eb8f;
            border-radius: 4px;
            padding: 8px 12px;
            margin-bottom: 14px;
            font-size: 12px;
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
          }
          .summary-val {
            color: #52c41a;
            font-weight: 600;
          }
          .divider {
            color: #d9d9d9;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
          }
          th {
            background-color: #fafafa;
            color: #262626;
            font-weight: 600;
            border: 1px solid #d9d9d9;
            padding: 8px 6px;
            text-align: center;
            font-size: 11.5px;
          }
          td {
            border: 1px solid #e8e8e8;
            padding: 6px 6px;
            font-size: 11.5px;
          }
          tr:nth-child(even) td {
            background-color: #fcfcfc;
          }
          .align-right {
            text-align: right;
          }
          .align-left {
            text-align: left;
          }
          .footer {
            margin-top: 20px;
            padding-top: 8px;
            border-top: 1px solid #e8e8e8;
            display: flex;
            justify-content: space-between;
            font-size: 10.5px;
            color: #8c8c8c;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company">${companyName}</div>
          <div class="title">${title}</div>
          ${subtitle ? `<div style="font-size: 12px; color: #595959;">${subtitle}</div>` : ''}
          <div class="meta">
            <span>Printed Date: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}</span>
            <span>Total Records: ${dataSource.length}</span>
          </div>
        </div>

        ${summaryHtml}

        <table>
          <thead>
            <tr>${tableHeaderHtml}</tr>
          </thead>
          <tbody>
            ${tableBodyHtml || '<tr><td colspan="' + printCols.length + '" style="text-align:center; padding: 20px;">No data available</td></tr>'}
          </tbody>
        </table>

        <div class="footer">
          <span>jshERP Enterprise Management System</span>
          <span>Sign / Stamp: ______________________</span>
        </div>
      </body>
    </html>
  `

  // Create invisible iframe for clean print dialog execution
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document
  if (doc) {
    doc.open()
    doc.write(printHtml)
    doc.close()

    setTimeout(() => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      setTimeout(() => {
        document.body.removeChild(iframe)
      }, 1000)
    }, 400)
  }
}
