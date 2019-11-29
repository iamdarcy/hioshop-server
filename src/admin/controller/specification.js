const Base = require('./base.js');
module.exports = class extends Base {
    /**
     * index action
     * @return {Promise} []
     */
    async indexAction() {
        const model = this.model('specification');
        const data = await model.where({
            id: ['>', 0]
        }).select();
        return this.success(data);
    }
    async getGoodsSpecAction() {
        const id = this.post('id');
        const model = this.model('product');
        const data = await model.where({
            goods_id: id,
            is_delete: 0
        }).select();
        //TODO 这里只有一层，以后如果有多重型号，如一件商品既有颜色又有尺寸时，这里的代码是不对的。以后再写。
        let specData = [];
        let specification_id = 0;
        for (const item of data) {
            let goods_spec_id = item.goods_specification_ids;
            let specValueData = await this.model('goods_specification').where({
                id: goods_spec_id,
                is_delete: 0
            }).find();
            specification_id = specValueData.specification_id;
            item.value = specValueData.value;
        }
        console.log(data);
        let dataInfo = {
            specData: data,
            specValue: specification_id
        };
        return this.success(dataInfo);
    }
    async productUpdateAction() {
        const goods_number = this.post('goods_number');
        const goods_weight = this.post('goods_weight');
        const goods_sn = this.post('goods_sn');
        const retail_price = this.post('retail_price');
        const cost = this.post('cost');
        const value = this.post('value');
        let updateInfo = {
            goods_number: goods_number,
            goods_weight: goods_weight,
            cost: cost,
            retail_price: retail_price
        }
        await this.model('cart').where({
            goods_sn: goods_sn
        }).update({
            retail_price: retail_price
        });
        const model = this.model('product');
        await model.where({
            goods_sn: goods_sn
        }).update(updateInfo);
        let idData = await model.where({
            goods_sn: goods_sn
        }).field('goods_specification_ids,goods_id').find();
        let goods_specification_id = idData.goods_specification_ids
        let info = await this.model('goods_specification').where({
            id: goods_specification_id
        }).update({
            value: value
        });
        let goods_id = idData.goods_id;
        // todo 价格显示为区间
        let pro = await this.model('product').where({
            goods_id: goods_id
        }).select();
        if (pro.length > 1) {
            let goodsNum = await this.model('product').where({
                goods_id: goods_id
            }).sum('goods_number');
            let maxPrice = await this.model('product').where({
                goods_id: goods_id
            }).max('retail_price');
            let minPrice = await this.model('product').where({
                goods_id: goods_id
            }).min('retail_price');
            let maxCost = await this.model('product').where({
                goods_id: goods_id
            }).max('cost');
            let minCost = await this.model('product').where({
                goods_id: goods_id
            }).min('cost');
            let goodsPrice = minPrice + '-' + maxPrice;
            let costPrice = minCost + '-' + maxCost;
            await this.model('goods').where({
                id: goods_id
            }).update({
                goods_number: goodsNum,
                retail_price: goodsPrice,
                cost_price: costPrice,
                min_retail_price: minPrice,
                min_cost_price: minCost,
            });
        } else {
            await this.model('goods').where({
                id: goods_id
            }).update({
                goods_number: goods_number,
                retail_price: retail_price,
                cost_price: cost,
                min_retail_price: retail_price,
                min_cost_price: cost,
            });
        }
        return this.success(info);
    }
    async productDeleAction() {
        const productId = this.post('id');
        const model = this.model('product');
        let idData = await model.where({
            id: productId
        }).field('goods_specification_ids,goods_id').find();
        let goods_specification_id = idData.goods_specification_ids;
        let goods_id = idData.goods_id;
        await model.where({
            id: productId
        }).limit(1).delete();
        let info = await this.model('goods_specification').where({
            id: goods_specification_id
        }).limit(1).delete();
        let lastData = await model.where({
            goods_id: goods_id
        }).select();
        if (lastData.length != 0) {
            let goodsNum = await this.model('product').where({
                goods_id: goods_id
            }).sum('goods_number');
            let goodsPrice = await this.model('product').where({
                goods_id: goods_id
            }).min('retail_price');
            await this.model('goods').where({
                id: goods_id
            }).update({
                goods_number: goodsNum,
                retail_price: goodsPrice
            });
        }
        return this.success(info);
    }
    async delePrimarySpecAction() {
        const goods_id = this.post('id');
        const model = this.model('product');
        await model.where({
            goods_id: goods_id
        }).delete();
        let info = await this.model('goods_specification').where({
            goods_id: goods_id
        }).delete();
        await this.model('goods').where({
            id: goods_id
        }).update({
            goods_number: 0,
            retail_price: 0
        });
        return this.success(info);
    }
    async detailAction(){
        let id = this.post('id');
        let info = await this.model('specification').where({
            id:id
        }).find();
        return this.success(info);
    }
    async addAction() {
        const value = this.post('name');
        const sort = this.post('sort_order');
        let info = {
            name: value,
            sort_order: sort
        }
        const model = this.model('specification');
        const data = await model.add(info);
        return this.success(data);
    }
    async checkSnAction() {
        const sn = this.post('sn');
        const model = this.model('product');
        const data = await model.where({
            goods_sn: sn
        }).select();
        if (data.length > 0) {
            return this.fail('sn已存在');
        } else {
            return this.success(data);
        }
    }
    async updateAction() {
        const id = this.post('id');
        const value = this.post('name');
        const sort = this.post('sort_order');
        let info = {
            name: value,
            sort_order: sort
        }
        const model = this.model('specification');
        const data = await model.where({
            id: id
        }).update(info);
        return this.success(data);
    }
    async deleteAction() {
        const id = this.post('id');
        const goods_spec = await this.model('goods_specification').where({
            specification_id: id,
            is_delete: 0
        }).select();
        console.log(goods_spec);
        if (goods_spec.length > 0) {
            return this.fail('该型号下有商品，暂不能删除')
        } else {
            const model = this.model('specification');
            const data = await model.where({
                id: id
            }).limit(1).delete();
            return this.success(data);
        }
    }
};