const _ = require('lodash');
module.exports = class extends think.Model {
    /**
     * 生成订单的编号order_sn
     * @returns {string}
     */
    generateOrderNumber() {
        const date = new Date();
        return date.getFullYear() + _.padStart(date.getMonth(), 2, '0') + _.padStart(date.getDay(), 2, '0') + _.padStart(date.getHours(), 2, '0') + _.padStart(date.getMinutes(), 2, '0') + _.padStart(date.getSeconds(), 2, '0') + _.random(100000, 999999);
    }
    /**
     * 获取订单可操作的选项
     * @param orderId
     */
    async getOrderHandleOption(orderId) {
        const handleOption = {
            cancel: false, // 取消操作
            delete: false, // 删除操作
            pay: false, // 支付操作
            delivery: false, // 确认收货操作
            confirm: false, // 完成订单操作
            buy: false // 再次购买
        };
        const orderInfo = await this.where({
            id: orderId
        }).find();
        // 订单流程：下单成功－》支付订单－》发货－》收货－》评论
        // 订单相关状态字段设计，采用单个字段表示全部的订单状态
        // 1xx表示订单取消和删除等状态 0订单创建成功等待付款，101订单已取消，102订单已删除
        // 2xx表示订单支付状态,201订单已付款，等待发货
        // 3xx表示订单物流相关状态,300订单已发货，301用户确认收货
        // 4xx表示订单退换货相关的状态,401没有发货，退款402,已收货，退款退货
        // 如果订单已经取消或是已完成，则可删除和再次购买
        if (orderInfo.order_status === 101) {
            handleOption.delete = true;
            handleOption.buy = true;
        }
        // 如果订单没有被取消，且没有支付，则可支付，可取消
        if (orderInfo.order_status === 0) {
            handleOption.cancel = true;
            handleOption.pay = true;
        }
        // 如果订单已经发货，没有收货，则可收货操作和退款、退货操作
        if (orderInfo.order_status === 300) {
            handleOption.cancel = true;
            handleOption.pay = true;
        }
        // 如果订单已经支付，且已经收货，则可完成交易、评论和再次购买
        if (orderInfo.order_status === 301) {
            handleOption.delete = true;
            handleOption.buy = true;
        }
        return handleOption;
    }
    async getOrderStatusText(orderId) {
        const orderInfo = await this.where({
            id: orderId
        }).find();
        let statusText = '';
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
                statusText = '待备货';
                break;
            case 300:
                statusText = '待发货';
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
        }
        return statusText;
    }
    async getOrderBtnText(orderId) {
        const orderInfo = await this.where({
            id: orderId
        }).find();
        let statusText = '';
        switch (orderInfo.order_status) {
            case 101:
                statusText = '修改价格';
                break;
            case 102:
                statusText = '查看详情';
                break;
            case 103:
                statusText = '查看详情'; //到时间系统自动取消
                break;
            case 201:
                statusText = '备货';
                break;
            case 202:
                statusText = '查看详情';
                break;
            case 203:
                statusText = '查看详情';
                break;
            case 300:
                statusText = '打印快递单';
                break;
            case 301:
                statusText = '查看详情';
                break;
            case 302:
                statusText = '查看详情';
                break;
            case 303:
                statusText = '查看详情'; //到时间，未收货的系统自动收货、
                break;
            case 401:
                statusText = '查看详情'; //到时间，未收货的系统自动收货、
                break;
        }
        if (orderInfo.order_status == 301) {
            statusText = '确认收货'
        }
        return statusText;
    }
};