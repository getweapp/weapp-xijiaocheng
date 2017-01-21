/*
* 作者： 刘焱旺 yw@getweapp.com
* 答疑交流QQ群：499859691
*/


import Util from "../../utils/util"
import api from '../../utils/api'
import moment from '../../utils/moment'

Page({
    data: {     
        orders: [],
        tips: '你还没有登录'
    },
    loginFun() {
        const people = wx.getStorageSync('people') || null

        if(people){
            this.setData({
                avatar: people.basic.avatar,
                name: people.basic.name
            })
            return
        }

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
                        this.refresh()
                    })            
                        
                    }
                    })   
            }
        });

    },
    refresh() {
  
         const token = wx.getStorageSync('token') || null

        if(!token){
            this.setData({
                orders: [],
                tips: '你还没有登录'
            })
   
            return
        }

        this.setData({
            tips: '你还没有购买任何服务'
        })

        api.get('orders', {}, (data) => { 
            console.log(data)
            data.map((e)=>{
                e.created = moment(e.created).format('YYYY年MM月DD日 HH:mm')
            })
            this.setData({
                orders: data
            })
        })
    },
  


    onLoad() {
        this.refresh()
    }
})