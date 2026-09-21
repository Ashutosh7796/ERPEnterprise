import { http } from '@core/api/client'

export interface DocumentNode {
  id: string
  docId: number
  docType: string
  docNumber: string
  status: string
  amount: number
  date: string
  operator: string
  partnerName: string
  stepIndex?: number
}

export interface DocumentEdge {
  source: string
  target: string
  relationshipType: string
  label?: string
  status?: string
}

export interface DocumentFlowDTO {
  rootDocumentId: number
  rootDocumentType: string
  nodes: DocumentNode[]
  edges: DocumentEdge[]
}

export const procurementApi = {
  submitRequisition: (id: number) => {
    return http.post(`/procurement/requisitions/${id}/submit`)
  },

  approveRequisition: (id: number, remarks?: string) => {
    return http.post(`/procurement/requisitions/${id}/approve`, { remarks })
  },

  rejectRequisition: (id: number, reason: string) => {
    return http.post(`/procurement/requisitions/${id}/reject`, { reason })
  },

  reopenRequisition: (id: number, reason?: string) => {
    return http.post(`/procurement/requisitions/${id}/reopen`, { reason })
  },

  convertToPo: (id: number, body?: any) => {
    return http.post(`/procurement/requisitions/${id}/convert-to-po`, body || {})
  },

  getApprovedRequisitions: (keyword?: string) => {
    return http.get<any[]>('/procurement/requisitions/approved-list', {
      params: { keyword },
    })
  },

  getDocumentFlow: (type: string, id: number) => {
    return http.get<DocumentFlowDTO>(`/procurement/documents/${type}/${id}/flow`)
  },

  reconcileThreeWayMatch: (poId: number, body: { invoiceId?: number; invoiceNumber: string; invoiceTotal: number }) => {
    return http.post(`/procurement/three-way-match/${poId}`, body)
  },
}
