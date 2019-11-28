const Base = require('./base.js');
module.exports = class extends Base {
    /**
     * index action
     * @return {Promise} []
     */
    async indexAction() {
        // const product = await this.model('product').where({is_delete:1}).delete()
        const product = await this.model('product').field(['c.goods_sn', 'c.goods_id', 'c.goods_specification_ids', 'c.retail_price', 'g.value']).alias('c').join({
            table: 'goods_specification',
            join: 'left',
            as: 'g',
            on: ['c.goods_specification_ids', 'g.id']
        }).select(); // 如果出错了，不会更新数据的
        console.log(product);
        // const goods = await this.model('goods').where({is_delete:0}).select();
        const goods = await this.model('goods').where({
            is_delete: 0
        }).select();
        for (const item of product) {
            let goods_id = item.goods_id;
            for (const jtem of goods) {
                if (goods_id == jtem.id) {
                    // const product = await this.model('product').where({goods_id:jtem.id}).update({is_delete:0})
                    item.name = jtem.name + '-' + item.value;
                    item.is_on_sale = jtem.is_on_sale;
                    item.list_pic_url = jtem.list_pic_url;
                    if (item.is_on_sale == 1) {
                        item.is_on_sale = true;
                    } else {
                        item.is_on_sale = false;
                    }
                }
            }
        }
        return this.success(product);
    }
    async onsaleAction() {
        const product = await this.model('product').field(['c.goods_sn', 'c.goods_id', 'c.goods_specification_ids', 'c.retail_price', 'g.value']).alias('c').join({
            table: 'goods_specification',
            join: 'left',
            as: 'g',
            on: ['c.goods_specification_ids', 'g.id']
        }).select(); // 如果出错了，不会更新数据的
        const goods = await this.model('goods').where({
            is_on_sale: 1,
            is_delete: 0
        }).select();
        console.log(goods);
        let info = [];
        for (const item of product) {
            let goods_id = item.goods_id;
            for (const jtem of goods) {
                if (goods_id == jtem.id) {
                    item.name = jtem.name + '-' + item.value;
                    item.is_on_sale = jtem.is_on_sale;
                    item.list_pic_url = jtem.list_pic_url;
                    if (item.is_on_sale == 1) {
                        item.is_on_sale = true;
                        info.push(item);
                    }
                }
            }
        }
        console.log(product);
        return this.success(info);
    }
    async outsaleAction() {
        const product = await this.model('product').field(['c.goods_sn', 'c.goods_id', 'c.goods_specification_ids', 'c.retail_price', 'g.value']).alias('c').join({
            table: 'goods_specification',
            join: 'left',
            as: 'g',
            on: ['c.goods_specification_ids', 'g.id']
        }).select(); // 如果出错了，不会更新数据的
        let info = [];
        const goods = await this.model('goods').where({
            is_on_sale: 0,
            is_delete: 0
        }).select();
        console.log(goods);
        for (const item of product) {
            let goods_id = item.goods_id;
            for (const jtem of goods) {
                if (goods_id == jtem.id) {
                    item.name = jtem.name + '-' + item.value;
                    item.is_on_sale = jtem.is_on_sale;
                    item.list_pic_url = jtem.list_pic_url;
                    if (item.is_on_sale == 0) {
                        item.is_on_sale = false;
                        info.push(item);
                    }
                }
            }
        }
        console.log(product);
        return this.success(info);
    }
    async updatePriceAction() {
        const sn = this.post('sn');
        const id = this.post('id');
        const price = this.post('price');
        const info = await this.model('product').where({
            goods_sn: sn
        }).update({
            retail_price: price
        });
        let min = await this.model('product').where({
            goods_id: id
        }).min('retail_price');
        await this.model('cart').where({
            goods_sn: sn
        }).update({
            retail_price: price
        });
        await this.model('goods').where({
            id: id
        }).update({
            retail_price: min
        });
        return this.success();
    }
    async outAction() {
        const page = this.get('page') || 1;
        const size = this.get('size') || 10;
        const model = this.model('goods');
        const data = await model.where({
            is_delete: 0,
            goods_number: ['<=', 0]
        }).order(['id DESC']).page(page, size).countSelect();
        for (const item of data.data) {
            const info = await this.model('category').where({
                id: item.category_id
            }).find();
            item.category_name = info.name;
            if (info.parent_id != 0) {
                const parentInfo = await this.model('category').where({
                    id: info.parent_id
                }).find();
                item.category_p_name = parentInfo.name;
            }
            if (item.is_on_sale == 1) {
                item.is_on_sale = true;
            } else {
                item.is_on_sale = false;
            }
        }
        return this.success(data);
    }
    async dropAction() {
        const page = this.get('page') || 1;
        const size = this.get('size') || 10;
        const model = this.model('goods');
        const data = await model.where({
            is_delete: 0,
            is_on_sale: 0
        }).order(['id DESC']).page(page, size).countSelect();
        for (const item of data.data) {
            const info = await this.model('category').where({
                id: item.category_id
            }).find();
            item.category_name = info.name;
            if (info.parent_id != 0) {
                const parentInfo = await this.model('category').where({
                    id: info.parent_id
                }).find();
                item.category_p_name = parentInfo.name;
            }
            if (item.is_on_sale == 1) {
                item.is_on_sale = true;
            } else {
                item.is_on_sale = false;
            }
        }
        return this.success(data);
    }
    async sortAction() {
        const page = this.get('page') || 1;
        const size = this.get('size') || 10;
        const model = this.model('goods');
        const index = this.get('index');
        if (index == 1) {
            const data = await model.where({
                is_delete: 0
            }).order(['sell_volume DESC']).page(page, size).countSelect();
            for (const item of data.data) {
                const info = await this.model('category').where({
                    id: item.category_id
                }).find();
                item.category_name = info.name;
                if (info.parent_id != 0) {
                    const parentInfo = await this.model('category').where({
                        id: info.parent_id
                    }).find();
                    item.category_p_name = parentInfo.name;
                }
                if (item.is_on_sale == 1) {
                    item.is_on_sale = true;
                } else {
                    item.is_on_sale = false;
                }
            }
            return this.success(data);
        } else if (index == 2) {
            const data = await model.where({
                is_delete: 0
            }).order(['retail_price DESC']).page(page, size).countSelect();
            for (const item of data.data) {
                const info = await this.model('category').where({
                    id: item.category_id
                }).find();
                item.category_name = info.name;
                if (info.parent_id != 0) {
                    const parentInfo = await this.model('category').where({
                        id: info.parent_id
                    }).find();
                    item.category_p_name = parentInfo.name;
                }
                if (item.is_on_sale == 1) {
                    item.is_on_sale = true;
                } else {
                    item.is_on_sale = false;
                }
            }
            return this.success(data);
        } else if (index == 3) {
            const data = await model.where({
                is_delete: 0
            }).order(['goods_number DESC']).page(page, size).countSelect();
            for (const item of data.data) {
                const info = await this.model('category').where({
                    id: item.category_id
                }).find();
                item.category_name = info.name;
                if (info.parent_id != 0) {
                    const parentInfo = await this.model('category').where({
                        id: info.parent_id
                    }).find();
                    item.category_p_name = parentInfo.name;
                }
                if (item.is_on_sale == 1) {
                    item.is_on_sale = true;
                } else {
                    item.is_on_sale = false;
                }
            }
            return this.success(data);
        }
    }
    async saleStatusAction() {
        const id = this.get('id');
        const status = this.get('status');
        let sale = 0;
        if (status == 'true') {
            sale = 1;
        }
        const model = this.model('goods');
        await model.where({
            id: id
        }).update({
            is_on_sale: sale
        });
    }
    async infoAction() {
        const id = this.get('id');
        const model = this.model('goods');
        const data = await model.where({
            id: id
        }).find();
        console.log(data);
        let category_id = data.category_id;
        let cateData = [];
        const c_data = await this.model('category').where({
            id: category_id
        }).find();
        const f_data = await this.model('category').where({
            id: c_data.parent_id
        }).find();
        cateData.push(f_data.id, c_data.id);
        let productInfo = await this.model('product').where({
            goods_id: id
        }).select();
        if (productInfo.length > 1) {}
        let infoData = {
            info: data,
            cateData: cateData,
        };
        return this.success(infoData);
    }
    async getAllCategory1Action() { // 我写的算法
        const model = this.model('category');
        const data = await model.where({
            is_show: 1,
            level: 'L1'
        }).select();
        const c_data = await model.where({
            is_show: 1,
            level: 'L2'
        }).select();
        let newData = [];
        for (const item of data) {
            let children = [];
            for (const citem of c_data) {
                if (citem.parent_id == item.id) {
                    children.push({
                        value: citem.id,
                        label: citem.name
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
    async getAllCategoryAction() { // 晓玲的算法，她要
        const model = this.model('category');
        const data = await model.where({
            is_show: 1,
            level: 'L1'
        }).field('id,name').select();
        let newData = [];
        for (const item of data) {
            let children = [];
            const c_data = await model.where({
                is_show: 1,
                level: 'L2',
                parent_id: item.id
            }).field('id,name').select();
            for (const c_item of c_data) {
                children.push({
                    value: c_item.id,
                    label: c_item.name
                })
            }
            newData.push({
                value: item.id,
                label: item.name,
                children: children
            });
        }
        return this.success(newData);
    }
    async getGoodsSnNameAction() {
        const cateId = this.get('cateId');
        const model = this.model('goods');
        const data = await model.where({
            category_id: cateId,
            is_delete: 0
        }).field('goods_sn,name').order({
            'goods_sn': 'DESC'
        }).select();
        return this.success(data);
    }
    async storeAction() {
        const values = this.post('info');
        const model = this.model('goods');
        let picUrl = values.list_pic_url;
        let goods_id = values.id;
        await this.model('cart').where({
            goods_id: goods_id
        }).update({
            list_pic_url: picUrl
        });
        values.is_new = values.is_new ? 1 : 0;
        let id = values.id;
        if (id > 0) {
            await model.where({
                id: id
            }).update(values);
        } else {
            delete values.id;
            let goods_id = await model.add(values);
            await model.where({
                id: goods_id
            }).update({
                goods_sn: goods_id
            });
        }
        return this.success(values);
    }
   
    async destoryAction() {
        const id = this.post('id');
        await this.model('goods').where({
            id: id
        }).limit(1).delete();
        // TODO 删除图片
        return this.success();
    }
};