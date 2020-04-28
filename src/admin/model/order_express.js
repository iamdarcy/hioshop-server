const moment = require('moment');
const _ = require('lodash');
const rp = require('request-promise');
const fs = require('fs');
const http = require("http");
const path = require('path');

module.exports = class extends think.Model {
    get tableName() {
        return this.tablePrefix + 'order_express';
    }
    /**
     * 获取最新的订单物流信息  快递鸟，不能查顺丰
     * @param orderId
     * @returns {Promise.<*>}
     */
    async getLatestOrderExpress(orderId) { // 这个是快递鸟的接口，查不了顺丰。顺丰用阿里云的付费接口，在order.js中已经写好
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
        }).find();
        if (think.isEmpty(orderExpress)) {
            return returnExpressInfo;
        }
        if (think.isEmpty(orderExpress.shipper_code) || think.isEmpty(orderExpress.logistic_code)) {
            return returnExpressInfo;
        }
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
        const ExpressSerivce = think.service('express', 'api');
        const latestExpressInfo = await ExpressSerivce.queryExpress(orderExpress.shipper_code, orderExpress.logistic_code);
        const nowTime = parseInt(new Date().getTime() / 1000);
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
    /**
     * 获取最新的订单物流信息  阿里云快递api 收费
     * @param orderId
     * @returns {Promise.<*>}
     */
    async getLatestOrderExpressByAli(orderId) {
        // let aliexpress = think.config('aliexpress');
        const currentTime = parseInt(new Date().getTime() / 1000);
        console.log('==============orderExpress===============');
        let info = await this.model('order_express').where({
            order_id: orderId
        }).find();
        if (think.isEmpty(info)) {
            return this.fail(400, '暂无物流信息');
        }
        const expressInfo = await this.model('order_express').where({
            order_id: orderId
        }).find();
        // 如果is_finish == 1；或者 updateTime 小于 10分钟，
        let updateTime = info.update_time;
        let com = (currentTime - updateTime) / 60;
        let is_finish = info.is_finish;
        if (is_finish == 1) {
            console.log('--1');
            return expressInfo;
        } else if (updateTime != 0 && com < 20) {
            console.log('--2');
            return expressInfo;
        } else {
            console.log('--3');
            let shipperCode = expressInfo.shipper_code;
            console.log(expressInfo);
            let expressNo = expressInfo.logistic_code;
            let code = shipperCode.substring(0, 2);
            let shipperName = '';
			let sfLastNo = think.config('aliexpress.sfLastNo');
            if (code == "SF") {
                shipperName = "SFEXPRESS";
                expressNo = expressNo + ':'+sfLastNo; // 这个要根据自己的寄件时的手机末四位
            } else {
                shipperName = shipperCode;
            }
            let lastExpressInfo = await this.getExpressInfo(shipperName, expressNo);
            console.log(lastExpressInfo);
            let deliverystatus = lastExpressInfo.deliverystatus;
            let newUpdateTime = lastExpressInfo.updateTime;
            newUpdateTime = parseInt(new Date(newUpdateTime).getTime() / 1000);
            deliverystatus = await this.getDeliverystatus(deliverystatus);
            console.log(deliverystatus);
            let issign = lastExpressInfo.issign;
            let traces = lastExpressInfo.list;
            traces = JSON.stringify(traces);
            console.log(traces);
            let dataInfo = {
                express_status: deliverystatus,
                is_finish: issign,
                traces: traces,
                update_time: newUpdateTime
            }
            console.log('出发1222222221');
            await this.model('order_express').where({
                order_id: orderId
            }).update(dataInfo);
            let express = await this.model('order_express').where({
                order_id: orderId
            }).find();
            return express;
        }
        // return this.success(latestExpressInfo);
    }
    async getExpressInfo(shipperName, expressNo) {
        console.log('出发1111111');
		let appCode = "APPCODE "+ think.config('aliexpress.appcode');
        const options = {
            method: 'GET',
            url: 'http://wuliu.market.alicloudapi.com/kdi?no=' + expressNo + '&type=' + shipperName,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": appCode
            }
        };
        let sessionData = await rp(options);
        sessionData = JSON.parse(sessionData);
        return sessionData.result;
    }
    async getDeliverystatus(status) {
        if (status == 0) {
            return '快递收件(揽件)';
        } else if (status == 1) {
            return '在途中';
        } else if (status == 2) {
            return '正在派件';
        } else if (status == 3) {
            return '已签收';
        } else if (status == 4) {
            return '派送失败(无法联系到收件人或客户要求择日派送，地址不详或手机号不清)';
        } else if (status == 5) {
            return '疑难件(收件人拒绝签收，地址有误或不能送达派送区域，收费等原因无法正常派送)';
        } else if (status == 6) {
            return '退件签收';
        }
    }
    async getMianExpress(orderId, senderInfo, receiverInfo, expressType) {
        // 开始了
        let ShipperCode = '';
        let ExpType = 1;
        let CustomerName = ''; // 圆通需要
        let MonthCode = ''; // 圆通需要浙江省舟山市普陀区沈家门分部
        let GoodsName = '';
        // 测试开关 start
        let testSwitch = 1; // 正式的时候，将这个设置为0
        if (testSwitch == 1) {
            if (expressType < 4) {
                MonthCode = ''
            } else {
                CustomerName = 'testyto';
                MonthCode = 'testytomonthcode';
            }
        } else {
            if (expressType < 4) {
                if (expressType == 1 || expressType == 2) {
                    let info = await this.model('shipper').where({
                        name: '顺丰速运'
                    }).find();
                    MonthCode = info.MonthCode;
                } else if (expressType == 3) {
                    let info = await this.model('shipper').where({
                        name: '顺丰特惠'
                    }).find();
                    MonthCode = info.MonthCode;
                }
            } else {
                let info = await this.model('shipper').where({
                    code: 'YTO'
                }).find();
                CustomerName = info.CustomerName;
                MonthCode = info.MonthCode;
            }
        }
        // 测试开关 end
        // 根据expressType 设置不同都属性
        let returnExpressInfo = {};
        if (expressType == 1) { // 顺丰保价：海鲜、梭子蟹
            ShipperCode = 'SF';
            GoodsName = '海鲜';
        } else if (expressType == 2) { // 顺丰不保价：外省腌制品等
            ShipperCode = 'SF';
            GoodsName = '海产品';
        } else if (expressType == 3) { // 顺丰特惠，江浙沪皖干货
            ExpType = 2;
            ShipperCode = 'SF';
            GoodsName = '海干货';
        } else if (expressType == 4) { // 圆通
            ShipperCode = 'YTO';
            GoodsName = '海产品';
        }
        returnExpressInfo = {
            MemberID: '', //ERP系统、电商平台等系统或平台类型用户的会员ID或店铺账号等唯一性标识，用于区分其用户
            // 电子面单客户号，需要下载《快递鸟电子面单客户号参数对照表.xlsx》，参考对应字段传值
            CustomerPwd: '',
            SendSite: '',
            SendStaff: '',
            // 圆通要传这个两个值
            CustomerName: CustomerName,
            MonthCode: MonthCode,
            CustomArea: '', //商家自定义区域
            WareHouseID: '', //发货仓编码
            TransType: 1, // 1陆运，2空运，默认不填为1
            ShipperCode: ShipperCode, // 必填项!!!-------------
            LogisticCode: '', //快递单号(仅宅急送可用)
            ThrOrderCode: '', //第三方订单号 (ShipperCode为JD且ExpType为1时必填)
            OrderCode: '', //订单编号(自定义，不可重复)  必填项!!!----------
            PayType: 3, // 邮费支付方式:1-现付，2-到付，3-月结，4-第三方支付(仅SF支持)  必填项!!!----------
            ExpType: ExpType, // 快递类型：1-标准快件 2-特惠，干货用这个 ,详细快递类型参考《快递公司快递业务类型.xlsx》 必填项!!!----------
            IsReturnSignBill: '', //是否要求签回单 1-  要求 0-不要求
            OperateRequire: '', // 签回单操作要求(如：签名、盖章、身份证复印件等)
            Cost: 0, // 快递运费
            OtherCost: 0, // 其他费用
            Receiver: {
                Company: '', //收件人公司
                Name: '', //收件人 必填项!!!-------------
                Tel: '', // 电话与手机，必填一个
                Mobile: '', //电话与手机，必填一个
                PostCode: '', // 收件人邮编
                ProvinceName: '', //收件省 必填项!!!-------------(如广东省，不要缺少“省”；如是直辖市，请直接传北京、上海等； 如是自治区，请直接传广西壮族自治区等)
                CityName: '', //收件市 必填项!!!------------- (如深圳市，不要缺少“市”； 如果是市辖区，请直接传北京市、上海市等)
                ExpAreaName: '', //收件区/县 必填项!!!-------------(如福田区，不要缺少“区”或“县”)
                Address: '' // 收件人详细地址 必填项!!!-------------
            },
            Sender: {
                Company: '', // 发件人公司
                Name: '', //发件人 必填项!!!-------------
                Tel: '', //电话与手机，必填一个 必填项!!!-------------
                Mobile: '', //电话与手机，必填一个 必填项!!!-------------
                PostCode: '', //发件地邮编(ShipperCode为EMS、YZPY、YZBK时必填)
                ProvinceName: '', //发件省 必填项!!!-------------
                CityName: '', //发件市 必填项!!!-------------
                ExpAreaName: '', //发件区/县 必填项!!!------------
                Address: '' /// 发件人详细地址 必填项!!!------
            },
            IsNotice: 1, //是否通知快递员上门揽件 0-   通知 1-   不通知 不填则默认为1
            Quantity: 1, //必填项!!!------包裹数(最多支持30件) 一个包裹对应一个运单号，如果是大于1个包裹，返回则按照子母件的方式返回母运单号和子运单号
            Remark: '', //备注
            Commodity: [{
                GoodsName: GoodsName, // 商品名称 必填项!!!------
                GoodsCode: '', //商品编码
                Goodsquantity: 0, //商品数量
                GoodsPrice: 0, //商品价格
                GoodsWeight: 0, //商品重量kg
                GoodsDesc: '', //商品描述
                GoodsVol: 0 //商品体积m3
            }],
            IsReturnPrintTemplate: 0, //返回电子面单模板：0-不需要；1-需要 todo
            IsSendMessage: 0, //是否订阅短信：0-不需要；1-需要
            TemplateSize: '', //模板规格(默认的模板无需传值，非默认模板传对应模板尺寸)
            PackingType: 0, //包装类型(快运字段)默认为0； 0-    纸 1-    纤 2-    木 3-    托膜 4-   木托 99-其他
            DeliveryMethod: 2 //送货方式(快运字段)默认为0； 0-  自提 1-   送货上门（不含上楼） 2-   送货上楼
        };
        const orderExpress = await this.model('order').where({
            id: orderId
        }).find();
        if (think.isEmpty(orderExpress)) {
            let error = 400;
            return error;
        }
        returnExpressInfo.Remark = orderExpress.remark;
        let expressValue = '0';
        if (expressType == 1) { // 顺丰保价：海鲜、梭子蟹
            expressValue = orderExpress.express_value;
            returnExpressInfo.AddService = [{
                "Name": "INSURE", //保价
                "Value": expressValue,
                "CustomerID": '0'
            }, ]
        }
        // 这里就是重新生成订单号，然后记得存入order表中去 todo,这里有点问题，不应该去直接生成新的订单号，而应该让打单员选择
        returnExpressInfo.OrderCode = orderExpress.order_sn;
        // 这里就是重新生成订单号，然后记得存入order表中去 todo,这里有点问题，不应该去直接生成新的订单号，而应该让打单员选择
        returnExpressInfo.Receiver = receiverInfo;
        returnExpressInfo.Sender = senderInfo;
        const ExpressSerivce = think.service('express', 'api');
        const latestExpressInfo = await ExpressSerivce.mianExpress(returnExpressInfo);
        // 将保价金额和时间回传。
        const currentTime = parseInt(new Date().getTime() / 1000);
        latestExpressInfo.send_time = moment.unix(currentTime).format('YYYY-MM-DD');
        latestExpressInfo.expressValue = expressValue;
        latestExpressInfo.remark = orderExpress.remark;
        latestExpressInfo.expressType = expressType;
        latestExpressInfo.MonthCode = MonthCode;
        return latestExpressInfo;
    }
    async printExpress() {
        const ExpressSerivce = think.service('express', 'api');
        const latestExpressInfo = await ExpressSerivce.buildForm();
        return latestExpressInfo;
    }
};