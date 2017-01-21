/*
* 作者：刘焱旺 yw@getweapp.com
* 答疑交流QQ群：499859691
*/

// api服务
const Restify = require('restify')
const Server = Restify.createServer()
Server.use(Restify.queryParser())
Server.use(Restify.bodyParser())

// mongo数据库
const Mongo = require('mongojs')
const Db = Mongo('lesson4', ['peoples', 'products', 'orders'])
const Peoples = Db.peoples
const Products = Db.products
const Orders = Db.orders

// request
const Request = require('request')

// 小程序解密库
const WXBizDataCrypt = require('./WXBizDataCrypt')

// redis
const Redis = require('redis')
const RedisClient = Redis.createClient()

// uuid
const uuid = require('uuid')

// 微信支付模块
import WeixinClient from './weapp-pay/WeixinClient'

const crypto = require('crypto')
const md5 = require('MD5')

const WeixinClient = new WeixinClient({
	appId: 'xxxx', // 应用ID
	appSecret: 'xxxx', // 应用密钥
	mchId: 'xxxx', // 商户号
	apiKey: 'xxxx', // api密钥
	certFile: '...apiclient_cert.pem',
	keyFile: '...apiclient_key.pem',
	pfxFile: '...apiclient_cert.p12',
	payNotifyUrl: 'http://www.getweapp.com:5304/payment'
})



// 监听端口号
const PORT = 5304

// 小程序参数
const APP_ID = 'xxxx'
const APP_SECRET = 'xxxx'

/********** 业务处理开始 **********/

// 获取解密SessionKey
const getSessionKey = (code, callback) => {
	const url = 'https://api.weixin.qq.com/sns/jscode2session?appid='
	+APP_ID+'&secret='+APP_SECRET+'&js_code='+code
	+'&grant_type=authorization_code'
	Request(url, (error, response, body) => {
		if(!error && response.statusCode == 200){
			console.log('getSessionKey:', body, typeof(body))

			const data =JSON.parse(body)
			if(!data.session_key){
				callback({
					code: 1, 
					message: data.errmsg
				})
				return
			}
			callback(null, data)
		}else{
			callback({
				code: 1, 
				message: error
			})
		}
	})
}

// 解密
const decrypt = (sessionKey, encryptedData, iv, callback) => {
	try{
		const pc = new WXBizDataCrypt(APP_ID, sessionKey)
		const data = pc.decryptData(encryptedData , iv)
		console.log('decrypted:', data)
		callback(null, data)
	}catch(e){
		console.log(e)	
		callback({
			code: 1, 
			message: e
		})
	}
}

// 存储登录状态
const saveAuth = (peopleId, callback) => {
	const token = uuid.v1()	
	RedisClient.set('WEAPP_AUTH:'+token, peopleId, (err, ret) => {
		console.log(err, ret)
		callback(err, token)
	})
}

// 获取登录状态
const checkAuth = (token, callback) => {
	RedisClient.get('WEAPP_AUTH:'+token, (err, ret) => {
		callback(err, ret)
	})
}

// 清除登录状态
const clearAuth = (token, callback) => {
	RedisClient.del('WEAPP_AUTH:'+token, (err, ret) => {
		callback(err, ret)
	})
}

// 获取支付参数
const payment = (openId, body, detail, outTradeNo, amount, callback) => {
	console.log('outTradeNo:', openId, body, detail, outTradeNo, amount)

	weixinClient.weappPay({
		openId: openId,
		body: body,
		detail: detail,
		outTradeNo: outTradeNo,
		amount: amount
	}, (err, ret)=>{
		console.log(err, ret)
		if(err){
			callback(err)
			return
		}
		crypto.randomBytes(16, (ex, buf) => {
			const timeStamp = new Date().getTime().toString()
  			const nonceStr = buf.toString('hex')
 			const _package = 'prepay_id='+ret.prepay_id
    			const appId = 'xxxx'
    			const signType='MD5'
			const apiKey = 'xxxx'
    			const stringA = md5('appId='+appId+'&nonceStr='+nonceStr+'&package='+_package+'&signType='+signType+'&timeStamp='+timeStamp
    				+'&key='+apiKey).toUpperCase()
			callback(null, {
				timeStamp: timeStamp,
				nonceStr: nonceStr,
				prepayId: ret.prepay_id,
				paySign: stringA
			})
		})
	})
}


// 小程序登录
Server.post('/signIn', (req, res) => {
	const data = req.body
	console.log('POST：/signIn, 参数：', data)

	if(!data.code){
		res.send({
			code: 1,
			message: '缺少参数：code'
		})
		return
	}else if(!data.encryptedData){
		res.send({
			code: 1,
			message: '缺少参数：encryptedData'
		})
		return
	}else if(!data.iv){
		res.send({
			code: 1,
			message: '缺少参数：iv'
		})
		return
	}

	// 获取sessionkey
	getSessionKey(data.code, (err, ret) => {
		if(err){
			res.send(err)
			return
		}
		console.log(ret)
		// 解密
		decrypt(ret.session_key, data.encryptedData, data.iv, (err, ret) => {
			if(err){
				res.end(err)
				return
			}

			console.log(ret)
			// 保存用户信息
			const people = {
				peopleId: uuid.v1(),
				channel: 'wechat',
				unionId: (ret.unionId)?ret.unionId:ret.openId,
				openId: ret.openId,
				name: ret.nickName,
				avatar: ret.avatarUrl,
				created: new Date().getTime(),
				updated: new Date().getTime()
			}
			Peoples.findAndModify({
				query: {
					channel: 'wechat',
					unionId: (ret.unionId)?ret.unionId:ret.openId
				},
				update: {
					"$set": {
						name: ret.nickName,
						avatar: ret.avatarUrl,
						updated: new Date().getTime()
					}
				}
			}, (err, exist) => {
				if(!exist){ // 不存在帐户，创建新帐户
					Peoples.save(people, (err, ret) => {
						// 保存登录状态
						saveAuth(people.peopleId, (err, ret) => {
							res.send({
								code: 0,
								data: {
									token: ret,
									people: people
								}
							})
						})
					})
					return
				}else{ // 存在帐户
					// 保存登录状态
					saveAuth(exist.peopleId, (err, ret) => {
						console.log('token:', ret)
						res.send({
							code: 0,
							data: {
								token: ret,
								people: exist 
							}
						})
					})
				}
			})
		})	
	})

})

// 退出登录
Server.post('/signOut', (req, res) => {
	const data = req.body
	console.log('POST：/signOut, 参数：', data)
	if(!data.token){
		res.send({
			code: 1,
			message: '缺少参数：token'
		})		
		return
	}
	clearAuth(data.token, (err, ret) => {
		if(err){
			res.send({
				code: 1,
				message: '退出出错'
			})
			return
		}
		res.send({
			code: 0,
			data: {}
		})
	})	
})

// 获取服务项目
Server.get('/products', (req, res) => {
	const data = req.query
	console.log('GET：/products, 参数：', data)
	
	Products.find({}).sort({productId: 1}, (err, ret) => {
		if(err){
			res.send({
				code: 1,
				message: '系统故障'
			})
			return
		}
		res.send({
			code: 0,
			data: ret
		})
	})	
})

// 创建订单
Server.post('/orders', (req, res) => {
	const data = req.body
	console.log('POST：/orders, 参数：', data)
	if(!data.token){
		res.send({
			code: 1,
			message: '缺少参数：token'
		})
		return
	}else if(!data.productId){
		res.send({
			code: 1,
			message: '缺少参数：productId'
		})
		return
	}

	checkAuth(data.token, (err, peopleId) => {
		if(err){
			res.send({
				code: 1,
				message: '系统故障'
			})
			return
		}else if(!peopleId){
			res.send({
				code: 1,
				message: '认证失败，请重新登录'
			})
			return
		}
		Peoples.findOne({peopleId: peopleId}, (err, people) => {
			if(err || !people){
				res.send({
					code: 1,
					message: '系统故障'
				})
				return
			}
		Products.findOne({productId: data.productId}, (err, exist) => {
			if(err){
				res.send({
					code: 1,
					message: '系统故障'
				})
				return
			}else if(!exist){
				res.send({
					code: 1,
					message: '没找到该服务'
				})
				return
			}

			Orders.save({
				orderId: uuid.v1().replace(/-/g, ''),
				peopleId: peopleId,
				productId: exist.productId,
				title: exist.title,
				amount: exist.price,
				step: 1,
				created: new Date().getTime()
			}, (err, order) => {
				console.log('order:', order)
				payment(
					people.openId,
					order.title,
					order.title,
					order.orderId,
					order.amount*100, (err, ret) => {
					if(err){
						res.send(err)
						return
					}
					res.send({code: 0, data: ret})
				})
			})
		})	
		})
	})
})

// 获取所有订单
Server.get('/orders', (req, res) => {
	const data = req.query
	console.log('GET：/orders, 参数：', data)
	
	if(!data.token){
		res.send({
			code: 1,
			message: '缺少参数：token'
		})
		return
	}

	checkAuth(data.token, (err, peopleId) => {
		if(err){
			res.send({
				code: 1,
				message: '系统故障'
			})
			return
		}else if(!peopleId){
			res.send({
				code: 1,
				message: '认证失败，请重新登录'
			})
			return
		}
		Orders.find({peopleId: peopleId, step:2}).sort({created: -1}, (err, ret) => {
			if(err){
				res.send({
					code: 1,
					message: '系统故障'
				})
				return
			}
			res.send({
				code: 0,
				data: ret
			})
		})
	})	
})

// 支付订单
Server.post('/payment', (req, res) => {
	const data = req.body
	console.log('POST：/payment, 参数：', data)
	
	WeixinClient.parseXML(data, (err, params) =>{
		console.log(params, typeof(params))
		Orders.findOne({orderId: params.out_trade_no}, (err, order) => {
			console.log('order:', order)
			if(order.step == 2)
				return
			weixinClient.queryOrderByOutTradeNo(order.orderId, (err, verify)=>{
				console.log('weixinclient:',err, verify)
				if(verify && verify.trade_state == 'SUCCESS' && verify.total_fee/100 == order.amount){
					Orders.findAndModify({
						query: { orderId: order.orderId, step: 1},
						update: { $set: {step: 2} },
						new:true
					}, (err, doc, lastErrorObject) => {
						console.log('update order:', err, doc, lastErrorObject)
					})
				}else{
					console.log('支付失败：', verify)
				}
			})
		})				
	})	
	res.end(WeixinClient.notifySuccess())
})


/********** 业务处理结束 **********/

// 监听端口开启api服务
Server.listen(PORT, () => {
	console.log('开启服务器，端口号：', PORT)
})
