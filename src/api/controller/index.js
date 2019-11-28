const Base = require('./base.js');
// const view = require('think-view');
const moment = require('moment');
const Jushuitan = require('jushuitan');
const rp = require('request-promise');
const http = require("http");
module.exports = class extends Base {
    async sendMessageAgainAction() {
        const tokenServer = think.service('weixin', 'api');
        const token = await tokenServer.getAccessToken();
        const rs = await tokenServer.sendLotteryMessage(24);
    }
    async indexAction() {
        //auto render template file index_index.html
        // return this.display();
    }
    async sendMessage(orderId, logistic_code, expressName) {
        console.log('哈哈');
        let orderInfo = await this.model('order').where({
            id: orderId
        }).field('user_id').find();
        let formInfo = await this.model('formid').where({
            order_id: orderId
        }).find();
        let formId = formInfo.form_id;
        let user = await this.model('user').where({
            id: orderInfo.user_id
        }).find();
        let openId = user.weixin_openid;
        // 物品名称
        // 快递单号
        // 快递公司
        // 发货时间
        // 温馨提示
        let goodsInfo = await this.model('order_goods').where({
            order_id: orderId
        }).field('goods_name').select();
        // 物品名称
        let goodsName = '';
        if (goodsInfo.length == 1) {
            goodsName = goodsInfo[0].goods_name
        } else {
            goodsName = goodsInfo[0].goods_name + '等' + goodsInfo.length + '件商品'
        }
        // 支付时间
        let currentTime = parseInt(new Date().getTime() / 1000);
        let shippingTime = moment.unix(currentTime).format('YYYY-MM-DD HH:mm:ss');
        // 订单金额
        // 温馨提示
        let data = {
            keyword1: {
                value: goodsName,
            },
            keyword2: {
                value: logistic_code, // 订单号码
            },
            keyword3: {
                value: expressName,
            },
            keyword4: {
                value: shippingTime,
            },
            keyword5: {
                value: '收到后请放冰箱！',
            },
        };
        const tokenServer = think.service('weixin', 'api');
        console.log(tokenServer)
        const token = await tokenServer.getAccessToken();
        const res = await tokenServer.sendMessage(token, openId, formId, data);
        console.log(res);
    }
    async appInfoAction() {
        // async indexAction() {
        let currentTime = parseInt(new Date().getTime() / 1000);
        const banner = await this.model('ad').where({
            enabled: 1,
            is_delete: 0
        }).order('sort_order asc').select();
        const notice = await this.model('notice').where({
            is_delete: 0
        }).select();
        const channel = await this.model('category').where({
            is_channel: 1,
            parent_id: 0,
        }).order({
            sort_order: 'asc'
        }).select();
        const categoryList = await this.model('category').where({
            parent_id: 0,
            is_show: 1
        }).order({
            sort_order: 'asc'
        }).select();
        const newCategoryList = [];
        for (const categoryItem of categoryList) {
            const categoryGoods = await this.model('goods').where({
                category_id: categoryItem.id,
                goods_number: ['>=', 0],
                is_on_sale: 1,
                is_index: 1,
                is_delete: 0
            }).order({
                sort_order: 'asc'
            }).select();
            newCategoryList.push({
                id: categoryItem.id,
                name: categoryItem.name,
                goodsList: categoryGoods,
                banner: categoryItem.img_url,
                height: categoryItem.p_height
            });
        }
        return this.success({
            channel: channel,
            banner: banner,
            notice: notice,
            categoryList: newCategoryList,
        });
    }
    async updatecartAction() {
        const goodsId = this.post('goodsId');
        const number = parseInt(this.post('number')); // 不是
        const productInfo = await this.model('product').where({
            goods_id: goodsId
        }).find();
        if (think.isEmpty(productInfo) || productInfo.goods_number < number) {
            return this.fail(400, '库存不足');
        }
        if (number > 0) {
            await this.model('cart').where({
                user_id: think.userId,
                is_delete: 0,
                goods_id: goodsId
            }).update({
                number: number
            });
        } else {
            await this.model('cart').where({
                user_id: think.userId,
                is_delete: 0,
                goods_id: goodsId
            }).update({
                is_delete: 1
            });
        }
        return this.success();
    }
};