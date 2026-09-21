import React from 'react'
import { Card, Tag, Typography, Descriptions, Alert, QRCode } from 'antd'
import { CheckCircleOutlined, WarningOutlined, QrcodeOutlined } from '@ant-design/icons'

const { Text } = Typography

interface GstSignedQrViewerProps {
  signedQrJwt?: string
  irn?: string
  ackNo?: number
  ackDate?: string
  isVerified?: boolean
  verificationDetails?: string
  decodedClaims?: {
    gstin?: string
    recGstin?: string
    docNo?: string
    docTyp?: string
    docDt?: string
    totInvVal?: number
    itemCnt?: number
    mainHsnCode?: string
    irn?: string
    irnDt?: string
  }
}

export const GstSignedQrViewer: React.FC<GstSignedQrViewerProps> = ({
  signedQrJwt,
  irn,
  ackNo,
  ackDate,
  isVerified,
  verificationDetails,
  decodedClaims,
}) => {
  if (!signedQrJwt && !irn) {
    return null
  }

  return (
    <Card
      size="small"
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>
            <QrcodeOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            Authoritative IRP Signed QR & Verification
          </span>
          {isVerified !== undefined && (
            <Tag color={isVerified ? 'success' : 'error'} icon={isVerified ? <CheckCircleOutlined /> : <WarningOutlined />}>
              {isVerified ? 'IRP Verified & Consistent' : 'Verification Failed'}
            </Tag>
          )}
        </div>
      }
      style={{ marginBottom: 16, background: '#fafafa', borderColor: '#d9d9d9' }}
    >
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ textAlign: 'center', background: '#fff', padding: 12, borderRadius: 6, border: '1px solid #eee' }}>
          {signedQrJwt ? (
            <QRCode value={signedQrJwt} size={140} bordered={false} />
          ) : (
            <div style={{ width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
              <Text type="secondary" style={{ fontSize: 11 }}>QR Not Available</Text>
            </div>
          )}
          <div style={{ marginTop: 6, fontSize: 11, color: '#888' }}>Authoritative IRP QR</div>
        </div>

        <div style={{ flex: 1, minWidth: 280 }}>
          <Descriptions size="small" column={1} bordered style={{ background: '#fff' }}>
            <Descriptions.Item label="IRN">
              <Text copyable style={{ fontSize: 12, wordBreak: 'break-all', fontFamily: 'monospace' }}>
                {irn || decodedClaims?.irn || 'N/A'}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Ack No & Date">
              <Text style={{ fontSize: 12 }}>
                {ackNo ? `${ackNo}` : 'N/A'} {ackDate ? `(${ackDate})` : ''}
              </Text>
            </Descriptions.Item>
            {decodedClaims && (
              <>
                <Descriptions.Item label="Supplier → Recipient">
                  <Text style={{ fontSize: 12 }}>
                    <strong>{decodedClaims.gstin || 'N/A'}</strong> → <strong>{decodedClaims.recGstin || 'URP'}</strong>
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Document Ref">
                  <Tag color="blue">{decodedClaims.docTyp}</Tag> <Text strong>{decodedClaims.docNo}</Text> ({decodedClaims.docDt})
                </Descriptions.Item>
                <Descriptions.Item label="Statutory Total">
                  <Text strong style={{ fontSize: 13, color: '#002766' }}>
                    ₹{decodedClaims.totInvVal?.toLocaleString('en-IN') || '0'}
                  </Text>
                  <span style={{ fontSize: 11, color: '#888', marginLeft: 8 }}>
                    ({decodedClaims.itemCnt || 1} items, Main HSN: {decodedClaims.mainHsnCode || '841370'})
                  </span>
                </Descriptions.Item>
              </>
            )}
          </Descriptions>

          {verificationDetails && (
            <Alert
              title={isVerified ? 'IRP Cryptographic Signature Verified' : 'Statutory Verification Notice'}
              description={verificationDetails}
              type={isVerified ? 'success' : 'warning'}
              showIcon
              style={{ marginTop: 12 }}
            />
          )}
        </div>
      </div>
    </Card>
  )
}
