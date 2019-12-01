module.exports = class extends think.Model {
    /**
     * 获取商品的product
     * @param goodsId
     * @returns {Promise.<*>}
     */
    async getProductList(goodsId) {
        const goods = await this.model('product').where({goods_id: goodsId,is_delete:0}).select();
        return goods;
    }

    /**
     * 获取商品的规格信息
     * @param goodsId
     * @returns {Promise.<Array>}
     */
    async getSpecificationList(goodsId) {
        // 根据sku商品信息，查找规格值列表
        let info = await this.model('goods_specification').where({goods_id:goodsId,is_delete:0}).select();
        for(const item of info){
            let product = await this.model('product').where({
                goods_specification_ids:item.id,
                is_delete:0
            }).find();
            item.goods_number = product.goods_number;
        }
        let spec_id = info[0].specification_id;
        let specification = await this.model('specification').where({id:spec_id}).find();
        let name = specification.name;
        let data = {
            specification_id:spec_id,
            name:name,
            valueList:info
        }
        return data;
    }
};
