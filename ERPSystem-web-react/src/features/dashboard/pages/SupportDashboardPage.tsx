import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Button,
  Tag,
  Form,
  Input,
  Select,
  InputNumber,
  Space,
  Table,
  Modal,
  Alert,
  Divider,
  Typography,
  Badge,
  App,
  Tabs,
  Tooltip,
  Segmented,
  Drawer,
  Timeline,
} from 'antd';
import {
  CustomerServiceOutlined,
  ClockCircleOutlined,
  SafetyCertificateOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  ThunderboltOutlined,
  HistoryOutlined,
  CheckCircleOutlined,
  ToolOutlined,
  UserSwitchOutlined,
  ArrowUpOutlined,
  ArrowRightOutlined,
  ReloadOutlined,
  FileTextOutlined,
  AuditOutlined,
  HourglassOutlined,
  CheckSquareOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  EyeOutlined,
  SearchOutlined,
  FireOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getToken, setToken } from '@core/api/client';
import { useAppStore } from '@store/useAppStore';
import { useSupportStore } from '@features/support/store/useSupportStore';
import { useSSE } from '@features/support/hooks/useSSE';
import {
  startSupportSession,
  getSessionHistory,
  getOperatorsList,
  transferSupportSession,
  escalateSupportSession,
  runDiagnostics,
  executeDataRepair,
  getTenantList,
  SupportSessionDto,
  OperatorDto,
} from '@features/support/api/supportApi';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

export interface CustomerTicket {
  id: string;
  tenantId: number;
  tenantName: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  subject: string;
  description: string;
  reportedBy: string;
  reportedAt: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'ESCALATED' | 'CLOSED';
  assignedOperator?: string;
  sessionCode?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  escalatedTo?: string;
  escalationReason?: string;
}

const INITIAL_TICKETS: CustomerTicket[] = [
  {
    id: 'INC-8091',
    tenantId: 149,
    tenantName: 'sam (Tenant #149)',
    category: 'SALES',
    priority: 'HIGH',
    subject: 'Sales Invoice GST Rounding Discrepancy on Rule 46 Bills',
    description: 'When generating GST tax invoices for multi-line items, rounding fraction difference occurs in SGST column.',
    reportedBy: 'Sam Administrator',
    reportedAt: '10 mins ago',
    status: 'IN_PROGRESS',
    assignedOperator: 'System Support Specialist',
    sessionCode: 'SUPPORT_SESSION',
  },
  {
    id: 'INC-8092',
    tenantId: 150,
    tenantName: 'Global Retail Logistics Ltd (Tenant #150)',
    category: 'INVENTORY',
    priority: 'MEDIUM',
    subject: 'Warehouse Depot #2 Stock Recalculation after Inter-Depot Transfer',
    description: 'Material SKU 693821098231 physical count does not match ledger balance following bulk transfer.',
    reportedBy: 'Store Manager Alex',
    reportedAt: '25 mins ago',
    status: 'OPEN',
  },
  {
    id: 'INC-8093',
    tenantId: 151,
    tenantName: 'Apex Manufacturing Inc (Tenant #151)',
    category: 'FINANCE',
    priority: 'URGENT',
    subject: 'Advance Payment Receipt Allocation Reconciliation Error',
    description: 'Customer payment voucher #PV-2026-08 cannot link to invoice balance due to concurrency flag.',
    reportedBy: 'Chief Accountant Maria',
    reportedAt: '1 hour ago',
    status: 'ESCALATED',
    assignedOperator: 'System Support Specialist',
    escalatedTo: 'Tier 2 Database Engineering',
    escalationReason: 'Deadlock on transaction commit requiring backend ledger index rebuild.',
  },
  {
    id: 'INC-8094',
    tenantId: 149,
    tenantName: 'sam (Tenant #149)',
    category: 'TAX',
    priority: 'MEDIUM',
    subject: 'E-Invoice IRN QR Code Signature Verification Notice',
    description: 'Testing NIC sandbox schema response formatting for B2B e-way bill export.',
    reportedBy: 'Billing Officer David',
    reportedAt: '2 hours ago',
    status: 'RESOLVED',
    assignedOperator: 'System Support Specialist',
    resolvedAt: 'Today, 11:20 PM IST',
    resolutionNotes: 'Updated sandbox public key certificates and re-synced NIC token cache.',
  },
];

const formatIndianTime = (dateInput: any) => {
  if (!dateInput) return '09:00:00 AM';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return String(dateInput);
  }
};

export const SupportDashboardPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const navigate = useNavigate();
  const { fetchUserAuth } = useAppStore();
  const {
    activeSession,
    attendance,
    shiftWorkingSeconds,
    fetchActiveSession,
    fetchAttendance,
    pauseCurrentSession,
    resumeCurrentSession,
    endCurrentSession,
    incrementWorkingSeconds,
  } = useSupportStore();

  const [activeTabKey, setActiveTabKey] = useState('1');
  const [ticketFilter, setTicketFilter] = useState('ALL');
  const [searchTicketText, setSearchTicketText] = useState('');
  const [tenants, setTenants] = useState<any[]>([]);
  const [operators, setOperators] = useState<OperatorDto[]>([]);
  const [history, setHistory] = useState<SupportSessionDto[]>([]);
  const [tickets, setTickets] = useState<CustomerTicket[]>(INITIAL_TICKETS);
  const [isStarting, setIsStarting] = useState(false);
  const [diagRunning, setDiagRunning] = useState(false);
  const [diagReport, setDiagReport] = useState<any>(null);
  
  // Modals & Drawers
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isEscalateModalOpen, setIsEscalateModalOpen] = useState(false);
  const [selectedTicketForAction, setSelectedTicketForAction] = useState<CustomerTicket | null>(null);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);

  const [form] = Form.useForm();
  const [transferForm] = Form.useForm();
  const [escalateForm] = Form.useForm();
  const [resolveForm] = Form.useForm();

  // Initial load
  useEffect(() => {
    fetchActiveSession();
    fetchAttendance();
    loadTenants();
    loadOperators();
    loadMyHistory();

    const timer = setInterval(() => {
      incrementWorkingSeconds();
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Real-Time SSE Stream for Authorized Support Specialist
  useSSE({
    url: '/ERPSystem-boot/support/sse/specialist-stream',
    enabled: true,
    onEvent: async (eventType, data) => {
      if (eventType === 'SESSION_APPROVED') {
        // Authoritative verification before unlocking UI
        message.success('Tenant approved support session! Unlocking enterprise diagnostic workspace...');
        await fetchActiveSession();
      } else if (eventType === 'SESSION_REJECTED') {
        message.warning(`Tenant declined support request${data?.reason ? ': ' + data.reason : ''}`);
        await fetchActiveSession();
      } else if (eventType === 'SESSION_REVOKED') {
        message.info('Support session revoked / ended.');
        await fetchActiveSession();
      } else if (eventType === 'TICKET_UPDATE') {
        if (data?.ticket) {
          setTickets((prev) => [data.ticket, ...prev.filter((t) => t.id !== data.ticket.id)]);
        }
      }
    },
    onReconnectSync: async () => {
      await fetchActiveSession();
    },
  });

  const loadTenants = async () => {
    try {
      const res: any = await getTenantList();
      if (res && res.code === 200) {
        setTenants(res.data?.rows || res.data?.list || []);
      }
    } catch {
      setTenants([
        { tenantId: 149, loginName: 'sam (Tenant #149)' },
        { tenantId: 150, loginName: 'Global Retail Logistics Ltd (Tenant #150)' },
        { tenantId: 151, loginName: 'Apex Manufacturing Inc (Tenant #151)' },
      ]);
    }
  };

  const loadOperators = async () => {
    try {
      const res: any = await getOperatorsList();
      if (res && res.code === 200 && res.data?.staff) {
        setOperators(res.data.staff);
      }
    } catch {
      // ignore
    }
  };

  const loadMyHistory = async () => {
    try {
      const res: any = await getSessionHistory({ page: 1, size: 10 });
      if (res && res.code === 200 && res.data?.rows) {
        setHistory(res.data.rows);
      }
    } catch {
      // ignore
    }
  };

  const handleEnterClientDashboard = async (session: any) => {
    if (!session) return;
    if (session.status === 'PENDING_APPROVAL') {
      modal.info({
        title: 'Awaiting Customer Tenant Approval',
        content: `Tenant #${session.tenantId} (${session.tenantName}) has been notified. You will be able to enter their workspace as soon as the client accepts the request via their top notification bell.`,
        okText: 'Understood',
      });
      return;
    }

    const token = session.sessionCode || session.supportToken;
    if (!token) return;
    const current = getToken() || '';
    if (!current.startsWith('SUPPORT_')) {
      sessionStorage.setItem('ORIGINAL_OPERATOR_TOKEN', current);
    }
    setToken(token);
    await fetchUserAuth();
    message.success(`Mounted diagnostic session for ${session.tenantName}. Entering customer ERP workspace.`);
    navigate('/dashboard');
  };

  const handleStartSession = async (values: any) => {
    try {
      setIsStarting(true);
      const res: any = await startSupportSession({
        targetTenantId: values.targetTenantId,
        justification: values.justification,
        moduleScope: values.moduleScope || 'ALL_DIAGNOSTICS',
        accessMode: 'READ_ONLY',
        durationMinutes: values.durationMinutes || 30,
        category: values.category || 'GENERAL',
        priority: values.priority || 'MEDIUM',
        ticketId: values.ticketId,
      });

      if (res && res.code === 200 && res.data?.supportSession) {
        const session = res.data.supportSession;
        message.success('Support session request initiated! Awaiting customer consent confirmation.');
        await fetchActiveSession();
        form.resetFields();

        // Update corresponding ticket if matched
        if (values.ticketId) {
          setTickets((prev) =>
            prev.map((t) =>
              t.id === values.ticketId
                ? { ...t, status: 'IN_PROGRESS', assignedOperator: 'System Support Specialist', sessionCode: session.sessionCode }
                : t
            )
          );
        }
      } else {
        message.error(res?.msgTip || 'Failed to start support session.');
      }
    } catch (e: any) {
      message.error(e?.message || 'Error initiating support session');
    } finally {
      setIsStarting(false);
    }
  };

  const handleInitiateFromTicket = (ticket: CustomerTicket) => {
    form.setFieldsValue({
      targetTenantId: ticket.tenantId,
      category: ticket.category,
      priority: ticket.priority,
      moduleScope: ticket.category === 'SALES' ? 'SALES' : ticket.category === 'INVENTORY' ? 'INVENTORY' : ticket.category === 'FINANCE' ? 'FINANCE' : 'ALL_DIAGNOSTICS',
      durationMinutes: ticket.priority === 'URGENT' ? 60 : 30,
      justification: `Ticket #${ticket.id}: ${ticket.subject} - ${ticket.description}`,
      ticketId: ticket.id,
    });
    setActiveTabKey('1');
    message.info(`Pre-filled support launcher for Ticket #${ticket.id} (${ticket.tenantName}). Click Launch to notify customer.`);
  };

  const handleResolveTicket = (values: any) => {
    if (!selectedTicketForAction) return;
    const nowStr = `Today, ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })} IST`;
    
    setTickets((prev) =>
      prev.map((t) =>
        t.id === selectedTicketForAction.id
          ? {
              ...t,
              status: 'RESOLVED',
              resolvedAt: nowStr,
              resolutionNotes: values.resolutionNotes,
              assignedOperator: 'System Support Specialist',
            }
          : t
      )
    );

    message.success(`Ticket #${selectedTicketForAction.id} marked as RESOLVED.`);
    setIsResolveModalOpen(false);
    resolveForm.resetFields();
    setSelectedTicketForAction(null);
  };

  const handleEscalateTicket = async (values: any) => {
    if (!selectedTicketForAction && !activeSession) return;
    const targetTeam = values.escalationTeam || 'Tier 2 Engineering';
    const notes = values.notes || 'Escalated by Support Specialist';

    if (activeSession) {
      await escalateSupportSession(activeSession.sessionCode || activeSession.supportToken || '', targetTeam, notes);
      await fetchActiveSession();
    }

    if (selectedTicketForAction) {
      setTickets((prev) =>
        prev.map((t) =>
          t.id === selectedTicketForAction.id
            ? {
                ...t,
                status: 'ESCALATED',
                escalatedTo: targetTeam,
                escalationReason: notes,
              }
            : t
        )
      );
    }

    message.warning(`Case escalated to ${targetTeam}.`);
    setIsEscalateModalOpen(false);
    escalateForm.resetFields();
    setSelectedTicketForAction(null);
  };

  const handleCloseTicket = (ticket: CustomerTicket) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === ticket.id ? { ...t, status: 'CLOSED' } : t))
    );
    message.info(`Ticket #${ticket.id} has been archived & CLOSED.`);
  };

  const handleReopenTicket = (ticket: CustomerTicket) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === ticket.id ? { ...t, status: 'OPEN' } : t))
    );
    message.warning(`Ticket #${ticket.id} REOPENED for further investigation.`);
  };

  const handleTransfer = async (values: any) => {
    if (!activeSession) return;
    try {
      const res: any = await transferSupportSession(
        activeSession.sessionCode || activeSession.supportToken || '',
        values.targetUserId,
        values.reason
      );
      if (res && res.code === 200) {
        message.success('Session handed over successfully');
        setIsTransferModalOpen(false);
        await fetchActiveSession();
      } else {
        message.error(res?.msgTip || 'Failed to transfer session');
      }
    } catch (e: any) {
      message.error(e?.message || 'Transfer failed');
    }
  };

  const handleRunDiagnostics = async (tenantId?: number, subsystem?: string) => {
    try {
      setDiagRunning(true);
      const res: any = await runDiagnostics(tenantId || activeSession?.tenantId, subsystem || 'ALL');
      if (res && res.code === 200) {
        setDiagReport(res.data?.report);
        message.success('Multi-subsystem health diagnostics completed');
      }
    } catch (e: any) {
      message.error(e?.message || 'Diagnostics failed');
    } finally {
      setDiagRunning(false);
    }
  };

  const formatTime = (secs: number) => {
    const s = Math.max(0, secs);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`;
  };

  const isPendingApproval = activeSession?.status === 'PENDING_APPROVAL';
  const isActive = activeSession?.status === 'ACTIVE';
  const isPaused = activeSession?.status === 'PAUSED';

  // Filtered tickets
  const filteredTickets = tickets.filter((t) => {
    const matchFilter =
      ticketFilter === 'ALL' ||
      (ticketFilter === 'OPEN' && (t.status === 'OPEN' || t.status === 'IN_PROGRESS')) ||
      (ticketFilter === 'RESOLVED' && t.status === 'RESOLVED') ||
      (ticketFilter === 'ESCALATED' && t.status === 'ESCALATED') ||
      (ticketFilter === 'CLOSED' && t.status === 'CLOSED');

    const matchSearch =
      searchTicketText === '' ||
      t.id.toLowerCase().includes(searchTicketText.toLowerCase()) ||
      t.tenantName.toLowerCase().includes(searchTicketText.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchTicketText.toLowerCase());

    return matchFilter && matchSearch;
  });

  const openTicketsCount = tickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;
  const resolvedTicketsCount = tickets.filter((t) => t.status === 'RESOLVED').length;
  const escalatedTicketsCount = tickets.filter((t) => t.status === 'ESCALATED').length;

  const ticketColumns = [
    {
      title: 'Ticket ID',
      dataIndex: 'id',
      key: 'id',
      width: 110,
      render: (text: string) => <Text code style={{ fontWeight: 700, color: '#1677ff' }}>#{text}</Text>,
    },
    {
      title: 'Customer Tenant',
      dataIndex: 'tenantName',
      key: 'tenantName',
      width: 200,
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Issue Subject & Details',
      key: 'subject',
      render: (_: any, r: CustomerTicket) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{r.subject}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.description}</Text>
          {r.resolutionNotes && (
            <div style={{ marginTop: 6, padding: '4px 8px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 4, fontSize: 12 }}>
              <Text strong style={{ color: '#52c41a' }}>Resolution: </Text>
              <Text>{r.resolutionNotes}</Text>
            </div>
          )}
          {r.escalationReason && (
            <div style={{ marginTop: 6, padding: '4px 8px', background: '#fff2e8', border: '1px solid #ffbb96', borderRadius: 4, fontSize: 12 }}>
              <Text strong style={{ color: '#fa541c' }}>Escalated To: {r.escalatedTo} &bull; </Text>
              <Text>{r.escalationReason}</Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Category & Priority',
      key: 'category_priority',
      width: 160,
      render: (_: any, r: CustomerTicket) => {
        const pColor = r.priority === 'URGENT' ? 'error' : r.priority === 'HIGH' ? 'warning' : 'default';
        return (
          <Space vertical size={4}>
            <Tag color="cyan">{r.category}</Tag>
            <Tag color={pColor} style={{ fontWeight: 600 }}>{r.priority}</Tag>
          </Space>
        );
      },
    },
    {
      title: 'Lifecycle Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (s: string) => {
        if (s === 'OPEN') return <Tag color="blue" icon={<SyncOutlined spin />}>OPEN QUEUE</Tag>;
        if (s === 'IN_PROGRESS') return <Tag color="orange" icon={<HourglassOutlined />}>INVESTIGATING</Tag>;
        if (s === 'RESOLVED') return <Tag color="success" icon={<CheckCircleOutlined />}>RESOLVED</Tag>;
        if (s === 'ESCALATED') return <Tag color="purple" icon={<ArrowUpOutlined />}>ESCALATED</Tag>;
        return <Tag color="default">CLOSED</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 220,
      render: (_: any, r: CustomerTicket) => (
        <Space size="small" wrap>
          {r.status === 'OPEN' && (
            <Button
              type="primary"
              size="small"
              icon={<ThunderboltOutlined />}
              disabled={!!activeSession}
              onClick={() => handleInitiateFromTicket(r)}
            >
              Take Ticket
            </Button>
          )}

          {r.status === 'IN_PROGRESS' && (
            <>
              <Button
                type="primary"
                size="small"
                style={{ background: '#52c41a', borderColor: '#52c41a' }}
                icon={<CheckCircleOutlined />}
                onClick={() => {
                  setSelectedTicketForAction(r);
                  setIsResolveModalOpen(true);
                }}
              >
                Resolve
              </Button>
              <Button
                size="small"
                danger
                icon={<ArrowUpOutlined />}
                onClick={() => {
                  setSelectedTicketForAction(r);
                  setIsEscalateModalOpen(true);
                }}
              >
                Escalate
              </Button>
            </>
          )}

          {r.status === 'RESOLVED' && (
            <>
              <Button size="small" onClick={() => handleCloseTicket(r)}>
                Close
              </Button>
              <Button size="small" type="dashed" onClick={() => handleReopenTicket(r)}>
                Reopen
              </Button>
            </>
          )}

          {r.status === 'ESCALATED' && (
            <Button
              size="small"
              type="primary"
              style={{ background: '#52c41a', borderColor: '#52c41a' }}
              onClick={() => {
                setSelectedTicketForAction(r);
                setIsResolveModalOpen(true);
              }}
            >
              Resolve Escalation
            </Button>
          )}

          <Tooltip title="View Ticket Timeline Audit">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedTicketForAction(r);
                setIsAuditDrawerOpen(true);
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const historyColumns = [
    {
      title: 'Session Code',
      dataIndex: 'sessionCode',
      key: 'sessionCode',
      render: (text: string) => <Text code style={{ fontWeight: 600 }}>{text || 'SUPPORT_SESSION'}</Text>,
    },
    {
      title: 'Customer Tenant',
      dataIndex: 'tenantName',
      key: 'tenantName',
      render: (t: string, r: any) => <span>{t || `Tenant #${r.tenantId}`}</span>,
    },
    {
      title: 'Scope',
      dataIndex: 'moduleScope',
      key: 'moduleScope',
      render: (s: string) => <Tag color="blue">{s || 'ALL_DIAGNOSTICS'}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const color = status === 'ACTIVE' ? 'processing' : status === 'PENDING_APPROVAL' ? 'warning' : status === 'ENDED' ? 'default' : 'purple';
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: 'Duration',
      dataIndex: 'durationMinutes',
      key: 'durationMinutes',
      render: (dur: number) => `${dur || 30}m`,
    },
    {
      title: 'Justification & Audit',
      dataIndex: 'justification',
      key: 'justification',
      ellipsis: true,
    },
  ];

  const mainTabItems = [
    {
      key: '1',
      label: (
        <span>
          <ThunderboltOutlined />
          Support Center & Launcher
        </span>
      ),
      children: (
        <Row gutter={[20, 20]}>
          <Col xs={24} lg={12}>
            <Card
              title={
                <Space>
                  <SafetyCertificateOutlined style={{ color: '#1677ff' }} />
                  <span>Launch Customer Support Session</span>
                </Space>
              }
              variant="outlined"
              style={{ borderRadius: 8, height: '100%' }}
            >
              <Form form={form} layout="vertical" onFinish={handleStartSession} initialValues={{ durationMinutes: 30, moduleScope: 'ALL_DIAGNOSTICS', category: 'GENERAL', priority: 'MEDIUM' }}>
                <Form.Item
                  name="targetTenantId"
                  label="Customer Tenant"
                  rules={[{ required: true, message: 'Please select a customer tenant' }]}
                >
                  <Select placeholder="Search and select tenant..." showSearch optionFilterProp="children" disabled={!!activeSession}>
                    {tenants.map((t) => (
                      <Option key={t.tenantId} value={t.tenantId}>
                        {t.loginName} (ID: {t.tenantId})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="category" label="Issue Category">
                      <Select disabled={!!activeSession}>
                        <Option value="GENERAL">General Support</Option>
                        <Option value="SALES">Sales & Billing</Option>
                        <Option value="FINANCE">Financial Ledgers</Option>
                        <Option value="GST_TAX">GST & Invoicing</Option>
                        <Option value="INVENTORY">Depot & Stock</Option>
                        <Option value="SEQUENCE">Numbering / Sequence</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="priority" label="Priority Level">
                      <Select disabled={!!activeSession}>
                        <Option value="LOW">Low</Option>
                        <Option value="MEDIUM">Medium</Option>
                        <Option value="HIGH">High</Option>
                        <Option value="URGENT">Urgent</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="moduleScope" label="Diagnostic Scope">
                      <Select disabled={!!activeSession}>
                        <Option value="ALL_DIAGNOSTICS">All Diagnostic Modules</Option>
                        <Option value="SALES">Sales & Invoicing</Option>
                        <Option value="PURCHASE">Procurement & Bills</Option>
                        <Option value="FINANCE">Finance & Accounts</Option>
                        <Option value="INVENTORY">Inventory & Depots</Option>
                        <Option value="REPORT">Analytics & Reports</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="durationMinutes" label="Authorized Duration (Mins)">
                      <InputNumber min={15} max={60} style={{ width: '100%' }} disabled={!!activeSession} />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="ticketId" label="Linked Ticket ID (Optional)">
                  <Input placeholder="e.g. INC-8091" disabled={!!activeSession} />
                </Form.Item>

                <Form.Item
                  name="justification"
                  label="Business Justification & Problem Description"
                  rules={[{ required: true, min: 10, message: 'Please provide at least 10 characters justification' }]}
                >
                  <Input.TextArea
                    rows={3}
                    placeholder="Describe the issue reported by the customer (min 10 characters)..."
                    disabled={!!activeSession}
                  />
                </Form.Item>

                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<PlayCircleOutlined />}
                  loading={isStarting}
                  disabled={!!activeSession}
                  block
                  size="large"
                >
                  Launch Support Session Request
                </Button>
              </Form>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card
              title={
                <Space>
                  <ToolOutlined style={{ color: '#52c41a' }} />
                  <span>Subsystem Diagnostics & Health Quick-Check</span>
                </Space>
              }
              variant="outlined"
              style={{ borderRadius: 8, height: '100%' }}
            >
              <Paragraph type="secondary" style={{ fontSize: 13 }}>
                Execute zero-mutation automated health checks on customer tenant data schemas, sequence integrity, ledger balances, and GST snapshot rules.
              </Paragraph>

              <Space style={{ marginBottom: 16 }} wrap>
                <Button
                  icon={<ThunderboltOutlined />}
                  onClick={() => handleRunDiagnostics(activeSession?.tenantId, 'DATABASE_HEALTH')}
                  loading={diagRunning}
                >
                  Database Health
                </Button>
                <Button
                  icon={<SafetyCertificateOutlined />}
                  onClick={() => handleRunDiagnostics(activeSession?.tenantId, 'SEQUENCE_INTEGRITY')}
                  loading={diagRunning}
                >
                  Sequence Integrity
                </Button>
                <Button
                  icon={<AuditOutlined />}
                  onClick={() => handleRunDiagnostics(activeSession?.tenantId, 'LEDGER_BALANCES')}
                  loading={diagRunning}
                >
                  Ledger Balances
                </Button>
              </Space>

              {diagReport && (
                <div style={{ background: '#fafafa', padding: 12, borderRadius: 6, border: '1px solid #f0f0f0' }}>
                  <Text strong>Diagnostic Report Summary:</Text>
                  <pre style={{ fontSize: 11, marginTop: 8, maxHeight: 180, overflowY: 'auto' }}>
                    {JSON.stringify(diagReport, null, 2)}
                  </pre>
                </div>
              )}
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: '2',
      label: (
        <span>
          <FileTextOutlined />
          Customer Tickets & Resolution Lifecycle ({openTicketsCount})
        </span>
      ),
      children: (
        <Card variant="outlined" style={{ borderRadius: 8 }}>
          <Row justify="space-between" align="middle" style={{ marginBottom: 16 }} gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Segmented
                value={ticketFilter}
                onChange={(val) => setTicketFilter(val as string)}
                options={[
                  { label: `All (${tickets.length})`, value: 'ALL' },
                  { label: `Open Queue (${openTicketsCount})`, value: 'OPEN' },
                  { label: `Resolved (${resolvedTicketsCount})`, value: 'RESOLVED' },
                  { label: `Escalated (${escalatedTicketsCount})`, value: 'ESCALATED' },
                  { label: 'Closed', value: 'CLOSED' },
                ]}
              />
            </Col>
            <Col xs={24} md={8}>
              <Input
                placeholder="Search ticket ID, customer or subject..."
                prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                value={searchTicketText}
                onChange={(e) => setSearchTicketText(e.target.value)}
                allowClear
              />
            </Col>
          </Row>

          <Table
            dataSource={filteredTickets}
            columns={ticketColumns}
            rowKey="id"
            pagination={{ pageSize: 6 }}
            size="middle"
          />
        </Card>
      ),
    },
    {
      key: '3',
      label: (
        <span>
          <HistoryOutlined />
          My Support Session History Log
        </span>
      ),
      children: (
        <Card variant="outlined" style={{ borderRadius: 8 }}>
          <Table
            dataSource={history}
            columns={historyColumns}
            rowKey={(r) => r.sessionCode || r.id || Math.random().toString()}
            pagination={{ pageSize: 6 }}
            size="middle"
          />
        </Card>
      ),
    },
  ];

  return (
    <div style={{ padding: '16px 24px', background: '#f0f2f5', minHeight: '100vh' }}>
      {/* SHIFT & WORKFORCE STATUS HEADER */}
      <div style={{ marginBottom: 20, background: '#fff', padding: '16px 24px', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Row align="middle" justify="space-between" gutter={[16, 16]}>
          <Col xs={24} md={10}>
            <Space align="center" size="middle">
              <Badge status="processing" color="#52c41a" style={{ transform: 'scale(1.5)' }} />
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  <CustomerServiceOutlined style={{ color: '#1677ff', marginRight: 8 }} />
                  Support Operations Center &bull; Specialist Workspace
                </Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Shift Status: <Tag color="green">ONLINE</Tag> &bull; Policy: <Tag color="blue">Strict Read-Only Boundary</Tag>
                </Text>
              </div>
            </Space>
          </Col>
          <Col xs={24} md={14}>
            <Row gutter={[16, 8]} justify="end" align="middle">
              <Col>
                <div style={{ textAlign: 'right' }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>CLOCK IN TIME (IST)</Text>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#595959', fontFamily: 'monospace' }}>
                    {attendance?.clockInTime ? formatIndianTime(attendance.clockInTime) : '09:00:00 AM'}
                  </div>
                </div>
              </Col>
              <Col><div style={{ width: 1, height: 32, background: '#e8e8e8' }} /></Col>
              <Col>
                <div style={{ textAlign: 'right' }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>TODAY'S SHIFT TIME</Text>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#1677ff', fontFamily: 'monospace' }}>
                    <ClockCircleOutlined style={{ marginRight: 4 }} />
                    {formatTime(shiftWorkingSeconds)}
                  </div>
                </div>
              </Col>
              <Col><div style={{ width: 1, height: 32, background: '#e8e8e8' }} /></Col>
              <Col>
                <div style={{ textAlign: 'right' }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>SESSIONS COMPLETED</Text>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#52c41a', textAlign: 'center' }}>
                    {attendance?.sessionsHandledToday ?? 0}
                  </div>
                </div>
              </Col>
              <Col>
                <Button icon={<ReloadOutlined />} onClick={() => { fetchActiveSession(); fetchAttendance(); loadMyHistory(); }}>
                  Refresh
                </Button>
              </Col>
            </Row>
          </Col>
        </Row>
      </div>

      {/* KPI METRIC CARDS ROW */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6} lg={6}>
          <Card variant="outlined" style={{ borderRadius: 8 }}>
            <Statistic
              title="Active In-Flight Session"
              value={activeSession ? (isActive ? 'Active' : isPendingApproval ? 'Pending Approval' : activeSession.status) : 'Idle (Ready)'}
              prefix={<ThunderboltOutlined style={{ color: isActive ? '#52c41a' : isPendingApproval ? '#faad14' : '#8c8c8c' }} />}
              styles={{ content: { fontSize: 16, fontWeight: 700, color: isActive ? '#52c41a' : isPendingApproval ? '#faad14' : '#595959' } }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={6}>
          <Card variant="outlined" style={{ borderRadius: 8 }}>
            <Statistic
              title="Open Ticket Queue"
              value={openTicketsCount}
              prefix={<FileTextOutlined style={{ color: '#1677ff' }} />}
              styles={{ content: { fontSize: 20, fontWeight: 700, color: '#1677ff' } }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={6}>
          <Card variant="outlined" style={{ borderRadius: 8 }}>
            <Statistic
              title="Resolved Cases Today"
              value={resolvedTicketsCount}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              styles={{ content: { fontSize: 20, fontWeight: 700, color: '#52c41a' } }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={6}>
          <Card variant="outlined" style={{ borderRadius: 8 }}>
            <Statistic
              title="Escalated to Tier 2 / Infra"
              value={escalatedTicketsCount}
              prefix={<ArrowUpOutlined style={{ color: '#fa541c' }} />}
              styles={{ content: { fontSize: 20, fontWeight: 700, color: '#fa541c' } }}
            />
          </Card>
        </Col>
      </Row>

      {/* ACTIVE / PENDING SESSION HERO CARD */}
      {activeSession && (activeSession.status === 'ACTIVE' || activeSession.status === 'PENDING_APPROVAL' || activeSession.status === 'PAUSED' || activeSession.status === 'ESCALATED') ? (
        <Card
          variant="outlined"
          style={{
            marginBottom: 24,
            borderColor: isActive ? '#52c41a' : '#faad14',
            background: isActive ? '#f6ffed' : '#fffbe6',
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
          }}
        >
          <Row justify="space-between" align="middle" gutter={[16, 16]}>
            <Col xs={24} md={13}>
              <div>
                <Space align="center" wrap>
                  <Badge status={isActive ? 'processing' : 'warning'} />
                  <Title level={4} style={{ margin: 0, color: '#262626' }}>
                    {isActive ? 'Active Support Session:' : 'Support Request Pending Consent:'} {activeSession.tenantName} (Tenant #{activeSession.tenantId})
                  </Title>
                  <Tag color={isActive ? 'success' : 'warning'}>
                    {isPendingApproval ? 'PENDING CLIENT APPROVAL' : activeSession.status}
                  </Tag>
                  <Tag color="purple">{activeSession.accessMode}</Tag>
                  <Tag color="blue">{activeSession.moduleScope}</Tag>
                </Space>

                {isPendingApproval && (
                  <Alert
                    type="warning"
                    showIcon
                    icon={<HourglassOutlined />}
                    title="Awaiting Customer Tenant Approval"
                    description={`An authorization prompt was sent to ${activeSession.tenantName}. The diagnostic session timer will begin once the customer accepts the request via their top notification bell.`}
                    style={{ margin: '12px 0 8px 0', borderRadius: 6 }}
                  />
                )}

                <div style={{ marginTop: 8, fontSize: 13, color: '#595959' }}>
                  <strong>Justification:</strong> {activeSession.justification}
                </div>
              </div>
            </Col>

            <Col xs={24} md={11} style={{ textAlign: 'right' }}>
              <Space size="middle" wrap>
                <Button
                  type="primary"
                  size="large"
                  icon={<ArrowRightOutlined />}
                  disabled={isPendingApproval}
                  onClick={() => handleEnterClientDashboard(activeSession)}
                  style={{
                    background: isPendingApproval ? '#d9d9d9' : '#52c41a',
                    borderColor: isPendingApproval ? '#d9d9d9' : '#52c41a',
                    fontWeight: 600,
                  }}
                >
                  {isPendingApproval ? 'Locked (Awaiting Approval)' : 'Enter Client ERP Workspace'}
                </Button>

                {isActive && (
                  <Button icon={<PauseCircleOutlined />} onClick={pauseCurrentSession}>
                    Pause
                  </Button>
                )}

                {isPaused && (
                  <Button type="primary" icon={<PlayCircleOutlined />} onClick={resumeCurrentSession}>
                    Resume
                  </Button>
                )}

                <Button icon={<UserSwitchOutlined />} onClick={() => setIsTransferModalOpen(true)}>
                  Transfer
                </Button>

                <Button danger icon={<StopOutlined />} onClick={endCurrentSession}>
                  End Session
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>
      ) : null}

      {/* MAIN WORKSPACE TABS */}
      <Card variant="outlined" style={{ borderRadius: 8 }}>
        <Tabs activeKey={activeTabKey} onChange={setActiveTabKey} size="large" items={mainTabItems} />
      </Card>

      {/* RESOLVE TICKET MODAL */}
      <Modal
        title={`Resolve Case: Ticket #${selectedTicketForAction?.id}`}
        open={isResolveModalOpen}
        onCancel={() => setIsResolveModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={resolveForm} layout="vertical" onFinish={handleResolveTicket}>
          <Form.Item label="Customer Tenant">
            <Input value={selectedTicketForAction?.tenantName} disabled />
          </Form.Item>
          <Form.Item label="Issue Subject">
            <Input value={selectedTicketForAction?.subject} disabled />
          </Form.Item>
          <Form.Item
            name="resolutionNotes"
            label="Resolution Summary & Action Taken"
            rules={[{ required: true, min: 10, message: 'Please document resolution steps taken' }]}
          >
            <Input.TextArea
              rows={4}
              placeholder="e.g. Recalculated stock balance ledger, adjusted tax round-off rules, cleared cache..."
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsResolveModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" style={{ background: '#52c41a', borderColor: '#52c41a' }}>
                Confirm & Mark Resolved
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* ESCALATE MODAL */}
      <Modal
        title="Escalate Case to Tier 2 / Engineering"
        open={isEscalateModalOpen}
        onCancel={() => setIsEscalateModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={escalateForm} layout="vertical" onFinish={handleEscalateTicket}>
          <Form.Item name="escalationTeam" label="Escalate To Team" rules={[{ required: true }]}>
            <Select placeholder="Select engineering / tier 2 group...">
              <Option value="Tier 2 Database Engineering">Tier 2 Database Engineering (DBA / Ledger)</Option>
              <Option value="Core Infrastructure Support">Core Infrastructure & Redis Cluster Support</Option>
              <Option value="Finance & Tax Specialist Group">Finance & GST Tax Specialist Group</Option>
              <Option value="Security & Compliance Team">Security & Compliance Team</Option>
            </Select>
          </Form.Item>
          <Form.Item name="notes" label="Escalation Reason & Notes" rules={[{ required: true, min: 10 }]}>
            <Input.TextArea rows={3} placeholder="Document reason for escalating..." />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsEscalateModalOpen(false)}>Cancel</Button>
              <Button type="primary" danger htmlType="submit">
                Submit Escalation
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* TRANSFER MODAL */}
      <Modal
        title="Transfer Active Support Session"
        open={isTransferModalOpen}
        onCancel={() => setIsTransferModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={transferForm} layout="vertical" onFinish={handleTransfer}>
          <Form.Item name="targetUserId" label="Transfer to Specialist" rules={[{ required: true }]}>
            <Select placeholder="Select colleague...">
              {operators.map((op) => (
                <Option key={op.id} value={op.id}>
                  {op.userName || op.loginName} ({op.roleName})
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="reason" label="Transfer Justification" rules={[{ required: true, min: 5 }]}>
            <Input.TextArea rows={3} placeholder="Document transfer justification..." />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsTransferModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                Confirm Handover
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* TICKET TIMELINE AUDIT DRAWER */}
      <Drawer
        title={`Ticket Audit Trail: #${selectedTicketForAction?.id}`}
        open={isAuditDrawerOpen}
        onClose={() => setIsAuditDrawerOpen(false)}
        size="large"
      >
        {selectedTicketForAction && (
          <div>
            <Card variant="outlined" style={{ marginBottom: 16, background: '#fafafa' }}>
              <Title level={5}>{selectedTicketForAction.subject}</Title>
              <Paragraph style={{ margin: 0 }}>{selectedTicketForAction.description}</Paragraph>
              <Divider style={{ margin: '12px 0' }} />
              <Space vertical size={4}>
                <div><strong>Customer:</strong> {selectedTicketForAction.tenantName}</div>
                <div><strong>Category:</strong> <Tag color="cyan">{selectedTicketForAction.category}</Tag></div>
                <div><strong>Priority:</strong> <Tag color="orange">{selectedTicketForAction.priority}</Tag></div>
                <div><strong>Reported By:</strong> {selectedTicketForAction.reportedBy} ({selectedTicketForAction.reportedAt})</div>
              </Space>
            </Card>

            <Title level={5}>Activity & Lifecycle History</Title>
            <Timeline
              items={[
                {
                  color: 'blue',
                  children: (
                    <div>
                      <Text strong>Ticket Created & Logged</Text>
                      <div style={{ fontSize: 12, color: '#8c8c8c' }}>Reported by {selectedTicketForAction.reportedBy} ({selectedTicketForAction.reportedAt})</div>
                    </div>
                  ),
                },
                selectedTicketForAction.status !== 'OPEN' ? {
                  color: 'orange',
                  children: (
                    <div>
                      <Text strong>Assigned to Support Specialist</Text>
                      <div style={{ fontSize: 12, color: '#8c8c8c' }}>Diagnostic Session initiated with {selectedTicketForAction.tenantName}</div>
                    </div>
                  ),
                } : null,
                selectedTicketForAction.escalatedTo ? {
                  color: 'red',
                  children: (
                    <div>
                      <Text strong>Escalated to {selectedTicketForAction.escalatedTo}</Text>
                      <div style={{ fontSize: 12, color: '#8c8c8c' }}>Reason: {selectedTicketForAction.escalationReason}</div>
                    </div>
                  ),
                } : null,
                selectedTicketForAction.resolvedAt ? {
                  color: 'green',
                  children: (
                    <div>
                      <Text strong>Issue Resolved</Text>
                      <div style={{ fontSize: 12, color: '#52c41a' }}>{selectedTicketForAction.resolvedAt}</div>
                      <div style={{ fontSize: 12, color: '#595959', marginTop: 4 }}>
                        Notes: {selectedTicketForAction.resolutionNotes}
                      </div>
                    </div>
                  ),
                } : null,
                selectedTicketForAction.status === 'CLOSED' ? {
                  color: 'gray',
                  children: (
                    <div>
                      <Text strong>Ticket Closed & Archived</Text>
                      <div style={{ fontSize: 12, color: '#8c8c8c' }}>Final customer sign-off recorded</div>
                    </div>
                  ),
                } : null,
              ].filter(Boolean) as any}
            />
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default SupportDashboardPage;
