<!-- JEditableTable -->
<!-- @version 1.5.0 -->
<!-- @author sjlei -->
<template>
  <a-spin :spinning="loading">

    <a-row type="flex">
      <a-col>
        <slot name="buttonBefore" :target="getVM()"/>
      </a-col>
      <a-col>
        <!-- 操作按钮 -->
        <div v-if="actionButton" class="action-button">
          <a-button type="primary" icon="plus" @click="handleClickAdd" :disabled="disabled">插入行</a-button>
          <span class="gap"></span>
          <template v-if="selectedRowIds.length>0">
            <a-popconfirm
              :title="`确定要移除这 ${selectedRowIds.length} 项吗?`"
              @confirm="handleConfirmDelete">
              <a-button type="primary" icon="minus" :disabled="disabled">移除行</a-button>
              <span class="gap"></span>
            </a-popconfirm>
            <template v-if="showClearSelectButton">
              <a-button icon="delete" @click="handleClickClearSelection">清空选择</a-button>
              <span class="gap"></span>
            </template>
          </template>
        </div>
        <div v-if="actionDeleteButton" class="action-button">
          <template v-if="selectedRowIds.length>0">
            <a-popconfirm
              :title="`确定要移除这 ${selectedRowIds.length} 项吗?`"
              @confirm="handleConfirmDelete">
              <a-button type="primary" icon="minus" :disabled="disabled">移除行</a-button>
              <span class="gap"></span>
            </a-popconfirm>
          </template>
        </div>
      </a-col>
      <a-col>
        <slot name="buttonAfter" :target="getVM()"/>
      </a-col>
    </a-row>

    <slot name="actionButtonAfter" :target="getVM()"/>

    <div :id="`${caseId}inputTable`" class="input-table" :style="{'min-width':minWidth+'px'}">
      <!-- 渲染表头 -->
      <div class="thead" ref="thead">
        <div class="tr" :style="{width: this.realTrWidth}">
          <!-- 左侧固定td  -->
          <div v-if="dragSort" class="td td-ds" :style="style.tdLeftDs">
            <span></span>
          </div>
          <div v-if="dragSortAndNumber" class="td td-ds" :style="style.tdLeftDs">
            <span>#</span>
          </div>
          <div v-if="rowNumber" class="td td-num" :style="style.tdLeft">
            <span>#</span>
          </div>
          <div v-if="rowSelection" class="td td-cb" :style="style.tdLeft">
            <!--:indeterminate="true"-->
            <a-checkbox
              :checked="getSelectAll"
              :indeterminate="getSelectIndeterminate"
              @change="handleChangeCheckedAll"
            />
          </div>
          <!-- 右侧动态生成td -->
          <template v-for="col in columns">
            <div
              v-show="col.type !== formTypes.hidden"
              class="td"
              :key="col.key"
              :style="buildTdStyle(col)">
              <span style="padding: 0 5px;">
                {{ col.title }}
                <slot name="depotBatchSet" v-if="col.key === 'depotId'" :target="getVM()"/>
              </span>
            </div>
          </template>
        </div>
      </div>

      <div class="scroll-view" ref="scrollView" :style="{'max-height':maxHeight+'px'}">


        <!-- 渲染主体 body -->
        <div :id="`${caseId}tbody`" class="tbody" :style="tbodyStyle">
          <!-- 扩展高度 -->
          <div class="tr-expand" :style="`height:${getExpandHeight}px; z-index:${loading?'11':'9'};`"></div>
          <!-- 无数据时显示 -->
          <div v-if="rows.length===0" class="tr-nodata">
            <span>暂无数据</span>
          </div>
          <!-- v-model="rows"-->
          <draggable
            :value="rows"
            handle=".td-ds-icons"
            @start="handleDragMoveStart"
            @end="handleDragMoveEnd"
          >

            <!-- 动态生成tr -->
            <template v-for="(row,rowIndex) in rows">
              <!-- tr 如果超出200条，则只加载可见的和预加载的总共十条数据 -->
              <div
                v-if="rows.length<=200 ||
                (rows.length>200 &&
                rowIndex >= parseInt(`${(scrollTop-rowHeight) / rowHeight}`) &&
                  (parseInt(`${scrollTop / rowHeight}`) + 9) > rowIndex)"
                :id="`${caseId}tbody-tr-${rowIndex}`"
                :data-idx="rowIndex"
                class="tr"
                :class="selectedRowIds.indexOf(row.id) !== -1 ? 'tr-checked' : ''"
                :style="buildTrStyle(rowIndex)"
                :key="row.id">
                <!-- 左侧固定td  -->

                <div v-if="dragSort" class="td td-ds" :style="style.tdLeftDs">
                  <a-dropdown :trigger="['click']" :getPopupContainer="getParentContainer">
                    <div class="td-ds-icons">
                      <a-icon type="align-left"/>
                      <a-icon type="align-right"/>
                    </div>

                    <a-menu slot="overlay">
                      <a-menu-item key="0" :disabled="rowIndex===0" @click="_handleRowMoveUp(rowIndex)">向上移</a-menu-item>
                      <a-menu-item key="1" :disabled="rowIndex===(rows.length-1)" @click="_handleRowMoveDown(rowIndex)">向下移</a-menu-item>
                      <!-- <a-menu-divider/>
                      <a-menu-item key="3" @click="_handleRowInsertDown(rowIndex)">插入一行</a-menu-item> -->
                    </a-menu>
                  </a-dropdown>
                </div>

                <div v-if="dragSortAndNumber" class="td td-ds" :style="style.tdLeftDs">
                  <a-dropdown :trigger="['click']" :getPopupContainer="getParentContainer">
                    <div class="td-ds-icons" title="点击不放可以拖动" style="text-align: center; line-height: 32px">
                      <span>{{ rowIndex+1 }}</span>
                    </div>

                    <a-menu slot="overlay">
                      <a-menu-item key="0" :disabled="rowIndex===0" @click="_handleRowMoveUp(rowIndex)">向上移</a-menu-item>
                      <a-menu-item key="1" :disabled="rowIndex===(rows.length-1)" @click="_handleRowMoveDown(rowIndex)">向下移</a-menu-item>
                      <!-- <a-menu-divider/>
                      <a-menu-item key="3" @click="_handleRowInsertDown(rowIndex)">插入一行</a-menu-item> -->
                    </a-menu>
                  </a-dropdown>
                </div>

                <div v-if="rowNumber" class="td td-num" :style="style.tdLeft">
                  <span>{{ rowIndex+1 }}</span>
                </div>

                <div v-if="rowSelection" class="td td-cb" :style="style.tdLeft">
                  <!-- 此 v-for 只是为了拼接 id 字符串 -->
                  <template v-for="(id,i) in [`${row.id}`]">
                    <a-checkbox
                      :id="id"
                      :key="i"
                      :checked="selectedRowIds.indexOf(id) !== -1"
                      @change="handleChangeLeftCheckbox"/>
                  </template>
                </div>

                <!-- 右侧动态生成td -->
                <div
                  class="td"
                  v-for="col in columns"
                  v-show="col.type !== formTypes.hidden"
                  :key="col.key"
                  :style="buildTdStyle(col)">

                  <!-- 此 v-for 只是为了拼接 id 字符串 -->
                  <template v-for="(id,i) in [`${col.key}${row.id}`]">

                    <!-- native input -->
                    <label :key="i" v-if="col.type === formTypes.input || col.type === formTypes.inputNumber">
                      <a-tooltip
                        :id="id"
                        placement="top"
                        :title="(tooltips[id] || {}).title"
                        :visible="(tooltips[id] || {}).visible || false"
                        :autoAdjustOverflow="true"
                        :getPopupContainer="getParentContainer"
                      >

                        <input
                          :id="id"
                          :readonly="col.readonly"
                          :visible="col.visible"
                          v-bind="buildProps(row,col)"
                          :data-input-number="col.type === formTypes.inputNumber"
                          :placeholder="replaceProps(col, col.placeholder)"
                          @blur="(e)=>{handleBlurCommono(e.target,rowIndex,row,col)}"
                          @input="(e)=>{handleInputCommono(e.target,rowIndex,row,col)}"
                          @mouseover="()=>{handleMouseoverCommono(row,col)}"
                          @mouseout="()=>{handleMouseoutCommono(row,col)}"/>

                      </a-tooltip>

                    </label>
                    <!-- checkbox -->
                    <template v-else-if="col.type === formTypes.checkbox">
                      <a-checkbox
                        :key="i"
                        :id="id"
                        v-bind="buildProps(row,col)"
                        :checked="checkboxValues[id]"
                        @change="(e)=>handleChangeCheckboxCommon(e,row,col)"
                      />
                    </template>
                    <!-- select -->
                    <template v-else-if="col.type === formTypes.select">
                      <a-tooltip
                        :key="i"
                        :id="id"
                        placement="top"
                        :title="(tooltips[id] || {}).title"
                        :visible="(tooltips[id] || {}).visible || false"
                        :autoAdjustOverflow="true"
                        :getPopupContainer="getParentContainer"
                      >

                      <span
                        @mouseover="()=>{handleMouseoverCommono(row,col)}"
                        @mouseout="()=>{handleMouseoutCommono(row,col)}">

                        <a-select
                          :id="id"
                          :key="i"
                          v-bind="buildProps(row,col)"
                          style="width: 100%;"
                          :value="getSelectValue(id)"
                          :options="col.options"
                          :getPopupContainer="getParentContainer"
                          :placeholder="replaceProps(col, col.placeholder)"
                          :filterOption="(i,o)=>handleSelectFilterOption(i,o,col)"
                          @change="(v)=>handleChangeSelectCommon(v,id,row,col)"
                          @search="(v)=>handleSearchSelect(v,id,row,col)"
                          @blur="(v)=>handleBlurSearch(v,id,row,col)"
                          allowClear
                        >
                          <div slot="dropdownRender" slot-scope="menu">
                            <v-nodes :vnodes="menu" />
                            <slot name="depotAdd" v-if="col.key === 'depotId'" :target="getVM()"/>
                            <slot name="inOutItemAdd" v-if="col.key === 'inOutItemId'" :target="getVM()"/>
                          </div>
                          <!--<template v-for="(opt,optKey) in col.options">-->
                          <!--<a-select-option :value="opt.value" :key="optKey">{{ opt.title }}</a-select-option>-->
                          <!--</template>-->
                        </a-select>
                      </span>
                      </a-tooltip>
                    </template>
                    <!-- date -->
                    <template v-else-if="col.type === formTypes.date || col.type === formTypes.datetime">
                      <a-tooltip
                        :key="i"
                        :id="id"
                        placement="top"
                        :title="(tooltips[id] || {}).title"
                        :visible="(tooltips[id] || {}).visible || false"
                        :autoAdjustOverflow="true"
                        :getPopupContainer="getParentContainer"
                      >

                      <span
                        @mouseover="()=>{handleMouseoverCommono(row,col)}"
                        @mouseout="()=>{handleMouseoutCommono(row,col)}">

                        <j-date
                          :id="id"
                          :key="i"
                          v-bind="buildProps(row,col)"
                          style="width: 100%;"
                          :value="jdateValues[id]"
                          :getCalendarContainer="getParentContainer"
                          :placeholder="replaceProps(col, col.placeholder)"
                          :trigger-change="true"
                          :showTime="col.type === formTypes.datetime"
                          :dateFormat="col.type === formTypes.date? 'YYYY-MM-DD':'YYYY-MM-DD HH:mm:ss'"
                          allowClear
                          @change="(v)=>handleChangeJDateCommon(v,id,row,col,col.type === formTypes.datetime)"/>

                      </span>
                      </a-tooltip>
                    </template>

                    <!-- input_pop -->
                    <template v-else-if="col.type === formTypes.input_pop">
                      <a-tooltip
                        :key="i"
                        :id="id"
                        placement="top"
                        :title="(tooltips[id] || {}).title"
                        :visible="(tooltips[id] || {}).visible || false"
                        :autoAdjustOverflow="true"
                        :getPopupContainer="getParentContainer">
                        <span
                          @mouseover="()=>{handleMouseoverCommono(row,col)}"
                          @mouseout="()=>{handleMouseoutCommono(row,col)}">
                          <j-input-pop
                            :id="id"
                            :key="i"
                            :width="300"
                            :height="210"
                            :pop-container="`${caseId}tbody`"
                            v-bind="buildProps(row,col)"
                            style="width: 100%;"
                            :value="jInputPopValues[id]"
                            :getCalendarContainer="getParentContainer"
                            :placeholder="replaceProps(col, col.placeholder)"
                            @change="(v)=>handleChangeJInputPopCommon(v,id,row,col)">
                          </j-input-pop>
                        </span>
                      </a-tooltip>
                    </template>

                    <div v-else-if="col.type === formTypes.upload" :key="i">
                      <template v-if="uploadValues[id] != null" v-for="(file,fileKey) of [(uploadValues[id]||{})]">
                        <a-input
                          :key="fileKey"
                          :readOnly="true"
                          :value="file.name"
                        >

                          <template slot="addonBefore" style="width: 30px">
                            <a-tooltip v-if="file.status==='uploading'" :title="`上传中(${Math.floor(file.percent)}%)`">
                              <a-icon type="loading"/>
                            </a-tooltip>
                            <a-tooltip v-else-if="file.status==='done'" title="上传完成">
                              <a-icon type="check-circle" style="color:#00DB00;"/>
                            </a-tooltip>
                            <a-tooltip v-else title="上传失败">
                              <a-icon type="exclamation-circle" style="color:red;"/>
                            </a-tooltip>
                          </template>

                          <template v-if="col.allowDownload!==false || col.allowRemove!==false" slot="addonAfter" style="width: 30px">
                            <a-dropdown :trigger="['click']" placement="bottomRight" :getPopupContainer="getParentContainer">
                              <a-tooltip title="操作" :getPopupContainer="getParentContainer">
                                <a-icon
                                  v-if="file.status!=='uploading'"
                                  type="setting"
                                  style="cursor: pointer;"/>
                              </a-tooltip>

                              <a-menu slot="overlay">
                                <a-menu-item v-if="col.allowDownload!==false" @click="handleClickDownloadFile(id)">
                                  <span><a-icon type="download"/>&nbsp;下载</span>
                                </a-menu-item>
                                <a-menu-item v-if="col.allowRemove!==false" @click="handleClickDelFile(id)">
                                  <span><a-icon type="delete"/>&nbsp;删除</span>
                                </a-menu-item>
                              </a-menu>
                            </a-dropdown>
                          </template>

                        </a-input>
                      </template>

                      <div :hidden="uploadValues[id] != null">
                        <a-tooltip
                          :key="i"
                          :id="id"
                          placement="top"
                          :title="(tooltips[id] || {}).title"
                          :visible="(tooltips[id] || {}).visible || false"
                          :autoAdjustOverflow="true"
                          :getPopupContainer="getParentContainer"
                        >

                          <span
                            @mouseover="()=>{handleMouseoverCommono(row,col)}"
                            @mouseout="()=>{handleMouseoutCommono(row,col)}">
                            <a-upload
                              name="file"
                              :data="{'isup':1}"
                              :multiple="false"
                              :action="col.action"
                              :headers="uploadGetHeaders(row,col)"
                              :showUploadList="false"
                              v-bind="buildProps(row,col)"
                              @change="(v)=>handleChangeUpload(v,id,row,col)"
                            >
                              <a-button icon="upload">{{ col.placeholder }}</a-button>
                            </a-upload>
                          </span>
                        </a-tooltip>
                      </div>

                    </div>

                    <!-- update-begin-author:taoyan date:0827 for：popup -->
                    <template v-else-if="col.type === formTypes.popup">
                      <a-tooltip
                        :key="i"
                        :id="id"
                        placement="top"
                        :title="(tooltips[id] || {}).title"
                        :visible="(tooltips[id] || {}).visible || false"
                        :autoAdjustOverflow="true"
                        :getPopupContainer="getParentContainer"
                      >

                        <span
                          @mouseover="()=>{handleMouseoverCommono(row,col)}"
                          @mouseout="()=>{handleMouseoutCommono(row,col)}">

                          <j-popup
                            :id="id"
                            :key="i"
                            v-bind="buildProps(row,col)"
                            :placeholder="replaceProps(col, col.placeholder)"
                            style="width: 100%;"
                            :value="getPopupValue(id)"
                            :field="col.field || col.key"
                            :org-fields="col.orgFields"
                            :dest-fields="col.destFields"
                            :code="col.popupCode"
                            :groupId="caseId"
                            @input="(value,others)=>popupCallback(value,others,id,row,col,rowIndex)"/>
                        </span>
                      </a-tooltip>
                    </template>
                    <!-- update-end-author:taoyan date:0827 for：popup -->

                    <!-- update-begin-author:jsh date:20210308 for：popupJsh -->
                    <template v-else-if="col.type === formTypes.popupJsh">
                      <a-tooltip
                        :key="i"
                        :id="id"
                        placement="top"
                        :title="(tooltips[id] || {}).title"
                        :visible="(tooltips[id] || {}).visible || false"
                        :autoAdjustOverflow="true"
                        :getPopupContainer="getParentContainer"
                      >

                        <span
                          @mouseover="()=>{handleMouseoverCommono(row,col)}"
                          @mouseout="()=>{handleMouseoutCommono(row,col)}">

                          <j-select-list
                            :rows="getPopupJshRows(row)"
                            :kind="col.kind"
                            :multi="col.multi"
                            :value="getPopupJshValue(id)"
                            @change="(v)=>handleChangePopupJshCommon(v,id,row,col,rowIndex)" />
                        </span>
                      </a-tooltip>
                    </template>
                    <!-- update-end-author:jsh date:20210308 for：popupJsh -->

                    <!-- update-beign-author:taoyan date:0827 for：文件/图片逻辑新增 -->
                    <div v-else-if="col.type === formTypes.file" :key="i">
                      <template v-if="uploadValues[id] != null" v-for="(file,fileKey) of [(uploadValues[id]||{})]">
                        <div :key="fileKey" style="position: relative;">
                          <a-tooltip v-if="file.status==='uploading'" :title="`上传中(${Math.floor(file.percent)}%)`">
                            <a-icon type="loading" style="color:red;"/>
                            <span style="color:red;margin-left:5px">{{  file.status }}</span>
                          </a-tooltip>

                          <a-tooltip v-else-if="file.status==='done'" :title="file.name">
                            <a-icon type="paper-clip" />
                            <span style="margin-left:5px">{{ getEllipsisWord(file.name,5) }}</span>
                          </a-tooltip>

                          <a-tooltip v-else :title="file.name">
                            <a-icon type="paper-clip" style="color:red;"/>
                            <span style="color:red;margin-left:5px">{{ getEllipsisWord(file.name,5) }}</span>
                          </a-tooltip>

                          <template style="width: 30px">
                            <a-dropdown :trigger="['click']" placement="bottomRight" :getPopupContainer="getParentContainer" style="margin-left: 10px;">
                              <a-tooltip title="操作" :getPopupContainer="getParentContainer">
                                <a-icon v-if="file.status!=='uploading'" type="setting" style="cursor: pointer;"/>
                              </a-tooltip>

                              <a-menu slot="overlay">
                                <a-menu-item v-if="col.allowDownload!==false" @click="handleClickDownFileByUrl(id)">
                                  <span><a-icon type="download"/>&nbsp;下载</span>
                                </a-menu-item>
                                <a-menu-item @click="handleClickDelFile(id)">
                                  <span><a-icon type="delete"/>&nbsp;删除</span>
                                </a-menu-item>
                                <a-menu-item @click="handleMoreOperation(id)">
                                  <span><a-icon type="bars" /> 更多</span>
                                </a-menu-item>
                              </a-menu>
                            </a-dropdown>
                          </template>
                        </div>
                      </template>

                      <div :hidden="uploadValues[id] != null">
                        <a-tooltip
                          :key="i"
                          :id="id"
                          placement="top"
                          :title="(tooltips[id] || {}).title"
                          :visible="(tooltips[id] || {}).visible || false"
                          :autoAdjustOverflow="true"
                          :getPopupContainer="getParentContainer"
                        >

                          <span
                            @mouseover="()=>{handleMouseoverCommono(row,col)}"
                            @mouseout="()=>{handleMouseoutCommono(row,col)}">
                            <a-upload
                              name="file"
                              :data="{'isup':1}"
                              :multiple="false"
                              :action="getUploadAction(col.action)"
                              :headers="uploadGetHeaders(row,col)"
                              :showUploadList="false"
                              v-bind="buildProps(row,col)"
                              @change="(v)=>handleChangeUpload(v,id,row,col)"
                            >
                              <a-button icon="upload">上传文件</a-button>
                            </a-upload>
                          </span>
                        </a-tooltip>
                      </div>

                    </div>

                    <div v-else-if="col.type === formTypes.image" :key="i">
                      <template v-if="uploadValues[id] != null" v-for="(file,fileKey) of [(uploadValues[id]||{})]">
                        <div :key="fileKey" style="position: relative;">
                          <template v-if="!uploadValues[id] || !(uploadValues[id]['url'] || uploadValues[id]['path'] || uploadValues[id]['message'])">
                            <a-icon type="loading"/>
                          </template>
                          <template v-else-if="uploadValues[id]['path']">
                            <img class="j-editable-image" :src="getCellImageView(id)" alt="无图片" @click="handleMoreOperation(id,'img')"/>
                          </template>
                          <template v-else>
                            <a-icon type="exclamation-circle" style="color: red;" @click="handleClickShowImageError(id)"/>
                          </template>
                          <template slot="addonBefore" style="width: 30px">
                            <a-tooltip v-if="file.status==='uploading'" :title="`上传中(${Math.floor(file.percent)}%)`">
                              <a-icon type="loading"/>
                            </a-tooltip>
                            <a-tooltip v-else-if="file.status==='done'" title="上传完成">
                              <a-icon type="check-circle" style="color:#00DB00;"/>
                            </a-tooltip>
                            <a-tooltip v-else title="上传失败">
                              <a-icon type="exclamation-circle" style="color:red;"/>
                            </a-tooltip>
                          </template>

                          <template style="width: 30px">
                            <a-dropdown :trigger="['click']" placement="bottomRight" :getPopupContainer="getParentContainer" style="margin-left: 10px;">
                              <a-tooltip title="操作" :getPopupContainer="getParentContainer">
                                <a-icon
                                  v-if="file.status!=='uploading'"
                                  type="setting"
                                  style="cursor: pointer;"/>
                              </a-tooltip>

                              <a-menu slot="overlay">
                                <a-menu-item v-if="col.allowDownload!==false" @click="handleClickDownFileByUrl(id)">
                                  <span><a-icon type="download"/>&nbsp;下载</span>
                                </a-menu-item>
                                <a-menu-item @click="handleClickDelFile(id)">
                                  <span><a-icon type="delete"/>&nbsp;删除</span>
                                </a-menu-item>
                                <a-menu-item @click="handleMoreOperation(id,'img')">
                                  <span><a-icon type="bars" /> 更多</span>
                                </a-menu-item>
                              </a-menu>
                            </a-dropdown>
                          </template>

                        </div>
                      </template>

                      <div :hidden="uploadValues[id] != null">
                        <a-tooltip
                          :key="i"
                          :id="id"
                          placement="top"
                          :title="(tooltips[id] || {}).title"
                          :visible="(tooltips[id] || {}).visible || false"
                          :autoAdjustOverflow="true"
                          :getPopupContainer="getParentContainer"
                        >

                          <span
                            @mouseover="()=>{handleMouseoverCommono(row,col)}"
                            @mouseout="()=>{handleMouseoutCommono(row,col)}">
                            <a-upload
                              name="file"
                              :data="{'isup':1}"
                              :multiple="false"
                              :action="getUploadAction(col.action)"
                              :headers="uploadGetHeaders(row,col)"
                              :showUploadList="false"
                              v-bind="buildProps(row,col)"
                              @change="(v)=>handleChangeUpload(v,id,row,col)"
                            >
                              <a-button icon="upload">上传图片</a-button>
                            </a-upload>
                          </span>
                        </a-tooltip>
                      </div>

                    </div>
                    <!-- update-end-author:taoyan date:0827 for：图片逻辑新增 -->


                    <!-- radio-begin -->
                    <template v-else-if="col.type === formTypes.radio">
                      <a-tooltip
                        :key="i"
                        :id="id"
                        placement="top"
                        :title="(tooltips[id] || {}).title"
                        :visible="(tooltips[id] || {}).visible || false"
                        :autoAdjustOverflow="true"
                        :getPopupContainer="getParentContainer"
                      >

                        <span
                          @mouseover="()=>{handleMouseoverCommono(row,col)}"
                          @mouseout="()=>{handleMouseoutCommono(row,col)}">
                          <a-radio-group
                            :id="id"
                            :key="i"
                            v-bind="buildProps(row,col)"
                            :value="radioValues[id]"
                            @change="(e)=>handleRadioChange(e.target.value,id,row,col)">
                            <a-radio v-for="(item, key) in col.options" :key="key" :value="item.value">{{ item.text }}</a-radio>
                          </a-radio-group>
                        </span>
                      </a-tooltip>
                    </template>
                    <!-- radio-end -->


                    <!-- select多选 -begin -->
                    <template v-else-if="col.type === formTypes.list_multi">
                      <a-tooltip
                        :key="i"
                        :id="id"
                        placement="top"
                        :title="(tooltips[id] || {}).title"
                        :visible="(tooltips[id] || {}).visible || false"
                        :autoAdjustOverflow="true"
                        :getPopupContainer="getParentContainer"
                      >

                        <span
                          @mouseover="()=>{handleMouseoverCommono(row,col)}"
                          @mouseout="()=>{handleMouseoutCommono(row,col)}">

                          <a-select
                            :id="id"
                            :key="i"
                            mode="multiple"
                            :maxTagCount="1"
                            v-bind="buildProps(row,col)"
                            style="width: 100%;"
                            :value="multiSelectValues[id]"
                            :options="col.options"
                            :getPopupContainer="getParentContainer"
                            :placeholder="replaceProps(col, col.placeholder)"
                            @change="(v)=>handleMultiSelectChange(v,id,row,col)"
                            allowClear>
                          </a-select>
                        </span>
                      </a-tooltip>
                    </template>
                    <!-- select多选 -end -->

                    <!-- select搜索 -begin -->
                    <template v-else-if="col.type === formTypes.sel_search">
                      <a-tooltip
                        :key="i"
                        :id="id"
                        placement="top"
                        :title="(tooltips[id] || {}).title"
                        :visible="(tooltips[id] || {}).visible || false"
                        :autoAdjustOverflow="true"
                        :getPopupContainer="getParentContainer"
                      >

                        <span
                          @mouseover="()=>{handleMouseoverCommono(row,col)}"
                          @mouseout="()=>{handleMouseoutCommono(row,col)}">

                          <a-select
                            :id="id"
                            :key="i"
                            showSearch
                            optionFilterProp="children"
                            :filterOption="filterOption"
                            v-bind="buildProps(row,col)"
                            style="width: 100%;"
                            :value="searchSelectValues[id]"
                            :options="col.options"
                            :getPopupContainer="getParentContainer"
                            :placeholder="replaceProps(col, col.placeholder)"
                            @change="(v)=>handleSearchSelectChange(v,id,row,col)"
                            allowClear>
                          </a-select>
                        </span>
                      </a-tooltip>
                    </template>
                    <!-- select搜索 -end -->


                    <div v-else-if="col.type === formTypes.slot" :key="i">
                      <a-tooltip
                        :key="i"
                        :id="id"
                        placement="top"
                        :title="(tooltips[id] || {}).title"
                        :visible="(tooltips[id] || {}).visible || false"
                        :autoAdjustOverflow="true"
                        :getPopupContainer="getParentContainer"
                      >

                        <span
                          @mouseover="()=>{handleMouseoverCommono(row,col)}"
                          @mouseout="()=>{handleMouseoutCommono(row,col)}">
                            <slot
                              :name="(col.slot || col.slotName) || col.key"
                              :index="rowIndex"
                              :text="slotValues[id]"
                              :value="slotValues[id]"
                              :column="col"
                              :rowId="getCleanId(row.id)"
                              :getValue="()=>_getValueForSlot(row.id)"
                              :caseId="caseId"
                              :allValues="_getAllValuesForSlot()"
                              :target="getVM()"
                              :handleChange="(v)=>handleChangeSlotCommon(v,id,row,col)"
                              :isNotPass="notPassedIds.includes(col.key+row.id)"
                            />
                        </span>
                      </a-tooltip>
                    </div>

                    <!-- else (normal) -->
                    <span v-else :key="i" v-bind="buildProps(row,col)" class="td-span" :title="inputValues[rowIndex][col.key]">
                      {{ inputValues[rowIndex][col.key] }}
                    </span>
                  </template>
                </div>
              </div>
              <!-- -- tr end -- -->

            </template>
          </draggable>


          <!-- 统计行 -->
          <div
            v-if="showStatisticsRow"
            class="tr"
            :style="{
              ...buildTrStyle(rows.length),
              height: '32px'
            }"
          >
            <div v-if="dragSort" class="td td-ds" :style="style.tdLeftDs">
            </div>
            <div v-if="dragSortAndNumber" class="td td-ds" :style="style.tdLeftDs">
            </div>
            <div v-if="rowNumber" class="td td-num" :style="style.tdLeft">
              <span v-if="!rowSelection">统计</span>
            </div>
            <div v-if="rowSelection" class="td td-cb" :style="style.tdLeft">
            </div>

            <!-- 右侧动态生成td -->
            <template v-for="col in columns">
              <div
                :key="col.key"
                class="td"
                v-show="col.type !== formTypes.hidden"
                :style="buildTdStyle(col)"
              >
                <span
                  v-show="col.type === formTypes.inputNumber"
                  style="padding: 0 2px;"
                >{{statisticsColumns[col.key]}}</span>
              </div>
            </template>

          </div>

        </div>
      </div>
      <j-file-pop ref="filePop" @ok="handleFileSuccess"></j-file-pop>
    </div>
  </a-spin>
</template>

<script>
  import Vue from 'vue'
  import $ from 'jquery'
  import Draggable from 'vuedraggable'
  import { ACCESS_TOKEN } from '@/store/mutation-types'
  import { FormTypes, VALIDATE_NO_PASSED } from '@/utils/JEditableTableUtil'
  import { cloneObject, randomString, randomNumber } from '@/utils/util'
  import JDate from '@/components/jeecg/JDate'
  import { getFileAccessHttpUrl } from '@/api/manage';
  import JInputPop from '@/components/jeecg/minipop/JInputPop'
  import JFilePop from '@/components/jeecg/minipop/JFilePop'
  import JSelectList from '@/components/jeecgbiz/JSelectList'

  // ，NeedsFinished
  let rowHeight = 42

  export default {
    name: 'JEditableTable',
    components: {
      JDate, Draggable, JInputPop, JFilePop, JSelectList,
      VNodes: {
        functional: true,
        render: (h, ctx) => ctx.props.vnodes,
      }
    },
    provide() {
      return {
        parentIsJEditableTable: true,
        getDestroyCleanGroupRequest: () => this.destroyCleanGroupRequest,
      }
    },
    props: {
      // Info
      columns: {
        type: Array,
        required: true
      },
      // Data
      dataSource: {
        type: Array,
        required: true,
        default: () => []
      },
      // YesNoDisplayButton
      actionButton: {
        type: Boolean,
        default: false
      },
      // YesNoDisplayDeleteButton
      actionDeleteButton: {
        type: Boolean,
        default: false
      },
      // YesNoDisplay
      rowNumber: {
        type: Boolean,
        default: false
      },
      // YesNo
      rowSelection: {
        type: Boolean,
        default: false
      },
      // PageYesNo
      loading: {
        type: Boolean,
        default: false
      },
      // PageYesNo
      minWidth: {
        type: Number,
        default: 1500
      },
      maxHeight: {
        type: Number,
        default: 400
      },
      // Disable
      disabledRows: {
        type: Object,
        default() {
          return {}
        }
      },
      // YesNoDisableAllComponent
      disabled: {
        type: Boolean,
        default: false
      },
      // YesNo
      dragSort: {
        type: Boolean,
        default: false
      },
      // YesNoDisplay
      dragSortAndNumber: {
        type: Boolean,
        default: false
      },
      dragSortKey: {
        type: String,
        default: 'orderNum'
      },
    },
    data() {
      return {
        // YesNo
        isFirst: true,
        // CurrentYesNoYes
        isJEditableTable: true,
        // caseId，PreventHas
        caseIdPrefix: '_jet-',
        caseId: `_jet-${randomString(6)}-`,
        // IDIdentifier，YesIdentifierIDYesID，Data
        tempId: `_tid-${randomString(6)}`,
        // document element Object
        el: {
          inputTable: null,
          tbody: null
        },
        // divstyle
        style: {
          // 'max-height': '400px'
          tbody: { left: '0px' },
          // tdstyle
          // 20200331 cfm modify
          // tdLeft: { 'min-width': '4%', 'max-width': '45px' },
          tdLeft: { 'min-width': '40px', 'max-width': '45px' },
          tdLeftDs: { 'min-width': '30px', 'max-width': '35px' },
        },
        // Type
        formTypes: FormTypes,
        // Data
        rows: [],
        // ，height + padding + border
        rowHeight,
        // 
        scrollTop: 0,
        // Bind select 
        selectValues: {},
        // Bind checkbox 
        checkboxValues: {},
        // Bind jdate 
        jdateValues: {},
        // Bindjinputpop
        jInputPopValues:{},
        // BindData
        slotValues: {},
        // file Info
        uploadValues: {},
        //popupInfo
        popupValues: {},
        //popupJshInfo
        popupJshValues: {},
        radioValues: {},
        metaCheckboxValues: {},
        multiSelectValues: {},
        searchSelectValues: {},
        // BindSelect boxAlreadyid
        selectedRowIds: [],
        // Deleteid
        deleteIds: [],
        // DisplaytooltipInfo
        tooltips: {},
        // HasinputId
        notPassedIds: [],

        // CurrentYesNo
        dragging: false,
        // YesNoHasStatistics
        hasStatisticsColumn: false,
        statisticsColumns: {},
        // OnlyHasClearGroupRequest
        destroyCleanGroupRequest: false,
      }
    },
    created() {
      this.inputValues = []
      // CurrentDisplaytr
      this.visibleTrEls = []
      this.disabledRowIds = (this.disabledRowIds || [])
    },
    // Property
    computed: {
      // expandHeight = rows.length * rowHeight
      getExpandHeight() {
        let length = this.rows.length * this.rowHeight
        if (this.showStatisticsRow) {
          length += 34
        }
        return length
      },
      // YesNoDisplayStatistics
      showStatisticsRow() {
        return this.hasStatisticsColumn && this.rows.length > 0
      },
      // GetYesNo
      getSelectIndeterminate() {
        return (this.selectedRowIds.length > 0 &&
          this.selectedRowIds.length < this.rows.length)
      },
      // GetYesNoAll
      getSelectAll() {
        return (this.selectedRowIds.length === this.rows.length) && this.rows.length > 0
      },
      tbodyStyle() {
        let style = Object.assign({}, this.style.tbody)
        // style['max-height'] = `${this.maxHeight}px`
        style['width'] = this.realTrWidth
        return style
      },
      showClearSelectButton() {
        let count = 0
        for (let key in this.disabledRows) {
          if (this.disabledRows.hasOwnProperty(key)) count++
        }
        return count > 0
      },
      accessToken() {
        return Vue.ls.get(ACCESS_TOKEN)
      },
      realTrWidth() {
        let splice = ' + '
        let calcWidth = 'calc('
        this.columns.forEach((column, i) => {
          let { type, width } = column
          // HideFieldand
          if (type !== FormTypes.hidden) {
            if (typeof width === 'number') {
              calcWidth += width + 'px'
            } else if (typeof width === 'string') {
              calcWidth += width
            } else {
              calcWidth += '120px'
            }
            calcWidth += splice
          }
        })
        if (calcWidth.endsWith(splice)) {
          calcWidth = calcWidth.substring(0, calcWidth.length - splice.length)
        }
        calcWidth += ')'
        // console.log('calcWidth: ', calcWidth)
        return calcWidth
      }
    },
    // 
    watch: {
      rows: {
        immediate: true,
        handler(val, old) {
          // val.forEach(item => {
          //   for (let inputValue of  this.inputValues) {
          //     if (inputValue.id === item.id) {
          //       item['dbFieldName'] = inputValue['dbFieldName']
          //       break
          //     }
          //   }
          // })
          // console.log('watch.rows:', cloneObject({ val, old }))
        }
      },
      dataSource: {
        immediate: true,
        handler: function (newValue) {
          // IE
          this.getElementPromise('tbody').then(() => {
            this.initialize()
            this._pushByDataSource(newValue)
          })
        }
      },
      columns: {
        immediate: true,
        handler(columns) {
          // IE
          this.getElementPromise('tbody').then(() => {
            columns.forEach(column => {
              if (column.type === FormTypes.select || column.type === FormTypes.list_multi || column.type === FormTypes.sel_search) {
                //  OldVersion options
                if (column.options instanceof Array) {
                  column.options = column.options.map(item => {
                    if (item) {
                      return {
                        ...item,
                        text: item.text || item.title,
                        title: item.text || item.title
                      }
                    }
                    return {}
                  })
                }
              }
            })
          })
        }
      },
      // selectRowIds
      selectedRowIds(newValue) {
        this.$emit('selectRowChange', cloneObject(newValue).map(i => this.getCleanId(i)))
      }
    },
    mounted() {
      let vm = this
      /**  */
      this.getElement('inputTable').onscroll = function (event) {
        vm.syncScrollBar(event.target.scrollLeft)
      }
      this.getElement('tbody').onscroll = function (event) {
        // vm.recalcTrHiddenItem(event.target.scrollTop)
      }

      let { thead, scrollView } = this.$refs
      scrollView.onscroll = function (event) {

        // console.log(event.target.scrollTop, ' - ', event.target.scrollLeft)

        thead.scrollLeft = event.target.scrollLeft

        vm.recalcTrHiddenItem(event.target.scrollTop)

      }

    },
    methods: {

      getElement(id, noCaseId = false) {
        if (!this.el[id]) {
          this.el[id] = document.getElementById((noCaseId ? '' : this.caseId) + id)
        }
        return this.el[id]
      },

      getElementPromise(id, noCaseId = false) {
        return new Promise((resolve) => {
          let timer = setInterval(() => {
            let element = this.getElement(id, noCaseId)
            if (element) {
              clearInterval(timer)
              resolve(element)
            }
          }, 10)
        })
      },

      /** InitializeList */
      initialize() {
        this.visibleTrEls = []
        // CheckYesNoYes，YesClear，PreventDeleteData
        if (!this.isFirst) {
          // inputValues：input
          // YesObject，ObjectkeyYesinputrowKey，Yesinput，HasidField
          // ：
          // [{
          //    id: "_jet-4sp0iu-15541771111770"
          //    dbDefaultVal: "aaa",
          //    dbFieldName: "bbb",
          //    dbFieldTxt: "ccc",
          //    dbLength: 32
          // }]
          this.inputValues = []
          this.rows = []
          this.deleteIds = []
          this.selectValues = {}
          this.checkboxValues = {}
          this.jdateValues = {}
          this.jInputPopValues = {}
          this.slotValues = {}
          this.selectedRowIds = []
          this.tooltips = {}
          this.notPassedIds = []
          this.uploadValues = []
          this.popupValues = []
          this.popupJshValues = []
          this.radioValues = []
          this.multiSelectValues = []
          this.searchSelectValues = []
          this.scrollTop = 0
          this.$nextTick(() => {
            this.getElement('tbody').scrollTop = 0
          })
        } else {
          this.isFirst = false
        }
      },

      /** Status */
      syncScrollBar(scrollLeft) {
        // this.style.tbody.left = `${scrollLeft}px`
        // this.getElement('tbody').scrollLeft = scrollLeft
      },
      /** Reset，Parameters */
      resetScrollTop(top) {
        let { scrollView } = this.$refs
        if (top != null && typeof top === 'number') {
          scrollView.scrollTop = top
        } else {
          scrollView.scrollTop = this.scrollTop
        }
      },
      /** NewNeedsHideorDisplaytr */
      recalcTrHiddenItem(top) {
        let diff = top - this.scrollTop
        if (diff < 0) {
          diff = this.scrollTop - top
        }
        // OnlyHasNew
        if (diff >= this.rowHeight * 0.3) {
          this.scrollTop = top
          // Newform
          this.$nextTick(() => {
            this.updateFormValues()
          })
        }
      },
      /** id */
      generateId(rows) {
        if (!(rows instanceof Array)) {
          rows = this.rows || []
        }
        let timestamp = new Date().getTime()
        return `${this.caseId}${timestamp}${rows.length}${randomNumber(6)}${this.tempId}`
      },
      /** push Data */
      push(record, update = true, rows, insertIndex = null, setDefaultValue = true) {
        return this._pushByDataSource([record], [insertIndex], update, rows, setDefaultValue)
      },

      /**
       * push 数据
       *
       * @param dataSource 数据源
       * @param insertIndexes 行插入位置，和dataSource的下标一一对应
       * @param update 是否更新
       * @param rows 若不传就使用 this.rows
       * @param setDefaultValue 是否填充默认值
       *
       */
      _pushByDataSource(dataSource, insertIndexes = null, update = true, rows = null, setDefaultValue = false) {
        if (!(rows instanceof Array)) {
          rows = [...this.rows] || []
        }
        let checkboxValues = { ...this.checkboxValues }
        let selectValues = { ...this.selectValues }
        let jdateValues = { ...this.jdateValues }
        let jInputPopValues = { ...this.jInputPopValues }
        let slotValues = { ...this.slotValues }
        let uploadValues = { ...this.uploadValues }
        let popupValues = { ...this.popupValues }
        let popupJshValues = { ...this.popupJshValues }
        let radioValues = { ...this.radioValues }
        let multiSelectValues = { ...this.multiSelectValues }
        let searchSelectValues = { ...this.searchSelectValues }
        // Disableid
        let disabledRowIds = (this.disabledRowIds || [])
        dataSource.forEach((data, newValueIndex) => {
          // CannotDataid
          let dataId = data.id
          // CheckDataYesNoHasid
          if (dataId == null || dataId === '') {
            dataId = this.generateId(rows)
          } else if(!this.hasCaseId(dataId)) {
            dataId = this.caseId + dataId
          }
          let row = { id: dataId }
          let value = { id: dataId }
          let disabled = false
          this.columns.forEach(column => {
            let inputId = column.key + value.id
            let sourceValue = (data[column.key] == null ? '' : data[column.key]).toString()

            let defaultValue = null;
            if (setDefaultValue) {
              defaultValue = column.defaultValue || (column.defaultValue === 0 ? 0 : '')
              if (defaultValue instanceof Array) {
                defaultValue = defaultValue.join(',')
              }

              sourceValue = (typeof sourceValue === 'number' || sourceValue) ? sourceValue : defaultValue
            }
            let sourceValueIsEmpty = (sourceValue == null || sourceValue === '')

            if (column.type === FormTypes.inputNumber) {
              // CheckYesNoYesField，Yes
              if (column.isOrder === true) {
                value[column.key] = this.getInputNumberMaxValue(column) + 1
              } else {
                value[column.key] = sourceValue
              }
              // CheckYesNoYesStatistics
              if (column.statistics) {
                this.hasStatisticsColumn = true
                if (!this.statisticsColumns[column.key]) {
                  this.$set(this.statisticsColumns, column.key, 0)
                }
              }

            } else if (column.type === FormTypes.checkbox) {
              // CheckYesNocustomValue（）
              if (column.customValue instanceof Array) {
                let customValue = (column.customValue[0] || '').toString()
                if (sourceValueIsEmpty && setDefaultValue) {
                  sourceValue = column.defaultChecked ? customValue : sourceValue
                }
                checkboxValues[inputId] = (sourceValue === customValue)
              } else {
                if (sourceValueIsEmpty && setDefaultValue) {
                  checkboxValues[inputId] = !!column.defaultChecked
                } else {
                  checkboxValues[inputId] = sourceValue
                }
              }

            } else if (column.type === FormTypes.select) {
              if (!sourceValueIsEmpty) {
                // CheckYesNoYes
                if (typeof sourceValue === 'string' && (column.props || {})['mode'] === 'multiple') {
                  sourceValue = sourceValue.split(',')
                }
                selectValues[inputId] = sourceValue
              } else {
                selectValues[inputId] = undefined
              }

            } else if (column.type === FormTypes.date || column.type === FormTypes.datetime) {
              jdateValues[inputId] = sourceValue

            } else if (column.type === FormTypes.slot) {
              slotValues[inputId] = sourceValue

            } else if (column.type === FormTypes.popup) {
              popupValues[inputId] = sourceValue
            } else if (column.type === FormTypes.popupJsh) {
              popupJshValues[inputId] = sourceValue
            } else if (column.type === FormTypes.input_pop) {
              jInputPopValues[inputId] = sourceValue
            } else if (column.type === FormTypes.radio) {
              radioValues[inputId] = sourceValue
            } else if (column.type === FormTypes.sel_search) {
              searchSelectValues[inputId] = sourceValue
            } else if (column.type === FormTypes.list_multi) {
              if (typeof sourceValue === 'string' && sourceValue.length > 0) {
                multiSelectValues[inputId] = sourceValue.split(',')
              } else {
                multiSelectValues[inputId] = []
              }
            } else if (column.type === FormTypes.upload || column.type === FormTypes.file || column.type === FormTypes.image) {
              if (sourceValue) {
                let fileName = ''
                if (sourceValue.indexOf(',') > 0) {
                  let sourceValue2 = sourceValue.split(',')[0]
                  fileName = sourceValue2.substring(sourceValue2.lastIndexOf('/') + 1)
                } else {
                  fileName = sourceValue.substring(sourceValue.lastIndexOf('/') + 1)
                }
                uploadValues[inputId] = {
                  name: fileName,
                  status: 'done',
                  path: sourceValue
                }
              }
            } else {
              value[column.key] = sourceValue
            }

            // disabledRows
            for (let columnKey in this.disabledRows) {
              // CheckYesNoHasProperty
              if (this.disabledRows.hasOwnProperty(columnKey) && data.hasOwnProperty(columnKey)) {
                if (disabled !== true) {
                  let temp = this.disabledRows[columnKey]
                  // DisableRuleYes
                  if (temp instanceof Array) {
                    disabled = temp.includes(data[columnKey])
                  } else {
                    disabled = (temp === data[columnKey])
                  }
                  if (disabled) {
                    disabledRowIds.push(row.id)
                  }
                }
              }
            }
          })
          // Yes
          let added = false
          if (insertIndexes instanceof Array) {
            let insertIndex = insertIndexes[newValueIndex]
            if (typeof insertIndex === 'number') {
              added = true
              rows.splice(insertIndex, 0, row)
              this.inputValues.splice(insertIndex, 0, value)
            }
          }
          if (!added) {
            rows.push(row)
            this.inputValues.push(value)
          }
        })
        // Enable，NewNumber / Code
        if (this.dragSort) {
          this.inputValues.forEach((item, index) => {
            item[this.dragSortKey] = (index + 1)
          })
        }
        this.disabledRowIds = disabledRowIds
        this.checkboxValues = checkboxValues
        this.selectValues = selectValues
        this.jdateValues = jdateValues
        this.jInputPopValues = jInputPopValues
        this.slotValues = slotValues
        this.uploadValues = uploadValues
        this.popupValues = popupValues
        this.popupJshValues = popupJshValues
        this.radioValues = radioValues
        this.multiSelectValues = multiSelectValues
        this.searchSelectValues = searchSelectValues
        // NewHasStatistics
        this.recalcAllStatisticsColumns()
        // New dom
        if (update) {
          this.rows = rows

          // Newform
          this.$nextTick(() => {
            this.updateFormValues()
          })
        }
        return rows
      },

      /** Get */
      getInputNumberMaxValue(column) {
        let maxNum = 0
        this.inputValues.forEach((item, index) => {
          let val = item[column.key], num
          try {
            num = parseInt(val)
          } catch {
            num = 0
          }
          // 
          if (index === 0) {
            maxNum = num
          } else {
            maxNum = (num > maxNum) ? num : maxNum
          }
        })
        return maxNum
      },
      /**  */
      add(num = 1, forceScrollToBottom = false) {
        if (num < 1) return
        // let timestamp = new Date().getTime()
        let rows = this.rows
        let row
        for (let i = 0; i < num; i++) {
          rows = this.push({}, false, rows)
          row = rows[rows.length - 1]
        }
        this.rows = rows

        this.$nextTick(() => {
          this.updateFormValues()
        })
        // add
        this.$emit('added', {
          row: (() => {
            let r = Object.assign({}, row)
            r.id = this.getCleanId(r.id)
            return r
          })(),
          target: this
        })
        // Set
        let tbody = this.getElement('tbody')
        let offsetHeight = tbody.offsetHeight
        let realScrollTop = tbody.scrollTop + offsetHeight
        if (forceScrollToBottom === false) {
          // OnlyHas
          if (!((tbody.scrollHeight - realScrollTop) <= 10)) {
            return
          }
        }
        this.$nextTick(() => {
          tbody.scrollTop = tbody.scrollHeight
        })
        this.$nextTick(() => {
          this.autoJumpNextInputBill()
        })
      },
      /**
       * 在指定位置添加一行
       * @param insertIndex 添加位置下标
       * @param num 添加的行数，默认1
       */
      insert(insertIndex, num = 1) {
        if (!insertIndex && num < 1) return
        let rows = this.rows
        let newRows = []
        for (let i = 0; i < num; i++) {
          let row = { id: this.generateId(rows) }
          rows = this.push(row, false, rows, insertIndex)
          newRows.push(row)
        }
        // 
        this.rows = rows
        this.$nextTick(() => {
          this.recalcSortNumber()
          this.forceUpdateFormValues()
        })
        //  insert 
        this.$emit('inserted', {
          rows: newRows.map(row => {
            let r = cloneObject(row)
            r.id = this.getCleanId(r.id)
            return r
          }),
          num, insertIndex,
          target: this
        })
        this.$nextTick(() => {
          this.autoJumpNextInputBill()
        })
      },
      /** Delete */
      removeSelectedRows() {
        this.removeRows(this.selectedRowIds)
        this.selectedRowIds = []
      },
      /** Deleteor */
      removeRows(id) {
        let ids = id
        if (!(id instanceof Array)) {
          if (typeof id === 'string') {
            ids = [id]
          } else {
            throw  `JEditableTable.removeRows() 函数需要的参数可以是string或Array类型，但提供的却是${typeof id}`
          }
        }

        let rows = cloneObject(this.rows)
        ids.forEach(removeId => {
          removeId = this.getCleanId(removeId)
          // idCorrespondingindexDelete
          const findAndDelete = (arr) => {
            for (let i = 0; i < arr.length; i++) {
              let currentId = this.getCleanId(arr[i].id)
              if (currentId === removeId) {
                arr.splice(i, 1)
                return true
              }
            }
          }
          // rowsCorrespondingindex，Delete
          if (findAndDelete(rows)) {
            // valuesCorrespondingindex，Delete
            findAndDelete(this.inputValues)
            // caseId
            let id = this.getCleanId(removeId)
            this.deleteIds.push(id)
          }
        })
        this.rows = rows
        this.$emit('deleted', this.getDeleteIds(), this)
        this.$nextTick(() => {
          // NewformValues
          this.updateFormValues()
          // NewStatistics
          this.recalcAllStatisticsColumns()
        })
        return true
      },

      /** GetTable（） */
      getValuesAsync(options = {}, callback) {
        let { validate, rowIds, deleteTempId } = options
        if (typeof validate !== 'boolean') validate = true
        if (!(rowIds instanceof Array)) rowIds = null
        // YesNoDeleteID，Defaultfor false
        if (typeof deleteTempId !== 'boolean') deleteTempId = false
        // console.log('options:', { validate, rowIds })

        let asyncCount = 0
        let error = 0
        let inputValues = cloneObject(this.inputValues)
        let tooltips = Object.assign({}, this.tooltips)
        let notPassedIds = cloneObject(this.notPassedIds)
        // 
        let values = []
        // inputValuesGet
        for (let value of inputValues) {
          let rowIdsFlag = false
          // HasrowIds，OnlyData
          if (rowIds == null) {
            rowIdsFlag = true
          } else {
            for (let rowId of rowIds) {
              if (this.getCleanId(rowId) === this.getCleanId(value.id)) {
                rowIdsFlag = true
                break
              }
            }
          }

          if (!rowIdsFlag) continue

          this.columns.forEach(column => {
            let inputId = column.key + value.id
            if (column.type === FormTypes.checkbox) {
              let checked = this.checkboxValues[inputId]
              if (column.customValue instanceof Array) {
                value[column.key] = checked ? column.customValue[0] : column.customValue[1]
              } else {
                value[column.key] = checked
              }

            } else if (column.type === FormTypes.select) {
              let selected = this.selectValues[inputId]
              if (selected instanceof Array) {
                value[column.key] = cloneObject(selected)
              } else {
                value[column.key] = selected
              }

            } else if (column.type === FormTypes.date || column.type === FormTypes.datetime) {
              value[column.key] = this.jdateValues[inputId]

            } else if (column.type === FormTypes.input_pop) {
              value[column.key] = this.jInputPopValues[inputId]

            } else if (column.type === FormTypes.upload) {
              value[column.key] = cloneObject(this.uploadValues[inputId] || null)

            } else if (column.type === FormTypes.image || column.type === FormTypes.file) {
              let currUploadObj = cloneObject(this.uploadValues[inputId] || null)
              if (currUploadObj) {
                value[column.key] = currUploadObj['path'] || null
              }

            } else if (column.type === FormTypes.popup) {
              if (!value[column.key]) {
                value[column.key] = this.popupValues[inputId] || null
              }
            } else if (column.type === FormTypes.popupJsh) {
              if (!value[column.key]) {
                value[column.key] = this.popupJshValues[inputId] || null
              }
            } else if (column.type === FormTypes.radio) {
              value[column.key] = this.radioValues[inputId]
            } else if (column.type === FormTypes.sel_search) {
              value[column.key] = this.searchSelectValues[inputId]
            } else if (column.type === FormTypes.list_multi) {
              if (!this.multiSelectValues[inputId] || this.multiSelectValues[inputId].length === 0) {
                value[column.key] = ''
              } else {
                value[column.key] = this.multiSelectValues[inputId].join(',')
              }
            } else if (column.type === FormTypes.slot) {
              value[column.key] = this.slotValues[inputId]
            }


            // Check
            if (validate === true) {
              const handleValidateOneInput = (results) => {
                tooltips[inputId] = results[0]
                if (tooltips[inputId].passed === false) {
                  error++
                  // if (error++ === 0) {
                  // let element = document.getElementById(inputId)
                  // while (element.className !== 'tr') {
                  //   element = element.parentElement
                  // }
                  // this.jumpToId(inputId, element)
                  // }
                }
                tooltips[inputId].visible = false
                notPassedIds = results[1]
              }
              asyncCount++
              let results = this.validateOneInputAsync(value[column.key], value, column, notPassedIds, false, 'getValues', (results) => {
                handleValidateOneInput(results)
                asyncCount--
              })
              handleValidateOneInput(results)
            }
          })
          // Delete tempId
          if (deleteTempId && this.isTempId(value.id)) {
            delete value.id
          } else {
            value.id = this.getCleanId(value.id)
          }

          values.push(value)
        }

        if (validate === true) {
          this.tooltips = tooltips
          this.notPassedIds = notPassedIds
        }

        const timer = setInterval(() => {
          if (asyncCount === 0) {
            clearInterval(timer)
            if (typeof callback === 'function') {
              callback({ error, values })
            }
          }
        }, 10)

        return { error, values }
      },

      /** GetTable（） */
      getValuesSync(options = {}) {
        return this.getValuesAsync(options)
      },

      /** GetTable */
      getValues(callback, validate = true, rowIds) {
        this.getValuesAsync({ validate, rowIds }, ({ error, values }) => {
          if (typeof callback === 'function') {
            callback(error, values)
          }
        })
      },
      /** getValuesPromise */
      getValuesPromise(validate = true, rowIds, deleteTempId) {
        return new Promise((resolve, reject) => {
          this.getValuesAsync({ validate, rowIds, deleteTempId }, ({ error, values }) => {
            if (error === 0) {
              resolve(values)
            } else {
              reject(VALIDATE_NO_PASSED)
            }
          })
        })
      },
      /** GetDeleteid */
      getDeleteIds() {
        return cloneObject(this.deleteIds)
      },
      /** GetHasData，values、deleteIds */
      getAll(validate, deleteTempId) {
        return new Promise((resolve, reject) => {
          let deleteIds = this.getDeleteIds()
          this.getValuesPromise(validate, null, deleteTempId).then((values) => {
            resolve({ values, deleteIds })
          }).catch(error => {
            reject(error)
          })
        })
      },
      /** Sync GetHasData，values、deleteIds */
      getAllSync(validate, rowIds, deleteTempId) {
        let result = this.getValuesSync({ validate, rowIds, deleteTempId })
        result.deleteIds = this.getDeleteIds()
        return result
      },
      // slot Get
      _getValueForSlot(rowId) {
        return this.getValuesSync({ rowIds: [rowId] }).values[0]
      },
      _getAllValuesForSlot() {
        return cloneObject({
          inputValues: this.inputValues,
          selectValues: this.selectValues,
          checkboxValues: this.checkboxValues,
          jdateValues: this.jdateValues,
          jInputPopValues: this.jInputPopValues,
          slotValues: this.slotValues,
          uploadValues: this.uploadValues,
          popupValues: this.popupValues,
          popupJshValues: this.popupJshValues,
          radioValues: this.radioValues,
          multiSelectValues: this.multiSelectValues,
          searchSelectValues: this.searchSelectValues,
        })
      },
      /** Set */
      setValues(values) {
        values.forEach(item => {
          let { rowKey, values: newValues } = item
          rowKey = this.getCleanId(rowKey)
          for (let newValueKey in newValues) {
            if (newValues.hasOwnProperty(newValueKey)) {
              let newValue = newValues[newValueKey]
              let edited = false // AlreadyUpdate
              this.inputValues.forEach(value => {
                // inputValuesField
                if (rowKey === this.getCleanId(value.id)) {
                  if (value.hasOwnProperty(newValueKey)) {
                    edited = true
                    value[newValueKey] = newValue
                  }
                }
              })
              let modelKey = `${newValueKey}${this.caseId}${rowKey}`
              //  selectValues 
              if (!edited) {
                if (newValue !== 0 && !newValue) {
                  edited = this.setOneValue(this.selectValues, modelKey, undefined)
                } else {
                  edited = this.setOneValue(this.selectValues, modelKey, newValue)
                }
              }
              //  checkboxValues 
              if (!edited) {
                edited = this.setOneValue(this.checkboxValues, modelKey, newValue)
              }
              //  jdateValues 
              if (!edited) {
                edited = this.setOneValue(this.jdateValues, modelKey, newValue)
              }
              //  jInputPopValues 
              if (!edited) {
                edited = this.setOneValue(this.jInputPopValues, modelKey, newValue)
              }
              //  slotValues 
              if (!edited) {
                edited = this.setOneValue(this.slotValues, modelKey, newValue)
              }
              //  uploadValues 
              if (!edited) {
                edited = this.setOneValue(this.uploadValues, modelKey, newValue)
              }
              //  popupValues 
              if (!edited) {
                edited = this.setOneValue(this.popupValues, modelKey, newValue)
              }
              //  popupJshValues 
              if (!edited) {
                edited = this.setOneValue(this.popupJshValues, modelKey, newValue)
              }
              //  radioValues 
              if (!edited) {
                edited = this.setOneValue(this.radioValues, modelKey, newValue)
              }
              //  multiSelectValues 
              if (!edited) {
                edited = this.setOneValue(this.multiSelectValues, modelKey, newValue)
              }
              //  searchSelectValues 
              if (!edited) {
                edited = this.setOneValue(this.searchSelectValues, modelKey, newValue)
              }
            }
          }
        })
        // NewformValues
        this.forceUpdateFormValues()
      },
      setOneValue(valuesObject, modelKey, value) {
        let key = this.valuesHasOwnProperty(valuesObject, modelKey)
        if (key) {
          this.$set(valuesObject, key, value)
          return true
        }
        return false
      },
      valuesHasOwnProperty(values, ownProperty) {
        let key = ownProperty
        if (values.hasOwnProperty(key)) {
          return key
        }
        if (values.hasOwnProperty(key + this.tempId)) {
          return key + this.tempId
        }
        return null
      },

      /** Redirect */
      // jumpToId(id, element) {
      //   if (element == null) {
      //     element = document.getElementById(id)
      //   }
      //   if (element != null) {
      //     console.log(this.getElement('tbody').scrollTop, element.offsetTop)
      //     this.getElement('tbody').scrollTop = element.offsetTop
      //     console.log(this.getElement('tbody').scrollTop, element.offsetTop)
      //   }
      // },

      /**
       * 验证单个表单，异步版
       *
       * @param value Validate的值
       * @param row Validate的行
       * @param column Validate的列
       * @param notPassedIds 没有通过Validate的 id
       * @param update 是否更新到vue中
       * @param validType Validate触发的方式（input、blur等）
       * @param callback
       */
      validateOneInputAsync(value, row, column, notPassedIds, update = false, validType = 'input', callback) {
        let tooltips = Object.assign({}, this.tooltips)
        // let notPassedIds = cloneObject(this.notPassedIds)
        let inputId = column.key + row.id
        tooltips[inputId] = tooltips[inputId] ? tooltips[inputId] : {}

        let [passed, message] = this.validateValue(column, value)

        const nextThen = res => {
          let [passed, message] = res
          // !(passed == null && tooltips[inputId].visible != null)
          if (passed != null) {
            tooltips[inputId].visible = !passed
            tooltips[inputId].passed = passed
            let index = notPassedIds.indexOf(inputId)
            let borderColor = null, boxShadow = null
            if (!passed) {
              tooltips[inputId].title = this.replaceProps(column, message)
              borderColor = 'red'
              boxShadow = `0 0 0 2px rgba(255, 0, 0, 0.2)`
              if (index === -1) notPassedIds.push(inputId)
            } else {
              if (index !== -1) notPassedIds.splice(index, 1)
            }

            let element = document.getElementById(inputId)
            if (element != null) {
              // select  .ant-select-selection Set border-color
              if (column.type === FormTypes.select) {
                element = element.getElementsByClassName('ant-select-selection')[0]
              }
              // jdate  input Set border-color
              if (column.type === FormTypes.date || column.type === FormTypes.datetime) {
                element = element.getElementsByTagName('input')[0]
              }
              // upload  .ant-upload .ant-btn Set border-color
              if (column.type === FormTypes.upload || column.type === FormTypes.file || column.type === FormTypes.image) {
                element = element.getElementsByClassName('ant-upload')[0].getElementsByClassName('ant-btn')[0]
              }
              element.style.borderColor = borderColor
              element.style.boxShadow = boxShadow
              if (element.tagName === 'SPAN') {
                element.style.display = 'block'
              }
            }
          }
          // YesNoNewdata
          if (update) {
            this.tooltips = tooltips
            this.notPassedIds = notPassedIds
          }

          if (typeof callback === 'function') {
            callback([tooltips[inputId], notPassedIds])
          }

        }

        if (typeof passed === 'function') {
          let executed = false
          passed(validType, value, { id: this.getCleanId(row.id) }, { ...column }, (flag, msg) => {
            if (executed) return
            executed = true
            if (typeof msg === 'string') {
              message = msg
            }
            if (flag == null) {
              nextThen([null, message])
            } else {
              nextThen([!!flag, message])
            }
          }, this)
        } else {
          nextThen([passed, message])
        }

        return [tooltips[inputId], notPassedIds]
      },

      /** Single */
      validateOneInput(value, row, column, notPassedIds, update = false, validType = 'input') {
        return this.validateOneInputAsync(value, row, column, notPassedIds, update, validType)
      },
      /** RuleYesNo */
      validateValue(column, value) {
        let rules = column.validateRules
        let passed = true, message = ''
        // CheckHasHasRuleorRuleFormat，Default
        if (rules instanceof Array) {
          for (let rule of rules) {
            // CurrentYesNofor
            let isNull = (value == null || value === '')
            // Rule：
            if (rule.required === true && isNull) {
              passed = false
            } else //  else-if YesforPrevent rule Rule
            // Rule：Validate
            if (rule.unique === true || rule.pattern === 'only') {
              let { values } = this.getValuesSync({ validate: false })
              let findCount = 0
              for (let val of values) {
                if (val[column.key] === value) {
                  if (++findCount >= 2) {
                    passed = false
                    break
                  }
                }
              }
            } else
            // Rule：
            if (!!rule.pattern && !isNull) {

              //  online Rule
              let foo = [
                { title: '6到16位数字', value: 'n6-16', pattern: /^\d{6,18}$/ },
                { title: '6到16位任意字符', value: '*6-16', pattern: /^.{6,16}$/ },
                { title: '6到18位字母', value: 's6-18', pattern: /^[a-z|A-Z]{6,18}$/ },
                { title: '网址', value: 'url', pattern: /^(?:([A-Za-z]+):)?(\/{0,3})([0-9.\-A-Za-z]+)(?::(\d+))?(?:\/([^?#]*))?(?:\?([^#]*))?(?:#(.*))?$/ },
                { title: '电子邮件', value: 'e', pattern: /^([\w]+\.*)([\w]+)@[\w]+\.\w{3}(\.\w{2}|)$/ },
                { title: '手机号码', value: 'm', pattern: /^1[3456789]\d{9}$/ },
                { title: '邮政编码', value: 'p', pattern: /^[1-9]\d{5}$/ },
                { title: '字母', value: 's', pattern: /^[A-Z|a-z]+$/ },
                { title: '数字', value: 'n', pattern: /^-?\d+(\.?\d+|\d?)$/ },
                { title: '整数', value: 'z', pattern: /^-?\d+$/ },
                { title: '非空', value: '*', pattern: /^.+$/ },
                { title: '金额', value: 'money', pattern: /^(([1-9][0-9]*)|([0]\.\d{0,2}|[1-9][0-9]*\.\d{0,2}))$/ },
              ]
              let flag = false
              for (let item of foo) {
                if (rule.pattern === item.value && item.pattern) {
                  passed = new RegExp(item.pattern).test(value)
                  flag = true
                  break
                }
              }
              if (!flag) passed = new RegExp(rule.pattern).test(value)
            } else
            // ValidateRule：Validate
            if (typeof rule.handler === 'function') {
              return [rule.handler, rule.message]
            }
            // Has，。，Rule
            if (!passed) {
              message = rule.message
              break
            }
          }
        }
        return [passed, message]
      },

      /** New */
      updateFormValues() {
        let trs = this.getElement('tbody').getElementsByClassName('tr')
        let trEls = []
        for (let tr of trs) {
          trEls.push(tr)
        }
        // GetAdd tr
        let newTrEls = trEls
        if (this.visibleTrEls.length > 0) {
          newTrEls = []
          for (let tr of trEls) {
            let isNewest = true
            for (let vtr of this.visibleTrEls) {
              if (vtr.id === tr.id) {
                isNewest = false
                break
              }
            }
            if (isNewest) {
              newTrEls.push(tr)
            }
          }
        }
        this.visibleTrEls = trEls
        // Addtr
        newTrEls.forEach(tr => {
          let { idx } = tr.dataset
          let value = this.inputValues[idx]
          for (let key in value) {
            if (value.hasOwnProperty(key)) {
              let elid = `${key}${value.id}`
              let el = document.getElementById(elid)
              if (el) {
                el.value = value[key]
              }
            }
          }
        })
      },
      /** NewFormValues */
      forceUpdateFormValues() {
        this.visibleTrEls = []
        this.updateFormValues()
      },

      // NewHasStatistics
      recalcAllStatisticsColumns() {
        if (this.hasStatisticsColumn) {
          Object.keys(this.statisticsColumns).forEach(key => this.recalcOneStatisticsColumn(key))
        }
      },
      // NewSingleStatistics
      recalcOneStatisticsColumn(key) {
        if (this.hasStatisticsColumn) {
          if (this.statisticsColumns.hasOwnProperty(key)) {
            // 
            let count = 0
            this.inputValues.forEach(item => {
              let value = item[key]
              if (value && count !== '-') {
                try {
                  count += Number.parseFloat(value)
                } catch (e) {
                  count = '-'
                }
              }
            })
            this.statisticsColumns[key] = count.toFixed(2)
          }
        }
      },

      /** GetStatisticsField */
      getStatisticsValue(key) {
        if (this.hasStatisticsColumn) {
          if (this.statisticsColumns.hasOwnProperty(key)) {
            return this.statisticsColumns[key]
          }
        }
        return null
      },

      /** orCancel */
      handleChangeCheckedAll() {
        let selectedRowIds = []
        if (!this.getSelectAll) {
          this.rows.forEach(row => {
            if ((this.disabledRowIds || []).indexOf(row.id) === -1) {
              selectedRowIds.push(row.id)
            }
          })
        }
        this.selectedRowIds = selectedRowIds
      },
      /** Select boxchange */
      handleChangeLeftCheckbox(event) {
        let { id } = event.target

        if ((this.disabledRowIds || []).indexOf(id) !== -1) {
          return
        }

        let index = this.selectedRowIds.indexOf(id)
        if (index !== -1) {
          this.selectedRowIds.splice(index, 1)
        } else {
          this.selectedRowIds.push(id)
        }

      },
      handleClickAdd() {
        this.add()
      },
      handleConfirmDelete() {
        this.removeSelectedRows()
      },
      handleClickClearSelection() {
        this.clearSelection()
      },
      clearSelection() {
        this.selectedRowIds = []
      },
      /** Dropdown */
      handleSelectFilterOption(input, option, column) {
        if (column.allowSearch === true || column.allowInput === true) {
          return option.componentOptions.children[0].text.toLowerCase().indexOf(input.toLowerCase()) >= 0
        }
        return true
      },
      /** select ，options */
      handleSearchSelect(value, id, row, col) {
        if (col.allowSearch !== true && col.allowInput === true) {
          // YesNoCorresponding，
          let flag = false
          for (let option of col.options) {
            if (option.value.toLocaleString() === value.toLocaleString()) {
              flag = true
              break
            }
          }
          // !!value ：
          if (!flag && !!value) {
            // searchAdd YesNoYes
            col.options.push({ title: value, value: value, searchAdd: true })
          }

        }
      },
      // blur 
      handleBlurSearch(value, id, row, col) {
        if (col.allowInput === true) {
          // DeleteNone（User）
          if (typeof value === 'string') {
            let indexs = []
            col.options.forEach((option, index) => {
              if (option.value.toLocaleString() === value.toLocaleString()) {
                delete option.searchAdd
              } else if (option.searchAdd === true) {
                indexs.push(index)
              }
            })
            // Delete
            for (let index of indexs.reverse()) {
              col.options.splice(index, 1)
            }
          }

        }
        // doSingle
        this.validateOneInput(value, row, col, this.notPassedIds, true, 'blur')
      },

      /** Already */
      emitDragged(oldIndex, newIndex) {
        this.$emit('dragged', { oldIndex, newIndex, target: this })
      },

      handleDragMoveStart(event) {
        this.dragging = true
        this.$refs.scrollView.style.overflow = 'hidden'
      },

      /** ，inputValue */
      handleDragMoveEnd(event) {
        this.dragging = false
        this.$refs.scrollView.style.overflow = 'auto'

        let { oldIndex, newIndex, item: { dataset: { idx: dataIdx } } } = event

        // DisplayHideindexHas，Needsindex
        let diff = Number.parseInt(dataIdx) - oldIndex
        oldIndex += diff
        newIndex += diff

        this.rowResort(oldIndex, newIndex)
        this.emitDragged(oldIndex, newIndex)
      },

      /** New */
      rowResort(oldIndex, newIndex) {
        const sort = (array) => {
          // OldData，DeleteOld
          let temp = array[oldIndex]
          array.splice(oldIndex, 1)
          // NewOldData
          array.splice(newIndex, 0, temp)
        }

        sort(this.rows)
        sort(this.inputValues)

        this.recalcSortNumber()

        this.forceUpdateFormValues()
      },

      /** NewField */
      recalcSortNumber() {
        if (this.dragSort) {
          // ResetField
          this.inputValues.forEach((val, idx) => val[this.dragSortKey] = (idx + 1))
        }
      },

      /** Current */
      _handleRowMoveUp(rowIndex) {
        if (rowIndex > 0) {
          let newIndex = rowIndex - 1
          this.rowResort(rowIndex, newIndex)
          this.emitDragged(rowIndex, newIndex)
        }
      },

      /** Current */
      _handleRowMoveDown(rowIndex) {
        if (rowIndex < (this.rows.length - 1)) {
          let newIndex = rowIndex + 1
          this.rowResort(rowIndex, newIndex)
          this.emitDragged(rowIndex, newIndex)
        }
      },

      /** Current */
      _handleRowInsertDown(rowIndex) {
        let insertIndex = (rowIndex + 1)
        this.insert(insertIndex)
      },

      /* --- common function begin --- */

      /**  */
      handleMouseoverCommono(row, column) {
        let inputId = column.key + row.id
        if (this.notPassedIds.indexOf(inputId) !== -1) {
          this.showOrHideTooltip(inputId, true, true)
        }
      },
      /**  */
      handleMouseoutCommono(row, column) {
        let inputId = column.key + row.id
        this.showOrHideTooltip(inputId, false)
      },
      /** input */
      handleInputCommono(target, index, row, column) {
        let oldValue = this.inputValues[index][column.key] || ''
        let { value, dataset, selectionStart } = target
        let type = FormTypes.input
        let change = true
        if (`${dataset.inputNumber}` === 'true') {
          type = FormTypes.inputNumber
          // CheckYesNo，
          if (!/^-?\d+\.?\d*$/.test(value) && (value !== '' && value !== '-')) {
            change = false
            value = oldValue
            target.value = value
            if (typeof selectionStart === 'number') {
              target.selectionStart = selectionStart - 1
              target.selectionEnd = selectionStart - 1
            }
          }
        }
        // 
        this.inputValues[index][column.key] = value
        // doSingle
        this.validateOneInput(value, row, column, this.notPassedIds, true, 'input')

        if (type === FormTypes.inputNumber) {
          this.recalcOneStatisticsColumn(column.key)
        }

        // valueChange 
        if (change) {
          this.elemValueChange(type, row, column, value)
        }
      },
      /** slot Change */
      handleChangeSlotCommon(value, id, row, column) {
        this.slotValues = this.bindValuesChange(value, id, 'slotValues')
        // doSingle
        this.validateOneInput(value, row, column, this.notPassedIds, true, 'change')
        // valueChange 
        this.elemValueChange(FormTypes.slot, row, column, value)
      },
      handleBlurCommono(target, index, row, column) {
        let { value, dataset } = target
        if (dataset && `${dataset.inputNumber}` === 'true') {
          // CheckYesNo，
          if (!/^-?\d+\.?\d*$/.test(value)) {
            value = ''
          } else {
            value = Number.parseFloat(value)
          }
          target.value = value
        }
        // doSingle
        this.validateOneInput(value, row, column, this.notPassedIds, true, 'blur')
      },
      handleChangeCheckboxCommon(event, row, column) {
        let { id, checked } = event.target
        this.checkboxValues = this.bindValuesChange(checked, id, 'checkboxValues')

        // valueChange 
        this.elemValueChange(FormTypes.checkbox, row, column, checked)
      },
      handleChangeSelectCommon(value, id, row, column) {
        this.selectValues = this.bindValuesChange(value, id, 'selectValues')
        // doSingle
        this.validateOneInput(value, row, column, this.notPassedIds, true, 'change')

        // valueChange 
        this.elemValueChange(FormTypes.select, row, column, value)
      },
      handleChangePopupJshCommon(value, id, row, column,index) {
        this.popupJshValues = this.bindValuesChange(value, id, 'popupJshValues')
        // doSingle
        this.validateOneInput(value, row, column, this.notPassedIds, true, 'change')

        // valueChange 
        this.elemValueChange(FormTypes.popupJsh, row, column, value)
      },
      handleChangeJDateCommon(value, id, row, column, showTime) {
        this.jdateValues = this.bindValuesChange(value, id, 'jdateValues')
        this.validateOneInput(value, row, column, this.notPassedIds, true, 'change')

        // valueChange 
        if (showTime) {
          this.elemValueChange(FormTypes.datetime, row, column, value)
        } else {
          this.elemValueChange(FormTypes.date, row, column, value)
        }
      },
      handleChangeJInputPopCommon(value, id, row, column){
        this.jInputPopValues = this.bindValuesChange(value, id, 'jInputPopValues')
        // doSingle
        this.validateOneInput(value, row, column, this.notPassedIds, true, 'change')
        // valueChange 
        this.elemValueChange(FormTypes.input_pop, row, column, value)
      },
      handleChangeUpload(info, id, row, column) {
        let { file } = info
        let value = {
          name: file.name,
          type: file.type,
          size: file.size,
          status: file.status,
          percent: file.percent
        }
        if (column.responseName && file.response) {
          value['responseName'] = file.response[column.responseName]
        }
        if (file.status === 'done') {
          value['path'] = file.response[column.responseName]
        } else if (file.status === 'error') {
          value['message'] = file.response.message || '未知错误'
        }
        this.uploadValues = this.bindValuesChange(value, id, 'uploadValues')
      },
      handleMoreOperation(id,flag){
        //console.log("this.uploadValues[id]",this.uploadValues[id])
        let path = ''
        if(this.uploadValues && this.uploadValues[id]){
          path = this.uploadValues[id].path
        }
        this.$refs.filePop.show(id,path,flag)
      },
      handleFileSuccess(obj){
        if(obj.id){
          this.uploadValues = this.bindValuesChange(obj, obj.id, 'uploadValues')
        }
      },
      /** DataBindComponent */
      bindValuesChange(value, id, key) {
        // let values = Object.assign({}, this[key])
        // values[id] = value
        // return values
        this.$set(this[key], id, value)
        return this[key]
      },

      /** DisplayorHidetooltip */
      showOrHideTooltip(inputId, show, force = false) {
        if (!this.tooltips[inputId] && !force) {
          return
        }

        let tooltip = this.tooltips[inputId] || {}
        if (tooltip.visible !== show) {
          tooltip.visible = show
          this.$set(this.tooltips, inputId, tooltip)
        }
      },

      /** value valueChange */
      elemValueChange(type, rowSource, columnSource, value) {
        let column = Object.assign({}, columnSource)
        // caseId
        let row = Object.assign({}, rowSource)
        row.id = this.getCleanId(row.id)
        // GetData
        let { values } = this.getValuesSync({ validate: false, rowIds: [row.id] })
        if (values.length > 0) {
          Object.assign(row, values[0])
        }
        this.$emit('valueChange', { type, row, column, value, target: this })
      },

      /** GetID（Does not containID） */
      getCleanId(id) {
        id = this.removeCaseId(id)
        id = this.removeTempId(id)
        return id
      },

      /** CheckIDYesNoContainscaseId */
      hasCaseId(id) {
        id = id + ""
        return id && id.startsWith(this.caseId)
      },

      /** caseId */
      removeCaseId(id) {
        if (this.hasCaseId(id)) {
          return id.substring(this.caseId.length, id.length)
        }
        return id
      },

      // Check id YesNoYesId
      isTempId(id) {
        return (id || '').endsWith(this.tempId)
      },

      /** tempId */
      removeTempId(id) {
        if (this.isTempId(id)) {
          return id.substring(0, id.length - this.tempId.length)
        }
        return id;
      },

      handleClickDelFile(id) {
        this.uploadValues[id] = null
      },
      handleClickDownloadFile(id) {
        let { path } = this.uploadValues[id] || {}
        if (path) {
          let url = getFileAccessHttpUrl(path)
          window.open(url)
        }
      },
      handleClickDownFileByUrl(id){
        let { url,path } = this.uploadValues[id] || {}
        if (!url || url.length===0) {
          if(path && path.length>0){
            url = getFileAccessHttpUrl(path.split(',')[0])
          }
        }
        if(url){
          window.open(url)
        }
      },
      handleClickShowImageError(id) {
        let currUploadObj = this.uploadValues[id] || null
        if (currUploadObj && currUploadObj['message']) {
          this.$error({ title: '上传出错', content: '错误信息：' + currUploadObj['message'], maskClosable: true })
        }
      },

      /* --- common function end --- */

      /* --- Yes，PageData --- */

      /** ：Log */
      log() {
        if (this.$attrs.logger) {
          console.log.apply(null, arguments)
        }
      },

      getVM() {
        return this
      },

      /** ：a-select and j-data Parent */
      getParentContainer(node) {
        let element = (() => {
          // nodeType 8	: Comment	: 
          if (this.$el && this.$el.nodeType !== 8) {
            return this.$el
          }
          let doc = document.getElementById(this.caseId + 'inputTable')
          if (doc != null) {
            return doc
          }
          return node.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode
        })()

        // CheckYesNoHas overflow: hidden；ParentElement
        const ifParent = (child) => {
          let currentOverflow = null
          if (child['currentStyle']) {
            currentOverflow = child['currentStyle']['overflow']
          } else if (window.getComputedStyle) {
            currentOverflow = window.getComputedStyle(child)['overflow']
          }
          if (currentOverflow != null) {
            if (currentOverflow === 'hidden') {
              // Has hidden ，CheckParentYesNoHas hidden，Has hidden or body 
              let temp = ifParent(child.parentNode)
              return temp != null ? temp : child.parentNode
            } else
            // CurrentHas hidden ，HasParentParentYes body CheckParent
            if (child.parentNode && child.parentNode.tagName.toLocaleLowerCase() !== 'body') {
              return ifParent(child.parentNode)
            } else {
              //  body HasHas hidden 
              return null
            }
          } else {
            return child
          }
        }

        let temp = ifParent(element)
        return (temp != null) ? temp : element
      },

      /** ：${...} */
      replaceProps(col, value) {
        if (value && typeof value === 'string') {
          value = value.replace(/\${title}/g, col.title)
          value = value.replace(/\${key}/g, col.key)
          value = value.replace(/\${defaultValue}/g, col.defaultValue)
        }
        return value
      },

      /** view： tr style */
      buildTrStyle(index) {
        return {
          'top': `${rowHeight * index}px`
        }
      },
      /** view： td style */
      buildTdStyle(col) {
        const isEmptyWidth = (column) => (column.type === FormTypes.hidden || column.width === '0px' || column.width === '0' || column.width === 0)

        let style = {}
        // 
        if (col.width) {
          style['width'] = col.width
        } else if (this.columns) {
          style['width'] = `${(100 - 4 * 2) / (this.columns.filter(column => !isEmptyWidth(column))).length}%`
        } else {
          style['width'] = '120px'
        }
        // checkbox Display
        let isCheckbox = col.type === FormTypes.checkbox
        if (isCheckbox) {
          style['align-items'] = 'center'
          style['text-align'] = 'center'
          style['padding-left'] = '0'
          style['padding-right'] = '0'
        }
        if (isEmptyWidth(col)) {
          style['padding-left'] = '0'
          style['padding-right'] = '0'
        }
        return style
      },
      /** view：props */
      buildProps(row, col) {
        let props = {}
        // props
        if (typeof col.props === 'object') {
          for (let prop in col.props) {
            if (col.props.hasOwnProperty(prop)) {
              props[prop] = this.replaceProps(col, col.props[prop])
            }
          }
        }
        // CheckselectYesNo
        if (col.type === FormTypes.select && (col.allowInput === true || col.allowSearch === true)) {
          props['showSearch'] = true
        }

        // CheckYesNoYesDisable
        props['disabled'] = (typeof col['disabled'] === 'boolean' ? col['disabled'] : props['disabled'])

        // CheckYesNoforDisable
        if (props['disabled'] !== true) {
          props['disabled'] = ((this.disabledRowIds || []).indexOf(row.id) !== -1)
        }

        // CheckYesNoDisableAllComponent
        if (this.disabled === true) {
          props['disabled'] = true
        }

        return props
      },
      /** upload ：Get headers */
      uploadGetHeaders(row, column) {
        let headers = {}
        if (column.token === true) {
          headers['X-Access-Token'] = this.accessToken
        }
        return headers
      },
      /** UploadRequest */
      getUploadAction(value) {
        if (!value) {
          return window._CONFIG['domianURL'] + '/sys/common/upload'
        } else {
          return value
        }
      },
      /** PreviewImage */
      getCellImageView(id) {
        let currUploadObj = this.uploadValues[id] || null
        if (currUploadObj) {
          if(currUploadObj['url']){
            return currUploadObj['url'];
          }else if(currUploadObj['path']){
            let readpath = currUploadObj['path'].split(',')[0]
            return getFileAccessHttpUrl(readpath)
          }
        }
        return ''
      },
      /** popup */
      popupCallback(value, others, id, row, column, index) {
        // 
        this.popupValues[id] = value
        if (others) {
          Object.keys(others).map((key) => {
            this.columns.map(k=>{
              if(k.key === key){
                let tempId = id.substring(id.indexOf(this.caseIdPrefix))
                if(k.type === 'date'){
                  this.handleChangeJDateCommon(others[key], key+tempId, {id:tempId}, k, false)
                }else if(k.type === 'datetime'){
                  this.handleChangeJDateCommon(others[key], key+tempId, {id:tempId}, k, true)
                }else{
                  this.inputValues[index][key] = others[key]
                }
              }
            })
          })
        }
        // doSingle
        this.validateOneInput(value, row, column, this.notPassedIds, true, 'change')
        // valueChange 
        this.elemValueChange('input', row, column, value)
        // Newform
        this.$nextTick(() => {
          this.forceUpdateFormValues()
        })
      },
      /** popupJsh */
      popupJshCallback(value, others, id, row, column, index) {
        // 
        this.popupJshValues[id] = value
        if (others) {
          Object.keys(others).map((key) => {
            this.columns.map(k=>{
              if(k.key === key){
                let tempId = id.substring(id.indexOf(this.caseIdPrefix))
                if(k.type === 'date'){
                  this.handleChangeJDateCommon(others[key], key+tempId, {id:tempId}, k, false)
                }else if(k.type === 'datetime'){
                  this.handleChangeJDateCommon(others[key], key+tempId, {id:tempId}, k, true)
                }else{
                  this.popupJshValues[index][key] = others[key]
                }
              }
            })
          })
        }
        // doSingle
        this.validateOneInput(value, row, column, this.notPassedIds, true, 'change')
        // valueChange 
        this.elemValueChange('input', row, column, value)
        // Newform
        this.$nextTick(() => {
          this.forceUpdateFormValues()
        })
      },
      /** select */
      getSelectValue(id) {
        return this.selectValues[id]
      },
      /** popup */
      getPopupValue(id) {
        return this.popupValues[id]
      },
      /** popupJsh */
      getPopupJshValue(id) {
        return this.popupJshValues[id]
      },
      /** popupJsh */
      getPopupJshRows(row) {
        let { values } = this.getValuesSync({ validate: false, rowIds: [row.id] })
        return JSON.stringify(values[0])
      },
      handleRadioChange(value, id, row, column) {
        this.radioValues = this.bindValuesChange(value, id, 'radioValues')
        // doSingle
        this.validateOneInput(value, row, column, this.notPassedIds, true, 'change')
        // valueChange 
        this.elemValueChange(FormTypes.radio, row, column, value)
      },
      handleMultiSelectChange(value, id, row, column) {
        this.multiSelectValues = this.bindValuesChange(value, id, 'multiSelectValues')
        // doSingle
        this.validateOneInput(value, row, column, this.notPassedIds, true, 'change')
        // valueChange 
        this.elemValueChange(FormTypes.list_multi, row, column, value)
      },
      handleSearchSelectChange(value, id, row, column) {
        this.searchSelectValues = this.bindValuesChange(value, id, 'searchSelectValues')
        this.validateOneInput(value, row, column, this.notPassedIds, true, 'change')
        this.elemValueChange(FormTypes.sel_search, row, column, value)
      },
      filterOption(input, option) {
        return option.componentOptions.children[0].text.toLowerCase().indexOf(input.toLowerCase()) >= 0
      },
      getEllipsisWord(content, len){
        if(!content || content.length==0){
          return ''
        }
        if(content.length>len){
          return content.substr(0,len)
        }
        return content;
      },
      /** input **/
      autoJumpNextInputBill() {
        let that = this
        let inputDom = $(".ant-modal-cust-warp:visible").find("#billModal");
        inputDom.find("input:visible:not(:checkbox)").off("keydown").on("keydown", function(e){
          //ResponseProcess
          e = event || window.event || arguments.callee.caller.arguments[0];
          //YesNofor，JS
          if(e && e.keyCode==13) {
            //inputDom
            let inputs = inputDom.find("input:visible:not(:checkbox)");
            let idx = inputs.index(this); // GetCurrent
            if (idx == inputs.length - 1) { // CheckYesNoYes
              let curKey = e.which;
              if (curKey == 13) {
                //Add
                that.handleClickAdd();
                //
                setTimeout(function() {
                  inputs = inputDom.find("input:visible:not(:checkbox)");
                  inputs[idx + 1].focus(); // Set
                  inputs[idx + 1].select(); // 
                },100)
              }
            } else {
              inputs[idx + 1].focus(); // Set
              inputs[idx + 1].select(); // 
            }
          }
        })
      },
      /** key **/
      autoSelectBySpecialKey(specialKey, orderNum) {
        let trs = this.getElement('tbody').getElementsByClassName('tr')
        let trEls = []
        if(trs && trs.length && orderNum>=1) {
          trEls.push(trs[orderNum-1])
        }
        trEls.forEach(tr => {
          let { idx } = tr.dataset
          let value = this.inputValues[idx]
          for (let key in value) {
            if (value.hasOwnProperty(key)) {
              let elid = `${key}${value.id}`
              let el = document.getElementById(elid)
              if (el && key === specialKey) {
                el.select()
              }
            }
          }
        })
      }
    },
    beforeDestroy() {
      this.destroyCleanGroupRequest = true
    },
  }
</script>

<style lang="less" scoped>

  .action-button {
    margin-bottom: 8px;

    .gap {
      padding-left: 8px;
    }

  }

  /* Parameters */
  @borderColor: #e8e8e8;
  @border: 1px solid @borderColor;
  /* tr & td  */
  @spacing: 2px;

  .input-table {
    max-width: 100%;
    overflow-x: hidden;
    overflow-y: hidden;
    position: relative;
    border: @border;

    .thead, .tbody {

      .tr, .td {
        display: flex;
      }

      .td {

        /*border-right: 1px solid red;*/
        /*color: white;*/
        /*background-color: black;*/
        /*margin-right: @spacing !important;*/

        padding-left: @spacing;
        flex-direction: column;

        &.td-cb, &.td-num {
          min-width: 4%;
          max-width: 45px;
          margin-right: 0;
          padding-left: 0;
          padding-right: 0;
          justify-content: center;
          align-items: center;
        }

        &.td-ds {
          margin-right: 0;
          padding-left: 0;
          padding-right: 0;
          justify-content: center;
          align-items: center;

          .td-ds-icons {
            position: relative;
            cursor: move;
            width: 100%;
            /*padding: 25% 0;*/
            height: 100%;

            .anticon-align-left,
            .anticon-align-right {
              position: absolute;
              top: 30%;
            }

            .anticon-align-left {
              left: 25%;
            }

            .anticon-align-right {
              right: 25%;
            }
          }


        }

      }

    }

    .thead {
      overflow-y: scroll;
      overflow-x: hidden;
      border-bottom: @border;

      /** Hidethead   */

      &::-webkit-scrollbar-thumb {
        box-shadow: none !important;
        background-color: transparent !important;
      }

      .tr {
        min-width: 100%;
        overflow-y: scroll;
      }

      .td {
        /*flex: 1;*/
        padding: 8px @spacing;
        justify-content: center;
      }

    }

    .tbody {
      position: relative;
      top: 0;
      left: 0;
      overflow-x: hidden;
      overflow-y: hidden;
      min-height: 61px;
      /*max-height: 400px;*/
      min-width: 100%;

      .tr-nodata {
        color: #999;
        line-height: 61px;
        text-align: center;
      }

      .tr {
        /*line-height: 50px;*/

        border-bottom: @border;
        transition: background-color 300ms;
        width: 100%;
        position: absolute;
        left: 0;
        z-index: 10;

        &.tr-checked {
          background-color: #fafafa;
        }

        &:hover {
          background-color: #E6F7FF;
        }

      }

      .tr-expand {
        position: relative;
        z-index: 9;
        background-color: white;
      }

      .td {
        /*flex: 1;*/
        padding: 6px @spacing 6px 0;
        justify-content: center;

        &:last-child {
          padding-right: @spacing;
        }

        input {
          font-variant: tabular-nums;
          box-sizing: border-box;
          margin: 0;
          list-style: none;
          position: relative;
          display: inline-block;
          padding: 2px 2px;
          width: 100%;
          height: 32px;
          font-size: 14px;
          line-height: 1.5;
          color: rgba(0, 0, 0, 0.65);
          background-color: #fff;
          border: 1px solid #d9d9d9;
          border-radius: 4px;
          transition: all 0.3s;
          outline: none;

          &:hover {
            border-color: #4D90FE
          }

          &:focus {
            border-color: #40a9ff;
            box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
            border-right-width: 1px !important;
          }

          &:disabled {
            color: rgba(0, 0, 0, 0.25);
            background: #f5f5f5;
            cursor: not-allowed;
          }

          /* Setplaceholder */

          &::-webkit-input-placeholder { /* WebKit browsers */
            color: #ccc;
          }

          &:-moz-placeholder { /* Mozilla Firefox 4 to 18 */
            color: #ccc;
          }

          &::-moz-placeholder { /* Mozilla Firefox 19+ */
            color: #ccc;
          }

          &:-ms-input-placeholder { /* Internet Explorer 10+ */
            color: #ccc;
          }

        }

        .j-editable-image {
          height: 32px;
          max-width: 100px !important;
          cursor: pointer;

          &:hover {
            opacity: 0.8;
          }

          &:active {
            opacity: 0.6;
          }

        }

        .td-span {
          font-variant: tabular-nums;
          box-sizing: border-box;
          margin: 0;
          list-style: none;
          position: relative;
          display: inline-block;
          padding: 2px 2px;
          width: 100%;
          height: 32px;
          font-size: 14px;
          line-height: 1.9;
          color: rgba(0, 0, 0, 0.65);
          background-color: #fff;
          border: 1px dashed #d9d9d9;
          border-radius: 4px;
          transition: all 0.3s;
          outline: none;
          overflow:hidden;
          white-space:nowrap;
          text-overflow:ellipsis;
        }

      }

    }

    .scroll-view {
      overflow: auto;
      overflow-y: scroll;
    }

    .thead, .thead .tr, .scroll-view {
      @scrollBarSize: 6px;
      /*  Corresponding*/

      &::-webkit-scrollbar {
        width: @scrollBarSize;
        height: @scrollBarSize;
        background-color: transparent;
      }

      /*  */

      &::-webkit-scrollbar-track {
        background-color: #f0f0f0;
      }

      /*  */

      &::-webkit-scrollbar-thumb {
        background-color: #eee;
        box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);

        &:hover {
          background-color: #bbb;
        }

        &:active {
          background-color: #888;
        }
      }

    }

    .thead .tr {

      &::-webkit-scrollbar-track {
        background-color: transparent;
      }

      /* IEHide */
      -ms-overflow-style: none;
      -ms-scroll-chaining: chained;
      -ms-content-zooming: zoom;
      -ms-scroll-rails: none;
      -ms-content-zoom-limit-min: 100%;
      -ms-content-zoom-limit-max: 500%;
      -ms-scroll-snap-type: proximity;
      -ms-scroll-snap-points-x: snapList(100%, 200%, 300%, 400%, 500%);
    }

  }

</style>