const Base = require('./base.js');
const moment = require('moment');
const generate = require('nanoid/generate');
const Jushuitan = require('jushuitan');
module.exports = class extends Base {
    /**
     * 获取支付的请求参数
     * @returns {Promise<PreventPromise|void|Promise>}
     */
    // 测试时付款，将真实接口注释。
    async preWeixinPayaAction() {
        const orderId = this.get('orderId');
        const orderInfo = await this.model('order').where({
            id: orderId
        }).find();
        let userId = orderInfo.user_id;
        let result = {
            transaction_id: 1,
            time_end: 1,
        }
        const orderModel = this.model('order');
        await orderModel.updatePayData(orderInfo.id, result);
        this.afterPay(orderInfo);
    }
    // 真实的付款接口
    async preWeixinPayAction() {
        const orderId = this.get('orderId');
        const orderInfo = await this.model('order').where({
            id: orderId
        }).find();
        let userId = orderInfo.user_id;
        if (think.isEmpty(orderInfo)) {
            return this.fail(400, '订单已取消');
        }
        if (parseInt(orderInfo.pay_status) !== 0) {
            return this.fail(400, '订单已支付，请不要重复操作');
        }
        const openid = await this.model('user').where({
            id: orderInfo.user_id
        }).getField('weixin_openid', true);
        if (think.isEmpty(openid)) {
            return this.fail(400, '微信支付失败?');
        }
        const WeixinSerivce = this.service('weixin', 'api');
        try {
            const returnParams = await WeixinSerivce.createUnifiedOrder({
                openid: openid,
                body: '[海鸥实验室]：' + orderInfo.order_sn,
                out_trade_no: orderInfo.order_sn,
                total_fee: parseInt(orderInfo.actual_price * 100),
                spbill_create_ip: ''
            });
            return this.success(returnParams);
        } catch (err) {
            return this.fail(400, '微信支付失败?');
        }
    }
    async notifyAction() {
        const WeixinSerivce = this.service('weixin', 'api');
        const data = this.post('xml');
        const result = WeixinSerivce.payNotify(this.post('xml'));
        
        if (!result) {
            let echo = 'FAIL';
            return this.json(echo);
        }
        const orderModel = this.model('order');
        const orderInfo = await orderModel.getOrderByOrderSn(result.out_trade_no);
        if (think.isEmpty(orderInfo)) {
            let echo = 'FAIL';
            return this.json(echo);
        }
        let bool = await orderModel.checkPayStatus(orderInfo.id);
        if (bool == true) {
            if (orderInfo.order_type == 0) { //普通订单和秒杀订单
                await orderModel.updatePayData(orderInfo.id, result);
                this.afterPay(orderInfo);
            } 
        } else {
            return '<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[订单已支付]]></return_msg></xml>';
        }
        let echo = 'SUCCESS'
        return this.json(echo);
    }
    async afterPay(orderInfo) {
        const currentTime = parseInt(new Date().getTime() / 1000);
        let userId = orderInfo.user_id;
        let userInfo = await this.model('user').where({
            id: userId
        }).find();
        // version 1.01
        if (orderInfo.order_type == 0) {
            let orderGoodsList = await this.model('order_goods').where({
                order_id: orderInfo.id
            }).select();
            for (const cartItem of orderGoodsList) {
                let goods_id = cartItem.goods_id;
                let product_id = cartItem.product_id;
                let number = cartItem.number;
                let specification = cartItem.goods_specifition_name_value;
                await this.model('goods').where({
                    id: goods_id
                }).decrement('goods_number', number);
                await this.model('goods').where({
                    id: goods_id
                }).increment('sell_volume', number);
                await this.model('product').where({
                    id: product_id
                }).decrement('goods_number', number);
            }
            // version 1.01
        }
        let formInfo = await this.model('formid').where({
            user_id: userId
        }).find();
        let formId = formInfo.form_id;
        let user = await this.model('user').where({
            id: userId
        }).find();
        let openId = user.weixin_openid;
        orderInfo.province_name = await this.model('region').where({
            id: orderInfo.province
        }).getField('name', true);
        orderInfo.city_name = await this.model('region').where({
            id: orderInfo.city
        }).getField('name', true);
        orderInfo.district_name = await this.model('region').where({
            id: orderInfo.district
        }).getField('name', true);
        orderInfo.full_region = orderInfo.province_name + orderInfo.city_name + orderInfo.district_name;
        orderInfo.postscript = Buffer.from(orderInfo.postscript, 'base64').toString();
        let _nickname = Buffer.from(user.nickname, 'base64').toString();
        let money = orderInfo.actual_price;
        let data = {
            keyword1: {
                value: orderInfo.print_info,
            },
            keyword2: {
                value: money.toString(), // 订单号码
            },
            keyword3: {
                value: orderInfo.consignee,
            },
            keyword4: {
                value: orderInfo.mobile,
            },
            keyword5: {
                value: orderInfo.full_region,
            },
            keyword6: {
                value: orderInfo.postscript,
            },
            keyword7: {
                value: _nickname
            },
        };
    }
};