import React from 'react'
import { Modal, Form, Input, message } from 'antd'
import { useAppStore } from '@store/useAppStore'
import { http } from '@core/api/client'

export const ChangePasswordModal: React.FC = () => {
  const [form] = Form.useForm()
  const { changePasswordVisible, setChangePasswordVisible } = useAppStore()
  const [loading, setLoading] = React.useState(false)

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)
      const res = await http.post('/user/updatePwd', {
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      })
      if (res && (res.code === 200 || res.status === 200)) {
        message.success('Password changed successfully')
        setChangePasswordVisible(false)
        form.resetFields()
      } else {
        message.error(res?.message || res?.data?.message || 'Failed to update password')
      }
    } catch (err: any) {
      if (err?.errorFields) return
      message.error(err?.message || 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title="Change Password"
      open={changePasswordVisible}
      onOk={handleOk}
      confirmLoading={loading}
      onCancel={() => {
        setChangePasswordVisible(false)
        form.resetFields()
      }}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          name="oldPassword"
          label="Old Password"
          rules={[{ required: true, message: 'Please enter your current password' }]}
        >
          <Input.Password placeholder="Enter old password" />
        </Form.Item>

        <Form.Item
          name="newPassword"
          label="New Password"
          rules={[
            { required: true, message: 'Please enter new password' },
            { min: 6, message: 'Password must be at least 6 characters' },
          ]}
        >
          <Input.Password placeholder="Enter new password" />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="Confirm Password"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: 'Please confirm your new password' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve()
                }
                return Promise.reject(new Error('The two passwords that you entered do not match!'))
              },
            }),
          ]}
        >
          <Input.Password placeholder="Confirm new password" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
