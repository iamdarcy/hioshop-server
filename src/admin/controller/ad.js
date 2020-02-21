const Base = require('./base.js');
const moment = require('moment');
module.exports = class extends Base {
    /**
     * index action
     * @return {Promise} []
     */
    async indexAction() {
        const page = this.get('page') || 1;
        const size = this.get('size') || 10;
        const model = this.model('ad');
        const data = await model.where({
            is_delete: 0
        }).order(['id ASC']).page(page, size).countSelect();
        for (const item of data.data) {
            if (item.end_time != 0) {
                item.end_time = moment.unix(item.end_time).format('YYYY-MM-DD HH:mm:ss');
            }
            if (item.enabled == 1) {
                item.enabled = true;
            } else {
                item.enabled = false;
            }
        }
        return this.success(data);
    }
    async updateSortAction() {
        const id = this.post('id');
        const sort = this.post('sort');
        const model = this.model('ad');
        const data = await model.where({
            id: id
        }).update({
            sort_order: sort
        });
        return this.success(data);
    }
    async infoAction() {
        const id = this.get('id');
        const model = this.model('ad');
        const data = await model.where({
            id: id
        }).find();
        return this.success(data);
    }
    async storeAction() {
        if (!this.isPost) {
            return false;
        }
        const values = this.post();
        console.log(values);
        values.end_time = parseInt(new Date(values.end_time).getTime() / 1000);
        const id = this.post('id');
        const model = this.model('ad');
        if (id > 0) {
            await model.where({
                id: id
            }).update(values);
        } else {
            let ex = await model.where({
                goods_id: values.goods_id,
                is_delete:0
            }).find();
            if (think.isEmpty(ex)) {
                delete values.id;
                if (values.link_type == 0) {
                    values.link = '';
                } else {
                    values.goods_id = 0;
                }
                await model.add(values);
            } else {
                return this.fail(100, '发生错误');
            }
        }
        return this.success(values);
    }
    async getallrelateAction() {
        let data = await this.model('goods').where({
            is_on_sale: 1,
            is_delete: 0
        }).field('id,name,list_pic_url').select();
        return this.success(data);
    }
    async destoryAction() {
        const id = this.post('id');
        await this.model('ad').where({
            id: id
        }).limit(1).update({
            is_delete: 1
        });
        // TODO 删除图片
        return this.success();
    }
    async deleteAdImageAction(){
        let id = this.post('id');
        await this.model('ad').where({
            id:id
        }).update({
            image_url:''
        });
        return this.success();
    }
    async saleStatusAction() {
        const id = this.get('id');
        const status = this.get('status');
        let sale = 0;
        if (status == 'true') {
            sale = 1;
        }
        const model = this.model('ad');
        await model.where({
            id: id
        }).update({
            enabled: sale
        });
    }
};