/*
* 作者： 刘焱旺 yw@getweapp.com
* 答疑交流QQ群：499859691
*/


import api from '../../utils/api'
import moment from '../../utils/moment'

Page({
  data: {
    list: []                // 商品数据
  },
  login(){
        wx.showToast({
            title: '登录中...',
            icon: 'loading',
            duration: 3000
        })
        
        wx.login({
            success: (loginRes) => {
        
                if(!loginRes.code) {
                    wx.hideToast()
                    return
                }
                 wx.getUserInfo({
                    success: (res) => {
                        if(!res.encryptedData){
                            wx.hideToast()
                            return
                        }
                    api.post('signIn', {code: loginRes.code, encryptedData: res.encryptedData, iv: res.iv}, (data) => {
                        wx.hideToast()
                        wx.setStorageSync('token', data.token)
                        wx.setStorageSync('people', data.people)
                    })            
                        
                    }
                    })   
            }
        });

    },
  buy(e) {
    const token = wx.getStorageSync('token') || ''
    if(!token){
      this.login()
      return
    }

    const productId = e.currentTarget.dataset.id || ''
    console.log(productId)
    if(!productId){
      return
    }
    console.log('token:', token)
    api.post('orders', {
      productId: productId
    }, (data) => {
      console.log(data)
      wx.requestPayment({
        'timeStamp': data.timeStamp,
        'nonceStr': data.nonceStr,
        'package': 'prepay_id='+data.prepayId,
        'signType': 'MD5',
        'paySign': data.paySign,
        'success':function(res){
           wx.showModal({
          title: '提示',
          content: '支付成功',
          showCancel: false,
          success: function(res) {
            wx.switchTab({
              url: '/pages/purchased/purchased'
            })
          }
        })
        },
        'fail':function(res){
          wx.showModal({
          title: '提示',
          content: '支付失败',
          showCancel: false,
          success: function(res) {
           
          }
        })

        }
      })
    })
  },
  init() {
    api.get('products', {}, (data) => {
      console.log(data)
       this.setData({
          list: data
        })
    })
  },
 onLoad: function(e) {     // 首次加载
      this.init()
  }
})