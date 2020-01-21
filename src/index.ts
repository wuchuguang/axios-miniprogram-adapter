import { AxiosRequestConfig, AxiosPromise } from 'axios'
import utils from 'axios/lib/utils'
var buildFullPath = require('axios/lib/core/buildFullPath');
import settle from 'axios/lib/core/settle'
import buildURL from 'axios/lib/helpers/buildURL'
import encode from './utils/encoder'
import { getRequest, transformError, transformResponse } from './utils/platForm'

const warn = console.warn
const isJSONstr = str => {
  try {
    return typeof str === 'string' && str.length && (str = JSON.parse(str)) && Object.prototype.toString.call(str) === '[object Object]'
  } catch (error) {
    return false
  }
}
export default function mpAdapter (config: AxiosRequestConfig) :AxiosPromise {
  const request = getRequest()
  return new Promise((resolve, reject) => {
    let requestTask: void | requestTask
    let requestData = config.data
    let requestHeaders = config.headers
    var fullPath = buildFullPath(config.baseURL, config.url);
    // baidu miniprogram only support upperCase
    let requestMethod = (config.method && config.method.toUpperCase()) || 'GET'
    // miniprogram network request config
    const mpRequestOption: NetworkRequestOpts = {
      method: requestMethod as NetworkRequestMethod,
      url: buildURL(fullPath, config.params, config.paramsSerializer),
      // Listen for success
      success: (mpResponse: NetworkRequestRes) => {
        const response = transformResponse(mpResponse, config, mpRequestOption)
        settle(resolve, reject, response)
      },
      // Handle request Exception
      fail: (error) => {
        console.error(`fail `, error);
        transformError(error, reject, config)
      },
      complete () {
        requestTask = undefined
      }
    }

    // HTTP basic authentication
    if (config.auth) {
      const [username, password] = [config.auth.username || '', config.auth.password || '']
      requestHeaders.Authorization = 'Basic ' + encode(username + ':' + password)
    }

    // Set the request timeout
    if (config.timeout !== 0) {
      warn('The "timeout" option is not supported by miniprogram. For more information about usage see "https://developers.weixin.qq.com/miniprogram/dev/framework/config.html#全局配置"')
    }

    // Add headers to the request
    utils.forEach(requestHeaders, function setRequestHeader (val: any, key: string) {
      const _header = key.toLowerCase()
      if ((typeof requestData === 'undefined' && _header === 'content-type') || _header === 'referer') {
        // Remove Content-Type if data is undefined
        // And the miniprogram document said that '设置请求的 header，header 中不能设置 Referer'
        delete requestHeaders[key]
      }
    })
    mpRequestOption.header = requestHeaders

    // Add responseType to request if needed
    if (config.responseType) {
      mpRequestOption.responseType = config.responseType as responseType
    }

    if (config.cancelToken) {
      // Handle cancellation
      config.cancelToken.promise.then(function onCanceled (cancel) {
        if (!requestTask) {
          return
        }
        requestTask.abort()
        reject(cancel)
        // Clean up request
        requestTask = undefined
      })
    }
    // Converting JSON strings to objects is handed over to the MiniPrograme
    if (isJSONstr(requestData)) {
      requestData = JSON.parse(requestData)
    }
    if (requestData !== undefined) {
      mpRequestOption.data = requestData
    }
    requestTask = request(mpRequestOption)
  })
}
