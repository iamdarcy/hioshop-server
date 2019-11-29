const Base = require('./base.js');
const moment = require('moment');
const _ = require('lodash');
module.exports = class extends Base {
    /**
     *
     * @returns {Promise<void|Promise|PreventPromise>}
     */
    async deleteAction() {
        const footprintId = this.post('footprintId');
        const userId = think.userId;    
        // 删除当天的同一个商品的足迹
        await this.model('footprint').where({
            user_id: userId,
            id: footprintId
        }).delete();
        return this.success('删除成功');
    }
    /**
     * list action
     * @return {Promise} []
     */
    async listAction() {
        const page = this.get('page');
        const size = this.get('size');
        const list = await this.model('footprint').alias('f').join({
            table: 'goods',
            join: 'left',
            as: 'g',
            on: ['f.goods_id', 'g.id']
        }).where({
            user_id: think.userId
        }).page(page, size).order({
            add_time: 'desc'
        }).field('id,goods_id,add_time').countSelect();
        for (const item of list.data) {
            let goods = await this.model('goods').where({
                id:item.goods_id
            }).field('name,goods_brief,retail_price,list_pic_url,goods_number,min_retail_price').find();
            item.add_time = moment.unix(item.add_time).format('YYYY-MM-DD');
            item.goods = goods;
            if (moment().format('YYYY-MM-DD') == item.add_time) {
                item.add_time = '今天';
            }
        }
        return this.success(list);
    }
};