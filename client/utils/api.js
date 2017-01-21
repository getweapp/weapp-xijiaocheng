/*
* 作者： 刘焱旺 yw@getweapp.com
* 答疑交流QQ群：499859691
*/

// 此处api应更换成自己服务器的api
const API = 'http://getweapp.com:5304/'


const get = (cmd, params, callback) => {
    params.token = wx.getStorageSync('token') || ''
    wx.showToast({
         title: '数据加载中...',
        icon: 'loading',
        duration: 2000
    })
    wx.request({
        url: API+cmd,
        data: params,
        success: (res) => {
            wx.hideToast()
            const data = res.data
            if(data.code){
                wx.showModal({
                    title: '提示',
                    showCancel: false,
                    confirmColor: 'rgb(251,93,93)',
                    content: data.message,
                    complete: (res) => {
                        if(data.message.indexOf('认证失败') != -1 && params.token){
                           wx.clearStorageSync()
                        }
                    }
                    })
                return
            }
            if(typeof(callback) == 'function')
                callback(data.data)
        }
    })
}

const post = (cmd, params, callback) => {
    params.token = wx.getStorageSync('token') || ''
    wx.request({
        url: API+cmd,
        data: params,
        method: 'POST',
        success: (res) => {
            const data = res.data
            if(data.code){
                wx.showModal({
                    title: '提示',
                    showCancel: false,
                    confirmColor: 'rgb(251,93,93)',
                    content: data.message,
                    success: (res) => {
                    }
                    })
                return
            }
            if(typeof(callback) == 'function')
                callback(data.data)
        }
    })
}



export default {
    get: get,
    post: post
}