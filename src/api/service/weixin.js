const crypto = require('crypto');
const md5 = require('md5');
const moment = require('moment');
const rp = require('request-promise');
const fs = require('fs');
const http = require("http");
module.exports = class extends think.Service {
    /**
     * 解析微信登录用户数据
     * @param sessionKey
     * @param encryptedData
     * @param iv
     * @returns {Promise.<string>}
     */
    async decryptUserInfoData(sessionKey, encryptedData, iv) {
        // base64 decode
        const _sessionKey = Buffer.from(sessionKey, 'base64');
        encryptedData = Buffer.from(encryptedData, 'base64');
        iv = Buffer.from(iv, 'base64');
        let decoded = '';
        try {
            // 解密
            const decipher = crypto.createDecipheriv('aes-128-cbc', _sessionKey, iv);
            // 设置自动 padding 为 true，删除填充补位
            decipher.setAutoPadding(true);
            decoded = decipher.update(encryptedData, 'binary', 'utf8');
            decoded += decipher.final('utf8');
            decoded = JSON.parse(decoded);
        } catch (err) {
            return '';
        }
        if (decoded.watermark.appid !== think.config('weixin.appid')) {
            return '';
        }
        return decoded;
    }
    /**
     * 统一下单
     * @param payInfo
     * @returns {Promise}
     */
    async createUnifiedOrder(payInfo) {
        const WeiXinPay = require('weixinpay');
        const weixinpay = new WeiXinPay({
            appid: think.config('weixin.appid'), // 微信小程序appid
            openid: payInfo.openid, // 用户openid
            mch_id: think.config('weixin.mch_id'), // 商户帐号ID
            partner_key: think.config('weixin.partner_key') // 秘钥
        });
        return new Promise((resolve, reject) => {
            // let total_fee = this.getTotalFee(payInfo.out_trade_no);
            weixinpay.createUnifiedOrder({
                body: payInfo.body,
                out_trade_no: payInfo.out_trade_no,
                total_fee: payInfo.total_fee,
                // total_fee: total_fee,
                spbill_create_ip: payInfo.spbill_create_ip,
                notify_url: think.config('weixin.notify_url'),
                trade_type: 'JSAPI'
            }, (res) => {
                console.log(res);
                if (res.return_code === 'SUCCESS' && res.result_code === 'SUCCESS') {
                    const returnParams = {
                        'appid': res.appid,
                        'timeStamp': parseInt(Date.now() / 1000) + '',
                        'nonceStr': res.nonce_str,
                        'package': 'prepay_id=' + res.prepay_id,
                        'signType': 'MD5'
                    };
                    const paramStr = `appId=${returnParams.appid}&nonceStr=${returnParams.nonceStr}&package=${returnParams.package}&signType=${returnParams.signType}&timeStamp=${returnParams.timeStamp}&key=` + think.config('weixin.partner_key');
                    returnParams.paySign = md5(paramStr).toUpperCase();
                    let order_sn = payInfo.out_trade_no;
                    resolve(returnParams);
                } else {
                    reject(res);
                }
            });
        });
    }
    async getTotalFee(sn) {
        let total_fee = await this.model('order').where({
            order_sn: sn
        }).field('actual_price').find();
        let res = total_fee.actual_price;
        return res;
    }
    /**
     * 生成排序后的支付参数 query
     * @param queryObj
     * @returns {Promise.<string>}
     */
    buildQuery(queryObj) {
        const sortPayOptions = {};
        for (const key of Object.keys(queryObj).sort()) {
            sortPayOptions[key] = queryObj[key];
        }
        let payOptionQuery = '';
        for (const key of Object.keys(sortPayOptions).sort()) {
            payOptionQuery += key + '=' + sortPayOptions[key] + '&';
        }
        payOptionQuery = payOptionQuery.substring(0, payOptionQuery.length - 1);
        return payOptionQuery;
    }
    /**
     * 对 query 进行签名
     * @param queryStr
     * @returns {Promise.<string>}
     */
    signQuery(queryStr) {
        queryStr = queryStr + '&key=' + think.config('weixin.partner_key');
        const md5 = require('md5');
        const md5Sign = md5(queryStr);
        return md5Sign.toUpperCase();
    }
    /**
     * 处理微信支付回调
     * @param notifyData
     * @returns {{}}
     */
    payNotify(notifyData) {
        if (think.isEmpty(notifyData)) {
            return false;
        }
        const notifyObj = {};
        let sign = '';
        for (const key of Object.keys(notifyData)) {
            if (key !== 'sign') {
                notifyObj[key] = notifyData[key][0];
            } else {
                sign = notifyData[key][0];
            }
        }
        if (notifyObj.return_code !== 'SUCCESS' || notifyObj.result_code !== 'SUCCESS') {
            return false;
        }
        const signString = this.signQuery(this.buildQuery(notifyObj));
        if (think.isEmpty(sign) || signString !== sign) {
            return false;
        }
        let timeInfo = notifyObj.time_end;
        let pay_time = moment(timeInfo, 'YYYYMMDDHHmmss');
        notifyObj.time_end = new Date(Date.parse(pay_time)).getTime() / 1000
        return notifyObj;
    }
    /**
     * 申请退款
     * @param refundInfo
     * @returns {Promise}
     */
    createRefund(payInfo) {
        const WeiXinPay = require('weixinpay');
        const weixinpay = new WeiXinPay({
            appid: think.config('weixin.appid'), // 微信小程序appid
            openid: payInfo.openid, // 用户openid
            mch_id: think.config('weixin.mch_id'), // 商户帐号ID
            partner_key: think.config('weixin.partner_key') // 秘钥
        });
        return new Promise((resolve, reject) => {
            weixinpay.createUnifiedOrder({
                body: payInfo.body,
                out_trade_no: payInfo.out_trade_no,
                total_fee: payInfo.total_fee,
                spbill_create_ip: payInfo.spbill_create_ip,
                notify_url: think.config('weixin.notify_url'),
                trade_type: 'JSAPI'
            }, (res) => {
                if (res.return_code === 'SUCCESS' && res.result_code === 'SUCCESS') {
                    const returnParams = {
                        'appid': res.appid,
                        'timeStamp': parseInt(Date.now() / 1000) + '',
                        'nonceStr': res.nonce_str,
                        'package': 'prepay_id=' + res.prepay_id,
                        'signType': 'MD5'
                    };
                    const paramStr = `appId=${returnParams.appid}&nonceStr=${returnParams.nonceStr}&package=${returnParams.package}&signType=${returnParams.signType}&timeStamp=${returnParams.timeStamp}&key=` + think.config('weixin.partner_key');
                    returnParams.paySign = md5(paramStr).toUpperCase();
                    resolve(returnParams);
                } else {
                    reject(res);
                }
            });
        });
    }
    async getAccessToken() {
        const options = {
            method: 'POST',
            // url: 'https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=',
            url: 'https://api.weixin.qq.com/cgi-bin/token',
            qs: {
                grant_type: 'client_credential',
                secret: think.config('weixin.secret'),
                appid: think.config('weixin.appid')
            }
        };
        let sessionData = await rp(options);
        sessionData = JSON.parse(sessionData);
        let token = sessionData.access_token;
        return token;
    }
    async getSelfToken(params) {
        var key = ['meiweiyuxianmeiweiyuxian', params.timestamp, params.nonce].sort().join('');
        //将token （自己设置的） 、timestamp（时间戳）、nonce（随机数）三个参数进行字典排序
        var sha1 = crypto.createHash('sha1');
        //将上面三个字符串拼接成一个字符串再进行sha1加密
        sha1.update(key);
        //将加密后的字符串与signature进行对比，若成功，返回success。如果通过验证，则，注释掉这个函数
        let a = sha1.digest('hex');
        let b = params.signature;
        if (a == b) {
            return true;
        }
    }
    async sendMessage(token, data) {
        const sendInfo = {
            method: 'POST',
            url: 'https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=' + token,
            body: data,
            json: true
        };
        let posting = await rp(sendInfo);
        console.log(posting);
        return posting;
    }
    async getMessageATempId(type) {
        switch (type) {
            case 1:
                return 'TXWzXjO4C0odXCwQk4idgBtGcgSKBEWXJETYBZcRAzE';
                break;
                // 支付成功
            case 2:
                return 'COiQGBTzTtz_us5qYeJf0K-pFAyubBuWQh40sV1eAuw';
                break;
                // 发货通知
            default:
                return '400';
        }
    }
    async getMessageTempId(type) {
        switch (type) {
            case 1:
                return 'TXWzXjO4C0odXCwQk4idgBtGcgSKBEWXJETYBZcRAzE';
                break;
                // 支付成功
            case 2:
                return 'COiQGBTzTtz_us5qYeJf0K-pFAyubBuWQh40sV1eAuw';
                break;
                // 发货通知
            default:
                return '400';
        }
    }
    async sendTextMessage(data, access_token) {
        const sendInfo = {
            method: 'POST',
            url: 'https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=' + access_token,
            body: {
                touser: data.FromUserName,
                msgtype: "text",
                text: {
                    content: data.Content
                }
            },
            json: true
        };
        let posting = await rp(sendInfo);
        return posting;
    }
    async sendImageMessage(media_id, data, access_token) {
        const sendInfo = {
            method: 'POST',
            url: 'https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=' + access_token,
            body: {
                touser: data.FromUserName,
                msgtype: "image",
                image: {
                    media_id: media_id
                }
            },
            json: true
        };
        let posting = await rp(sendInfo);
        return posting;
    }
};