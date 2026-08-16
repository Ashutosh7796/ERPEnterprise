<template>
  <div ref="container">
    <a-modal
      :title="title"
      :width="modalWidth"
      :visible="visible"
      :confirmLoading="confirmLoading"
      :mask="isDesktop()"
      :maskClosable="false"
      @ok="handleOk"
      @cancel="handleCancel"
      cancelText="Close"
      style="top:20%;height: 50%;">
      <a-spin :spinning="confirmLoading">
        <a-form :form="form">
          <a-form-item label="Old Password" :labelCol="labelCol" :wrapperCol="wrapperCol">
            <a-input-password type="password" placeholder="Please enter old password" v-decorator="[ 'oldpassword', validatorRules.oldpassword]" />
          </a-form-item>
          <a-form-item label="New Password" :labelCol="labelCol" :wrapperCol="wrapperCol">
            <a-input-password type="password" placeholder="At least 6 characters, case sensitive" v-decorator="[ 'password', validatorRules.password]" />
          </a-form-item>
          <a-form-item label="Confirm Password" :labelCol="labelCol" :wrapperCol="wrapperCol">
            <a-input-password type="password" placeholder="Please confirm new password" v-decorator="[ 'confirmPassword', validatorRules.confirmPassword]"/>
          </a-form-item>
        </a-form>
      </a-spin>
    </a-modal>
  </div>
</template>

<script>
  import { putAction } from '@/api/manage'
  import {mixinDevice} from '@/utils/mixin'
  import md5 from 'md5'
  export default {
    name: "UserPassword",
    mixins: [mixinDevice],
    data () {
      return {
        title:"Change Password",
        modalWidth:800,
        visible: false,
        confirmLoading: false,
        validatorRules:{
          oldpassword:{
            rules: [{
              required: true, message: 'Please enter old password!',
            }],
          },
          password:{
            rules: [
              { required: true, message: 'Please enter new password!'},
              { validator: this.handlePassword }
            ],
            validateTrigger: ['change', 'blur'],
            validateFirst: true
          },
          confirmPassword:{
            rules: [
              { required: true, message: 'Please confirm new password!' },
              { validator: this.handleConfirmPassword }
            ],
            validateTrigger: ['change', 'blur'],
            validateFirst: true
          }
        },
        confirmDirty:false,
        labelCol: {
          xs: { span: 24 },
          sm: { span: 5 },
        },
        wrapperCol: {
          xs: { span: 24 },
          sm: { span: 16 },
        },
        form:this.$form.createForm(this),
        url: "/user/updatePwd",
        userId:"",
      }
    },
    methods: {
      show(userId){
        if(!userId){
          this.$message.warning("No logged-in user in current session!");
        }else{
          this.userId = userId
          this.form.resetFields();
          this.visible = true;
        }
      },
      handleCancel () {
        this.close()
      },
      close () {
        this.$emit('close');
        this.visible = false;
        this.disableSubmit = false;
      },
      handleOk () {
        const that = this;
        // 
        this.form.validateFields((err, values) => {
          if (!err) {
            that.confirmLoading = true
            values.oldpassword = md5(values.oldpassword)
            values.password = md5(values.password)
            let params = Object.assign({userId:this.userId},values)
            putAction(this.url,params).then((res)=>{
              if(res.code === 200){
                if(res.data.status === 2 || res.data.status === 3) {
                  that.$message.warning(res.data.message)
                } else {
                  that.$message.success(res.data.message)
                  that.close()
                }
              }else{
                that.$message.warning(res.data.message)
              }
            }).finally(() => {
              that.confirmLoading = false
            })
          }
        })
      },
      handlePassword(rule, value, callback) {
        let oldpassword = this.form.getFieldValue('oldpassword')
        if(oldpassword === value) {
          callback(new Error('New password cannot be the same as old password!'))
        }
        let reg = /^(?=.*[a-z])(?=.*\d).{6,}$/;
        if (!reg.test(value)) {
          callback(new Error('Password must contain digits and lowercase letters, length at least 6!'))
        }
        callback()
      },
      handleConfirmPassword(rule, value, callback) {
        let password = this.form.getFieldValue('password')
        if (value === undefined) {
          callback(new Error('Please enter password!'))
        }
        if (value && password && value.trim() !== password.trim()) {
          callback(new Error('Passwords do not match!'))
        }
        callback()
      }
    }
  }
</script>

<style scoped>

</style>
