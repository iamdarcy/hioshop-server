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
        console.log('zheli');
        console.log(weixinpay);
        console.log(payInfo);
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
                    let formId = res.prepay_id;
                    let order_sn = payInfo.out_trade_no;
                    this.saveFormId(formId, order_sn);
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
    async saveFormId(formId, order_sn) {
        let orderInfo = await this.model('order').where({
            order_sn: order_sn
        }).field('user_id,id').find();
        const currentTime = parseInt(new Date().getTime() / 1000);
        let data = {
            form_id: formId,
            order_id: orderInfo.id,
            user_id: orderInfo.user_id,
            add_time: currentTime
        }
        let info = await this.model('formid').where({
            order_id: orderInfo.id
        }).find();
        if (think.isEmpty(info)) {
            await this.model('formid').add(data);
        } else {
            await this.model('formid').where({
                order_id: orderInfo.id
            }).update(data);
        }
    }
    async sendMessageInfo(formId, openId, template_id, order_sn) {
        let page = '/pages/ucenter/order-list/index';
        let order = await this.model('order').where({
            order_sn: order_sn
        }).field('id,pay_time,actual_price').find();
        let goodsInfo = await this.model('order_goods').where({
            order_id: order.id
        }).field('goods_name').select();
        // 物品名称
        let goodsName = '';
        if (goodsInfo.length == 1) {
            goodsName = goodsInfo[0].goods_name
        } else {
            goodsName = goodsInfo[0].goods_name + '等' + goodsInfo.length + '件商品'
        }
        // 支付时间
        let payTime = moment.unix(order.pay_time).format('YYYY-MM-DD HH:mm:ss');
        // 订单金额
        let money = order.actual_price
        // 温馨提示
        let data = {
            keyword1: {
                value: goodsName,
            },
            keyword2: {
                value: order_sn, // 订单号码
            },
            keyword3: {
                value: payTime,
            },
            keyword4: {
                value: money,
            },
            keyword5: {
                value: '您的商品很快就飞奔到您手上啦！',
            },
        }
        const token = await this.getAccessToken();
        const sendInfo = {
            method: 'POST',
            url: 'https://api.weixin.qq.com/cgi-bin/message/wxopen/template/send?access_token=' + token,
            body: {
                touser: openId,
                template_id: template_id,
                page: page,
                form_id: formId,
                data: data
            },
            json: true
        };
        let posting = await rp(sendInfo);
        console.log('-----------------');
        console.log(posting);
        console.log('-----------------');
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
    async sendMessage(token, openId, formId, data) {
        const sendInfo = {
            method: 'POST',
            url: 'https://api.weixin.qq.com/cgi-bin/message/wxopen/template/send?access_token=' + token,
            body: {
                touser: openId,
                template_id: 'qpYW_mtRIibDA_i7RY-mGFzRLWgbPaYsNwcQv7BWXCA',
                page: '/pages/ucenter/index/index',
                form_id: formId,
                data: data
            },
            json: true
        };
        let posting = await rp(sendInfo);
        return posting;
    }
    async sendLotteryMessage(id) {
        let lotteryJoin = await this.model('lottery_join').where({
            lottery_id: id,
            is_delete: 0,
        }).select();
        let lottery = await this.model('lottery_list').where({
            id: id,
            is_delete: 0,
        }).find();
        for (const item of lotteryJoin) {
            let user = await this.model('user').where({
                id: item.user_id
            }).find();
            let formId = await this.model('formid').where({
                order_id: 0,
                user_id: item.user_id
            }).order('add_time asc').find();
            if (think.isEmpty(formId)) {
                continue;
            }
            formId = formId.form_id;
            let shop_name = lottery.shop_name;
            let open_time = moment.unix(lottery.open_time).format('YYYY-MM-DD HH:mm');
            let nickname = Buffer.from(user.nickname, 'base64').toString();
            let openId = user.weixin_openid;
            let isBingo = item.is_bingo;
            let result = '';
            let template_id = '';
            let data = {};
            let page = '/pages/ucenter/lottery-details/index?id=' + id + '&&open=1';
            let myInviter = await this.model('lottery_inviter').where({
                from_user_id: item.user_id, // 106 976
            }).getField('friend_user_id');
            console.log(myInviter);
            let friendBingo = {};
            if (myInviter.length > 0) {
                friendBingo = await this.model('lottery_join').where({
                    lottery_id: id,
                    user_id: ['IN', myInviter],
                    is_bingo: 1,
                    is_delete: 0,
                }).find();
            }
            let inviteMe = await this.model('lottery_inviter').where({
                friend_user_id: item.user_id, // 106 976
            }).getField('from_user_id');
            let myFriendBingo = {};
            if (inviteMe.length > 0) {
                myFriendBingo = await this.model('lottery_join').where({
                    lottery_id: id,
                    user_id: ['IN', inviteMe],
                    is_bingo: 1,
                    is_delete: 0,
                }).find();
            }
            let bingoText = '';
            if (!think.isEmpty(friendBingo) || !think.isEmpty(myFriendBingo)) {
                bingoText = '你的朋友中奖了，快去看看吧！'
            } else {
                bingoText = '点击查看中奖名单'
            }
            if (isBingo == 0) {
                let lotteryPrize = await this.model('lottery_prize').where({
                    lottery_id: id
                }).order('level asc').select();
                let prize = '';
                if (lotteryPrize.length == 1) {
                    prize = lotteryPrize[0].name;
                } else {
                    for (const item of lotteryPrize) {
                        let level = item.level;
                        let levelName = '';
                        if (level == 1) {
                            levelName = '一等奖';
                        } else if (level == 2) {
                            levelName = '二等奖';
                        } else if (level == 3) {
                            levelName = '三等奖';
                        } else if (level == 4) {
                            levelName = '四等奖';
                        }
                        prize = prize + levelName + item.name + ';'
                    }
                }
                //  奖品名称
                // {{keyword1.DATA}}
                // 发起商户
                // {{keyword2.DATA}}
                // 开奖时间
                // {{keyword3.DATA}}
                // 开奖结果
                // {{keyword4.DATA}}
                // 抽奖结果
                // {{keyword5.DATA}}
                template_id = 'lEVvPjLGhE6dXuHhafLaoKqANwvhTYgTS3JkhzLzqMI';
                data = {
                    keyword1: {
                        value: prize,
                    },
                    keyword2: {
                        value: shop_name
                    },
                    keyword3: {
                        value: open_time
                    },
                    keyword4: {
                        value: '很遗憾，本次抽奖你未中奖'
                    },
                    keyword5: {
                        value: bingoText
                    }
                }
            } else if (isBingo == 1) {
                let myPrize = await this.model('lottery_num').where({
                    lottery_id: id,
                    lottery_join_id: item.id,
                    bingo_level: ['>', 0]
                }).field('bingo_level').find();
                let bingoLevel = myPrize.bingo_level;
                let lotteryPrize = await this.model('lottery_prize').where({
                    lottery_id: id,
                    level: bingoLevel
                }).find();
                console.log('=========================');
                console.log(lotteryPrize);
                console.log('==================');
                let prize = lotteryPrize.name;
                let tip_val = '';
                if (lotteryPrize.goods_id > 0) {
                    tip_val = '请添加地址后，联系客服领取，客服微信：lookgxl'
                } else {
                    tip_val = '请添加客服微信后领取，客服微信：lookgxl'
                }
                // 开奖结果
                // {{keyword1.DATA}}
                // 奖品名称
                // {{keyword2.DATA}}
                // 用户昵称
                // {{keyword3.DATA}}
                // 领奖方式
                // {{keyword4.DATA}}
                // 备注
                // {{keyword5.DATA}}
                result = '恭喜你，中奖啦！';
                template_id = 'bjzqwhjKlw8qouus2jiTnbPfmYdlRQdKexVwkDQIOME';
                data = {
                    keyword1: {
                        value: result
                    },
                    keyword2: {
                        value: prize
                    },
                    keyword3: {
                        value: nickname,
                    },
                    keyword4: {
                        value: tip_val
                    },
                    keyword5: {
                        value: '请当天领取，过期作废！'
                    }
                }
            }
            let tokenServer = think.service('weixin', 'api');
            const token = await tokenServer.getAccessToken();
            const rs = await this.sendLotteryMessageNow(token, openId, formId, template_id, page, data);
            console.log('===========================消息');
            console.log(rs);
        }
    }
    async sendLotteryMessageNow(token, openId, formId, template_id, page, data) {
        const sendInfo = {
            method: 'POST',
            url: 'https://api.weixin.qq.com/cgi-bin/message/wxopen/template/send?access_token=' + token,
            body: {
                touser: openId,
                template_id: template_id,
                page: page,
                form_id: formId,
                data: data
            },
            json: true
        };
        console.log('--------------=============-1');
        console.log(template_id);
        console.log(openId);
        console.log(formId);
        console.log('--------------=============-1');
        let posting = await rp(sendInfo);
        console.log(posting);
        let form = await this.model('formid').where({
            form_id: formId
        }).find();
        console.log('--------------=============-2');
        if (form.order_id == 0) {
            await this.model('formid').where({
                form_id: formId
            }).limit(1).delete();
        } else {
            if (form.user_times == 0 || form.user_times == 1) {
                await this.model('formid').where({
                    form_id: formId
                }).increment('user_times');
            } else if (form.user_times == 2) {
                await this.model('formid').where({
                    form_id: formId
                }).limit(1).delete();
            }
        }
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