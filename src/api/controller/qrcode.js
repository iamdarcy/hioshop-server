const Base = require('./base.js');
const rp = require('request-promise');
const fs = require('fs');
const http = require("https");
const path = require('path');
// const mineType = require('mime-types');
module.exports = class extends Base {
    async getBase64Action() {
        let goodsId = this.post('goodsId');
        let page = "pages/goods/goods";
        let sceneData = goodsId;
        const options = {
            method: 'POST',
            url: 'https://api.weixin.qq.com/cgi-bin/token',
            qs: {
                grant_type: 'client_credential',
                secret: think.config('weixin.secret'),
                appid: think.config('weixin.appid')
            }
        };
        let sessionData = await rp(options);
        sessionData = JSON.parse(sessionData);
        let token = sessionData.access_token;
        let data = {
            "scene": sceneData, //第一个参数是抽奖ID，第二个是userId，第三个是share=1
            "page": page,
            "width": 200
        };
        data = JSON.stringify(data);
        var options2 = {
            method: "POST",
            host: "api.weixin.qq.com",
            path: "/wxa/getwxacodeunlimit?access_token=" + token,
            headers: {
                "Content-Type": "application/json",
                "Content-Length": data.length
            }
        };
        const uploadFunc = async () => {
            return new Promise((resolve, reject) => {
                try {
                    var req = http.request(options2, function(res) {
                        res.setEncoding("base64");
                        var imgData = "";
                        res.on('data', function(chunk) {
                            imgData += chunk;
                        });
                        res.on("end", function() {
                            return resolve(imgData);
                        });
                    });
                    req.write(data);
                    req.end();
                } catch (e) {
                    return resolve(null);
                }
            })
        };
        const url = await uploadFunc();
        return this.success(url);
    }
}