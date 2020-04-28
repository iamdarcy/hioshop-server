const Base = require('./base.js');
const moment = require('moment');
const rp = require('request-promise');
const http = require("http");
module.exports = class extends Base {
    async timetaskAction() {
        console.log("=============开始============");
        let currentTime = parseInt(new Date().getTime() / 1000);
        let newday = new Date(new Date().setHours(3, 0, 0, 0)) / 1000;
        let newday_over = new Date(new Date().setHours(3, 0, 59, 0)) / 1000;
        if (currentTime > newday && currentTime < newday_over) {
        }
        // 将公告下掉
        let notice = await this.model('notice').where({
            is_delete: 0
        }).select();
        if (notice.length > 0) {
            for (const noticeItem of notice) {
                let notice_exptime = noticeItem.end_time;
                if (currentTime > notice_exptime) {
                    await this.model('notice').where({
                        id: noticeItem.id
                    }).update({
                        is_delete: 1
                    });
                }
            }
        }
        const expiretime = parseInt(new Date().getTime() / 1000) - 24 * 60 * 60;
        let orderList = await this.model('order').where({
            order_status: ['IN', '101,801'],
            add_time: ['<', expiretime],
            is_delete: 0,
        }).select();
        if (orderList.length != 0) {
            // await this.model('order').where({id: ['IN', orderList.map((ele) => ele.id)]}).update({order_status: 102});
            for (const item of orderList) {

                let orderId = item.id;
                await this.model('order').where({
                    id: orderId
                }).update({
                    order_status: 102
                });
            }
        }
        // 定时将到期的广告停掉
        let ad_info = await this.model('ad').where({
            end_time: ['<', currentTime],
            enabled: 1
        }).select();
        if (ad_info.length != 0) {
            await this.model('ad').where({
                id: ['IN', ad_info.map((ele) => ele.id)]
            }).update({
                enabled: 0
            });
        }
        //定时将长时间没收货的订单确认收货
        const noConfirmTime = parseInt(new Date().getTime() / 1000) - 5 * 24 * 60 * 60;
        // 5天没确认收货就自动确认
        let noConfirmList = await this.model('order').where({
            order_status: 301,
            shipping_time: {
                '<=': noConfirmTime,
                '<>': 0
            },
            is_delete: 0,
        }).select();
        if (noConfirmList.length != 0) {
            for (const citem of noConfirmList) {
                let orderId = citem.id;
                await this.model('order').where({
                    id: orderId
                }).update({
                    order_status: 401,
                    confirm_time: currentTime
                });
            }
        }
    }
    async resetSqlAction() {
        let time = parseInt(new Date().getTime() / 1000 + 300);
        let info = await this.model('settings').where({id:1}).find();
        if(info.reset == 0){
            await this.model('settings').where({id:1}).update({countdown:time,reset:1});
            console.log('重置了！');
        }
        console.log('还没到呢！');
    }
};