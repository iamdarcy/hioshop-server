const Base = require('./base.js');
const moment = require('moment');
module.exports = class extends Base {
    async indexAction() {
        const model = this.model('goods');
        const goodsList = await model.select();
        return this.success(goodsList);
    }
    /**
     * 商品详情页数据
     * @returns {Promise.<Promise|PreventPromise|void>}
     */
    async detailAction() {
        const goodsId = this.get('id');
        const model = this.model('goods');
        let info = await model.where({
            id: goodsId,
			is_delete:0
        }).find();
		if(think.isEmpty(info)){
			return this.fail('该商品不存在或已下架');
		}
        const gallery = await this.model('goods_gallery').where({
            goods_id: goodsId,
            is_delete: 0,
        }).order('sort_order').limit(6).select();
        await this.model('footprint').addFootprint(think.userId, goodsId);
        let productList = await model.getProductList(goodsId);
        let goodsNumber = 0;
        for (const item of productList) {
            if (item.goods_number > 0) {
                goodsNumber = goodsNumber + item.goods_number;
            }
        }
        let specificationList = await model.getSpecificationList(goodsId);
        info.goods_number = goodsNumber;
        return this.success({
            info: info,
            gallery: gallery,
            specificationList: specificationList,
            productList: productList
        });
    }
    async goodsShareAction() {
        const goodsId = this.get('id');
        const info = await this.model('goods').where({
            id: goodsId
        }).field('name,retail_price').find();
        return this.success(info);
    }
    /**
     * 获取商品列表
     * @returns {Promise.<*>}
     */
    async listAction() {
        const keyword = this.get('keyword');
        const sort = this.get('sort');
        const order = this.get('order');
        const sales = this.get('sales');
        const model = this.model('goods');
        const whereMap = {
            is_on_sale: 1,
            is_delete: 0,
        };
        if (!think.isEmpty(keyword)) {
            whereMap.name = ['like', `%${keyword}%`];
            // 添加到搜索历史
            await this.model('search_history').add({
                keyword: keyword,
                user_id: think.userId,
                add_time: parseInt(new Date().getTime() / 1000)
            });
            //    TODO 之后要做个判断，这个词在搜索记录中的次数，如果大于某个值，则将他存入keyword
        }
        // 排序
        let orderMap = {};
        if (sort === 'price') {
            // 按价格
            orderMap = {
                retail_price: order
            };
        } else if (sort === 'sales') {
            // 按价格
            orderMap = {
                sell_volume: sales
            };
        } else {
            // 按商品添加时间
            orderMap = {
                sort_order: 'asc'
            };
        }
        const goodsData = await model.where(whereMap).order(orderMap).select();
        return this.success(goodsData);
    }
    /**
     * 在售的商品总数
     * @returns {Promise.<Promise|PreventPromise|void>}
     */
    async countAction() {
        const goodsCount = await this.model('goods').where({
            is_delete: 0,
            is_on_sale: 1
        }).count('id');
        return this.success({
            goodsCount: goodsCount
        });
    }
};