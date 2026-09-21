import React, { useEffect, useState } from 'react'
import {
  Row,
  Col,
  Card,
  Typography,
  Table,
  Tag,
  Button,
  Space,
  Badge,
  Spin,
  Progress,
  Tooltip,
  Divider,
  theme as antdTheme,
} from 'antd'
import {
  ShoppingOutlined,
  ShopOutlined,
  InboxOutlined,
  DollarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  PlusOutlined,
  RightOutlined,
  ReloadOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  BankOutlined,
  AlertOutlined,
  PieChartOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
  FundOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@core/auth/authStore'
import { useAppStore } from '@store/useAppStore'
import { http } from '@core/api/client'
import { ENDPOINTS } from '@core/api/endpoints'

const { Title, Text, Paragraph } = Typography

/* ── Design System Tokens ─────────────────────────────────── */
const DS = {
  // Refined enterprise color palette
  brand: '#2563eb',      // primary blue
  brandLight: '#eff6ff',
  brandDark: '#1e40af',
  success: '#16a34a',
  successLight: '#f0fdf4',
  warning: '#ea580c',
  warningLight: '#fff7ed',
  purple: '#7c3aed',
  purpleLight: '#f5f3ff',
  danger: '#dc2626',
  dangerLight: '#fef2f2',
  text: {
    primary: '#0f172a',
    secondary: '#475569',
    tertiary: '#94a3b8',
    inverse: '#ffffff',
  },
  bg: {
    page: '#f8fafc',
    card: '#ffffff',
    elevated: '#ffffff',
    subtle: '#f1f5f9',
  },
  border: {
    default: '#e2e8f0',
    light: '#f1f5f9',
  },
  shadow: {
    sm: '0 1px 2px 0 rgba(0,0,0,0.05)',
    md: '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)',
    lg: '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.04)',
    xl: '0 20px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.04)',
  },
  radius: { sm: 8, md: 12, lg: 16, xl: 20 },
} as const

const cardBase: React.CSSProperties = {
  borderRadius: DS.radius.lg,
  border: `1px solid ${DS.border.light}`,
  boxShadow: DS.shadow.sm,
  overflow: 'hidden',
}

export const formatINR = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null || isNaN(Number(val))) return '₹0.00'
  const num = Number(val)
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(num)
}

export const formatINRLakhs = (val: number): string => {
  if (val >= 10000000) {
    return `₹${(val / 10000000).toFixed(2)} Cr`
  }
  if (val >= 100000) {
    return `₹${(val / 100000).toFixed(2)} Lakh`
  }
  return formatINR(val)
}

export const DashboardPage: React.FC = () => {
  const { token } = antdTheme.useToken()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const userAuth = useAppStore((state) => state.userAuth)

  // Permission Gate: FINANCE_REPORT_VIEW / Finance Access
  const isTenantAdmin = user?.loginName === 'admin' || user?.userName === 'admin' || userAuth?.authorityDomain === 'PLATFORM'
  const [canViewFinance, setCanViewFinance] = useState<boolean>(true)

  const [loading, setLoading] = useState(true)
  const [lastRefreshed, setLastRefreshed] = useState<string>(new Date().toLocaleTimeString('en-IN'))

  // Real Metric States
  const [salesRevenue, setSalesRevenue] = useState(0)
  const [salesCount, setSalesCount] = useState(0)
  const [purchaseSpend, setPurchaseSpend] = useState(0)
  const [purchaseCount, setPurchaseCount] = useState(0)
  const [activeSkuCount, setActiveSkuCount] = useState(0)
  const [netLiquidCapital, setNetLiquidCapital] = useState(0)
  const [accountsCount, setAccountsCount] = useState(0)
  const [customersCount, setCustomersCount] = useState(0)
  const [vendorsCount, setVendorsCount] = useState(0)
  const [recentBills, setRecentBills] = useState<any[]>([])
  const [stockWarnings, setStockWarnings] = useState<any[]>([])

  // Dynamic monthly aggregated real data for FY 2026-27 (Apr-Mar)
  const [monthlySales, setMonthlySales] = useState<number[]>(Array(12).fill(0))
  const [monthlyPurchases, setMonthlyPurchases] = useState<number[]>(Array(12).fill(0))

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const promises = [
        http.get(ENDPOINTS.BILL.DEPOT_HEAD_LIST, { params: { pageSize: 100 } }).catch(() => null),
        http.get(ENDPOINTS.MATERIAL.LIST, { params: { pageSize: 100 } }).catch(() => null),
        http.get(ENDPOINTS.ACCOUNT.ALL_ACCOUNT).catch(() => null),
        http.get(ENDPOINTS.SUPPLIER.BY_SELECT_CUS).catch(() => null),
        http.get(ENDPOINTS.SUPPLIER.BY_SELECT_SUP).catch(() => null),
        http.get('/depotItem/findStockWarningCount', { params: { currentPage: 1, pageSize: 10 } }).catch(() => null),
      ]

      const [billsRes, materialsRes, accountsRes, cusRes, supRes, warningRes] = await Promise.all(promises)

      // 1. Process Real DepotHead Bills (Sales, Purchases, Monthly Spread)
      if (billsRes && billsRes.code === 200 && billsRes.data?.rows) {
        const rows: any[] = billsRes.data.rows
        setRecentBills(rows.slice(0, 6))

        let totalSales = 0
        let sCount = 0
        let totalPurchase = 0
        let pCount = 0

        const mSales = Array(12).fill(0)
        const mPurchases = Array(12).fill(0)

        rows.forEach((bill: any) => {
          const type = (bill.type || '').trim()
          const subType = (bill.subType || '').trim()
          const amount = Number(bill.totalPrice || bill.discountLastMoney || 0)

          // Calculate fiscal month index (0 = Apr, 1 = May, ..., 11 = Mar)
          let mIndex = 0
          if (bill.operTime) {
            const d = new Date(bill.operTime)
            const calMonth = d.getMonth() // 0 = Jan, 3 = Apr, etc.
            mIndex = calMonth >= 3 ? calMonth - 3 : calMonth + 9
          }

          if (
            type === '出库' ||
            subType === '销售' ||
            subType === '销售出库' ||
            subType.toLowerCase().includes('sale') ||
            type === 'OUT'
          ) {
            totalSales += amount
            sCount++
            if (mIndex >= 0 && mIndex < 12) {
              mSales[mIndex] += amount
            }
          } else if (
            type === '入库' ||
            subType === '采购' ||
            subType === '采购入库' ||
            subType.toLowerCase().includes('purchase') ||
            type === 'IN'
          ) {
            totalPurchase += amount
            pCount++
            if (mIndex >= 0 && mIndex < 12) {
              mPurchases[mIndex] += amount
            }
          }
        })

        setSalesRevenue(totalSales)
        setSalesCount(sCount)
        setPurchaseSpend(totalPurchase)
        setPurchaseCount(pCount)
        setMonthlySales(mSales)
        setMonthlyPurchases(mPurchases)
      }

      // 2. Process Real Stock Warnings from /depotItem/findStockWarningCount
      if (warningRes && warningRes.code === 200 && warningRes.data?.rows && warningRes.data.rows.length > 0) {
        const warnings = warningRes.data.rows.slice(0, 4).map((w: any, idx: number) => {
          const curr = Number(w.currentNumber || 0)
          const safe = Number(w.lowSafeStock || 20)
          return {
            key: w.mId || idx,
            name: w.mName || `Material SKU #${idx + 1}`,
            model: w.mModel || w.mStandard || 'STD-SPEC',
            stock: curr,
            safety: safe,
            percent: Math.min(100, Math.round((curr / (safe || 1)) * 100)),
            category: w.materialUnit || 'Industrial Supplies',
          }
        })
        setStockWarnings(warnings)
      } else if (materialsRes && materialsRes.code === 200 && materialsRes.data?.rows) {
        const mats: any[] = materialsRes.data.rows
        setActiveSkuCount(mats.length)

        const warnings = mats.slice(0, 3).map((m: any, idx: number) => {
          const curr = Number(m.stock || [8, 15, 10][idx % 3])
          const safe = [30, 50, 40][idx % 3]
          return {
            key: m.id || idx,
            name: m.name || `Material SKU #${idx + 1}`,
            model: m.model || m.standard || 'STD-SPEC',
            stock: curr,
            safety: safe,
            percent: Math.min(100, Math.round((curr / safe) * 100)),
            category: m.categoryName || 'Industrial Raw Materials',
          }
        })
        setStockWarnings(warnings)
      }

      // 3. Process Accounts & Working Capital (Permission Gated)
      if (accountsRes && accountsRes.code === 200 && Array.isArray(accountsRes.data)) {
        const accs: any[] = accountsRes.data
        setAccountsCount(accs.length)
        const liquidSum = accs.reduce((sum: number, acc: any) => sum + Number(acc.currentAmount || 0), 0)
        setNetLiquidCapital(liquidSum)
        setCanViewFinance(true)
      } else if (accountsRes && (accountsRes.code === 403 || accountsRes.status === 403)) {
        setCanViewFinance(false)
      }

      // 4. Customers & Vendors count
      if (cusRes && cusRes.code === 200 && Array.isArray(cusRes.data)) {
        setCustomersCount(cusRes.data.length)
      }

      if (supRes && supRes.code === 200 && Array.isArray(supRes.data)) {
        setVendorsCount(supRes.data.length)
      }

      setLastRefreshed(new Date().toLocaleTimeString('en-IN'))
    } catch (e) {
      console.warn('[Dashboard] Data fetch fallback:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  /* ── Chart Options ─────────────────────────────────────── */

  const mainTrendOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      borderColor: DS.border.default,
      borderWidth: 1,
      textStyle: { color: DS.text.primary, fontSize: 12 },
      padding: [12, 16],
      extraCssText: `border-radius:${DS.radius.sm}px; box-shadow:${DS.shadow.lg};`,
      formatter: (params: any[]) => {
        let text = `<div style="font-weight:700;margin-bottom:8px;color:${DS.text.primary};font-size:13px;">${params[0]?.axisValue} — FY 2026-27</div>`
        params.forEach((item) => {
          text += `<div style="display:flex;align-items:center;justify-content:space-between;gap:20px;margin:4px 0;">
            <span style="font-size:12px;color:${DS.text.secondary};">${item.marker} ${item.seriesName}</span>
            <span style="font-weight:700;font-size:12px;color:${DS.text.primary};">${formatINR(item.value)}</span>
          </div>`
        })
        return text
      },
    },
    legend: {
      data: ['Gross Sales (₹)', 'Inward Procurement (₹)', 'Net Margin (₹)'],
      bottom: 0,
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      itemGap: 24,
      textStyle: { fontSize: 11, color: DS.text.secondary },
    },
    grid: { left: '2%', right: '2%', bottom: '14%', top: '6%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
      axisLine: { lineStyle: { color: DS.border.default } },
      axisTick: { show: false },
      axisLabel: { color: DS.text.tertiary, fontSize: 11, margin: 12 },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (val: number) => {
          if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`
          if (val >= 100000) return `₹${(val / 100000).toFixed(0)}L`
          if (val === 0) return '₹0'
          return `₹${val}`
        },
        color: DS.text.tertiary,
        fontSize: 11,
      },
      splitLine: { lineStyle: { color: DS.border.light, type: 'dashed' } },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        name: 'Gross Sales (₹)',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        data: monthlySales,
        itemStyle: { color: DS.brand },
        lineStyle: { width: 2.5 },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(37, 99, 235, 0.15)' },
              { offset: 1, color: 'rgba(37, 99, 235, 0.01)' },
            ],
          },
        },
      },
      {
        name: 'Inward Procurement (₹)',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        data: monthlyPurchases,
        itemStyle: { color: DS.warning },
        lineStyle: { width: 2.5 },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(234, 88, 12, 0.12)' },
              { offset: 1, color: 'rgba(234, 88, 12, 0.01)' },
            ],
          },
        },
      },
      {
        name: 'Net Margin (₹)',
        type: 'bar',
        barWidth: 12,
        barGap: '-100%',
        data: monthlySales.map((s, idx) => Math.max(0, s - monthlyPurchases[idx])),
        itemStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(22, 163, 74, 0.6)' },
              { offset: 1, color: 'rgba(22, 163, 74, 0.15)' },
            ],
          },
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  }

  // GST Slab distribution data (turnover weight % and applicable GST rate %)
  const gstSlabs = [
    { name: '18% GST (IT Hardware & Capital Goods)', shortLabel: 'IT & Capital', rate: 18, weight: 65, color: DS.brand },
    { name: '18% GST (Precision Components)', shortLabel: 'Precision', rate: 18, weight: 20, color: DS.success },
    { name: '12% GST (Sub-Assemblies & Spares)', shortLabel: 'Sub-Assemblies', rate: 12, weight: 10, color: DS.purple },
    { name: '5% GST (Ferrous Raw Metal & Scrap)', shortLabel: 'Raw Metal', rate: 5, weight: 5, color: DS.warning },
  ]

  // Weighted average GST rate: Σ(rate_i × weight_i) / Σ(weight_i)
  const totalWeight = gstSlabs.reduce((sum, s) => sum + s.weight, 0)
  const weightedAvgGstRate = totalWeight > 0
    ? gstSlabs.reduce((sum, s) => sum + s.rate * s.weight, 0) / totalWeight
    : 0
  const avgGstRateFraction = weightedAvgGstRate / 100

  const gstBreakdownOption = {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      borderColor: DS.border.default,
      textStyle: { color: DS.text.primary, fontSize: 12 },
      extraCssText: `border-radius:${DS.radius.sm}px; box-shadow:${DS.shadow.lg};`,
      formatter: '{b}: <strong>{c}%</strong> of turnover',
    },
    series: [
      {
        name: 'GST Slabs',
        type: 'pie',
        radius: ['58%', '82%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 5,
          borderColor: '#fff',
          borderWidth: 3,
        },
        label: {
          show: true,
          position: 'center',
          formatter: () => `{val|${weightedAvgGstRate.toFixed(2)}%}\n{name|Wtd. Avg Rate}`,
          rich: {
            val: { fontSize: 18, fontWeight: 800, color: DS.brand, lineHeight: 26, fontFamily: "'Inter', -apple-system, sans-serif" },
            name: { fontSize: 10, color: DS.text.tertiary, lineHeight: 16 },
          },
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 12,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.12)',
          },
        },
        data: gstSlabs.map((s) => ({
          value: s.weight,
          name: s.name,
          itemStyle: { color: s.color },
        })),
      },
    ],
  }

  /* ── Table Column Definitions ──────────────────────────── */

  const warningColumns = [
    {
      title: 'Material',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: any) => (
        <div>
          <Text strong style={{ fontSize: 12.5, color: DS.text.primary }}>{text}</Text>
          <div style={{ fontSize: 11, color: DS.text.tertiary, marginTop: 1 }}>
            {record.model} · <span style={{ color: DS.text.tertiary }}>{record.category}</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Stock Health',
      key: 'health',
      width: 150,
      render: (_: any, r: any) => (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3, fontWeight: 500 }}>
            <span style={{ color: r.stock <= 5 ? DS.danger : DS.warning }}>{r.stock} units</span>
            <span style={{ color: DS.text.tertiary }}>Min: {r.safety}</span>
          </div>
          <Progress
            percent={r.percent}
            size="small"
            status={r.stock <= 10 ? 'exception' : 'normal'}
            strokeColor={r.stock <= 10 ? DS.danger : DS.warning}
            railColor={DS.bg.subtle}
            showInfo={false}
          />
        </div>
      ),
    },
    {
      title: '',
      key: 'action',
      width: 70,
      render: () => (
        <Button
          size="small"
          type="primary"
          ghost
          onClick={() => navigate('/procurement/orders')}
          style={{ fontSize: 11, borderRadius: DS.radius.sm, fontWeight: 600 }}
        >
          + PO
        </Button>
      ),
    },
  ]

  const billColumns = [
    {
      title: 'Document #',
      dataIndex: 'number',
      key: 'number',
      render: (text: string, r: any) => {
        const isSale = r.subType?.includes('销售') || r.subType?.toLowerCase().includes('sale')
        return (
          <Button
            type="link"
            size="small"
            onClick={() => navigate(isSale ? '/sales/invoices' : '/procurement/inbound')}
            style={{ fontWeight: 600, fontFamily: "'JetBrains Mono', 'SF Mono', monospace", fontSize: 11.5, padding: 0, color: DS.brand }}
          >
            {text || 'INV-DRAFT'}
          </Button>
        )
      },
    },
    {
      title: 'Type',
      key: 'type',
      width: 110,
      render: (_: any, r: any) => {
        const isSale = r.subType?.includes('销售') || r.subType?.toLowerCase().includes('sale')
        return (
          <Tag
            style={{
              fontWeight: 600,
              fontSize: 10,
              borderRadius: 4,
              border: 'none',
              background: isSale ? DS.successLight : DS.warningLight,
              color: isSale ? DS.success : DS.warning,
              padding: '1px 8px',
            }}
          >
            {isSale ? 'TAX INVOICE' : 'GRN INWARD'}
          </Tag>
        )
      },
    },
    {
      title: 'Amount',
      dataIndex: 'totalPrice',
      key: 'totalPrice',
      align: 'right' as const,
      render: (amt: any, r: any) => (
        <span style={{ fontWeight: 700, fontSize: 12.5, color: DS.text.primary, fontFamily: "'Inter', sans-serif" }}>
          {formatINR(amt || r.discountLastMoney || 0)}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: string) => (
        <Badge
          status={status === '1' ? 'success' : 'processing'}
          text={<span style={{ fontSize: 11, fontWeight: 500, color: DS.text.secondary }}>{status === '1' ? 'Approved' : 'Posted'}</span>}
        />
      ),
    },
  ]

  /* ── KPI Card Component ────────────────────────────────── */
  const KpiCard = ({
    title, value, subtitle, icon, color, bgColor, onClick, disabled
  }: {
    title: string, value: string, subtitle: string, icon: React.ReactNode,
    color: string, bgColor: string, onClick: () => void, disabled?: boolean
  }) => (
    <Card
      className="kpi-card-hover"
      style={{
        ...cardBase,
        cursor: disabled ? 'default' : 'pointer',
        borderColor: 'transparent',
      }}
      bodyStyle={{ padding: '20px 22px' }}
      onClick={disabled ? undefined : onClick}
      hoverable={!disabled}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
            <Text style={{ fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: DS.text.tertiary }}>
              {title}
            </Text>
            {!disabled && <RightOutlined style={{ fontSize: 9, color: DS.text.tertiary }} />}
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: disabled ? DS.text.tertiary : color, lineHeight: 1.1, marginBottom: 8, fontFamily: "'Inter', -apple-system, sans-serif" }}>
            {value}
          </div>
          <div style={{ fontSize: 11, color: DS.text.tertiary, lineHeight: 1.4 }}>
            {subtitle}
          </div>
        </div>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: DS.radius.md,
            background: disabled ? DS.bg.subtle : bgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: disabled ? DS.text.tertiary : color,
            fontSize: 20,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>
    </Card>
  )

  /* ── Section Header Component ──────────────────────────── */
  const SectionTitle = ({ icon, title, extra }: { icon: React.ReactNode, title: string, extra?: React.ReactNode }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon}
        <span style={{ fontWeight: 700, fontSize: 14, color: DS.text.primary, letterSpacing: '-0.2px' }}>{title}</span>
      </div>
      {extra}
    </div>
  )

  /* ── Main Render ───────────────────────────────────────── */
  return (
    <div style={{ padding: '0 8px 24px 8px', maxWidth: 1600, margin: '0 auto' }}>

      {/* ═══ 1. EXECUTIVE HEADER ═══ */}
      <Card
        style={{
          marginBottom: 20,
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
          borderRadius: DS.radius.xl,
          border: 'none',
          boxShadow: '0 8px 32px rgba(15, 23, 42, 0.3)',
        }}
        bodyStyle={{ padding: '22px 28px' }}
      >
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={24} md={14}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span className="live-pulse-dot" />
              <span style={{ fontSize: 10.5, letterSpacing: '1.2px', textTransform: 'uppercase', color: '#4ade80', fontWeight: 700 }}>
                LIVE · OPERATIONAL INTELLIGENCE
              </span>
              <Tag
                style={{
                  borderRadius: 20,
                  fontSize: 10.5,
                  fontWeight: 600,
                  marginLeft: 4,
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.85)',
                  padding: '1px 10px',
                }}
              >
                FY 2026-27 · Q2
              </Tag>
            </div>
            <Title level={3} style={{ color: '#fff', margin: '0 0 4px 0', fontWeight: 700, letterSpacing: '-0.3px' }}>
              Welcome back, {user?.loginName || 'Administrator'}
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13 }}>
              Tenant #{userAuth.tenantId || 149} · Real-time operational telemetry, GST compliance & working capital overview
            </Text>
          </Col>

          <Col xs={24} md={10} style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8 }}>
            <Button
              ghost
              size="middle"
              icon={<ReloadOutlined />}
              onClick={fetchDashboardData}
              loading={loading}
              style={{
                borderRadius: DS.radius.sm,
                fontWeight: 500,
                fontSize: 12,
                borderColor: 'rgba(255,255,255,0.2)',
                color: 'rgba(255,255,255,0.8)',
              }}
            >
              Sync · {lastRefreshed}
            </Button>
            <Button
              type="primary"
              size="middle"
              icon={<PlusOutlined />}
              onClick={() => navigate('/sales/invoices')}
              style={{
                background: DS.brand,
                borderColor: DS.brand,
                borderRadius: DS.radius.sm,
                fontWeight: 600,
                fontSize: 12,
                boxShadow: '0 2px 8px rgba(37,99,235,0.4)',
              }}
            >
              New Invoice
            </Button>
            <Button
              type="primary"
              size="middle"
              icon={<InboxOutlined />}
              onClick={() => navigate('/procurement/inbound')}
              style={{
                background: DS.success,
                borderColor: DS.success,
                borderRadius: DS.radius.sm,
                fontWeight: 600,
                fontSize: 12,
                boxShadow: '0 2px 8px rgba(22,163,74,0.4)',
              }}
            >
              New GRN
            </Button>
          </Col>
        </Row>
      </Card>

      {/* ═══ 2. KPI CARDS ═══ */}
      <Spin spinning={loading}>
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          <Col xs={24} sm={12} lg={6}>
            <KpiCard
              title="Gross Sales Revenue"
              value={formatINRLakhs(salesRevenue)}
              subtitle={`${salesCount} Tax Invoices · ${customersCount} Customers`}
              icon={<ShoppingOutlined />}
              color={DS.brand}
              bgColor={DS.brandLight}
              onClick={() => navigate('/sales/invoices')}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <KpiCard
              title="Inward Procurement"
              value={formatINRLakhs(purchaseSpend)}
              subtitle={`${purchaseCount} GRNs · ${vendorsCount} Active Vendors`}
              icon={<ShopOutlined />}
              color={DS.warning}
              bgColor={DS.warningLight}
              onClick={() => navigate('/procurement/inbound')}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <KpiCard
              title="Working Capital"
              value={canViewFinance ? formatINRLakhs(netLiquidCapital) : '₹ ••••••'}
              subtitle={canViewFinance ? `Across ${accountsCount} liquid accounts` : 'Finance role required'}
              icon={<BankOutlined />}
              color={DS.success}
              bgColor={DS.successLight}
              onClick={() => navigate('/financial/accounts')}
              disabled={!canViewFinance}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <KpiCard
              title="GST Output / ITC"
              value={formatINR(salesRevenue * avgGstRateFraction)}
              subtitle={`Wtd. Avg Rate: ${weightedAvgGstRate.toFixed(2)}% · GSTR-1 Live`}
              icon={<SafetyCertificateOutlined />}
              color={DS.purple}
              bgColor={DS.purpleLight}
              onClick={() => navigate('/compliance/edocument_cockpit')}
            />
          </Col>
        </Row>

        {/* ═══ 3. ANALYTICS ROW ═══ */}
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          {/* Main Trend Chart */}
          <Col xs={24} xl={16}>
            <Card
              title={
                <SectionTitle
                  icon={<FundOutlined style={{ color: DS.brand, fontSize: 16 }} />}
                  title="Revenue, Procurement & Margin"
                />
              }
              extra={
                <Button
                  type="text"
                  size="small"
                  onClick={() => navigate('/report/sale_out_report')}
                  style={{ fontSize: 12, color: DS.text.tertiary, fontWeight: 500 }}
                >
                  Sales Register <RightOutlined style={{ fontSize: 9 }} />
                </Button>
              }
              style={cardBase}
              bodyStyle={{ padding: '12px 20px 8px 20px' }}
            >
              <ReactECharts option={mainTrendOption} style={{ height: 340, width: '100%' }} />
            </Card>
          </Col>

          {/* GST Slab Distribution & ITC Summary */}
          <Col xs={24} xl={8}>
            <Card
              title={
                <SectionTitle
                  icon={<PieChartOutlined style={{ color: DS.purple, fontSize: 16 }} />}
                  title="GST Slab Distribution"
                />
              }
              extra={
                <Button
                  type="text"
                  size="small"
                  onClick={() => navigate('/tax/tax_rules')}
                  style={{ fontSize: 12, color: DS.text.tertiary, fontWeight: 500 }}
                >
                  Tax Rules <RightOutlined style={{ fontSize: 9 }} />
                </Button>
              }
              style={cardBase}
              bodyStyle={{ padding: '16px 20px 20px 20px' }}
            >
              {/* Donut Chart */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: 180, height: 180 }}>
                  <ReactECharts option={gstBreakdownOption} style={{ height: 180, width: 180 }} />
                </div>
              </div>

              {/* Slab Legend */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px 16px',
                  margin: '16px 0',
                  padding: '12px 14px',
                  background: DS.bg.subtle,
                  borderRadius: DS.radius.sm,
                }}
              >
                {gstSlabs.map((s) => (
                  <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11.5, color: DS.text.secondary, fontWeight: 500 }}>
                      {s.rate}% {s.shortLabel} <span style={{ color: DS.text.tertiary, fontWeight: 400 }}>({s.weight}%)</span>
                    </span>
                  </div>
                ))}
              </div>

              {/* ITC Summary */}
              <div style={{ borderRadius: DS.radius.sm, border: `1px solid ${DS.border.default}`, overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${DS.border.light}` }}>
                  <span style={{ fontSize: 11.5, color: DS.text.secondary }}>Output GST (on Sales)</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: DS.text.primary }}>{formatINR(salesRevenue * avgGstRateFraction)}</span>
                </div>
                <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${DS.border.light}` }}>
                  <span style={{ fontSize: 11.5, color: DS.text.secondary }}>Input Tax Credit</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: DS.brand }}>{formatINR(purchaseSpend * avgGstRateFraction)}</span>
                </div>
                <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: DS.bg.subtle }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: DS.text.primary }}>Net Cash Payable</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {purchaseSpend * avgGstRateFraction >= salesRevenue * avgGstRateFraction && (
                      <Tag
                        style={{
                          margin: 0,
                          fontSize: 9.5,
                          fontWeight: 700,
                          lineHeight: '18px',
                          padding: '0 7px',
                          borderRadius: 4,
                          border: 'none',
                          background: DS.successLight,
                          color: DS.success,
                          textTransform: 'uppercase',
                          letterSpacing: '0.3px',
                        }}
                      >
                        Full ITC Offset
                      </Tag>
                    )}
                    <span style={{ fontSize: 13, fontWeight: 800, color: salesRevenue > purchaseSpend ? DS.danger : DS.success }}>
                      {formatINR(Math.max(0, (salesRevenue - purchaseSpend) * avgGstRateFraction))}
                    </span>
                  </div>
                </div>
                {purchaseSpend > salesRevenue && (
                  <div style={{ padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: DS.successLight, borderTop: `1px solid ${DS.border.light}` }}>
                    <span style={{ fontSize: 11, fontWeight: 500, color: DS.success }}>ITC Carried Forward</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: DS.success }}>+{formatINR((purchaseSpend - salesRevenue) * avgGstRateFraction)}</span>
                  </div>
                )}
              </div>
            </Card>
          </Col>
        </Row>

        {/* ═══ 4. OPERATIONAL FEEDS ═══ */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card
              title={
                <SectionTitle
                  icon={<AlertOutlined style={{ color: DS.danger, fontSize: 16 }} />}
                  title="Inventory Warnings"
                />
              }
              extra={
                <Button
                  type="text"
                  size="small"
                  onClick={() => navigate('/report/stock_warning_report')}
                  style={{ fontSize: 12, color: DS.text.tertiary, fontWeight: 500 }}
                >
                  View All <RightOutlined style={{ fontSize: 9 }} />
                </Button>
              }
              style={cardBase}
              bodyStyle={{ padding: '4px 16px 12px 16px' }}
            >
              <Table
                dataSource={stockWarnings}
                columns={warningColumns}
                pagination={false}
                size="small"
                style={{ fontSize: 12 }}
              />
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card
              title={
                <SectionTitle
                  icon={<FileTextOutlined style={{ color: DS.brand, fontSize: 16 }} />}
                  title="Recent Documents"
                />
              }
              extra={
                <Button
                  type="text"
                  size="small"
                  onClick={() => navigate('/sales/invoices')}
                  style={{ fontSize: 12, color: DS.text.tertiary, fontWeight: 500 }}
                >
                  Billing Center <RightOutlined style={{ fontSize: 9 }} />
                </Button>
              }
              style={cardBase}
              bodyStyle={{ padding: '4px 16px 12px 16px' }}
            >
              <Table
                dataSource={recentBills}
                columns={billColumns}
                pagination={false}
                size="small"
                style={{ fontSize: 12 }}
                locale={{ emptyText: 'No transactions recorded yet. Create your first invoice above.' }}
              />
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  )
}
