const Base = require('./base.js');
const moment = require('moment');

module.exports = class extends Base {
    async indexAction() {
        const goodsOnsale = await this.model('goods').where({is_on_sale: 1,is_delete:0}).count();
        const orderToDelivery = await this.model('order').where({order_status: 300}).count();
        const user = await this.model('user').count();
        let data = await this.model('settings').field('countdown').find();
        let timestamp = data.countdown;
        let info = {
            user: user,
            goodsOnsale: goodsOnsale,
            timestamp:timestamp,
            orderToDelivery: orderToDelivery,
        }
        return this.success(info);
    }
    async getQiniuTokenAction(){
        const TokenSerivce = this.service('qiniu'); // 服务里返回token
        let data = await TokenSerivce.getQiniuToken(); // 取得token值 goods
        let qiniuToken = data.uploadToken;
        let domain = data.domain;
        let info ={
            token:qiniuToken,
            url:domain
        };
        return this.success(info);
    }
    async mainAction() {
        const index = this.get('pindex');
        console.log('index:' + index);
        let todayTimeStamp = new Date(new Date().setHours(0, 0, 0, 0)) / 1000; //今天零点的时间戳
        let yesTimeStamp = todayTimeStamp - 86400; //昨天零点的时间戳
        let sevenTimeStamp = todayTimeStamp - 86400 * 7; //7天前零点的时间戳
        let thirtyTimeStamp = todayTimeStamp - 86400 * 30; //30天前零点的时间戳
        let newUser = 1;
        let oldUser = 0;
        let addCart = 0;
        let addOrderNum = 0;
        let addOrderSum = 0;
        let payOrderNum = 0;
        let payOrderSum = 0;
        let newData = [];
        let oldData = [];
        if (index == 0) {
            newData = await this.model('user').where({
                id: ['>', 0],
                register_time: ['>', todayTimeStamp]
            }).select();
            newUser = newData.length;
            for(const item of newData){
                item.nickname = Buffer.from(item.nickname, 'base64').toString();
            }
            oldData = await this.model('user').where({
                id: ['>', 0],
                register_time: ['<', todayTimeStamp],
                last_login_time: ['>', todayTimeStamp]
            }).select();
            for(const item of oldData){
                item.nickname = Buffer.from(item.nickname, 'base64').toString();
            }
            oldUser = oldData.length;
            addCart = await this.model('cart').where({is_delete: 0, add_time: ['>', todayTimeStamp]}).count();
            addOrderNum = await this.model('order').where({
                is_delete: 0,
                add_time: ['>', todayTimeStamp]
            }).count();
            addOrderSum = await this.model('order').where({
                is_delete: 0,
                add_time: ['>', todayTimeStamp]
            }).sum('actual_price');
            payOrderNum = await this.model('order').where({
                is_delete: 0,
                add_time: ['>', todayTimeStamp],
                order_status: ['IN', [201, 802, 300, 301]]
            }).count();
            payOrderSum = await this.model('order').where({
                is_delete: 0,
                add_time: ['>', todayTimeStamp],
                order_status: ['IN', [201, 802, 300, 301]]
            }).sum('actual_price');
        }
        else if (index == 1) {
            newData = await this.model('user').where({
                id: ['>', 0],
                register_time: ['BETWEEN', yesTimeStamp, todayTimeStamp]
            }).select();
            for(const item of newData){
                item.nickname = Buffer.from(item.nickname, 'base64').toString();
            }
            newUser = newData.length;
            oldData = await this.model('user').where({
                id: ['>', 0],
                register_time: ['<', yesTimeStamp],
                last_login_time: ['BETWEEN', yesTimeStamp, todayTimeStamp]
            }).select();
            for(const item of oldData){
                item.nickname = Buffer.from(item.nickname, 'base64').toString();
            }
            oldUser = oldData.length;
            addCart = await this.model('cart').where({
                is_delete: 0,
                add_time: ['BETWEEN', yesTimeStamp, todayTimeStamp]
            }).count();
            addOrderNum = await this.model('order').where({
                is_delete: 0,
                add_time: ['BETWEEN', yesTimeStamp, todayTimeStamp]
            }).count();
            addOrderSum = await this.model('order').where({
                is_delete: 0,
                add_time: ['BETWEEN', yesTimeStamp, todayTimeStamp]
            }).sum('actual_price');
            payOrderNum = await this.model('order').where({
                is_delete: 0,
                add_time: ['BETWEEN', yesTimeStamp, todayTimeStamp],
                order_status: ['IN', [201, 802, 300, 301]]
            }).count();
            console.log('------------321----------');
            console.log(payOrderNum);
            console.log('-----------3321-----------');
            payOrderSum = await this.model('order').where({
                is_delete: 0,
                add_time: ['BETWEEN', yesTimeStamp, todayTimeStamp],
                order_status: ['IN', [201, 802, 300, 301]]
            }).sum('actual_price');
            console.log('-----------123-----------');
            console.log(payOrderSum);
            console.log('-----------123-----------');

        }
        else if (index == 2) {
            newData = await this.model('user').where({
                id: ['>', 0],
                register_time: ['>', sevenTimeStamp]
            }).select();
            for(const item of newData){
                item.nickname = Buffer.from(item.nickname, 'base64').toString();
            }
            newUser = newData.length;
            oldData = await this.model('user').where({
                id: ['>', 0],
                register_time: ['<', sevenTimeStamp],
                last_login_time: ['>', sevenTimeStamp]
            }).select();
            for(const item of oldData){
                item.nickname = Buffer.from(item.nickname, 'base64').toString();
            }
            oldUser = oldData.length;
            addCart = await this.model('cart').where({
                is_delete: 0,
                add_time: ['>', sevenTimeStamp]
            }).count();
            addOrderNum = await this.model('order').where({
                is_delete: 0,
                add_time: ['>', sevenTimeStamp]
            }).count();
            addOrderSum = await this.model('order').where({
                is_delete: 0,
                add_time: ['>', sevenTimeStamp]
            }).sum('actual_price');
            payOrderNum = await this.model('order').where({
                is_delete: 0,
                add_time: ['>', sevenTimeStamp],
                order_status: ['IN', [201, 802, 300, 301]]
            }).count();
            payOrderSum = await this.model('order').where({
                is_delete: 0,
                add_time: ['>', sevenTimeStamp],
                order_status: ['IN', [201, 802, 300, 301]]
            }).sum('actual_price');
        }
        else if (index == 3) {
            newData = await this.model('user').where({
                id: ['>', 0],
                register_time: ['>', thirtyTimeStamp]
            }).select();
            for(const item of newData){
                item.nickname = Buffer.from(item.nickname, 'base64').toString();
            }
            newUser = newData.length;
            oldData = await this.model('user').where({
                id: ['>', 0],
                register_time: ['<', thirtyTimeStamp],
                last_login_time: ['>', thirtyTimeStamp]
            }).select();
            for(const item of oldData){
                item.nickname = Buffer.from(item.nickname, 'base64').toString();
            }
            oldUser = oldData.length;
            addCart = await this.model('cart').where({
                is_delete: 0,
                add_time: ['>', thirtyTimeStamp]
            }).count();
            addOrderNum = await this.model('order').where({
                is_delete: 0,
                add_time: ['>', thirtyTimeStamp]
            }).count();
            addOrderSum = await this.model('order').where({
                is_delete: 0,
                add_time: ['>', thirtyTimeStamp]
            }).sum('actual_price');
            payOrderNum = await this.model('order').where({
                is_delete: 0,
                add_time: ['>', thirtyTimeStamp],
                order_status: ['IN', [201, 802, 300, 301]]
            }).count();
            payOrderSum = await this.model('order').where({
                is_delete: 0,
                add_time: ['>', thirtyTimeStamp],
                order_status: ['IN', [201, 802, 300, 301]]
            }).sum('actual_price');
        }
        if (addOrderSum == null) {
            addOrderSum = 0;
        }
        if (payOrderSum == null) {
            payOrderSum = 0;
        }
        if(newData.length > 0){
            for(const item of newData){
                item.register_time =  moment.unix(item.register_time).format('YYYY-MM-DD HH:mm:ss');
                item.last_login_time =  moment.unix(item.last_login_time).format('YYYY-MM-DD HH:mm:ss');
            }
        }

        if(oldData.length > 0){
            for(const item of oldData){
                item.register_time =  moment.unix(item.register_time).format('YYYY-MM-DD HH:mm:ss');
                item.last_login_time =  moment.unix(item.last_login_time).format('YYYY-MM-DD HH:mm:ss');
            }
        }

        let info = {
            newUser: newUser,
            oldUser: oldUser,
            addCart: addCart,
            newData: newData,
            oldData: oldData,
            addOrderNum: addOrderNum,
            addOrderSum: addOrderSum,
            payOrderNum: payOrderNum,
            payOrderSum: payOrderSum
        }
        return this.success(info);
    }


};
