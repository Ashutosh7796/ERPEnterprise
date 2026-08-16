<template>
  <div :style="{ padding: '0' }">
    <h4 :style="{ marginBottom: '20px' }">{{ title }}</h4>

    <v-chart ref="chart" :forceFit="true" :height="height" :data="dataSource" :scale="scale">
      <v-tooltip :shared="false"/>
      <v-axis/>
      <v-line position="x*y" :size="lineSize" :color="lineColor"/>
      <v-area position="x*y" :color="color"/>
    </v-chart>

  </div>
</template>

<script>
  import { triggerWindowResizeEvent } from '@/utils/util'

  export default {
    name: 'AreaChartTy',
    props: {
      // Data
      dataSource: {
        type: Array,
        required: true
      },
      // 
      title: {
        type: String,
        default: ''
      },
      // x Alias
      x: {
        type: String,
        default: 'x'
      },
      // y Alias
      y: {
        type: String,
        default: 'y'
      },
      // Y
      min: {
        type: Number,
        default: 0
      },
      // Y
      max: {
        type: Number,
        default: null
      },
      // 
      height: {
        type: Number,
        default: 254
      },
      // 
      lineSize: {
        type: Number,
        default: 2
      },
      // 
      color: {
        type: String,
        default: ''
      },
      // 
      lineColor: {
        type: String,
        default: ''
      }
    },
    computed: {
      scale() {
        return [
          { dataKey: 'x', title: this.x, alias: this.x },
          { dataKey: 'y', title: this.y, alias: this.y, min: this.min, max: this.max }
        ]
      }
    },
    mounted() {
      triggerWindowResizeEvent()
    }
  }
</script>

<style lang="less" scoped>
  @import "chart";
</style>