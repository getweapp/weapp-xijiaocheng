const request = require('request')
const moment = require('moment')
const xml2js = require('xml2js')
const md5 = require('MD5')

const WXPay = require('./index');
const fs = require('fs');

const APP_IP = '43.241.219.133'

const buildXML = (json) => {
	const builder = new xml2js.Builder()
	return builder.buildObject(json)
}

const parseXML = (xml, fn) => {
	const parser = new xml2js.Parser({ trim:true, explicitArray:false, explicitRoot:false })
	parser.parseString(xml, fn||function(err, result){})
}


export default class WeixinClient {
	constructor( params ) {
		this.appId = params.appId
		this.appSecret = params.appSecret
		this.mchId = params.mchId
		this.partnerKey = params.apiKey
		this.certFile = params.certFile
		this.keyFile = params.keyFile
		this.pfxFile = params.pfxFile
		this.payNotifyUrl = params.payNotifyUrl
		this.wxpay = WXPay({
			appid: this.appId,
        		mch_id: this.mchId,
			partner_key: this.partnerKey,
			cert: fs.readFileSync(this.certFile),
			key:fs.readFileSync(this.keyFile)
		})
	}
	// 小程序支付
	weappPay(order, callback) {
		const nonceStr = md5(this.appId+this.appSecret+order.outTradeNo)
		this.wxpay.createUnifiedOrder({
    			openid: order.openId,
    			body: order.body,
			trade_type: 'JSAPI',
			nonce_str: nonceStr,
    			detail: order.detail,
    			out_trade_no: order.outTradeNo,
    			total_fee: order.amount,
    			spbill_create_ip: APP_IP,
    			notify_url: this.payNotifyUrl
			}, (err, result) => {
				console.log('weappPay:', err, result)
			if(err)
				callback({code:1, message: err})
			else
				callback(null, result)
		})

	}
	// 通过微信订单号查
	queryOrderByTransactionId( transactionId, callback ) {
		this.wxpay.queryOrder({ transaction_id: transactionId }, (err, result) => {
			if(err)
				callback({code:1, message: err})
			if(result.result_code != 'SUCCESS')
				callback({code:1, message: result.return_msg})
			else
				callback(null, result)
	    	})
	}
	// 通过商户订单号查
	queryOrderByOutTradeNo( outTradeNo, callback ) {
		this.wxpay.queryOrder({ out_trade_no: outTradeNo }, (err, result) => {
			if(err)
				callback({code:1, message: err})
			if(result.result_code != 'SUCCESS')
				callback({code:1, message: result.return_msg})
			else
				callback(null, result)
	    	})
	}
	// 解析回调
	notifyParse(text, callback) {
		parseXML(text, (err, ret) => {
			if(err){
				callback({code:1, message: err})
				return
			}
			const sign = md5(this.appId + this.appSecret + ret.out_trade_no)
			if(sign == ret.nonce_str)
				callback(null, ret)
			else
				callback({code:1, message: 'sign error'})
		})
	}
	// 回调返回
	static notifySuccess() {
		return '<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>'
	}
	// parse
	static parseXML(txt, callback) {
		parseXML(txt, (err, ret) => {
			callback(err, ret)
		})
	}
}
