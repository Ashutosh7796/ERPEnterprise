export interface DashboardContext {
  fiscalYearLabel: string
  fiscalYearStart: string
  today: string
  gstReturnMonths: string[]
  tenantId?: number
  organizationId?: number | null
  currency?: string
  timezone?: string
  accountingBasis?: string
}

export type KpiMetricType = 'FLOW' | 'BALANCE'

export interface DashboardKpi {
  key: string
  label: string
  sublabel: string
  metricType: KpiMetricType
  value: number | null
  prevValue: number | null
  delta: number | null
  deltaPct: number | null
  hasComparison: boolean
  masked: boolean
  sparkline: number[]
  sparklineLabels: string[]
  link: string
  note: string
}

export interface DashboardSummary {
  periodLabel: string
  startDate: string
  endDate: string
  financeVisible: boolean
  kpis: DashboardKpi[]
}

export interface DashboardTrendPoint {
  period: string
  sales?: number | null
  purchases?: number | null
  revenue?: number | null
  expenses?: number | null
  cogs?: number | null
  grossProfit?: number | null
  profit?: number | null
  cashBalance?: number | null
}

export interface CashSummary {
  opening?: number | null
  operating?: number | null
  investing?: number | null
  financing?: number | null
  net?: number | null
  closing?: number | null
  reconciled: boolean
  note?: string | null
}

export interface ExpenseCategory {
  accountCode: string
  accountName: string
  amount: number
}

export interface DashboardFinancial {
  periodLabel: string
  startDate: string
  endDate: string
  financeVisible: boolean
  profitTrend: DashboardTrendPoint[]
  salesTrend: DashboardTrendPoint[]
  cash: CashSummary
  expensesTotal?: number | null
  expensesPrevTotal?: number | null
  expenseCategories: ExpenseCategory[]
}

export type AgingBucketKey = '0-30' | '31-60' | '61-90' | '90+'

export interface AgingBucket {
  bucket: string
  partyCount: number
  amount: number
  estimated: boolean
}

export interface PartyOutstanding {
  partyId?: number | null
  partyName?: string | null
  outstanding: number
  opening: number
}

export interface ReceivablesPosition {
  total?: number | null
  opening?: number | null
  partyCount: number
  aging: AgingBucket[]
  topParties: PartyOutstanding[]
  note: string
}

export interface PayablesPosition {
  total?: number | null
  opening?: number | null
  partyCount: number
  aging: AgingBucket[]
  topParties: PartyOutstanding[]
  note: string
}

export interface TopMover {
  materialId?: number | null
  materialName?: string | null
  quantity: number
  amount: number
}

export interface InventoryPosition {
  value?: number | null
  totalStock?: number | null
  lowStockCount: number
  outOfStockCount: number
  valueMasked: boolean
  topMovers: TopMover[]
  note: string
}

export interface GstRateBucket {
  taxRate?: number | null
  taxableValue: number
  taxAmount: number
  invoiceCount: number
}

export interface GstPosition {
  returnPeriod: string
  computed: boolean
  taxableSupplies?: number | null
  outputTax?: number | null
  itcAvailable?: number | null
  itcUtilized?: number | null
  cashPayable?: number | null
  closingItc?: number | null
  rateDistribution: GstRateBucket[]
  note: string
}

export interface DashboardPosition {
  periodLabel: string
  asOfDate: string
  financeVisible: boolean
  receivables: ReceivablesPosition
  payables: PayablesPosition
  inventory: InventoryPosition
  gst: GstPosition
}

export type ActionSeverity = 'high' | 'medium' | 'info'

export interface ActionItem {
  severity: ActionSeverity
  category: string
  title: string
  description: string
  route?: string
  count: number
  amount?: number | null
  amountMasked: boolean
  note?: string
}

export type RecentKind = 'INVOICE' | 'RECEIPT' | 'PAYMENT' | 'RETURN' | 'ORDER' | 'GRN'

export interface RecentTransaction {
  kind: RecentKind
  refNo?: string | null
  partyName?: string | null
  date?: string | null
  subType?: string | null
  status?: string | null
  amountLabel?: string | null
  amount?: number | null
  route?: string
}

export interface DashboardActivity {
  periodLabel: string
  startDate: string
  endDate: string
  financeVisible: boolean
  actions: ActionItem[]
  recent: RecentTransaction[]
}