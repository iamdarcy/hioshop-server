module.exports = class extends think.Model {
    get tableName() {
        return this.tablePrefix + 'order_express';
    }
    /**
     * 获取最新的订单物流信息
     * @param orderId
     * @returns {Promise.<*>}
     */
    async getLatestOrderExpress(orderId) {
        const returnExpressInfo = {
            shipper_code: '',
            shipper_name: '',
            logistic_code: '',
            is_finish: 0,
            request_time: 0,
            traces: []
        };
        const orderExpress = await this.where({
            order_id: orderId
        }).find(); // 根据orderid得到order_express的info
        if (think.isEmpty(orderExpress)) { // 如果是空的，说明还没发货
            return returnExpressInfo;
        }
        if (think.isEmpty(orderExpress.shipper_code) || think.isEmpty(orderExpress.logistic_code)) {
            return returnExpressInfo; // 如果是空的，说明还没发货
        }
        // 如果不空，则将里面的登录的快递号等信息复制给returnExpressInfo
        returnExpressInfo.shipper_code = orderExpress.shipper_code;
        returnExpressInfo.shipper_name = orderExpress.shipper_name;
        returnExpressInfo.logistic_code = orderExpress.logistic_code;
        returnExpressInfo.is_finish = orderExpress.is_finish;
        returnExpressInfo.request_time = think.datetime(orderExpress.request_time * 1000);
        returnExpressInfo.traces = think.isEmpty(orderExpress.traces) ? [] : JSON.parse(orderExpress.traces);
        // 如果物流配送已完成，直接返回
        if (orderExpress.is_finish) {
            return returnExpressInfo;
        }
        // 查询最新物流信息
        const ExpressSerivce = think.service('express', 'api'); // 引入api
        // 调用api里的queryExpress方法 最重要
        const latestExpressInfo = await ExpressSerivce.queryExpress(orderExpress.shipper_code, orderExpress.logistic_code);
        const nowTime = Number.parseInt(Date.now() / 1000);
        const updateData = {
            request_time: nowTime,
            update_time: nowTime,
            request_count: ['EXP', 'request_count+1']
        };
        if (latestExpressInfo.success) {
            returnExpressInfo.traces = latestExpressInfo.traces;
            returnExpressInfo.is_finish = latestExpressInfo.isFinish;
            // 查询成功则更新订单物流信息
            updateData.traces = JSON.stringify(latestExpressInfo.traces);
            returnExpressInfo.request_time = think.datetime(nowTime * 1000);
            updateData.is_finish = latestExpressInfo.isFinish;
        }
        await this.where({
            id: orderExpress.id
        }).update(updateData);
        return returnExpressInfo;
    }
};