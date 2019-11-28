// default config
module.exports = {
    default_module: 'api',
    weixin: {
        appid: 'wx7af111110000000', // 小程序 appid
        secret: 'cb8e5adce569f9bddce5b8e1115aaddce505', // 小程序密钥
        mch_id: '15988888888', // 商户帐号ID
        partner_key: 'asdasdasdasdasdasdasd', // 微信支付密钥
        notify_url: 'https://www.您的域名.com/api/pay/notify' // 微信异步通知
    },
    express: {
        // 快递物流信息查询使用的是快递鸟接口，申请地址：http://www.kdniao.com/
        appid: '12312312', // 对应快递鸟用户后台 用户ID
        appkey: '123123123123123123123123', // 对应快递鸟用户后台 API key
        request_url: 'http://api.kdniao.com/Ebusiness/EbusinessOrderHandle.aspx'
    },
   mianexpress:{
        appid: '123123', // 对应快递鸟用户后台 用户ID
        appkey: '71012-4e66-94cb5297309a', // 对应快递鸟用户后台 API key
        request_url: 'http://testapi.kdniao.com:8081/api/EOrderService',
        print_url: 'http://sandboxapi.kdniao.com:8080/kdniaosandbox/gateway/exterfaceInvoke.json',
        ip_server_url:'http://www.kdniao.com/External/GetIp.aspx'
    },
    qiniu: {
        access_key: 'asdlakjsdlajlajsdlas',      //在七牛密钥管理中获取
        secret_key: 'alskdjalksjdlasjdlajsd',    //在七牛密钥管理中获取
        bucket: 'bucketname',                    // bucket的名称
        domain: 'http://pic.meiweiyuxian.com/'   // domain域名
    },
    aliexpress:{
        url:'http://wuliu.market.alicloudapi.com/kdi', //阿里云的短信api，收费的
        appcode: 'asldjalsjdlasjdla'
    }
};
