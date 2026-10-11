import React, { useEffect, useState, useCallback } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Typography,
  Row,
  Col,
  Input,
  Select,
  Form,
  Modal,
  Drawer,
  InputNumber,
  Descriptions,
  message,
  Switch,
  Divider,
} from 'antd'
import type { TableColumnsType } from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  DeleteOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { qcApi, QcTemplateDTO, QcTemplateItemDTO } from '../api/qcApi'

const { Title, Text } = Typography

export const QualityTemplateListPage: React.FC = () => {
  const [form] = Form.useForm()
  const [createForm] = Form.useForm()

  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<QcTemplateDTO[]>([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })

  // Drawer / Modal state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<QcTemplateDTO | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createSubmitting, setCreateSubmitting] = useState(false)

  const fetchTemplates = useCallback(async (page = 1, size = 10, filters: any = {}) => {
    setLoading(true)
    try {
      const res: any = await qcApi.getTemplateList({
        currentPage: page,
        pageSize: size,
        inspectionType: filters.inspectionType,
        templateCode: filters.templateCode,
        templateName: filters.templateName,
      })

      const rows = res?.rows || res?.data?.rows || (Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [])
      const total = res?.total !== undefined ? res.total : (res?.data?.total !== undefined ? res.data.total : rows.length)
      setDataSource(rows)
      setPagination({ current: page, pageSize: size, total })
    } catch (err) {
      console.error('Failed to load templates:', err)
      message.error('Failed to load inspection templates.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTemplates(1, 10)
  }, [fetchTemplates])

  const handleOpenDetailDrawer = async (record: QcTemplateDTO) => {
    try {
      setDrawerOpen(true)
      const res: any = await qcApi.getTemplateById(record.id!)
      setSelectedTemplate(res?.data || res)
    } catch (err) {
      message.error('Failed to load template specifications.')
    }
  }

  const handleActivate = async (id: number) => {
    try {
      await qcApi.activateTemplate(id)
      message.success('Inspection template version activated successfully.')
      fetchTemplates(pagination.current, pagination.pageSize)
      if (selectedTemplate && selectedTemplate.id === id) {
        setSelectedTemplate({ ...selectedTemplate, isActive: true })
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to activate template.')
    }
  }

  const handleCreateTemplate = async () => {
    try {
      const values = await createForm.validateFields()
      setCreateSubmitting(true)

      const items: QcTemplateItemDTO[] = (values.items || []).map((it: any, idx: number) => ({
        parameterName: it.parameterName,
        parameterType: it.parameterType || 'NUMERIC',
        nominalValue: it.nominalValue,
        lsl: it.lsl,
        usl: it.usl,
        unitOfMeasure: it.unitOfMeasure || 'mm',
        isCritical: !!it.isCritical,
        sampleCount: it.sampleCount || 5,
        testMethod: it.testMethod || 'Vernier Caliper',
        sortOrder: idx + 1,
      }))

      const payload: QcTemplateDTO = {
        templateCode: values.templateCode,
        templateName: values.templateName,
        inspectionType: values.inspectionType,
        materialId: values.materialId ? Number(values.materialId) : undefined,
        routingOperationSeq: values.routingOperationSeq ? Number(values.routingOperationSeq) : undefined,
        workCenterType: values.workCenterType,
        remark: values.remark,
        items,
      }

      await qcApi.createTemplate(payload)
      message.success('Inspection template created successfully.')
      setCreateModalOpen(false)
      createForm.resetFields()
      fetchTemplates(1, pagination.pageSize)
    } catch (err: any) {
      message.error(err.message || 'Failed to create template.')
    } finally {
      setCreateSubmitting(false)
    }
  }

  const columns: TableColumnsType<QcTemplateDTO> = [
    {
      title: 'Template Code',
      dataIndex: 'templateCode',
      key: 'templateCode',
      render: (text, record) => (
        <a onClick={() => handleOpenDetailDrawer(record)} style={{ fontWeight: 600 }}>
          {text}
        </a>
      ),
    },
    {
      title: 'Template Name',
      dataIndex: 'templateName',
      key: 'templateName',
    },
    {
      title: 'Inspection Type',
      dataIndex: 'inspectionType',
      key: 'inspectionType',
      render: (type) => {
        const color = type === 'IQC' ? 'blue' : type === 'IPQC' ? 'orange' : 'purple'
        return <Tag color={color}>{type}</Tag>
      },
    },
    {
      title: 'Version',
      key: 'version',
      render: (_, record) => (
        <Text strong>v{record.versionMajor || 1}.{record.versionMinor || 0}</Text>
      ),
    },
    {
      title: 'Target Item / Material',
      dataIndex: 'materialName',
      key: 'materialName',
      render: (name, record) => (
        <Text type="secondary">
          {name || (record.materialId ? `Item #${record.materialId}` : 'Plant-Wide Generic')}
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (active) => (
        active ? <Tag color="green">ACTIVE</Tag> : <Tag color="default">INACTIVE</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => handleOpenDetailDrawer(record)}>
            View Specifications
          </Button>
          {!record.isActive && (
            <Button
              size="small"
              type="primary"
              ghost
              icon={<ThunderboltOutlined />}
              onClick={() => handleActivate(record.id!)}
            >
              Activate
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileTextOutlined style={{ color: '#1890ff' }} />
            Inspection Templates
          </Title>
          <Text type="secondary">
            Inspection Specifications, Acceptance Quality Limits (AQL), and Critical-To-Quality (CTQ) Parameter Definitions
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => fetchTemplates(pagination.current, pagination.pageSize)}>
            Refresh
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
            Create Inspection Template
          </Button>
        </Space>
      </div>

      {/* FILTER */}
      <Card style={{ borderRadius: 12 }}>
        <Form form={form} layout="inline" onFinish={() => fetchTemplates(1, pagination.pageSize, form.getFieldsValue())}>
          <Form.Item name="inspectionType">
            <Select placeholder="Filter by Inspection Type" allowClear style={{ width: 260 }}>
              <Select.Option value="IQC">Incoming Quality Control (IQC)</Select.Option>
              <Select.Option value="IPQC">In-Process Quality Control (IPQC)</Select.Option>
              <Select.Option value="FQC">Final Quality Control (FQC)</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="templateCode">
            <Input placeholder="Template Code..." allowClear />
          </Form.Item>
          <Form.Item name="templateName">
            <Input placeholder="Template Name..." allowClear />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                Filter
              </Button>
              <Button onClick={() => { form.resetFields(); fetchTemplates(1, pagination.pageSize) }}>
                Reset
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* TABLE */}
      <Card style={{ borderRadius: 12 }}>
        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            onChange: (p, s) => fetchTemplates(p, s, form.getFieldsValue()),
          }}
        />
      </Card>

      {/* DETAIL DRAWER */}
      <Drawer
        title={
          <Space>
            <FileTextOutlined style={{ color: '#1890ff' }} />
            <span>Template Specifications: {selectedTemplate?.templateCode}</span>
            {selectedTemplate?.isActive ? <Tag color="green">ACTIVE</Tag> : <Tag>INACTIVE</Tag>}
          </Space>
        }
        placement="right"
        width={750}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        extra={
          selectedTemplate && !selectedTemplate.isActive && (
            <Button type="primary" icon={<ThunderboltOutlined />} onClick={() => handleActivate(selectedTemplate.id!)}>
              Activate This Version
            </Button>
          )
        }
      >
        {selectedTemplate && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Template Name" span={2}>
                {selectedTemplate.templateName}
              </Descriptions.Item>
              <Descriptions.Item label="Inspection Type">
                <Tag color="blue">{selectedTemplate.inspectionType}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Version">
                v{selectedTemplate.versionMajor}.{selectedTemplate.versionMinor}
              </Descriptions.Item>
              <Descriptions.Item label="Target Item / Material" span={2}>
                {selectedTemplate.materialName || (selectedTemplate.materialId ? `Item #${selectedTemplate.materialId}` : 'Plant-Wide Generic Standard')}
              </Descriptions.Item>
              {selectedTemplate.remark && (
                <Descriptions.Item label="Notes" span={2}>
                  {selectedTemplate.remark}
                </Descriptions.Item>
              )}
            </Descriptions>

            <div>
              <Title level={5}>Inspection Specifications & Tolerances</Title>
              <Table
                dataSource={selectedTemplate.items || []}
                rowKey="id"
                pagination={false}
                size="small"
                columns={[
                  {
                    title: 'Parameter',
                    dataIndex: 'parameterName',
                    key: 'parameterName',
                    render: (text, it) => (
                      <Space direction="vertical" size={0}>
                        <Text strong>{text}</Text>
                        {it.isCritical && <Tag color="red">CTQ Critical</Tag>}
                      </Space>
                    ),
                  },
                  {
                    title: 'Specification & Tolerance Limits',
                    key: 'limits',
                    render: (_, it) => (
                      <div>
                        {it.parameterType === 'NUMERIC' ? (
                          <Text code>
                            [{it.lsl ?? '-∞'} &lt; {it.nominalValue ?? 'Nom'} &lt; {it.usl ?? '+∞'}] {it.unitOfMeasure}
                          </Text>
                        ) : (
                          <Text type="secondary">Visual / Conforming Pass-Fail</Text>
                        )}
                      </div>
                    ),
                  },
                  {
                    title: 'Test Method',
                    dataIndex: 'testMethod',
                    key: 'testMethod',
                    render: (method) => <Text type="secondary">{method || 'Standard Gauge'}</Text>,
                  },
                  {
                    title: 'Sample Size (Quantity)',
                    dataIndex: 'sampleCount',
                    key: 'sampleCount',
                    align: 'right',
                    render: (cnt) => `${cnt || 5} pcs`,
                  },
                ]}
              />
            </div>
          </div>
        )}
      </Drawer>

      {/* CREATE MODAL */}
      <Modal
        title="Create Inspection Template"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onOk={handleCreateTemplate}
        confirmLoading={createSubmitting}
        destroyOnClose
        width={750}
      >
        <Form
          form={createForm}
          layout="vertical"
          initialValues={{
            inspectionType: 'IQC',
            items: [
              {
                parameterName: 'Dimension OD',
                parameterType: 'NUMERIC',
                nominalValue: 50.0,
                lsl: 49.8,
                usl: 50.2,
                unitOfMeasure: 'mm',
                isCritical: true,
                sampleCount: 5,
                testMethod: 'Digital Vernier Caliper',
              },
            ],
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="templateCode" label="Template Code" rules={[{ required: true, message: 'Please enter a template code.' }]}>
                <Input placeholder="e.g. TPL-IQC-STEEL" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="templateName" label="Template Name" rules={[{ required: true, message: 'Please enter a template name.' }]}>
                <Input placeholder="e.g. Steel Rod Receiving Inspection" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="inspectionType" label="Inspection Type" rules={[{ required: true, message: 'Please select an inspection type.' }]}>
                <Select>
                  <Select.Option value="IQC">Incoming Quality Control (IQC)</Select.Option>
                  <Select.Option value="IPQC">In-Process Quality Control (IPQC)</Select.Option>
                  <Select.Option value="FQC">Final Quality Control (FQC)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="materialId" label="Target Item / Material ID (Optional)">
                <InputNumber style={{ width: '100%' }} placeholder="Blank for generic" />
              </Form.Item>
            </Col>
          </Row>

          <Divider titlePlacement="start">Inspection Specification & Parameter Definitions</Divider>

          <Form.List name="items">
            {(fields, { add, remove }) => (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {fields.map(({ key, name, ...restField }) => (
                  <Card size="small" key={key} style={{ background: '#fafafa' }}>
                    <Row gutter={8} align="middle">
                      <Col span={6}>
                        <Form.Item
                          {...restField}
                          name={[name, 'parameterName']}
                          label="Parameter"
                          rules={[{ required: true, message: 'Please enter a parameter name.' }]}
                        >
                          <Input placeholder="Diameter" />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item {...restField} name={[name, 'nominalValue']} label="Target Value (Nominal)">
                          <InputNumber placeholder="50.0" style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item {...restField} name={[name, 'lsl']} label="Lower Tolerance Limit (LSL)">
                          <InputNumber placeholder="49.8" style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item {...restField} name={[name, 'usl']} label="Upper Tolerance Limit (USL)">
                          <InputNumber placeholder="50.2" style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={3}>
                        <Form.Item {...restField} name={[name, 'unitOfMeasure']} label="Unit of Measure">
                          <Input placeholder="mm" />
                        </Form.Item>
                      </Col>
                      <Col span={3} style={{ textAlign: 'right' }}>
                        <Button danger type="text" icon={<DeleteOutlined />} onClick={() => remove(name)} />
                      </Col>
                    </Row>
                  </Card>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                  Add Inspection Parameter Line
                </Button>
              </div>
            )}
          </Form.List>

          <Form.Item name="remark" label="Notes" style={{ marginTop: 16 }}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
