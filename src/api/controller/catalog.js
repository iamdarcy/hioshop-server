const Base = require('./base.js');
module.exports = class extends Base {
    /**
     * 获取分类栏目数据
     * @returns {Promise.<Promise|void|PreventPromise>}
     */
    async indexAction() {
        const categoryId = this.get('id');
        const model = this.model('category');
        const data = await model.limit(10).where({
            parent_id: 0,
            is_category: 1
        }).order('sort_order ASC').select();
        let currentCategory = null;
        if (categoryId) {
            currentCategory = await model.where({
                'id': categoryId
            }).find();
        }
        if (think.isEmpty(currentCategory)) {
            currentCategory = data[0];
        }
        return this.success({
            categoryList: data,
        });
    }
    async currentAction() {
        const categoryId = this.get('id');
        let data = await this.model('category').where({
            id: categoryId
        }).field('id,name,img_url,p_height').find();
        return this.success(data);
    }
    async currentlistAction() {
        const page = this.post('page');
        const size = this.post('size');
        const categoryId = this.post('id');
        if (categoryId == 0) {
            let list = await this.model('goods').where({
                is_on_sale: 1,
                is_delete: 0
            }).order({
                sort_order: 'asc'
            }).field('name,id,goods_brief,min_retail_price,list_pic_url,goods_number').page(page, size).countSelect();
            return this.success(list);
        } else {
            let list = await this.model('goods').where({
                is_on_sale: 1,
                is_delete: 0,
                category_id: categoryId
            }).order({
                sort_order: 'asc'
            }).field('name,id,goods_brief,min_retail_price,list_pic_url,goods_number').page(page, size).countSelect();
            return this.success(list);
        }
    }
};