var util = require('./util');
var request = require('request');
var md5 = require('MD5');

exports = module.exports = WXPay;

function WXPay() {
	
	if (!(this instanceof WXPay)) {
		return new WXPay(arguments[0]);
	};

	this.options = arguments[0];
	this.wxpayID = { appid:this.options.appid, mch_id:this.options.mch_id };
};

WXPay.mix = function(){
	
	switch (arguments.length) {
		case 1:
			var obj = arguments[0];
			for (var key in obj) {
				if (WXPay.prototype.hasOwnProperty(key)) {
					throw new Error('Prototype method exist. method: '+ key);
				}
				WXPay.prototype[key] = obj[key];
			}
			break;
		case 2:
			var key = arguments[0].toString(), fn = arguments[1];
			if (WXPay.prototype.hasOwnProperty(key)) {
				throw new Error('Prototype method exist. method: '+ key);
			}
			WXPay.prototype[key] = fn;
			break;
	}
};


WXPay.mix('option', function(option){
	for( var k in option ) {
		this.options[k] = option[k];
	}
});


WXPay.mix('sign', function(param){

	var querystring = Object.keys(param).filter(function(key){
		return param[key] !== undefined && param[key] !== '' && ['pfx', 'partner_key', 'sign', 'key'].indexOf(key)<0;
	}).sort().map(function(key){
		return key + '=' + param[key];
	}).join("&") + "&key=" + this.options.partner_key;

	return md5(querystring).toUpperCase();
});


WXPay.mix('createUnifiedOrder', function(opts, fn){

	opts.nonce_str = opts.nonce_str || util.generateNonceString();
	util.mix(opts, this.wxpayID);
	opts.sign = this.sign(opts);

	request({
		url: "https://api.mch.weixin.qq.com/pay/unifiedorder",
		method: 'POST',
		body: util.buildXML(opts),
		agentOptions: {
			pfx: this.options.pfx,
			passphrase: this.options.mch_id
		}
	}, function(err, response, body){
		util.parseXML(body, fn);
	});
});

WXPay.mix('useWXCallback', function(fn){

	return function(req, res, next){
		var _this = this;
		res.success = function(){ res.end(util.buildXML({ xml:{ return_code:'SUCCESS' } })); };
		res.fail = function(){ res.end(util.buildXML({ xml:{ return_code:'FAIL' } })); };

		util.pipe(req, function(err, data){
			var xml = data.toString('utf8');
			util.parseXML(xml, function(err, msg){
				req.wxmessage = msg;
				fn.apply(_this, [msg, req, res, next]);
			});
		});
	};
});

WXPay.mix('queryOrder', function(query, fn){
	
	if (!(query.transaction_id || query.out_trade_no)) { 
		fn(null, { return_code: 'FAIL', return_msg:'缺少参数' });
	}

	query.nonce_str = query.nonce_str || util.generateNonceString();
	util.mix(query, this.wxpayID);
	query.sign = this.sign(query);

	request({
		url: "https://api.mch.weixin.qq.com/pay/orderquery",
		method: "POST",
		body: util.buildXML({xml: query})
	}, function(err, res, body){
		util.parseXML(body, fn);
	});
});
