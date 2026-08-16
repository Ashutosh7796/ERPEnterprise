import { mergeRecursive } from "@/utils/util";
import DictOptions from './DictOptions'

/**
 * @classdesc Dictionary元数据
 * @property {String} type Type
 * @property {Function} request Request
 * @property {String} label 标签字段
 * @property {String} value 值字段
 */
export default class DictMeta {
  constructor(options) {
    this.type = options.type
    this.request = options.request
    this.responseConverter = options.responseConverter
    this.labelField = options.labelField
    this.valueField = options.valueField
    this.lazy = options.lazy === true
  }
}


/**
 * 解析Dictionary元数据
 * @param {Object} options
 * @returns {DictMeta}
 */
DictMeta.parse= function(options) {
  let opts = null
  if (typeof options === 'string') {
    opts = DictOptions.metas[options] || {}
    opts.type = options
  } else if (typeof options === 'object') {
    opts = options
  }
  opts = mergeRecursive(DictOptions.metas['*'], opts)
  return new DictMeta(opts)
}
