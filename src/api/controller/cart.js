const Base = require('./base.js');
const moment = require('moment');
const pinyin = require("pinyin");
module.exports = class extends Base {
    async getCart(type) {
        let cartList = [];
        if(type == 0){
            cartList = await this.model('cart').where({
                user_id: think.userId,
                is_delete: 0,
                is_fast: 0,
            }).select();
        }
        else{
            cartList = await this.model('cart').where({
                user_id: think.userId,
                is_delete: 0,
                is_fast: 1
            }).select();
        }
        // 获取购物车统计信息
        let goodsCount = 0;
        let goodsAmount = 0;
        let checkedGoodsCount = 0;
        let checkedGoodsAmount = 0;
        let numberChange = 0;
        for (const cartItem of cartList) {
            let product = await this.model('product').where({
                id: cartItem.product_id,
                is_delete: 0
            }).find();
            if (think.isEmpty(product)) {
                await this.model('cart').where({
                    product_id: cartItem.product_id,
                    user_id: think.userId,
                    is_delete: 0,
                }).update({
                    is_delete: 1
                });
            } else {
                let retail_price = product.retail_price;
                let productNum = product.goods_number;
				// 4.14 更新
                if (productNum <= 0 || product.is_on_sale == 0) {
                    await this.model('cart').where({
                        product_id: cartItem.product_id,
                        user_id: think.userId,
                        checked: 1,
                        is_delete: 0,
                    }).update({
                        checked: 0
                    });
                    cartItem.number = 0;
                } else if (productNum > 0 && productNum < cartItem.number) {
                    cartItem.number = productNum;
                    numberChange = 1;
                } else if (productNum > 0 && cartItem.number == 0) {
                    cartItem.number = 1;
                    numberChange = 1;
                }
                goodsCount += cartItem.number;
                goodsAmount += cartItem.number * retail_price;
                cartItem.retail_price = retail_price;
                if (!think.isEmpty(cartItem.checked && productNum > 0)) {
                    checkedGoodsCount += cartItem.number;
                    checkedGoodsAmount += cartItem.number * Number(retail_price);
                }
                // 查找商品的图片
                let info = await this.model('goods').where({
                    id: cartItem.goods_id
                }).field('list_pic_url').find();
                cartItem.list_pic_url = info.list_pic_url;
                cartItem.weight_count = cartItem.number * Number(cartItem.goods_weight);
                await this.model('cart').where({
                    product_id: cartItem.product_id,
                    user_id: think.userId,
                    is_delete: 0,
                }).update({
                    number: cartItem.number,
                    add_price:retail_price
                })
            }
        }
        let cAmount = checkedGoodsAmount.toFixed(2);
        let aAmount = checkedGoodsAmount;
        return {
            cartList: cartList,
            cartTotal: {
                goodsCount: goodsCount,
                goodsAmount: goodsAmount.toFixed(2),
                checkedGoodsCount: checkedGoodsCount,
                checkedGoodsAmount: cAmount,
                user_id: think.userId,
                numberChange: numberChange
            }
        };
    }
    /**
     * 获取购物车信息，所有对购物车的增删改操作，都要重新返回购物车的信息
     * @return {Promise} []
     */
    async indexAction() {
        return this.success(await this.getCart(0));
    }
    async addAgain(goodsId, productId, number) {
        const currentTime = parseInt(new Date().getTime() / 1000);
        const goodsInfo = await this.model('goods').where({
            id: goodsId
        }).find();
        if (think.isEmpty(goodsInfo) || goodsInfo.is_on_sale == 0) {
            return this.fail(400, '商品已下架');
        }
        // 取得规格的信息,判断规格库存
        // const productInfo = await this.model('product').where({goods_id: goodsId, id: productId}).find();
        const productInfo = await this.model('product').where({
            id: productId
        }).find();
        // let productId = productInfo.id;
        if (think.isEmpty(productInfo) || productInfo.goods_number < number) {
            return this.fail(400, '库存不足');
        }
        // 判断购物车中是否存在此规格商品
        const cartInfo = await this.model('cart').where({
            user_id: think.userId,
            product_id: productId,
            is_delete: 0
        }).find();
        let retail_price = productInfo.retail_price;
        if (think.isEmpty(cartInfo)) {
            // 添加操作
            // 添加规格名和值
            let goodsSepcifitionValue = [];
            if (!think.isEmpty(productInfo.goods_specification_ids)) {
                goodsSepcifitionValue = await this.model('goods_specification').where({
                    goods_id: productInfo.goods_id,
                    is_delete: 0,
                    id: {
                        'in': productInfo.goods_specification_ids.split('_')
                    }
                }).getField('value');
            }
            // 添加到购物车
            const cartData = {
                goods_id: productInfo.goods_id,
                product_id: productId,
                goods_sn: productInfo.goods_sn,
                goods_name: goodsInfo.name,
                goods_aka: productInfo.goods_name,
                goods_weight: productInfo.goods_weight,
                freight_template_id: goodsInfo.freight_template_id,
                list_pic_url: goodsInfo.list_pic_url,
                number: number,
                user_id: think.userId,
                retail_price: retail_price,
                add_price: retail_price,
                goods_specifition_name_value: goodsSepcifitionValue.join(';'),
                goods_specifition_ids: productInfo.goods_specification_ids,
                checked: 1,
                add_time: currentTime
            };
            await this.model('cart').add(cartData);
        } else {
            // 如果已经存在购物车中，则数量增加
            if (productInfo.goods_number < (number + cartInfo.number)) {
                return this.fail(400, '库存都不够啦');
            }
            await this.model('cart').where({
                user_id: think.userId,
                product_id: productId,
                is_delete: 0,
                id: cartInfo.id
            }).update({
                retail_price: retail_price,
                checked: 1,
                number: number
            });
        }
    }
    /**
     * 添加商品到购物车
     * @returns {Promise.<*>}
     */
    async addAction() {
        const goodsId = this.post('goodsId');
        const productId = this.post('productId');
        const number = this.post('number');
        const addType = this.post('addType');
        const currentTime = parseInt(new Date().getTime() / 1000);
        // 判断商品是否可以购买
        const goodsInfo = await this.model('goods').where({
            id: goodsId
        }).find();
        if (think.isEmpty(goodsInfo) || goodsInfo.is_on_sale == 0) {
            return this.fail(400, '商品已下架');
        }
        // 取得规格的信息,判断规格库存
        // const productInfo = await this.model('product').where({goods_id: goodsId, id: productId}).find();
        const productInfo = await this.model('product').where({
            id: productId
        }).find();
        // let productId = productInfo.id;
        if (think.isEmpty(productInfo) || productInfo.goods_number < number) {
            return this.fail(400, '库存不足');
        }
        // 判断购物车中是否存在此规格商品
        const cartInfo = await this.model('cart').where({
            user_id: think.userId,
            product_id: productId,
            is_delete: 0
        }).find();
        let retail_price = productInfo.retail_price;
        if (addType == 1) {
            await this.model('cart').where({
                is_delete: 0,
                user_id: think.userId
            }).update({
                checked: 0
            });
            let goodsSepcifitionValue = [];
            if (!think.isEmpty(productInfo.goods_specification_ids)) {
                goodsSepcifitionValue = await this.model('goods_specification').where({
                    goods_id: productInfo.goods_id,
                    is_delete: 0,
                    id: {
                        'in': productInfo.goods_specification_ids.split('_')
                    }
                }).getField('value');
            }
            // 添加到购物车
            const cartData = {
                goods_id: productInfo.goods_id,
                product_id: productId,
                goods_sn: productInfo.goods_sn,
                goods_name: goodsInfo.name,
                goods_aka: productInfo.goods_name,
                goods_weight: productInfo.goods_weight,
                freight_template_id: goodsInfo.freight_template_id,
                list_pic_url: goodsInfo.list_pic_url,
                number: number,
                user_id: think.userId,
                retail_price: retail_price,
                add_price: retail_price,
                goods_specifition_name_value: goodsSepcifitionValue.join(';'),
                goods_specifition_ids: productInfo.goods_specification_ids,
                checked: 1,
                add_time: currentTime,
                is_fast: 1
            };
            await this.model('cart').add(cartData);
            return this.success(await this.getCart(1));
        } else {
            if (think.isEmpty(cartInfo)) {
                // 添加操作
                // 添加规格名和值
                let goodsSepcifitionValue = [];
                if (!think.isEmpty(productInfo.goods_specification_ids)) {
                    goodsSepcifitionValue = await this.model('goods_specification').where({
                        goods_id: productInfo.goods_id,
                        is_delete: 0,
                        id: {
                            'in': productInfo.goods_specification_ids.split('_')
                        }
                    }).getField('value');
                }
                // 添加到购物车
                const cartData = {
                    goods_id: productInfo.goods_id,
                    product_id: productId,
                    goods_sn: productInfo.goods_sn,
                    goods_name: goodsInfo.name,
                    goods_aka: productInfo.goods_name,
                    goods_weight: productInfo.goods_weight,
                    freight_template_id: goodsInfo.freight_template_id,
                    list_pic_url: goodsInfo.list_pic_url,
                    number: number,
                    user_id: think.userId,
                    retail_price: retail_price,
                    add_price: retail_price,
                    goods_specifition_name_value: goodsSepcifitionValue.join(';'),
                    goods_specifition_ids: productInfo.goods_specification_ids,
                    checked: 1,
                    add_time: currentTime
                };
                await this.model('cart').add(cartData);
            } else {
                // 如果已经存在购物车中，则数量增加
                if (productInfo.goods_number < (number + cartInfo.number)) {
                    return this.fail(400, '库存都不够啦');
                }
                await this.model('cart').where({
                    user_id: think.userId,
                    product_id: productId,
                    is_delete: 0,
                    id: cartInfo.id
                }).update({
                    retail_price: retail_price
                });
                await this.model('cart').where({
                    user_id: think.userId,
                    product_id: productId,
                    is_delete: 0,
                    id: cartInfo.id
                }).increment('number', number);
            }
            return this.success(await this.getCart(0));
        }
    }
    // 更新指定的购物车信息
    async updateAction() {
        const productId = this.post('productId'); // 新的product_id
        const id = this.post('id'); // cart.id
        const number = parseInt(this.post('number')); // 不是
        // 取得规格的信息,判断规格库存
        const productInfo = await this.model('product').where({
            id: productId,
            is_delete: 0,
        }).find();
        if (think.isEmpty(productInfo) || productInfo.goods_number < number) {
            return this.fail(400, '库存不足');
        }
        // 判断是否已经存在product_id购物车商品
        const cartInfo = await this.model('cart').where({
            id: id,
            is_delete: 0
        }).find();
        // 只是更新number
        if (cartInfo.product_id === productId) {
            await this.model('cart').where({
                id: id,
                is_delete: 0
            }).update({
                number: number
            });
            return this.success(await this.getCart(0));
        }
    }
    // 是否选择商品，如果已经选择，则取消选择，批量操作
    async checkedAction() {
        let productId = this.post('productIds').toString();
        const isChecked = this.post('isChecked');
        if (think.isEmpty(productId)) {
            return this.fail('删除出错');
        }
        productId = productId.split(',');
        await this.model('cart').where({
            product_id: {
                'in': productId
            },
            user_id: think.userId,
            is_delete: 0
        }).update({
            checked: parseInt(isChecked)
        });
        return this.success(await this.getCart(0));
    }
    // 删除选中的购物车商品，批量删除
    async deleteAction() {
        let productId = this.post('productIds');
        if (think.isEmpty(productId)) {
            return this.fail('删除出错');
        }
        await this.model('cart').where({
            product_id: productId,
            user_id: think.userId,
            is_delete: 0
        }).update({
            is_delete: 1
        });
        return this.success(await this.getCart(0));
        // return this.success(productId);
    }
    // 获取购物车商品的总件件数
    async goodsCountAction() {
        const cartData = await this.getCart(0);
        await this.model('cart').where({
            user_id: think.userId,
            is_delete: 0,
            is_fast: 1
        }).update({
            is_delete: 1
        });
        return this.success({
            cartTotal: {
                goodsCount: cartData.cartTotal.goodsCount
            }
        });
    }
    /**
     * 订单提交前的检验和填写相关订单信息
     * @returns {Promise.<void>}
     */
    async checkoutAction() {
        const currentTime = parseInt(new Date().getTime() / 1000);
        let orderFrom = this.get('orderFrom');
        const type = this.get('type'); // 是否团购
        const addressId = this.get('addressId'); // 收货地址id
        const addType = this.get('addType');
        let goodsCount = 0; // 购物车的数量
        let goodsMoney = 0; // 购物车的总价
        let freightPrice = 0;
        let outStock = 0;
        let cartData = '';
        // 获取要购买的商品
        if (type == 0) {
            if (addType == 0) {
                cartData = await this.getCart(0);
            } else if (addType == 1) {
                cartData = await this.getCart(1);
            } else if (addType == 2) {
                cartData = await this.getAgainCart(orderFrom);
            }
        }
        const checkedGoodsList = cartData.cartList.filter(function(v) {
            return v.checked === 1;
        });
        for (const item of checkedGoodsList) {
            goodsCount = goodsCount + item.number;
            goodsMoney = goodsMoney + item.number * item.retail_price;
            if (item.goods_number <= 0 || item.is_on_sale == 0) {
                outStock = Number(outStock) + 1;
            }
        }
        if (addType == 2) {
            let againGoods = await this.model('order_goods').where({
                order_id: orderFrom
            }).select();
            let againGoodsCount = 0;
            for (const item of againGoods) {
                againGoodsCount = againGoodsCount + item.number;
            }
            if (goodsCount != againGoodsCount) {
                outStock = 1;
            }
        }
        // 选择的收货地址
        let checkedAddress = null;
        if (addressId == '' || addressId == 0) {
            checkedAddress = await this.model('address').where({
                is_default: 1,
                user_id: think.userId,
				is_delete:0
            }).find();
        } else {
            checkedAddress = await this.model('address').where({
                id: addressId,
                user_id: think.userId,
				is_delete:0
            }).find();
        }
        if (!think.isEmpty(checkedAddress)) {
            // 运费开始
            // 先将促销规则中符合满件包邮或者满金额包邮的规则找到；
            // 先看看是不是属于偏远地区。
            let province_id = checkedAddress.province_id;
            // 得到数组了，然后去判断这两个商品符不符合要求
            // 先用这个goods数组去遍历
            let cartGoods = checkedGoodsList;
            let freightTempArray = await this.model('freight_template').where({
                is_delete: 0
            }).select();
            let freightData = [];
            for (const item in freightTempArray) {
                freightData[item] = {
                    id: freightTempArray[item].id,
                    number: 0,
                    money: 0,
                    goods_weight: 0,
                    freight_type: freightTempArray[item].freight_type
                }
            }
            // 按件计算和按重量计算的区别是：按件，只要算goods_number就可以了，按重量要goods_number*goods_weight
            // checkedGoodsList = [{goods_id:1,number5},{goods_id:2,number:3},{goods_id:3,number:2}]
            for (const item of freightData) {
                for (const cartItem of cartGoods) {
                    if (item.id == cartItem.freight_template_id) {
                        // 这个在判断，购物车中的商品是否属于这个运费模版，如果是，则加一，但是，这里要先判断下，这个商品是否符合满件包邮或满金额包邮，如果是包邮的，那么要去掉
                        item.number = item.number + cartItem.number;
                        item.money = item.money + cartItem.number * cartItem.retail_price;
                        item.goods_weight = item.goods_weight + cartItem.number * cartItem.goods_weight;
                    }
                }
            }
            checkedAddress.province_name = await this.model('region').getRegionName(checkedAddress.province_id);
            checkedAddress.city_name = await this.model('region').getRegionName(checkedAddress.city_id);
            checkedAddress.district_name = await this.model('region').getRegionName(checkedAddress.district_id);
            checkedAddress.full_region = checkedAddress.province_name + checkedAddress.city_name + checkedAddress.district_name;
            for (const item of freightData) {
                if (item.number == 0) {
                    continue;
                }
                let ex = await this.model('freight_template_detail').where({
                    template_id: item.id,
                    area: province_id,
                    is_delete: 0,
                }).find();
                let freight_price = 0;
                if (!think.isEmpty(ex)) {
                    // console.log('第一层：非默认邮费算法');
                    let groupData = await this.model('freight_template_group').where({
                        id: ex.group_id
                    }).find();
                    // 不为空，说明有模板，那么应用模板，先去判断是否符合指定的包邮条件，不满足，那么根据type 是按件还是按重量
                    let free_by_number = groupData.free_by_number;
                    let free_by_money = groupData.free_by_money;
                    // 4种情况，1、free_by_number > 0  2,free_by_money > 0  3,free_by_number free_by_money > 0,4都等于0
                    let templateInfo = await this.model('freight_template').where({
                        id: item.id,
                        is_delete: 0,
                    }).find();
                    let freight_type = templateInfo.freight_type;
                    if (freight_type == 0) {
                        if (item.number > groupData.start) { // 说明大于首件了
                            freight_price = groupData.start * groupData.start_fee + (item.number - 1) * groupData.add_fee; // todo 如果续件是2怎么办？？？
                        } else {
                            freight_price = groupData.start * groupData.start_fee;
                        }
                    } else if (freight_type == 1) {
                        if (item.goods_weight > groupData.start) { // 说明大于首件了
                            freight_price = groupData.start * groupData.start_fee + (item.goods_weight - 1) * groupData.add_fee; // todo 如果续件是2怎么办？？？
                        } else {
                            freight_price = groupData.start * groupData.start_fee;
                        }
                    }
                    if (free_by_number > 0) {
                        if (item.number >= free_by_number) {
                            freight_price = 0;
                        }
                    }
                    if (free_by_money > 0) {
                        if (item.money >= free_by_money) {
                            freight_price = 0;
                        }
                    }
                } else {
                    // console.log('第二层：使用默认的邮费算法');
                    let groupData = await this.model('freight_template_group').where({
                        template_id: item.id,
                        area: 0
                    }).find();
                    let free_by_number = groupData.free_by_number;
                    let free_by_money = groupData.free_by_money;
                    let templateInfo = await this.model('freight_template').where({
                        id: item.id,
                        is_delete: 0,
                    }).find();
                    let freight_type = templateInfo.freight_type;
                    if (freight_type == 0) {
                        if (item.number > groupData.start) { // 说明大于首件了
                            freight_price = groupData.start * groupData.start_fee + (item.number - 1) * groupData.add_fee; // todo 如果续件是2怎么办？？？
                        } else {
                            freight_price = groupData.start * groupData.start_fee;
                        }
                    } else if (freight_type == 1) {
                        if (item.goods_weight > groupData.start) { // 说明大于首件了
                            freight_price = groupData.start * groupData.start_fee + (item.goods_weight - 1) * groupData.add_fee; // todo 如果续件是2怎么办？？？
                        } else {
                            freight_price = groupData.start * groupData.start_fee;
                        }
                    }
                    if (free_by_number > 0) {
                        if (item.number >= free_by_number) {
                            freight_price = 0;
                        }
                    }
                    if (free_by_money > 0) {
                        if (item.money >= free_by_money) {
                            freight_price = 0;
                        }
                    }
                }
				freightPrice = freightPrice > freight_price?freightPrice:freight_price
                // freightPrice = freightPrice + freight_price;
                // 会得到 几个数组，然后用省id去遍历在哪个数组
            }
        } else {
            checkedAddress = 0;
        }
        // 计算订单的费用
        let goodsTotalPrice = cartData.cartTotal.checkedGoodsAmount; // 商品总价
        // 获取是否有可用红包
        let money = cartData.cartTotal.checkedGoodsAmount;
        let orderTotalPrice = 0;
        let def = await this.model('settings').where({
            id: 1
        }).find();
        orderTotalPrice = Number(money) + Number(freightPrice) // 订单的总价
        const actualPrice = orderTotalPrice; // 减去其它支付的金额后，要实际支付的金额
        let numberChange = cartData.cartTotal.numberChange;
        return this.success({
            checkedAddress: checkedAddress,
            freightPrice: freightPrice,
            checkedGoodsList: checkedGoodsList,
            goodsTotalPrice: goodsTotalPrice,
            orderTotalPrice: orderTotalPrice.toFixed(2),
            actualPrice: actualPrice.toFixed(2),
            goodsCount: goodsCount,
            outStock: outStock,
            numberChange: numberChange,
        });
    }
    async getAgainCart(orderFrom) {
        const againGoods = await this.model('order_goods').where({
            order_id: orderFrom
        }).select();
        await this.model('cart').where({
            is_delete: 0,
            user_id: think.userId
        }).update({
            checked: 0
        });
        for (const item of againGoods) {
            await this.addAgain(item.goods_id, item.product_id, item.number);
        }
        const cartList = await this.model('cart').where({
            user_id: think.userId,
            is_fast: 0,
            is_delete: 0
        }).select();
        // 获取购物车统计信息
        let goodsCount = 0;
        let goodsAmount = 0;
        let checkedGoodsCount = 0;
        let checkedGoodsAmount = 0;
        for (const cartItem of cartList) {
            goodsCount += cartItem.number;
            goodsAmount += cartItem.number * cartItem.retail_price;
            if (!think.isEmpty(cartItem.checked)) {
                checkedGoodsCount += cartItem.number;
                checkedGoodsAmount += cartItem.number * Number(cartItem.retail_price);
            }
            // 查找商品的图片
            let info = await this.model('goods').where({
                id: cartItem.goods_id
            }).field('list_pic_url,goods_number,goods_unit').find();
            // cartItem.list_pic_url = await this.model('goods').where({id: cartItem.goods_id}).getField('list_pic_url', true);
            let num = info.goods_number;
            if (num <= 0) {
                await this.model('cart').where({
                    product_id: cartItem.product_id,
                    user_id: think.userId,
                    checked: 1,
                    is_delete: 0,
                }).update({
                    checked: 0
                });
            }
            cartItem.list_pic_url = info.list_pic_url;
            cartItem.goods_number = info.goods_number;
            cartItem.weight_count = cartItem.number * Number(cartItem.goods_weight);
        }
        let cAmount = checkedGoodsAmount.toFixed(2);
        let aAmount = checkedGoodsAmount;
        return {
            cartList: cartList,
            cartTotal: {
                goodsCount: goodsCount,
                goodsAmount: goodsAmount.toFixed(2),
                checkedGoodsCount: checkedGoodsCount,
                checkedGoodsAmount: cAmount,
                user_id: think.userId
            }
        };
    }
};