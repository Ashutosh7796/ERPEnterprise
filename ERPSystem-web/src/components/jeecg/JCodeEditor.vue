<template>
  <div v-bind="fullScreenParentProps">
    <a-icon v-if="fullScreen" class="full-screen-icon" :type="iconType" @click="()=>fullCoder=!fullCoder"/>

    <div class="code-editor-cust full-screen-child">
      <textarea ref="textarea"></textarea>
      <span @click="nullTipClick" class="null-tip" :class="{'null-tip-hidden':hasCode}" :style="nullTipStyle">{{ placeholderShow }}</span>
      <template v-if="languageChange">
        <a-select v-model="mode" size="small" class="code-mode-select" @change="changeMode" placeholder="请选择主题">
          <a-select-option
            v-for="mode in modes"
            :key="mode.value"
            :value="mode.value">
            {{ mode.label }}
          </a-select-option>
        </a-select>
      </template>

    </div>
  </div>
</template>

<script type="text/ecmascript-6">
  // 
  import _CodeMirror from 'codemirror'

  // 
  import 'codemirror/lib/codemirror.css'
  // ThemeNeeds options Theme darcula  gruvbox-dark hopscotch  monokai
  import 'codemirror/theme/panda-syntax.css'
  //Noticecss
  import "codemirror/addon/hint/show-hint.css";

  // NeedsHasCorresponding
  // codemirror Support /addon/mode/loadmode.js and /mode/meta.js Corresponding
  //  vue HasNoneInitializeCorresponding JS ，Corresponding JS 
  import 'codemirror/mode/javascript/javascript.js'
  import 'codemirror/mode/css/css.js'
  import 'codemirror/mode/xml/xml.js'
  import 'codemirror/mode/clike/clike.js'
  import 'codemirror/mode/markdown/markdown.js'
  import 'codemirror/mode/python/python.js'
  import 'codemirror/mode/r/r.js'
  import 'codemirror/mode/shell/shell.js'
  import 'codemirror/mode/sql/sql.js'
  import 'codemirror/mode/swift/swift.js'
  import 'codemirror/mode/vue/vue.js'

  // Get
  const CodeMirror = window.CodeMirror || _CodeMirror

  export default {
    name: 'JCodeEditor',
    props: {
      // ，Bind
      value: {
        type: String,
        default: ''
      },
      // Type
      language: {
        type: String,
        default: null
      },
     languageChange:{
       type: Boolean,
       default:false,
       required:false
     },
      placeholder: {
        type: String,
        default: null
      },
      // Display
      lineNumbers: {
        type: Boolean,
        default: true
      },
      // YesNoDisplayButton
      fullScreen: {
        type: Boolean,
        default: false
      },
      // z-index
      zIndex: {
        type: [Number, String],
        default: 999
      }
    },
    data () {
      return {
        // 
        code: '',
        iconType: 'fullscreen',
        hasCode:false,
        // DefaultType
        mode: 'javascript',
        // 
        coder: null,
        // DefaultConfig
        options: {
          // Format
          tabSize: 2,
          // Theme，CorrespondingTheme JS Needs
          theme: 'panda-syntax',
          line: true,
         // extraKeys: {'Ctrl': 'autocomplete'},//
          hintOptions: {
            tables: {
              users: ['name', 'score', 'birthDate'],
              countries: ['name', 'population', 'size']
            }
          },
        },
        // SupportSwitchType，Corresponding JS Already
        // Yes MIME-TYPE ，for text/ 
        modes: [{
          value: 'css',
          label: 'CSS'
        }, {
          value: 'javascript',
          label: 'Javascript'
        }, {
          value: 'html',
          label: 'XML/HTML'
        }, {
          value: 'x-java',
          label: 'Java'
        }, {
          value: 'x-objectivec',
          label: 'Objective-C'
        }, {
          value: 'x-python',
          label: 'Python'
        }, {
          value: 'x-rsrc',
          label: 'R'
        }, {
          value: 'x-sh',
          label: 'Shell'
        }, {
          value: 'x-sql',
          label: 'SQL'
        }, {
          value: 'x-swift',
          label: 'Swift'
        }, {
          value: 'x-vue',
          label: 'Vue'
        }, {
          value: 'markdown',
          label: 'Markdown'
        }],
        // code  YesNo
        fullCoder: false
      }
    },
    watch: {
      fullCoder:{
        handler(value) {
          if(value){
            this.iconType="fullscreen-exit"
          }else{
            this.iconType="fullscreen"
          }
        }
      },
      // value: {
      //   immediate: false,
      //   handler(value) {
      //     this._getCoder().then(() => {
      //       this.coder.setValue(value)
      //     })
      //   }
      // },
      language: {
        immediate: true,
        handler(language) {
          this._getCoder().then(() => {
            // ParentGetType
            if (language) {
              // GetTypeObject
              let modeObj = this._getLanguage(language)

              // CheckParentYesNoSupport
              if (modeObj) {
                this.mode = modeObj.label
                this.coder.setOption('mode', `text/${modeObj.value}`)
              }
            }
          })
        }
      }
    },
    computed: {
      placeholderShow() {
        if (this.placeholder == null) {
          return `请在此输入${this.language}代码`
        } else {
          return this.placeholder
        }
      },
      nullTipStyle(){
        if (this.lineNumbers) {
          return { left: '36px' }
        } else {
          return { left: '12px' }
        }
      },
      // coder Config
      coderOptions() {
        return {
          tabSize: this.options.tabSize,
          theme: this.options.theme,
          lineNumbers: this.lineNumbers,
          line: true,
          hintOptions: this.options.hintOptions
        }
      },
      fullScreenParentProps(){
        let props = {
          class: ['full-screen-parent', this.fullCoder ? 'full-screen' : ''],
          style: {}
        }
        if (this.fullCoder) {
          props.style['z-index'] = this.zIndex
        }
        return props
      }
    },
    mounted () {
      // Initialize
      this._initialize()
    },
    methods: {
      // Initialize
      _initialize () {
        // Initialize，NeedsObjectandDefaultConfig
        this.coder = CodeMirror.fromTextArea(this.$refs.textarea, this.coderOptions)
        // 
        if(this.value||this.code){
          this.hasCode=true
          this.coder.setValue(this.value || this.code)
        }else{
          this.coder.setValue('')
          this.hasCode=false
        }
        // SupportBind
        this.coder.on('change', (coder) => {
          this.code = coder.getValue()
          if(this.code){
            this.hasCode=true
          }else{
            this.hasCode=false
          }
          if (this.$emit) {
            this.$emit('input', this.code)
          }
        })
        this.coder.on('focus', () => {
          this.hasCode=true
        })
        this.coder.on('blur', () => {
          if(this.code){
            this.hasCode=true
          }else{
            this.hasCode=false
          }
        })

       /* this.coder.on('cursorActivity',()=>{
          this.coder.showHint()
        })*/

      },
      getCodeContent(){
        return this.code
      },
      setCodeContent(val){
        setTimeout(()=>{
          if(!val){
            this.coder.setValue('')
          }else{
            this.coder.setValue(val)
          }
        },300)
      },
      // GetCurrentType
      _getLanguage (language) {
        // SupportTypeListType
        return this.modes.find((mode) => {
          // Has，
          let currentLanguage = language.toLowerCase()
          let currentLabel = mode.label.toLowerCase()
          let currentValue = mode.value.toLowerCase()

          // ， java Yes x-java ， value and label and
          return currentLabel === currentLanguage || currentValue === currentLanguage
        })
      },
      _getCoder() {
        let _this = this
        return new Promise((resolve) => {
          (function get() {
            if (_this.coder) {
              resolve(_this.coder)
            } else {
              setTimeout(get, 10)
            }
          })()
        })
      },
      // 
      changeMode (val) {
        // UpdateConfig
        this.coder.setOption('mode', `text/${val}`)

        // GetUpdate
        let label = this._getLanguage(val).label.toLowerCase()

        // ParentCurrent
        this.$emit('language-change', label)
      },
      nullTipClick(){
        this.coder.focus()
      }
    }
  }
</script>

<style lang="less">
  .code-editor-cust{
    flex-grow:1;
    display:flex;
    position:relative;
    height:100%;
    .CodeMirror{
      flex-grow:1;
      z-index:1;
      .CodeMirror-code{
        line-height:19px;
      }

    }
    .code-mode-select{
      position:absolute;
      z-index:2;
      right:10px;
      top:10px;
      max-width:130px;
    }
    .CodeMirror{
      height: auto;
      min-height:100%;
    }
    .null-tip{
      position: absolute;
      top: 4px;
      left: 36px;
      z-index: 10;
      color: #ffffffc9;
      line-height: initial;
    }
    .null-tip-hidden{
      display: none;
    }
  }

  /*  */
  .full-screen-parent {
    position: relative;

    .full-screen-icon {
      opacity: 0;
      color: black;
      width: 20px;
      height: 20px;
      line-height: 24px;
      background-color: white;
      position: absolute;
      top: 2px;
      right: 2px;
      z-index: 9;
      cursor: pointer;
      transition: opacity 0.3s;
    }

    &:hover {
      .full-screen-icon {
        opacity: 1;

        &:hover {
          background-color: rgba(255, 255, 255, 0.88);
        }
      }
    }

    &.full-screen {
      position: fixed;
      top: 10px;
      left: 10px;
      width: calc(100% - 20px);
      height: calc(100% - 20px);
      padding: 10px;
      background-color: #f5f5f5;

      .full-screen-icon {
        top: 12px;
        right: 12px;
      }
      .full-screen-child {
        height: 100%;
        max-height: 100%;
        min-height: 100%;
      }
    }

    .full-screen-child {
      min-height: 120px;
      max-height: 320px;
      overflow:hidden;
    }

  }

.CodeMirror-cursor{
  height:18.4px !important;
}
</style>