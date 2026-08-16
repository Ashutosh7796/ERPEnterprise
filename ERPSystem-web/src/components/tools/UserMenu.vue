<template>
  <div class="user-wrapper" :class="theme">
    <span class="action" v-if="showAd">
      <a v-if="theme==='light'" class="ad_title" target="_blank" :href="payFeeUrl">
        <a-icon type="cloud" theme="filled" style="color: yellow; font-size: 16px; line-height: 16px; padding-right: 5px" />
        <span>管伊佳ERP网络版198元1年</span>
      </a>
    </span>
    <!-- update_begin author:zhaoxin date:20191129 for: 做头部菜单栏导航 -->
    <!-- update-begin author:sunjianlei date:20191@20 for: 解决全局样式冲突的问题 -->
    <span class="action" @click="showClick">
      <a-icon type="search"></a-icon>
    </span>
    <!-- update-begin author:sunjianlei date:20200219 for: 菜单搜索改为动态组件，在手机端呈现出弹出框 -->
    <component :is="searchMenuComp" v-show="searchMenuVisible || isMobile()" class="borders" :visible="searchMenuVisible" title="Search Menu" :footer="null" @cancel="searchMenuVisible=false">
      <a-select
        class="search-input"
        showSearch
        :showArrow="false"
        placeholder="Search menu"
        optionFilterProp="children"
        :filterOption="filterOption"
        :open="isMobile()?true:null"
        :getPopupContainer="(node) => node.parentNode"
        :style="isMobile()?{width: '100%',marginBottom:'50px'}:{}"
        @change="searchMethods"
        @blur="hiddenClick"
      >
        <a-select-option v-for="(site,index) in searchMenuOptions" :key="index" :value="site.id">{{site.text}}</a-select-option>
      </a-select>
    </component>
    <!-- update-end author:sunjianlei date:20200219 for: 菜单搜索改为动态组件，在手机端呈现出弹出框 -->
    <!-- update-end author:sunjianlei date:20191220 for: 解决全局样式冲突的问题 -->
    <!-- update_end  author:zhaoxin date:20191129 for: 做头部菜单栏导航 -->
    <span class="action">
      <a-tooltip>
        <template slot="title">Official Website</template>
        <a target="_blank" :href="systemUrl">
          <a-icon type="bank" style="font-size: 16px;" />
        </a>
      </a-tooltip>
    </span>
    <!-- Language Switcher -->
    <a-dropdown>
      <span class="action ant-dropdown-link" style="cursor: pointer;">
        <a-icon type="global" style="font-size: 16px; margin-right: 4px;" />
        <span>{{ currentLang === 'english' ? 'English' : '简体中文' }}</span>
      </span>
      <a-menu slot="overlay" @click="handleLangChange">
        <a-menu-item key="english">
          <span>🇬🇧 English</span>
        </a-menu-item>
        <a-menu-item key="chinese_simplified">
          <span>🇨🇳 简体中文 (Chinese)</span>
        </a-menu-item>
      </a-menu>
    </a-dropdown>
    <header-notice class="action"/>
    <a-dropdown>
      <span v-if="isDesktop()" class="action ant-dropdown-link user-dropdown-menu">
        <a-icon type="down-circle"/>
        <span style="margin-left:4px">Welcome, {{ nickname() }}</span>
      </span>
      <a-menu slot="overlay" class="user-dropdown-menu-wrapper">
        <a-menu-item key="3"  @click="systemSetting">
           <a-icon type="tool"/>
           <span>Interface Settings</span>
        </a-menu-item>
        <a-menu-item key="4" @click="updatePassword">
          <a-icon type="setting"/>
          <span>Change Password</span>
        </a-menu-item>
      </a-menu>
    </a-dropdown>
    <span class="action">
      <a class="logout_title" href="javascript:;" @click="handleLogout">
        <a-icon type="logout"/>
        <span>&nbsp;Logout</span>
      </a>
    </span>
    <user-password ref="userPassword"></user-password>
    <depart-select ref="departSelect" :closable="true" title="部门切换"></depart-select>
    <setting-drawer ref="settingDrawer" :closable="true" title="系统设置"></setting-drawer>
  </div>
</template>

<script>
  import HeaderNotice from './HeaderNotice'
  import UserPassword from './UserPassword'
  import SettingDrawer from "@/components/setting/SettingDrawer";
  import DepartSelect from './DepartSelect'
  import { mapActions, mapGetters,mapState } from 'vuex'
  import { mixinDevice } from '@/utils/mixin.js'
  import { getFileAccessHttpUrl,getAction } from "@/api/manage"
  import { getPlatformConfigByKey } from '@/api/api'

  export default {
    name: "UserMenu",
    mixins: [mixinDevice],
    data(){
      return{
        // update-begin author:sunjianlei date:20200219 for: MenuNaming --------------
        searchMenuOptions:[],
        searchMenuComp: 'span',
        searchMenuVisible: false,
        systemUrl: window.SYS_URL,
        showAd: false,
        payFeeUrl: '',
        currentLang: localStorage.getItem('jsh_app_language') || 'english'
        // update-begin author:sunjianlei date:20200219 for: MenuNaming --------------
      }
    },
    components: {
      HeaderNotice,
      UserPassword,
      DepartSelect,
      SettingDrawer
    },
    props: {
      theme: {
        type: String,
        required: false,
        default: 'dark'
      }
    },
    /* update_begin author:zhaoxin date:20191129 for: Create header menu bar navigation*/
    created() {
      let lists = []
      this.searchMenus(lists,this.permissionMenuList)
      this.searchMenuOptions=[...lists]
      this.isShowAd()
    },
    computed: {
      ...mapState({
        // Menu
        permissionMenuList: state => state.user.permissionList

      })
    },
    /* update_end author:zhaoxin date:20191129 for: Create header menu bar navigation*/
    watch: {
      // update-begin author:sunjianlei date:20200219 for: Change menu search to dynamic component, display popup on mobile
      device: {
        immediate: true,
        handler() {
          this.searchMenuVisible = false
          this.searchMenuComp = this.isMobile() ? 'a-modal' : 'span'
        },
      },
      // update-end author:sunjianlei date:20200219 for: Change menu search to dynamic component, display popup on mobile
    },
    methods: {
      /* update_begin author:zhaoxin date:20191129 for: Create header menu bar navigation*/
      showClick() {
        this.searchMenuVisible = true
      },
      hiddenClick(){
        this.shows = false
      },
      /* update_end author:zhaoxin date:20191129 for: Create header menu bar navigation*/
      ...mapActions(["Logout"]),
      ...mapGetters(["nickname","loginName","userInfo"]),
      // getAvatar(){
      //   return getFileAccessHttpUrl(this.avatar())
      // },
      handleLogout() {
        const that = this

        this.$confirm({
          title: 'Confirm',
          content: 'Are you sure you want to sign out?',
          onOk() {
            return that.Logout({}).then(() => {
                window.location.href="/";
              //window.location.reload()
            }).catch(err => {
              that.$message.error({
                title: 'Error',
                description: err.message
              })
            })
          },
          onCancel() {
          },
        });
      },
      updatePassword(){
        let userId = this.userInfo().id
        this.$refs.userPassword.show(userId)
      },
      systemSetting(){
        this.$refs.settingDrawer.showDrawer()
      },
      /* update_begin author:zhaoxin date:20191129 for: Create header menu bar navigation*/
      searchMenus(arr,menus){
        for(let i of menus){
          if("/layouts/RouteView"!==i.component && "/layouts/TabLayout"!==i.component){
            arr.push(i)
          }
          if(i.children&& i.children.length>0){
            this.searchMenus(arr,i.children)
          }
        }
      },
      filterOption(input, option) {
        if(option && option.componentOptions && option.componentOptions.children && option.componentOptions.children[0]) {
          return option.componentOptions.children[0].text.toLowerCase().indexOf(input.toLowerCase()) >= 0
        }
      },
      // update_begin author:sunjianlei date:20191230 for: Fix issue where external links failed to open
      searchMethods(value) {
        let route = this.searchMenuOptions.filter(item => item.id === value)[0]
        this.$emit("searchGlobalHeader",route.url, route.id, route.text, route.component)
        this.searchMenuVisible = false
      },
      // update_end author:sunjianlei date:20191230 for: Fix issue where external links failed to open
      /*update_end author:zhaoxin date:20191129 for: Create header menu bar navigation*/
      isShowAd() {
        //Display ad only if renewal URL and trial tenant are configured
        getPlatformConfigByKey({"platformKey": "pay_fee_url"}).then((res)=> {
          if (res && res.code === 200) {
            let payFeeUrl = res.data.platformValue
            if(payFeeUrl) {
              getAction("/user/infoWithTenant",{}).then(res=> {
                if (res && res.code === 200) {
                  let tenant = res.data
                  if(tenant && tenant.type === '0') {
                    if(!this.isMobile()) {
                      //Display on PC only
                      this.showAd = true
                      this.payFeeUrl = payFeeUrl
                    }
                  }
                }
              })
            }
          }
        })
      },
      handleLangChange({ key }) {
        this.currentLang = key
        if (key === 'english' && window.jshI18n) {
          window.jshI18n.enable()
          this.$message.success('Switched to English')
        } else if (window.jshI18n) {
          window.jshI18n.disable() // reloads to restore Chinese
        }
      }
    },
    mounted() {
      const savedLang = localStorage.getItem('jsh_app_language') || 'english'
      this.currentLang = savedLang
      // i18n-en.js auto-initializes on load, just re-translate Vue-rendered content
      if (window.jshI18n && savedLang !== 'chinese_simplified') {
        setTimeout(function() { window.jshI18n.translatePage(); }, 300)
      }
    }
  }
</script>

<style lang="less" scoped>
  /* update_begin author:zhaoxin date:20191129 for: Allow search box color to change with theme*/
  /* update-begin author:sunjianlei date:20191220 for: Fix global style conflict issue */
  .user-wrapper .search-input {
    width: 180px;
    color: inherit;

    /deep/ .ant-select-selection {
      background-color: inherit;
      border: 0;
      border-bottom: 1px solid white;
      &__placeholder, &__field__placeholder {
        color: inherit;
      }
    }
  }
  /* update-end author:sunjianlei date:20191220 for: Fix global style conflict issue */
  /* update_end author:zhaoxin date:20191129 for: Allow search box color to change with theme*/
</style>

<style scoped>
  .ad_title {
    color: yellow;
    text-decoration: none;
  }
  .logout_title {
    color: inherit;
    text-decoration: none;
  }
</style>