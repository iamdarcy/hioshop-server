const Base = require('./base.js');
const moment = require('moment');
const rp = require('request-promise');
const fs = require('fs');
const http = require("http");
module.exports = class extends Base {
    /**
     * 获取订单列表
     * @return {Promise} []
     */
    async listAction() {
        const showType = this.get('showType');
        const page = this.get('page');
        const size = this.get('size');
        let status = [];
        status = await this.model('order').getOrderStatus(showType);
        let is_delete = 0;
        // const orderList = await this.model('order').where({ user_id: think.userId }).page(1, 10).order('add_time DESC').countSelect();
        const orderList = await this.model('order').field('id,add_time,actual_price,freight_price,offline_pay').where({
            user_id: think.userId,
            is_delete: is_delete,
            order_type: ['<', 7],
            order_status: ['IN', status]
        }).page(page, size).order('add_time DESC').countSelect();
        const newOrderList = [];
        for (const item of orderList.data) {
            // 订单的商品
            item.goodsList = await this.model('order_goods').field('id,list_pic_url,number').where({
                user_id: think.userId,
                order_id: item.id,
                is_delete: 0
            }).select();
            item.goodsCount = 0;
            item.goodsList.forEach(v => {
                item.goodsCount += v.number;
            });
            item.add_time = moment.unix(await this.model('order').getOrderAddTime(item.id)).format('YYYY-MM-DD HH:mm:ss');
            // item.dealdone_time = moment.unix(await this.model('order').getOrderAddTime(item.id)).format('YYYY-MM-DD HH:mm:ss');
            // item.add_time =this.timestampToTime(await this.model('order').getOrderAddTime(item.id));
            // 订单状态的处理
            item.order_status_text = await this.model('order').getOrderStatusText(item.id);
            // 可操作的选项
            item.handleOption = await this.model('order').getOrderHandleOption(item.id);
            newOrderList.push(item);
        }
        orderList.data = newOrderList;
        return this.success(orderList);
    }
    // 获得订单数量
    //
    async countAction() {
        const showType = this.get('showType');
        let status = [];
        status = await this.model('order').getOrderStatus(showType);
        let is_delete = 0;
        const allCount = await this.model('order').where({
            user_id: think.userId,
            is_delete: is_delete,
            order_status: ['IN', status]
        }).count('id');
        return this.success({
            allCount: allCount,
        });
    }
    // 获得订单数量状态
    //
    async orderCountAction() {
        let user_id = think.userId;
        let toPay = await this.model('order').where({
            user_id: user_id,
            is_delete: 0,
            order_type: ['<', 7],
            order_status: ['IN', '101,801']
        }).count('id');
        let toDelivery = await this.model('order').where({
            user_id: user_id,
            is_delete: 0,
            order_type: ['<', 7],
            order_status: 300
        }).count('id');
        let toReceive = await this.model('order').where({
            user_id: user_id,
            order_type: ['<', 7],
            is_delete: 0,
            order_status: 301
        }).count('id');
        let newStatus = {
            toPay: toPay,
            toDelivery: toDelivery,
            toReceive: toReceive,
        }
        return this.success(newStatus);
    }
    async detailAction() {
        const orderId = this.get('orderId');
        const orderInfo = await this.model('order').where({
            user_id: think.userId,
            id: orderId
        }).find();
        const currentTime = parseInt(new Date().getTime() / 1000);
        if (think.isEmpty(orderInfo)) {
            return this.fail('订单不存在');
        }
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
        const orderGoods = await this.model('order_goods').where({
            user_id: think.userId,
            order_id: orderId,
            is_delete: 0
        }).select();
        var goodsCount = 0;
        for (const gitem of orderGoods) {
            goodsCount += gitem.number;
        }
        // 订单状态的处理
        orderInfo.order_status_text = await this.model('order').getOrderStatusText(orderId);
        if (think.isEmpty(orderInfo.confirm_time)) {
            orderInfo.confirm_time = 0;
        } else orderInfo.confirm_time = moment.unix(orderInfo.confirm_time).format('YYYY-MM-DD HH:mm:ss');
        if (think.isEmpty(orderInfo.dealdone_time)) {
            orderInfo.dealdone_time = 0;
        } else orderInfo.dealdone_time = moment.unix(orderInfo.dealdone_time).format('YYYY-MM-DD HH:mm:ss');
        if (think.isEmpty(orderInfo.pay_time)) {
            orderInfo.pay_time = 0;
        } else orderInfo.pay_time = moment.unix(orderInfo.pay_time).format('YYYY-MM-DD HH:mm:ss');
        if (think.isEmpty(orderInfo.shipping_time)) {
            orderInfo.shipping_time = 0;
        } else {
            orderInfo.confirm_remainTime = orderInfo.shipping_time + 10 * 24 * 60 * 60;
            orderInfo.shipping_time = moment.unix(orderInfo.shipping_time).format('YYYY-MM-DD HH:mm:ss');
        }
        // 订单支付倒计时
        if (orderInfo.order_status === 101 || orderInfo.order_status === 801) {
            // if (moment().subtract(60, 'minutes') < moment(orderInfo.add_time)) {
            orderInfo.final_pay_time = orderInfo.add_time + 24 * 60 * 60; //支付倒计时2小时
            if (orderInfo.final_pay_time < currentTime) {
                //超过时间不支付，更新订单状态为取消
                let updateInfo = {
                    order_status: 102
                };
                await this.model('order').where({
                    id: orderId
                }).update(updateInfo);
            }
        }
        orderInfo.add_time = moment.unix(orderInfo.add_time).format('YYYY-MM-DD HH:mm:ss');
        orderInfo.order_status = '';
        // 订单可操作的选择,删除，支付，收货，评论，退换货
        const handleOption = await this.model('order').getOrderHandleOption(orderId);
        const textCode = await this.model('order').getOrderTextCode(orderId);
        return this.success({
            orderInfo: orderInfo,
            orderGoods: orderGoods,
            handleOption: handleOption,
            textCode: textCode,
            goodsCount: goodsCount,
        });
    }
    /**
     * order 和 order-check 的goodslist
     * @return {Promise} []
     */
    async orderGoodsAction() {
        const orderId = this.get('orderId');
        if (orderId > 0) {
            const orderGoods = await this.model('order_goods').where({
                user_id: think.userId,
                order_id: orderId,
                is_delete: 0
            }).select();
            var goodsCount = 0;
            for (const gitem of orderGoods) {
                goodsCount += gitem.number;
            }
            return this.success(orderGoods);
        } else {
            const cartList = await this.model('cart').where({
                user_id: think.userId,
                checked:1,
                is_delete: 0,
                is_fast: 0,
            }).select();
            return this.success(cartList);
        }
    }
    /**
     * 取消订单
     * @return {Promise} []
     */
    async cancelAction() {
        const orderId = this.post('orderId');
        // 检测是否能够取消
        const handleOption = await this.model('order').getOrderHandleOption(orderId);
        // console.log('--------------' + handleOption.cancel);
        if (!handleOption.cancel) {
            return this.fail('订单不能取消');
        }
        // 设置订单已取消状态
        let updateInfo = {
            order_status: 102
        };
        let orderInfo = await this.model('order').field('order_type').where({
            id: orderId,
            user_id: think.userId
        }).find();
        //取消订单，还原库存
        const goodsInfo = await this.model('order_goods').where({
            order_id: orderId,
            user_id: think.userId
        }).select();
        for (const item of goodsInfo) {
            let goods_id = item.goods_id;
            let product_id = item.product_id;
            let number = item.number;
            await this.model('goods').where({
                id: goods_id
            }).increment('goods_number', number);
            await this.model('product').where({
                id: product_id
            }).increment('goods_number', number);
        }
        const succesInfo = await this.model('order').where({
            id: orderId
        }).update(updateInfo);
        return this.success(succesInfo);
    }
    /**
     * 删除订单
     * @return {Promise} []
     */
    async deleteAction() {
        const orderId = this.post('orderId');
        // 检测是否能够取消
        const handleOption = await this.model('order').getOrderHandleOption(orderId);
        if (!handleOption.delete) {
            return this.fail('订单不能删除');
        }
        const succesInfo = await this.model('order').orderDeleteById(orderId);
        return this.success(succesInfo);
    }
    /**
     * 确认订单
     * @return {Promise} []
     */
    async confirmAction() {
        const orderId = this.post('orderId');
        // 检测是否能够取消
        const handleOption = await this.model('order').getOrderHandleOption(orderId);
        if (!handleOption.confirm) {
            return this.fail('订单不能确认');
        }
        // 设置订单已取消状态
        const currentTime = parseInt(new Date().getTime() / 1000);
        let updateInfo = {
            order_status: 401,
            confirm_time: currentTime
        };
        const succesInfo = await this.model('order').where({
            id: orderId
        }).update(updateInfo);
        return this.success(succesInfo);
    }
    /**
     * 完成评论后的订单
     * @return {Promise} []
     */
    async completeAction() {
        const orderId = this.get('orderId');
        // 设置订单已完成
        const currentTime = parseInt(new Date().getTime() / 1000);
        let updateInfo = {
            order_status: 401,
            dealdone_time: currentTime
        };
        const succesInfo = await this.model('order').where({
            id: orderId
        }).update(updateInfo);
        return this.success(succesInfo);
    }
    /**
     * 提交订单
     * @returns {Promise.<void>}
     */
    async submitAction() {
        // 获取收货地址信息和计算运费
        const addressId = this.post('addressId');
        const freightPrice = this.post('freightPrice');
        const offlinePay = this.post('offlinePay');
        let postscript = this.post('postscript');
        const buffer = Buffer.from(postscript); // 留言
        const checkedAddress = await this.model('address').where({
            id: addressId
        }).find();
        if (think.isEmpty(checkedAddress)) {
            return this.fail('请选择收货地址');
        }
        // 获取要购买的商品
        const checkedGoodsList = await this.model('cart').where({
            user_id: think.userId,
            checked: 1,
            is_delete: 0
        }).select();
        if (think.isEmpty(checkedGoodsList)) {
            return this.fail('请选择商品');
        }
        let checkPrice = 0;
        let checkStock = 0;
        for(const item of checkedGoodsList){
            let product = await this.model('product').where({
                id:item.product_id
            }).find();
            if(item.number > product.goods_number){
                checkStock++;
            }
            if(item.retail_price != item.add_price){
                checkPrice++;
            }
        }
        if(checkStock > 0){
            return this.fail(400, '库存不足，请重新下单');
        }
        if(checkPrice > 0){
            return this.fail(400, '价格发生变化，请重新下单');
        }
        // 获取订单使用的红包
        // 如果有用红包，则将红包的数量减少，当减到0时，将该条红包删除
        // 统计商品总价
        let goodsTotalPrice = 0.00;
        for (const cartItem of checkedGoodsList) {
            goodsTotalPrice += cartItem.number * cartItem.retail_price;
        }
        // 订单价格计算
        const orderTotalPrice = goodsTotalPrice + freightPrice; // 订单的总价
        const actualPrice = orderTotalPrice - 0.00; // 减去其它支付的金额后，要实际支付的金额 比如满减等优惠
        const currentTime = parseInt(new Date().getTime() / 1000);
        let print_info = '';
        for (const item in checkedGoodsList) {
            let i = Number(item) + 1;
            print_info = print_info + i + '、' + checkedGoodsList[item].goods_aka + '【' + checkedGoodsList[item].number + '】 ';
        }
        let def = await this.model('settings').where({
            id: 1
        }).find();
        let sender_name = def.Name;
        let sender_mobile = def.Tel;
        // let sender_address = '';
        let userInfo = await this.model('user').where({
            id: think.userId
        }).find();
        // const checkedAddress = await this.model('address').where({id: addressId}).find();
        const orderInfo = {
            order_sn: this.model('order').generateOrderNumber(),
            user_id: think.userId,
            // 收货地址和运费
            consignee: checkedAddress.name,
            mobile: checkedAddress.mobile,
            province: checkedAddress.province_id,
            city: checkedAddress.city_id,
            district: checkedAddress.district_id,
            address: checkedAddress.address,
            order_status: 101, // 订单初始状态为 101
            // 根据城市得到运费，这里需要建立表：所在城市的具体运费
            freight_price: freightPrice,
            postscript: buffer.toString('base64'),
            add_time: currentTime,
            goods_price: goodsTotalPrice,
            order_price: orderTotalPrice,
            actual_price: actualPrice,
            change_price: actualPrice,
            print_info: print_info,
            offline_pay:offlinePay
        };
        // 开启事务，插入订单信息和订单商品
        const orderId = await this.model('order').add(orderInfo);
        orderInfo.id = orderId;
        if (!orderId) {
            return this.fail('订单提交失败');
        }
        // 将商品信息录入数据库
        const orderGoodsData = [];
        for (const goodsItem of checkedGoodsList) {
            orderGoodsData.push({
                user_id: think.userId,
                order_id: orderId,
                goods_id: goodsItem.goods_id,
                product_id: goodsItem.product_id,
                goods_name: goodsItem.goods_name,
                goods_aka: goodsItem.goods_aka,
                list_pic_url: goodsItem.list_pic_url,
                retail_price: goodsItem.retail_price,
                number: goodsItem.number,
                goods_specifition_name_value: goodsItem.goods_specifition_name_value,
                goods_specifition_ids: goodsItem.goods_specifition_ids
            });
        }
        await this.model('order_goods').addMany(orderGoodsData);
        await this.model('cart').clearBuyGoods();
        return this.success({
            orderInfo: orderInfo
        });
    }
    async updateAction() {
        const addressId = this.post('addressId');
        const orderId = this.post('orderId');
        // 备注
        // let postscript = this.post('postscript');
        // const buffer = Buffer.from(postscript);
        const updateAddress = await this.model('address').where({
            id: addressId
        }).find();
        const currentTime = parseInt(new Date().getTime() / 1000);
        const orderInfo = {
            // 收货地址和运费
            consignee: updateAddress.name,
            mobile: updateAddress.mobile,
            province: updateAddress.province_id,
            city: updateAddress.city_id,
            district: updateAddress.district_id,
            address: updateAddress.address,
            // TODO 根据地址计算运费
            // freight_price: 0.00,
            // 备注
            // postscript: buffer.toString('base64'),
            // add_time: currentTime
        };
        const updateInfo = await this.model('order').where({
            id: orderId
        }).update(orderInfo);
        return this.success(updateInfo);
    }
    /**
     * 查询物流信息asd
     * @returns {Promise.<void>}
     */
    async expressAction() {
        // let aliexpress = think.config('aliexpress');
        const currentTime = parseInt(new Date().getTime() / 1000);
        const orderId = this.get('orderId');
        let info = await this.model('order_express').where({
            order_id: orderId
        }).find();
        if (think.isEmpty(info)) {
            return this.fail(400, '暂无物流信息');
        }
        const expressInfo = await this.model('order_express').where({
            order_id: orderId
        }).find();
        // 如果is_finish == 1；或者 updateTime 小于 10分钟，
        let updateTime = info.update_time;
        let com = (currentTime - updateTime) / 60;
        let is_finish = info.is_finish;
        if (is_finish == 1) {
            return this.success(expressInfo);
        } else if (updateTime != 0 && com < 20) {
            return this.success(expressInfo);
        } else {
            let shipperCode = expressInfo.shipper_code;
            let expressNo = expressInfo.logistic_code;
            let code = shipperCode.substring(0, 2);
            let shipperName = '';
			let sfLastNo = think.config('aliexpress.sfLastNo');
            if (code == "SF") {
                shipperName = "SFEXPRESS";
                expressNo = expressNo + ':'+ sfLastNo;
            } else {
                shipperName = shipperCode;
            }
            let lastExpressInfo = await this.getExpressInfo(shipperName, expressNo);
            let deliverystatus = lastExpressInfo.deliverystatus;
            let newUpdateTime = lastExpressInfo.updateTime;
            newUpdateTime = parseInt(new Date(newUpdateTime).getTime() / 1000);
            deliverystatus = await this.getDeliverystatus(deliverystatus);
            let issign = lastExpressInfo.issign;
            let traces = lastExpressInfo.list;
            traces = JSON.stringify(traces);
            let dataInfo = {
                express_status: deliverystatus,
                is_finish: issign,
                traces: traces,
                update_time: newUpdateTime
            }
            await this.model('order_express').where({
                order_id: orderId
            }).update(dataInfo);
            let express = await this.model('order_express').where({
                order_id: orderId
            }).find();
            return this.success(express);
        }
        // return this.success(latestExpressInfo);
    }
    async getExpressInfo(shipperName, expressNo) {
		let appCode = "APPCODE "+ think.config('aliexpress.appcode');
        const options = {
            method: 'GET',
            url: 'http://wuliu.market.alicloudapi.com/kdi?no=' + expressNo + '&type=' + shipperName,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": appCode
            }
        };
        let sessionData = await rp(options);
        sessionData = JSON.parse(sessionData);
        return sessionData.result;
    }
    async getDeliverystatus(status) {
        if (status == 0) {
            return '快递收件(揽件)';
        } else if (status == 1) {
            return '在途中';
        } else if (status == 2) {
            return '正在派件';
        } else if (status == 3) {
            return '已签收';
        } else if (status == 4) {
            return '派送失败(无法联系到收件人或客户要求择日派送，地址不详或手机号不清)';
        } else if (status == 5) {
            return '疑难件(收件人拒绝签收，地址有误或不能送达派送区域，收费等原因无法正常派送)';
        } else if (status == 6) {
            return '退件签收';
        }
    }
};