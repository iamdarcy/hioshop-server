const Base = require('./base.js');
// const view = require('think-view');
const moment = require('moment');
const Jushuitan = require('jushuitan');
const rp = require('request-promise');
const http = require("http");
module.exports = class extends Base {
    async indexAction() {
        //auto render template file index_index.html
        // return this.display();
    }
    async appInfoAction() {
        // async indexAction() {
        let currentTime = parseInt(new Date().getTime() / 1000);
        const banner = await this.model('ad').where({
            enabled: 1,
            is_delete: 0
        }).order('sort_order asc').select();
        const notice = await this.model('notice').where({
            is_delete: 0
        }).select();
        const channel = await this.model('category').where({
            is_channel: 1,
            parent_id: 0,
        }).order({
            sort_order: 'asc'
        }).select();
        const categoryList = await this.model('category').where({
            parent_id: 0,
            is_show: 1
        }).order({
            sort_order: 'asc'
        }).select();
        const newCategoryList = [];
        for (const categoryItem of categoryList) {
            const categoryGoods = await this.model('goods').where({
                category_id: categoryItem.id,
                goods_number: ['>=', 0],
                is_on_sale: 1,
                is_index: 1,
                is_delete: 0
            }).order({
                sort_order: 'asc'
            }).select();
            newCategoryList.push({
                id: categoryItem.id,
                name: categoryItem.name,
                goodsList: categoryGoods,
                banner: categoryItem.img_url,
                height: categoryItem.p_height
            });
        }
        return this.success({
            channel: channel,
            banner: banner,
            notice: notice,
            categoryList: newCategoryList,
        });
    }
};