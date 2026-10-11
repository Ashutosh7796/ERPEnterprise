import * as XLSX from 'xlsx'
import dayjs from 'dayjs'

export interface ColumnDefinition {
  title?: string
  headerName?: string
  dataIndex?: string
  field?: string
  key?: string
  colId?: string
  width?: number | string
  render?: (value: any, record: any, index: number) => any
  valueGetter?: (params: any) => any
  cellRenderer?: any
  menuTitle?: string
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
 * Gets human-readable column title from Ant Design or AG Grid column definition
 */
export function getColumnTitle(col: ColumnDefinition): string {
  return col.title || col.headerName || col.menuTitle || col.field || col.dataIndex || ''
}

/**
 * Categorizes a column for smart printing and formatting
 */
export function getColumnCategory(col: ColumnDefinition): 'date' | 'code' | 'numeric' | 'status' | 'person' | 'text' {
  const id = (col.colId || col.key || col.dataIndex || col.field || '').toLowerCase()
  const title = getColumnTitle(col).toLowerCase()

  if (id.includes('date') || id.includes('time') || title.includes('date') || title.includes('time')) {
    return 'date'
  }
  if (id === 'status' || id === 'enabled' || title === 'status' || title === 'state') {
    return 'status'
  }
  if (
    id === 'number' ||
    id === 'billno' ||
    id === 'linknumber' ||
    id === 'barcode' ||
    id === 'mbarcode' ||
    id === 'code' ||
    title.includes('doc number') ||
    title.includes('barcode') ||
    title.includes('linked doc') ||
    title.includes('doc no')
  ) {
    return 'code'
  }
  if (
    id.includes('price') ||
    id.includes('amount') ||
    id.includes('money') ||
    id.includes('decimal') ||
    id.includes('debt') ||
    id.includes('count') ||
    id.includes('stock') ||
    id.includes('qty') ||
    title.includes('(₹)') ||
    title.includes('amount') ||
    title.includes('price') ||
    title.includes('qty') ||
    title.includes('total') ||
    title.includes('debt') ||
    title.includes('stock')
  ) {
    return 'numeric'
  }
  if (
    id === 'username' ||
    id === 'handspersonname' ||
    id === 'creatorname' ||
    title.includes('operator') ||
    title.includes('staff') ||
    title.includes('creator') ||
    title.includes('user')
  ) {
    return 'person'
  }
  return 'text'
}

/**
 * Determines whether a column is an action, selection, or internal control column
 */
export function isActionOrSelectColumn(col: ColumnDefinition): boolean {
  const id = (col.colId || col.key || col.dataIndex || col.field || '').toLowerCase()
  const title = getColumnTitle(col).toLowerCase().trim()
  return (
    id === 'action' ||
    id === '__select__' ||
    id === 'ag-grid-selectioncolumn' ||
    id === 'ag-grid-autocolumn' ||
    title === 'action' ||
    title === 'operation' ||
    title === 'stockdetails' ||
    title === ''
  )
}

/**
 * Recursively extracts plain text from React nodes, components, and elements
 */
function extractNodeText(node: any): string {
  if (node === null || node === undefined || node === false) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) {
    return node.map(extractNodeText).filter(Boolean).join(' ')
  }
  if (typeof node === 'object') {
    if ('props' in node) {
      return extractNodeText(node.props?.children)
    }
  }
  return ''
}

/**
 * Extracts raw or rendered cell text for export/print from both Ant Design and AG Grid columns
 */
export function extractCellText(col: ColumnDefinition, record: any, rowIndex: number): string | number {
  const colKey = col.key || col.colId || col.dataIndex || col.field
  if (colKey === 'rowIndex') {
    return rowIndex + 1
  }

  // 1. Resolve raw value from field or dataIndex
  const field = col.field || col.dataIndex
  let val = field ? record[field] : undefined

  // 2. Resolve AG Grid valueGetter if present
  if (typeof col.valueGetter === 'function') {
    try {
      const calculated = col.valueGetter({
        data: record,
        node: { data: record, rowIndex },
        colDef: col,
        api: null,
        getValue: (f: string) => record[f],
      })
      if (calculated !== undefined && calculated !== null) {
        val = calculated
      }
    } catch {
      // fallback to field
    }
  }

  // 3. Resolve Ant Design render or React component
  if (typeof col.render === 'function') {
    try {
      const rendered = col.render(val, record, rowIndex)
      const text = extractNodeText(rendered)
      if (text) return text
    } catch {
      // fallback
    }
  }

  const cat = getColumnCategory(col)

  // 4. Translate status codes to business names
  if (cat === 'status') {
    const s = String(val ?? '').trim()
    if (s === '1' || s === 'true') return 'Approved'
    if (s === '0' || s === 'false') return 'Pending Approval'
    if (s === '2') return 'Rejected'
    if (s === '3') return 'Partial'
    if (s === '9') return 'Under Review'
  }

  // 5. Format numbers cleanly with thousand separators
  if (cat === 'numeric' && typeof val === 'number') {
    const id = (col.field || col.dataIndex || '').toLowerCase()
    const isQty = id.includes('count') || id.includes('qty') || id.includes('stock')
    if (isQty) {
      return val.toLocaleString('en-IN')
    }
    return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // 6. Nullish / empty handling
  if (val === null || val === undefined || val === '') return '-'
  if (typeof val === 'number') return val
  if (typeof val === 'boolean') return val ? 'Yes' : 'No'

  return String(val)
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

  // Filter out action / selection columns from export
  const exportCols = columns.filter((c) => !isActionOrSelectColumn(c))

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
  rows.push(exportCols.map((c) => getColumnTitle(c)))

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
 * Optimized for paper saving, one-line density, and smart column layout
 */
export function printTableReport(options: PrintReportOptions): void {
  const {
    title,
    companyName = 'ERPSystem',
    subtitle,
    summaryItems = [],
    columns,
    dataSource,
    orientation = columns.length > 6 ? 'landscape' : 'portrait',
  } = options

  // Filter out action / button / select columns
  const printCols = columns.filter((c) => !isActionOrSelectColumn(c))

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

  const tableHeaderHtml = printCols
    .map((col) => {
      const cat = getColumnCategory(col)
      const alignClass = cat === 'numeric' ? 'align-right' : cat === 'date' || cat === 'status' || cat === 'code' ? 'align-center' : 'align-left'
      const nowrapClass = cat !== 'text' ? 'nowrap' : ''
      return `<th class="${alignClass} ${nowrapClass}">${getColumnTitle(col)}</th>`
    })
    .join('')

  const tableBodyHtml = dataSource
    .map((record, rIndex) => {
      const cells = printCols
        .map((col) => {
          const val = extractCellText(col, record, rIndex)
          const cat = getColumnCategory(col)
          const alignClass = cat === 'numeric' ? 'align-right' : cat === 'date' || cat === 'status' || cat === 'code' ? 'align-center' : 'align-left'
          const nowrapClass = cat !== 'text' ? 'nowrap' : 'wrap-text'
          return `<td class="${alignClass} ${nowrapClass}">${val}</td>`
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
            margin: 8mm 10mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #1a1a1a;
            margin: 0;
            padding: 0;
            font-size: 10px;
            line-height: 1.3;
          }
          .header {
            text-align: center;
            margin-bottom: 8px;
            border-bottom: 2px solid #1677ff;
            padding-bottom: 6px;
          }
          .company {
            font-size: 12px;
            font-weight: 600;
            color: #595959;
            text-transform: uppercase;
            letter-spacing: 0.8px;
          }
          .title {
            font-size: 17px;
            font-weight: 700;
            color: #1677ff;
            margin: 2px 0;
          }
          .meta {
            font-size: 9.5px;
            color: #737373;
            display: flex;
            justify-content: space-between;
            margin-top: 4px;
          }
          .summary-banner {
            background-color: #f6ffed;
            border: 1px solid #b7eb8f;
            border-radius: 3px;
            padding: 5px 8px;
            margin-bottom: 8px;
            font-size: 10px;
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
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
            margin-top: 4px;
            margin-bottom: 8px;
          }
          th {
            background-color: #f5f5f5;
            color: #262626;
            font-weight: 600;
            border: 1px solid #bfbfbf;
            padding: 5px 5px;
            font-size: 9.5px;
            line-height: 1.2;
          }
          td {
            border: 1px solid #d9d9d9;
            padding: 3.5px 5px;
            font-size: 9.5px;
            line-height: 1.25;
          }
          tr:nth-child(even) td {
            background-color: #fafafa;
          }
          tr {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .nowrap {
            white-space: nowrap !important;
            width: 1%;
          }
          .wrap-text {
            white-space: normal;
            word-break: break-word;
            overflow-wrap: break-word;
          }
          .align-right {
            text-align: right;
          }
          .align-left {
            text-align: left;
          }
          .align-center {
            text-align: center;
          }
          .footer {
            margin-top: 10px;
            padding-top: 6px;
            border-top: 1px solid #d9d9d9;
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            color: #8c8c8c;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company">${companyName}</div>
          <div class="title">${title}</div>
          ${subtitle ? `<div style="font-size: 11px; color: #595959;">${subtitle}</div>` : ''}
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
            ${tableBodyHtml || '<tr><td colspan="' + printCols.length + '" style="text-align:center; padding: 12px;">No data available</td></tr>'}
          </tbody>
        </table>

        <div class="footer">
          <span>ERPSystem Management System</span>
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
