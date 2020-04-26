const Base = require('./base.js');
const moment = require('moment');
const generate = require('nanoid/generate');
const Jushuitan = require('jushuitan');
module.exports = class extends Base {
    /**
     * 获取支付的请求参数
     * @returns {Promise<PreventPromise|void|Promise>}
     */
    // 测试时付款，将真实接口注释。 在小程序的services/pay.js中按照提示注释和打开
    async preWeixinPayaAction() {
        const orderId = this.get('orderId');
        const orderInfo = await this.model('order').where({
            id: orderId
        }).find();
        let userId = orderInfo.user_id;
        let result = {
        	transaction_id: 123123123123,
        	time_end: parseInt(new Date().getTime() / 1000),
        }
        const orderModel = this.model('order');
        await orderModel.updatePayData(orderInfo.id, result);
        this.afterPay(orderInfo);
		return this.success();
    }
    // 真实的付款接口
    async preWeixinPayAction() {
        const orderId = this.get('orderId');
        const orderInfo = await this.model('order').where({
            id: orderId
        }).find();
        // 再次确认库存和价格
        let orderGoods = await this.model('order_goods').where({
            order_id:orderId,
            is_delete:0
        }).select();
        let checkPrice = 0;
        let checkStock = 0;
        for(const item of orderGoods){
            let product = await this.model('product').where({
                id:item.product_id
            }).find();
            if(item.number > product.goods_number){
                checkStock++;
            }
            if(item.retail_price != product.retail_price){
                checkPrice++;
            }
        }
        if(checkStock > 0){
            return this.fail(400, '库存不足，请重新下单');
        }
        if(checkPrice > 0){
            return this.fail(400, '价格发生变化，请重新下单');
        }
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
                body: '[海风小店]：' + orderInfo.order_sn,
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
    }
};