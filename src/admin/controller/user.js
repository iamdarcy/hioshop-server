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
        let nickname = this.get('nickname') || '';
        const buffer = Buffer.from(nickname);
        nickname = buffer.toString('base64');
        const model = this.model('user');
        const data = await model.where({
            nickname: ['like', `%${nickname}%`],
        }).order(['id DESC']).page(page, size).countSelect();
        for (const item of data.data) {
            item.register_time = moment.unix(item.register_time).format('YYYY-MM-DD HH:mm:ss');
            item.last_login_time = moment.unix(item.last_login_time).format('YYYY-MM-DD HH:mm:ss');
            item.nickname = Buffer.from(item.nickname, 'base64').toString();
        }
        let info = {
            userData: data,
        }
        return this.success(info);
    }
    async infoAction() {
        const id = this.get('id');
        const model = this.model('user');
        let info = await model.where({
            id: id
        }).find();
        info.register_time = moment.unix(info.register_time).format('YYYY-MM-DD HH:mm:ss');
        info.last_login_time = moment.unix(info.last_login_time).format('YYYY-MM-DD HH:mm:ss');
        info.nickname = Buffer.from(info.nickname, 'base64').toString();
        return this.success(info);
    }
    async datainfoAction() {
        const id = this.get('id');
        let info = {};
        info.orderSum = await this.model('order').where({
            user_id: id,
            order_type: ['<', 8],
            is_delete: 0
        }).count();
        info.orderDone = await this.model('order').where({
            user_id: id,
            order_status: ['IN', '302,303,401'],
            order_type: ['<', 8],
            is_delete: 0
        }).count();
        info.orderMoney = await this.model('order').where({
            user_id: id,
            order_status: ['IN', '302,303,401'],
            order_type: ['<', 8],
            is_delete: 0
        }).sum('actual_price');
        info.cartSum = await this.model('cart').where({
            user_id: id,
            is_delete: 0
        }).sum('number');
        return this.success(info);
    }
    async addressAction() {
        const id = this.get('id');
        const page = this.get('page') || 1;
        const size = this.get('size') || 10;
        let addr = await this.model('address').where({
            user_id: id
        }).page(page, size).countSelect();
        for (const item of addr.data) {
            let province_name = await this.model('region').where({
                id: item.province_id
            }).getField('name', true);
            let city_name = await this.model('region').where({
                id: item.city_id
            }).getField('name', true);
            let district_name = await this.model('region').where({
                id: item.district_id
            }).getField('name', true);
            item.full_region = province_name + city_name + district_name + item.address;
        }
        return this.success(addr);
    }
    async saveaddressAction() {
        const id = this.post('id');
        const user_id = this.post('user_id');
        const name = this.post('name');
        const mobile = this.post('mobile');
        const address = this.post('address');
        const addOptions = this.post('addOptions');
        const province = addOptions[0];
        const city = addOptions[1];
        const district = addOptions[2];
        let info = {
            name: name,
            mobile: mobile,
            address: address,
            province_id: province,
            district_id: district,
            city_id: city
        }
        await this.model('address').where({
            user_id: user_id,
            id: id
        }).update(info);
        return this.success();
    }
    async cartdataAction() {
        const id = this.get('id');
        const page = this.get('page') || 1;
        const size = this.get('size') || 10;
        const model = this.model('cart');
        const data = await model.where({
            user_id: id
        }).order(['add_time DESC']).page(page, size).countSelect();
        for (const item of data.data) {
            item.add_time = moment.unix(item.add_time).format('YYYY-MM-DD HH:mm:ss');
        }
        return this.success(data);
    }
    async footAction() {
        const id = this.get('id');
        const page = this.get('page') || 1;
        const size = this.get('size') || 10;
        const model = this.model('footprint');
        const data = await model.alias('f').join({
            table: 'goods',
            join: 'left',
            as: 'g',
            on: ['f.goods_id', 'g.id']
        }).where({
            user_id: id
        }).page(page, size).countSelect();
        console.log(data);
        return this.success(data);
    }
    async orderAction() {
        const page = this.get('page') || 1;
        const size = this.get('size') || 10;
        const user_id = this.get('id');
        const model = this.model('order');
        const data = await model.where({
            user_id: user_id,
            order_type: ['<', 8],
        }).order(['id DESC']).page(page, size).countSelect();
        console.log(data.count);
        for (const item of data.data) {
            item.goodsList = await this.model('order_goods').field('goods_name,list_pic_url,number,goods_specifition_name_value,retail_price').where({
                order_id: item.id,
                is_delete: 0
            }).select();
            item.goodsCount = 0;
            item.goodsList.forEach(v => {
                item.goodsCount += v.number;
            });
            let province_name = await this.model('region').where({
                id: item.province
            }).getField('name', true);
            let city_name = await this.model('region').where({
                id: item.city
            }).getField('name', true);
            let district_name = await this.model('region').where({
                id: item.district
            }).getField('name', true);
            item.full_region = province_name + city_name + district_name;
            item.postscript = Buffer.from(item.postscript, 'base64').toString();
            item.add_time = moment.unix(item.add_time).format('YYYY-MM-DD HH:mm:ss');
            item.order_status_text = await this.model('order').getOrderStatusText(item.id);
            item.button_text = await this.model('order').getOrderBtnText(item.id);
        }
        return this.success(data);
    }
    async getOrderStatusText(orderInfo) {
        let statusText = '待付款';
        switch (orderInfo.order_status) {
            case 101:
                statusText = '待付款';
                break;
            case 102:
                statusText = '交易关闭';
                break;
            case 103:
                statusText = '交易关闭'; //到时间系统自动取消
                break;
            case 201:
                statusText = '待发货';
                break;
            case 202:
                statusText = '退款中';
                break;
            case 203:
                statusText = '已退款';
                break;
            case 300:
                statusText = '已备货';
                break;
            case 301:
                statusText = '已发货';
                break;
            case 302:
                statusText = '待评价';
                break;
            case 303:
                statusText = '待评价'; //到时间，未收货的系统自动收货、
                break;
            case 401:
                statusText = '交易成功'; //到时间，未收货的系统自动收货、
                break;
            case 801:
                statusText = '拼团待付款';
                break;
            case 802:
                statusText = '拼团中'; // 如果sum变为0了。则，变成201待发货
                break;
        }
        return statusText;
    }
    async updateInfoAction() {
        const id = this.post('id');
        let nickname = this.post('nickname');
        const buffer = Buffer.from(nickname);
        nickname = buffer.toString('base64');
        const model = this.model('user');
        const data = await model.where({
            id: id
        }).update({
            nickname: nickname
        });
        return this.success(data);
    }
    async updateNameAction() {
        const id = this.post('id');
        const name = this.post('name');
        const model = this.model('user');
        const data = await model.where({
            id: id
        }).update({
            name: name
        });
        return this.success(data);
    }
    async updateMobileAction() {
        const id = this.post('id');
        const mobile = this.post('mobile');
        const model = this.model('user');
        const data = await model.where({
            id: id
        }).update({
            mobile: mobile
        });
        return this.success(data);
    }
    async storeAction() {
        if (!this.isPost) {
            return false;
        }
        const values = this.post();
        const id = this.post('id');
        const model = this.model('user');
        values.is_show = values.is_show ? 1 : 0;
        values.is_new = values.is_new ? 1 : 0;
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
        await this.model('user').where({
            id: id
        }).limit(1).delete();
        // TODO 删除图片
        return this.success();
    }
};