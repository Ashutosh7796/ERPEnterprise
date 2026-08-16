<template>
  <div ref="container">
    <a-modal
      ref="modal"
      :class="getClass(modalClass)"
      :style="getStyle(modalStyle)"
      :visible="visible"
      :getContainer="() => $refs.container"
      :maskStyle="{'top':'93px','left':'154px'}"
      :wrapClassName="wrapClassNameInfo()"
      :mask="isDesktop()"
      :maskClosable="false"
      v-bind="_attrs"
      v-on="$listeners"
      @ok="handleOk"
      @cancel="handleCancel"
    >

      <slot></slot>

      <template v-if="!isNoTitle" slot="title">
        <a-row class="j-modal-title-row" type="flex">
          <a-col class="left">
            <slot name="title">{{ title }}</slot>
          </a-col>
          <a-col class="right">
            <a-tooltip title="新手引导">
              <a-button v-if="switchHelp" @click="handleHelp" style="right:112px;" class="ant-modal-close ant-modal-close-x"
                        ghost type="link" icon="question-circle"/>
            </a-tooltip>
            <a-button v-if="switchFullscreen" @click="toggleFullscreen" class="ant-modal-close ant-modal-close-x"
                      ghost type="link" :icon="fullscreenButtonIcon"/>
          </a-col>
        </a-row>
      </template>

      <!-- 处理 scopedSlots -->
      <template v-for="slotName of scopedSlotsKeys" :slot="slotName">
        <slot :name="slotName"></slot>
      </template>

      <!-- 处理 slots -->
      <template v-for="slotName of slotsKeys" v-slot:[slotName]>
        <slot :name="slotName"></slot>
      </template>

    </a-modal>
  </div>
</template>

<script>

  import { getClass, getStyle } from '@/utils/props-util'
  import { triggerWindowResizeEvent, handleIntroJs } from "@/utils/util"
  import {mixinDevice} from '@/utils/mixin'
  import Vue from 'vue'

  export default {
    name: 'JModal',
    mixins: [mixinDevice],
    props: {
      title: String,
      //  .sync 
      visible: Boolean,
      // 
      prefixNo: String,
      // YesNo，None body 。 .sync 
      fullscreen: {
        type: Boolean,
        default: false
      },
      // YesNoNew（Button）
      switchHelp: {
        type: Boolean,
        default: false
      },
      // YesNoSwitch（Button）
      switchFullscreen: {
        type: Boolean,
        default: false
      },
      // ButtonYesNoDisable
      okClose: {
        type: Boolean,
        default: true
      },
    },
    data() {
      return {
        //  slots ，Process
        usedSlots: ['title'],
        // YesNoParameters
        innerFullscreen: this.fullscreen,
      }
    },
    computed: {
      // NotProcessParametersorProcessParametersBind a-modal 
      _attrs() {
        let attrs = { ...this.$attrs }
        // for 100%
        if (this.innerFullscreen) {
          attrs['width'] = '100%'
        }
        return attrs
      },
      modalClass() {
        return {
          'j-modal-box': true,
          'fullscreen': this.innerFullscreen,
          'no-title': this.isNoTitle,
          'no-footer': this.isNoFooter,
        }
      },
      modalStyle() {
        let style = {}
        // topfor 0
        if (this.innerFullscreen) {
          style['top'] = '0'
        }
        return style
      },
      isNoTitle() {
        return !this.title && !this.allSlotsKeys.includes('title')
      },
      isNoFooter() {
        return this._attrs['footer'] === null
      },
      slotsKeys() {
        return Object.keys(this.$slots).filter(key => !this.usedSlots.includes(key))
      },
      scopedSlotsKeys() {
        return Object.keys(this.$scopedSlots).filter(key => !this.usedSlots.includes(key))
      },
      allSlotsKeys() {
        return this.slotsKeys.concat(this.scopedSlotsKeys)
      },
      // SwitchButtonIcon
      fullscreenButtonIcon() {
        return this.innerFullscreen ? 'fullscreen-exit' : 'fullscreen'
      },
    },
    watch: {
      visible() {
        if (this.visible) {
          this.innerFullscreen = this.fullscreen
        }
      },
      innerFullscreen(val) {
        this.$emit('update:fullscreen', val)
      },
    },
    methods: {

      getClass(clazz) {
        return { ...getClass(this), ...clazz }
      },
      getStyle(style) {
        return { ...getStyle(this), ...style }
      },

      close() {
        this.$emit('update:visible', false)
      },

      handleOk() {
        if (this.okClose) {
          this.close()
        }
      },
      handleCancel() {
        this.close()
      },

      /** New */
      handleHelp() {
        let element = 'intro_cache_' + this.prefixNo
        Vue.ls.remove(element)
        handleIntroJs(this.prefixNo, 1)
      },

      /** Switch */
      toggleFullscreen() {
        this.innerFullscreen = !this.innerFullscreen
        triggerWindowResizeEvent()
      },

    }
  }
</script>

<style lang="less">
  .j-modal-box {

    &.fullscreen {
      top: 0;
      left: 0;
      padding: 0;

      height: 100vh;

       >.ant-modal-content {
        height: 100vh;
        border-radius: 0;

         >.ant-modal-body {
          /* title and footer  55px */
          height: calc(100% - 55px - 55px);
          overflow: auto;
        }
      }

      >.no-title, &.no-footer {
        .ant-modal-body {
          height: calc(100% - 55px);
        }
      }

      >.no-title.no-footer {
        .ant-modal-body {
          height: 100%;
        }
      }

    }

    .j-modal-title-row {
      .left {
        width: calc(100% - 56px - 56px);
      }

      .right {
        width: 56px;
        position: inherit;

        .ant-modal-close {
          right: 56px;
          color: rgba(0, 0, 0, 0.45);

          &:hover {
            color: rgba(0, 0, 0, 0.75);
          }

        }
      }
    }


  }

  @media (max-width: 767px) {
    .j-modal-box.fullscreen {
      margin: 0;
      max-width: 100vw;
    }
  }
</style>