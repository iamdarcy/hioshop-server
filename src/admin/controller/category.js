const Base = require('./base.js');
module.exports = class extends Base {
    /**
     * index action
     * @return {Promise} []
     */
    async indexAction() {
        const model = this.model('category');
        const data = await model.order(['sort_order ASC']).select();
        const topCategory = data.filter((item) => {
            return item.parent_id === 0;
        });
        const categoryList = [];
        topCategory.map((item) => {
            item.level = 1;
            categoryList.push(item);
            data.map((child) => {
                if (child.parent_id === item.id) {
                    child.level = 2;
                    categoryList.push(child);
                }
                if (child.is_show == 1) {
                    child.is_show = true;
                } else {
                    child.is_show = false;
                }
                if (child.is_channel == 1) {
                    child.is_channel = true;
                } else {
                    child.is_channel = false;
                }
                if (child.is_category == 1) {
                    child.is_category = true;
                } else {
                    child.is_category = false;
                }
            });
        });
        return this.success(categoryList);
    }
    async updateSortAction() {
        const id = this.post('id');
        const sort = this.post('sort');
        const model = this.model('category');
        const data = await model.where({
            id: id
        }).update({
            sort_order: sort
        });
        return this.success(data);
    }
    async topCategoryAction() {
        const model = this.model('category');
        const data = await model.where({
            parent_id: 0
        }).order(['id ASC']).select();
        return this.success(data);
    }
    async infoAction() {
        const id = this.get('id');
        const model = this.model('category');
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
        const id = this.post('id');
        const model = this.model('category');
        values.is_show = values.is_show ? 1 : 0;
        values.is_channel = values.is_channel ? 1 : 0;
        values.is_category = values.is_category ? 1 : 0;
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
    async destoryAction() {
        const id = this.post('id');
        let data = await this.model('category').where({
            parent_id: id
        }).select();
        if (data.length > 0) {
            return this.fail();
        } else {
            await this.model('category').where({
                id: id
            }).limit(1).delete();
            // TODO 删除图片
            return this.success();
        }
    }
    async showStatusAction() {
        const id = this.get('id');
        const status = this.get('status');
        let ele = 0;
        if (status == 'true') {
            ele = 1;
        }
        const model = this.model('category');
        await model.where({
            id: id
        }).update({
            is_show: ele
        });
    }
    async channelStatusAction() {
        const id = this.get('id');
        const status = this.get('status');
        let stat = 0;
        if (status == 'true') {
            stat = 1;
        }
        const model = this.model('category');
        await model.where({
            id: id
        }).update({
            is_channel: stat
        });
    }
    async categoryStatusAction() {
        const id = this.get('id');
        const status = this.get('status');
        let stat = 0;
        if (status == 'true') {
            stat = 1;
        }
        const model = this.model('category');
        await model.where({
            id: id
        }).update({
            is_category: stat
        });
    }
    async deleteBannerImageAction() {
        let id = this.post('id');
        await this.model('category').where({
            id: id
        }).update({
            img_url: ''
        });
        return this.success();
    }
    async deleteIconImageAction() {
        let id = this.post('id');
        await this.model('category').where({
            id: id
        }).update({
            icon_url: ''
        });
        return this.success();
    }
};