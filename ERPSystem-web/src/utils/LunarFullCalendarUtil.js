/**
 * LunarFullCalendar 公共 js
 *
 * @version 1.0.0
 * @author sunjianlei
 *
 * */

import { getRefPromise } from '@/utils/JEditableTableUtil'

/* Type */
const calendarViewType = {
  month: 'month', // 
  basicWeek: 'basicWeek',  // 
  basicDay: 'basicDay',//  
  agendaWeek: 'agendaWeek', // 
  agendaDay: 'agendaDay', // 
}

/* Default */
const defaultView = calendarViewType.month

/* DefaultConfig */
const defaultSettings = {
  locale: 'zh-cn',
  // Button
  buttonText: {
    today: '今天',
    month: '月',
    week: '周',
    day: '日'
  },
  // 
  header: {
    left: 'prev,next, today',
    center: 'title',
    right: 'hide, custom, month,agendaWeek,agendaDay'
  },
  //List
  eventLimitClick: 'day',
  // Hide
  eventLimit: true,
  // SetDatefor
  firstDay: 0,
  // DefaultDisplay
  defaultView,
  timeFormat: 'H:mm',
  axisFormat: 'H:mm',
  // agendaYesNoDisplayall-day
  allDaySlot: true,
  // agendaall-dayDisplay
  allDayText: '全天',
  // Default
  timezone: 'local',
  // andTimeDisplay
  slotLabelFormat: 'HH:mm',
  // Set
  nextDayThreshold: '00:00:00',
}

/**  */
const CalendarMixins = {
  data() {
    return {
      calenderCurrentViewType: defaultView
    }
  },
  methods: {

    getCalendarConfigEventHandler() {
      return {
        // Process view changed 
        viewRender: (view, element) => {
          let { type } = view

          let lastViewType = this.calenderCurrentViewType
          this.calenderCurrentViewType = type

          if (typeof this.handleViewRender === 'function') {
            this.handleViewRender(type, view, element)
          }

          if (lastViewType !== this.calenderCurrentViewType && typeof this.handleViewChanged === 'function') {
            this.handleViewChanged(type, view, element)
          }

        },
      }
    },

    /** Get LunarFullCalendar ，ref = baseCalendar */
    getCalendar(fn) {
      return getRefPromise(this, 'baseCalendar').then(fn)
    },

    calendarEmit(name, data) {
      this.getCalendar(ref => ref.$emit(name, data))
    },

    /** NewHas（）*/
    calendarReloadEvents() {
      this.calendarEmit('reload-events')
    }
  }
}

export { defaultSettings, calendarViewType, CalendarMixins }