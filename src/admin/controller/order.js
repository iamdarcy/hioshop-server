const Base = require('./base.js');
const moment = require('moment');
const _ = require('lodash');
// const Jushuitan = require('jushuitan');
module.exports = class extends Base {
    /**
     * index action
     * @return {Promise} []
     */
    async indexAction() {
        const page = this.get('page') || 1;
        const size = this.get('size') || 10;
        const orderSn = this.get('orderSn') || '';
        const consignee = this.get('consignee') || '';
        const logistic_code = this.get('logistic_code') || '';
        const status = this.get('status') || '';
        let data = {}
        const model = this.model('order');
        if (logistic_code == '') {
            data = await model.where({
                order_sn: ['like', `%${orderSn}%`],
                consignee: ['like', `%${consignee}%`],
                order_status: ['IN', status],
                order_type: ['<', 7],
            }).order(['id DESC']).page(page, size).countSelect();
            console.log(data);
        } else {
            let orderData = await this.model('order_express').where({
                logistic_code: logistic_code
            }).find();
            let order_id = orderData.order_id;
            data = await model.where({
                id: order_id
            }).order(['id DESC']).page(page, size).countSelect();
        }
        for (const item of data.data) {
            item.goodsList = await this.model('order_goods').field('goods_name,goods_aka,list_pic_url,number,goods_specifition_name_value,retail_price').where({
                order_id: item.id,
                is_delete: 0
            }).select();
            item.goodsCount = 0;
            item.goodsList.forEach(v => {
                item.goodsCount += v.number;
            });
            let user = await this.model('user').where({
                id: item.user_id
            }).field('nickname,name,mobile,avatar').find();
            if (!think.isEmpty(user)) {
                user.nickname = Buffer.from(user.nickname, 'base64').toString();
            } else {
                user.nickname = '已删除'
            }
            item.userInfo = user;
            let province_name = await this.model('region').where({
                id: item.province
            }).getField('name', true);
            let city_name = await this.model('region').where({
                id: item.city
            }).getField('name', true);
            let district_name = await this.model('region').where({
                id: item.district
            }).getField('name', true);
            item.full_region = province_name + city_name + district_name;
            item.postscript = Buffer.from(item.postscript, 'base64').toString();
            item.add_time = moment.unix(item.add_time).format('YYYY-MM-DD HH:mm:ss');
            if (item.pay_time != 0) {
                item.pay_time = moment.unix(item.pay_time).format('YYYY-MM-DD HH:mm:ss');
            } else {
                item.pay_time = 0;
            }
            item.order_status_text = await this.model('order').getOrderStatusText(item.id);
            let express = await this.model('order_express').where({
                order_id: item.id
            }).find();
            if (!think.isEmpty(express)) {
                item.expressInfo = express.shipper_name + express.logistic_code;
            } else {
                item.expressInfo = ''
            }
            // item.button_text = await this.model('order').getOrderBtnText(item.id);
        }
        return this.success(data);
    }
    async getAutoStatusAction() {
        let status = await this.model('settings').where({
            id: 1
        }).field('autoDelivery').find();
        let info = status.autoDelivery;
        return this.success(info);
    }
    async toDeliveryAction() {
        const page = this.get('page') || 1;
        const size = this.get('size') || 10;
        const status = this.get('status') || '';
        const model = this.model('order');
        const data = await model.where({
            order_status: status,
        }).order(['id DESC']).page(page, size).countSelect();
        for (const item of data.data) {
            item.goodsList = await this.model('order_goods').field('goods_name,list_pic_url,number,goods_specifition_name_value,retail_price').where({
                order_id: item.id
            }).select();
            item.goodsCount = 0;
            item.goodsList.forEach(v => {
                item.goodsCount += v.number;
            });
            let province_name = await this.model('region').where({
                id: item.province
            }).getField('name', true);
            let city_name = await this.model('region').where({
                id: item.city
            }).getField('name', true);
            let district_name = await this.model('region').where({
                id: item.district
            }).getField('name', true);
            item.address = province_name + city_name + district_name + item.address;
            item.postscript = Buffer.from(item.postscript, 'base64').toString();
            item.add_time = moment.unix(item.add_time).format('YYYY-MM-DD HH:mm:ss');
            item.order_status_text = await this.model('order').getOrderStatusText(item.id);
            item.button_text = await this.model('order').getOrderBtnText(item.id);
        }
        return this.success(data);
    }
    async saveGoodsListAction() {
        // console.log(typeof(data));
        let id = this.post('id');
        let order_id = this.post('order_id');
        let number = this.post('number');
        let price = this.post('retail_price');
        let addOrMinus = this.post('addOrMinus');
        let changePrice = Number(number) * Number(price);
        console.log(order_id);
        console.log(changePrice);
        if (addOrMinus == 0) {
            await this.model('order_goods').where({
                id: id
            }).decrement('number', number);
            await this.model('order').where({
                id: order_id
            }).decrement({
                actual_price: changePrice,
                order_price: changePrice,
                goods_price: changePrice
            });
            let order_sn = this.model('order').generateOrderNumber();
            await this.model('order').where({
                id: order_id
            }).update({
                order_sn: order_sn
            });
            return this.success(order_sn);
        } else if (addOrMinus == 1) {
            await this.model('order_goods').where({
                id: id
            }).increment('number', number);
            await this.model('order').where({
                id: order_id
            }).increment({
                actual_price: changePrice,
                order_price: changePrice,
                goods_price: changePrice
            });
            let order_sn = this.model('order').generateOrderNumber();
            await this.model('order').where({
                id: order_id
            }).update({
                order_sn: order_sn
            });
            return this.success(order_sn);
        }
    }
    async goodsListDeleteAction() {
        console.log(this.post('id'));
        let id = this.post('id');
        let order_id = this.post('order_id');
        let number = this.post('number');
        let price = this.post('retail_price');
        let addOrMinus = this.post('addOrMinus');
        let changePrice = Number(number) * Number(price);
        console.log(order_id);
        console.log(changePrice);
        await this.model('order_goods').where({
            id: id
        }).update({
            is_delete: 1
        });
        await this.model('order').where({
            id: order_id
        }).decrement({
            actual_price: changePrice,
            order_price: changePrice,
            goods_price: changePrice
        });
        let order_sn = this.model('order').generateOrderNumber();
        await this.model('order').where({
            id: order_id
        }).update({
            order_sn: order_sn
        });
        return this.success(order_sn);
    }
    async saveAdminMemoAction() {
        const id = this.post('id');
        const text = this.post('text');
        const model = this.model('order');
        let info = {
            admin_memo: text
        }
        let data = await model.where({
            id: id
        }).update(info);
        let orderInfo = await this.model('order').where({
            id: id
        }).find();
        let goods = await this.model('order_goods').where({
            order_id: id
        }).field('id,product_id,number,retail_price,list_pic_url').select();
        let order_goods = [];
        for (const item of goods) {
            let product = await this.model('product').where({
                id: item.product_id
            }).find();
            let data = {
                name: product.goods_name,
                sku_id: product.goods_sn,
                amount: item.retail_price,
                qty: item.number,
                outer_oi_id: item.id,
                pic: item.list_pic_url
            };
            order_goods.push(data);
        }
        return this.success(data);
    }
    async savePrintInfoAction() {
        const id = this.post('id');
        const print_info = this.post('print_info');
        const model = this.model('order');
        let info = {
            print_info: print_info
        };
        let data = await model.where({
            id: id
        }).update(info);
        return this.success(data);
    }
    async saveExpressValueInfoAction() {
        const id = this.post('id');
        const express_value = this.post('express_value');
        const model = this.model('order');
        let info = {
            express_value: express_value
        };
        let data = await model.where({
            id: id
        }).update(info);
        return this.success(data);
    }
    async saveRemarkInfoAction() {
        const id = this.post('id');
        const remark = this.post('remark');
        const model = this.model('order');
        let info = {
            remark: remark
        };
        let data = await model.where({
            id: id
        }).update(info);
        return this.success(data);
    }
    async detailAction() {
        const id = this.get('orderId');
        const model = this.model('order');
        let data = await model.where({
            id: id
        }).find();
        data.goodsList = await this.model('order_goods').field('id,product_id,goods_name,goods_aka,list_pic_url,number,goods_specifition_name_value,retail_price,goods_id').where({
            order_id: data.id,
            is_delete: 0
        }).select();
        data.goodsCount = 0;
        data.goodsList.forEach(v => {
            data.goodsCount += v.number;
        });
        for (const item of data.goodsList) {
            let info = await this.model('product').where({
                id: item.product_id
            }).field('goods_sn').find();
            item.goods_sn = info.goods_sn;
        }
        console.log(data.goodsList);
        let userInfo = await this.model('user').where({
            id: data.user_id
        }).find();
        let _nickname = Buffer.from(userInfo.nickname, 'base64').toString();
        data.user_name = _nickname;
        data.avatar = userInfo.avatar;
        let province_name = await this.model('region').where({
            id: data.province
        }).getField('name', true);
        let city_name = await this.model('region').where({
            id: data.city
        }).getField('name', true);
        let district_name = await this.model('region').where({
            id: data.district
        }).getField('name', true);
        data.full_region = province_name + city_name + district_name;
        data.postscript = Buffer.from(data.postscript, 'base64').toString();
        data.order_status_text = await this.model('order').getOrderStatusText(data.id);
        data.add_time = moment.unix(data.add_time).format('YYYY-MM-DD HH:mm:ss');
        data.allAddress = data.full_region + data.address;
        if (data.pay_time != 0) {
            data.pay_time = moment.unix(data.pay_time).format('YYYY-MM-DD HH:mm:ss');
        }
        if (data.shipping_time != 0) {
            data.shipping_time = moment.unix(data.shipping_time).format('YYYY-MM-DD HH:mm:ss');
        }
        if (data.confirm_time != 0) {
            data.confirm_time = moment.unix(data.confirm_time).format('YYYY-MM-DD HH:mm:ss');
        }
        if (data.dealdone_time != 0) {
            data.dealdone_time = moment.unix(data.dealdone_time).format('YYYY-MM-DD HH:mm:ss');
        }
        let def = await this.model('settings').where({
            id: 1
        }).find();
        let senderInfo = {}
        let receiveInfo = {}
        receiveInfo = {
            name: data.consignee,
            mobile: data.mobile,
            province: province_name,
            province_id: data.province,
            city: city_name,
            city_id: data.city,
            district: district_name,
            district_id: data.district,
            address: data.address
        }
        senderInfo = {
            name: def.Name,
            mobile: def.Tel,
            province: def.ProvinceName,
            city: def.CityName,
            district: def.ExpAreaName,
            province_id: def.province_id,
            city_id: def.city_id,
            district_id: def.district_id,
            address: def.Address,
        }
        return this.success({
            orderInfo: data,
            receiver: receiveInfo,
            sender: senderInfo
        });
    }
    async getAllRegionAction() { // 我写的算法
        const model = this.model('region');
        const aData = await model.where({
            type: 1
        }).select();
        const bData = await model.where({
            type: 2
        }).select();
        const cData = await model.where({
            type: 3
        }).select();
        let newData = [];
        for (const item of aData) {
            let children = [];
            for (const bitem of bData) {
                let innerChildren = [];
                for (const citem of cData) {
                    if (citem.parent_id == bitem.id) {
                        innerChildren.push({
                            value: citem.id,
                            label: citem.name
                        })
                    }
                }
                if (bitem.parent_id == item.id) {
                    children.push({
                        value: bitem.id,
                        label: bitem.name,
                        children: innerChildren
                    })
                }
            }
            newData.push({
                value: item.id,
                label: item.name,
                children: children
            });
        }
        return this.success(newData);
    }
    async orderpackAction() {
        const id = this.get('orderId');
        const model = this.model('order');
        const data = await model.where({
            id: id
        }).update({
            order_status: 300
        });
    }
    async orderReceiveAction() {
        const id = this.get('orderId');
        let currentTime = parseInt(new Date().getTime() / 1000);
        const model = this.model('order');
        const data = await model.where({
            id: id
        }).update({
            order_status: 302,
            shipping_time: currentTime
        });
    }
    async orderPriceAction() {
        const id = this.get('orderId');
        const goodsPrice = this.get('goodsPrice');
        const freightPrice = this.get('freightPrice');
        const actualPrice = this.get('actualPrice');
        const model = this.model('order');
        const data = await model.where({
            id: id
        }).find();
        let newData = {
            actual_price: actualPrice,
            freight_price: freightPrice,
            goods_price: goodsPrice,
            order_sn: model.generateOrderNumber()
        }
        await model.where({
            id: id
        }).update(newData);
    }
    async getOrderExpressAction() {
        const orderId = this.post('orderId');
        const latestExpressInfo = await this.model('order_express').getLatestOrderExpressByAli(orderId);
        return this.success(latestExpressInfo);
    }
    async getPrintTestAction() {
        const latestExpressInfo = await this.model('order_express').printExpress();
        return this.success(latestExpressInfo);
    }
    async getMianExpressAction() {
        const orderId = this.post('orderId');
        const sender = this.post('sender');
        const receiver = this.post('receiver');
        console.log(orderId);
        console.log(sender);
        console.log(receiver);
        let senderOptions = sender.senderOptions;
        let receiveOptions = receiver.receiveOptions;
        let senderInfo = {
            Name: sender.name,
            Tel: sender.mobile,
            ProvinceName: await this.model('region').where({
                id: senderOptions[0]
            }).getField('name', true),
            CityName: await this.model('region').where({
                id: senderOptions[1]
            }).getField('name', true),
            ExpAreaName: await this.model('region').where({
                id: senderOptions[2]
            }).getField('name', true),
            Address: sender.address
        };
        let receiverInfo = {
            Name: receiver.name,
            Tel: receiver.mobile,
            ProvinceName: await this.model('region').where({
                id: receiveOptions[0]
            }).getField('name', true),
            CityName: await this.model('region').where({
                id: receiveOptions[1]
            }).getField('name', true),
            ExpAreaName: await this.model('region').where({
                id: receiveOptions[2]
            }).getField('name', true),
            Address: receiver.address
        };
        // 每次重新生成一次订单号，这样，不会出现已经下过单的情况了。
        const expressType = this.post('expressType');
        const latestExpressInfo = await this.model('order_express').getMianExpress(orderId, senderInfo, receiverInfo, expressType);
        console.log('lastExpressInfo++++++++++++++++++++++');
        console.log(latestExpressInfo);
        if (latestExpressInfo.ResultCode == 100) {
            // 获取快递单号成功，然后存入order_express中
            this.orderExpressAdd(latestExpressInfo, orderId)
        }
        return this.success({
            latestExpressInfo: latestExpressInfo,
            sender: senderInfo,
            receiver: receiverInfo
        });
    }
    async rePrintExpressAction() {
        const date = new Date();
        let orderId = this.get('orderId')
        let order_sn = date.getFullYear() + _.padStart(date.getMonth(), 2, '0') + _.padStart(date.getDay(), 2, '0') + _.padStart(date.getHours(), 2, '0') + _.padStart(date.getMinutes(), 2, '0') + _.padStart(date.getSeconds(), 2, '0') + _.random(100000, 999999);
        let info = await this.model('order').where({
            id: orderId
        }).update({
            order_sn: order_sn
        });
        return this.success(info);
    }
    async directPrintExpressAction() {
        let orderId = this.get('orderId')
        let express = await this.model('order_express').where({
            order_id: orderId
        }).find();
        let info = {};
        if (express.express_type < 4) {
            info = await this.model('shipper').where({
                code: 'SF'
            }).find();
        } else {
            info = await this.model('shipper').where({
                code: 'YTO'
            }).find();
        }
        express.MonthCode = info.MonthCode;
        express.send_time = moment.unix(express.add_time).format('YYYY-MM-DD');
        return this.success(express);
    }
    async orderExpressAdd(ele, orderId) {
        let currentTime = parseInt(new Date().getTime() / 1000);
        let info = await this.model('order_express').where({
            order_id: orderId
        }).find();
        if (think.isEmpty(info)) {
            let orderInfo = ele.Order;
            let ShipperCode = orderInfo.ShipperCode;
            let logistic_code = orderInfo.LogisticCode;
            let expressType = ele.expressType;
            let region_code = orderInfo.DestinatioCode;
            if (expressType == 4) {
                region_code = orderInfo.MarkDestination;
            }
            const model = this.model('order');
            let kdInfo = await this.model('shipper').where({
                code: ShipperCode
            }).find();
            let kdData = {
                order_id: orderId,
                shipper_id: kdInfo.id,
                shipper_name: kdInfo.name,
                shipper_code: ShipperCode,
                logistic_code: logistic_code,
                region_code: region_code,
                express_type: expressType,
                add_time: currentTime
            };
            await this.model('order_express').add(kdData);
        } else {
            let orderInfo = ele.Order;
            await this.model('order_express').where({
                order_id: orderId
            }).update({
                logistic_code: orderInfo.LogisticCode
            });
        }
        // 如果生成快递单号了。然后又最后没有使用，又去生成快递单号，那么应该重新生成下订单号，用新订单号去生成快递单号，然后update掉旧的order_express
    }
    // 点击打印并发货按钮后，就将订单的状态改成已发货
    async goDeliveryAction() {
        let orderId = this.post('order_id');
        let currentTime = parseInt(new Date().getTime() / 1000);
        let updateData = {
            order_status: 301,
            print_status: 1,
            shipping_status: 1,
            shipping_time: currentTime
        };
        let data = await this.model('order').where({
            id: orderId
        }).update(updateData);
        // 发送服务消息
        let orderInfo = await this.model('order').where({
            id: orderId
        }).field('user_id').find();
     
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
        let express = await this.model('order_express').where({
            order_id: orderId
        }).find();
        // 物品名称
        let goodsName = '';
        if (goodsInfo.length == 1) {
            goodsName = goodsInfo[0].goods_name
        } else {
            goodsName = goodsInfo[0].goods_name + '等' + goodsInfo.length + '件商品'
        }
        // 支付时间
        let shippingTime = moment.unix(currentTime).format('YYYY-MM-DD HH:mm:ss');
        // 订单金额
		// 订阅消息 请先在微信小程序的官方后台设置好订阅消息模板，然后根据自己的data的字段信息，设置好data
        let TEMPLATE_ID = 'w6AMCJ0FI2LqjCjWPIrpnVWTsFgnlNlmCf9TTDmG6_U'
        let message = {
            "touser": openId,
            "template_id": TEMPLATE_ID,
            "page": '/pages/ucenter/index/index',
            "miniprogram_state":"formal",
            "lang":"zh_CN",
            "data": {
              "thing7": {
                  "value": goodsName
              },
              "date2": {
                  "value": shippingTime
              },
              "name3": {
                  "value": express.shipper_name
              },
              "character_string4": {
                  "value": express.logistic_code
              } ,
              "thing9": {
                  "value": '签收前请检查包裹！'
              }
          }
        }
        const tokenServer = think.service('weixin', 'api');
        const token = await tokenServer.getAccessToken();
        const res = await tokenServer.sendMessage(token,message);
        return this.success();
    }
    async goPrintOnlyAction() {
        let orderId = this.post('order_id');
        let updateData = {
            print_status: 1
        };
        let data = await this.model('order').where({
            id: orderId
        }).update(updateData);
        return this.success(data);
    }
    async orderDeliveryAction() {
        const orderId = this.get('orderId');
        const method = this.get('method');
        const deliveryId = this.get('shipper') || 0;
        const logistic_code = this.get('logistic_code') || 0;
        const model = this.model('order');
        let currentTime = parseInt(new Date().getTime() / 1000);
        let expressName = '';
        if (method == 2) {
            let ele = await this.model('order_express').where({
                order_id: orderId
            }).find();
            if (think.isEmpty(ele)) {
                let kdInfo = await this.model('shipper').where({
                    id: deliveryId
                }).find();
                expressName = kdInfo.name;
                let kdData = {
                    order_id: orderId,
                    shipper_id: deliveryId,
                    shipper_name: kdInfo.name,
                    shipper_code: kdInfo.code,
                    logistic_code: logistic_code,
                    add_time: currentTime
                };
                await this.model('order_express').add(kdData);
                let updateData = {
                    order_status: 301,
                    shipping_status: 1,
                    shipping_time: currentTime
                };
                await this.model('order').where({
                    id: orderId
                }).update(updateData);
                // 发送服务消息
            } else {
                let kdInfo = await this.model('shipper').where({
                    id: deliveryId
                }).find();
                expressName = kdInfo.name;
                let kdData = {
                    order_id: orderId,
                    shipper_id: deliveryId,
                    shipper_name: kdInfo.name,
                    shipper_code: kdInfo.code,
                    logistic_code: logistic_code,
                    add_time: currentTime
                }
                await this.model('order_express').where({
                    order_id: orderId
                }).update(kdData);
            }
        } else if (method == 3) {
            let updateData = {
                order_status: 301,
                shipping_time: currentTime
            };
            await this.model('order').where({
                id: orderId
            }).update(updateData);
            expressName = '自提件';
        }
        let orderInfo = await this.model('order').where({
            id: orderId
        }).field('user_id').find();
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
        let shippingTime = moment.unix(currentTime).format('YYYY-MM-DD HH:mm:ss');
        // 订单金额
		// 订阅消息 请先在微信小程序的官方后台设置好订阅消息模板，然后根据自己的data的字段信息，设置好data
        let TEMPLATE_ID = 'w6AMCJ0FI2LqjCjWPIrpnVWTsFgnlNlmCf9TTDmG6_U'
        let message = {
            "touser": openId,
            "template_id": TEMPLATE_ID,
            "page": '/pages/ucenter/index/index',
            "miniprogram_state":"formal",
            "lang":"zh_CN",
            "data": {
              "thing7": {
                  "value": goodsName
              },
              "date2": {
                  "value": shippingTime
              },
              "name3": {
                  "value": expressName
              },
              "character_string4": {
                  "value": logistic_code
              } ,
              "thing9": {
                  "value": '签收前请检查包裹！'
              }
          }
        }
        const tokenServer = think.service('weixin', 'api');
        const token = await tokenServer.getAccessToken();
        const res = await tokenServer.sendMessage(token,message);
    }
    async checkExpressAction() {
        const id = this.get('orderId');
        let info = await this.model('order_express').where({
            order_id: id
        }).find();
        if (!think.isEmpty(info)) {
            return this.success(info);
        } else {
            return this.fail(100, '没找到');
        }
    }
    async saveAddressAction() {
        const sn = this.post('order_sn');
        const name = this.post('name');
        const mobile = this.post('mobile');
        const cAddress = this.post('cAddress');
        const addOptions = this.post('addOptions');
        const province = addOptions[0];
        const city = addOptions[1];
        const district = addOptions[2];
        let info = {
            consignee: name,
            mobile: mobile,
            address: cAddress,
            province: province,
            city: city,
            district: district
        }
        const model = this.model('order');
        const data = await model.where({
            order_sn: sn
        }).update(info);
        return this.success(data);
    }
    async storeAction() {
        if (!this.isPost) {
            return false;
        }
        const values = this.post();
        const id = this.post('id');
        const model = this.model('order');
        values.is_show = values.is_show ? 1 : 0;
        values.is_new = values.is_new ? 1 : 0;
        if (id > 0) {
            await model.where({
                id: id
            }).update(values);
        } else {
            delete values.id;
            await model.add(values);
        }
        return this.success(values);
    }
    async changeStatusAction() {
        const orderSn = this.post('orderSn');
        const value = this.post('status');
        const info = await this.model('order').where({
            order_sn: orderSn
        }).update({
            order_status: value
        });
        return this.success(info);
    }
    async destoryAction() {
        const id = this.post('id');
        await this.model('order').where({
            id: id
        }).limit(1).delete();
        // 删除订单商品
        await this.model('order_goods').where({
            order_id: id
        }).delete();
        // TODO 事务，验证订单是否可删除（只有失效的订单才可以删除）
        return this.success();
    }
    async getGoodsSpecificationAction() {
        const goods_id = this.post('goods_id');
        let data = await this.model('goods_specification').where({
            goods_id: goods_id,
            is_delete: 0
        }).field('id,value').select();
        return this.success(data);
    }
};