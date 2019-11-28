const Base = require('./base.js');
const rp = require('request-promise');
const fs = require('fs');
const http = require("http");
const path = require('path');
// const mineType = require('mime-types');
module.exports = class extends Base {
    async getGoodsImageAction() {
        let id = this.post('goodsId');
        let goods = await this.model('goods').where({
            id:id,
            is_delete: 0,
        }).find();
        let url = goods.list_pic_url;
        const uploadFunc = async () => {
            return new Promise((resolve, reject) => {
                try {
                     http.get(url, function(res) {
                        var chunks = [];
                        var size = 0;
                        res.on('data', function(chunk) {
                            chunks.push(chunk);
                            size += chunk.length; //累加缓冲数据的长度
                        });
                        res.on('end', function(err) {
                            var data = Buffer.concat(chunks, size);
                            var base64Img = data.toString('base64');
                            // console.log(base64Img);
                            return resolve(base64Img);
                            // console.log(`data:image/png;base64,${base64Img}`);
                        });
                    });
                    // console.log();
                    // req.write(data);
                    // req.end();
                } catch (e) {
                    return resolve(null);
                }
            })
        };
        const img = await uploadFunc();
        return this.success(img);
    }
    async getTokenAction() {
        const options = {
            method: 'POST',
            // url: 'https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=',
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
        return this.success(token);
    }
    async getBase64Action() {
        console.log('=========zheli')
        let lotteryId = this.post('lotteryId');
        let lotteryInfo = await this.model('lottery_list').where({
            id:lotteryId,
        }).find();
        let hasJoin = await this.model('lottery_join').where({
            lottery_id:lotteryId,
            user_id:think.userId,
        }).find();
        let page = '';
        if(lotteryInfo.status == 0 && !think.isEmpty(hasJoin) && lotteryInfo.type == 1){
            page = "pages/ucenter/lottery-help/index";
        }
        else {
            page = "pages/ucenter/lottery-details/index";
        }
        console.log(page);
        let userId = think.userId;
        let sceneData = lotteryId + ','+userId+',1';
        const options = {
            method: 'POST',
            // url: 'https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=',
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
            // "page": "pages/index/index",
            "page": page,
            "width": 200
        };
        data = JSON.stringify(data);
        let qrurl = "./www/code/share" + 36 + ".jpeg"
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
                    console.log('---------base---------');
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
                    // console.log();
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
    async arrayBufferToBase64(buffer) {
        var binary = '';
        var bytes = new Uint16Array(buffer);
        var len = bytes.byteLength;
        for (var i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return binary;
    }
    async getqrcodeAction() {
        let lotteryId = this.post('lotteryId');
        let userId = this.post('userId') || 0;
        let sceneData = lotteryId + ','+userId+',1';
        const options = {
            method: 'POST',
            // url: 'https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=',
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
            // "page": "pages/index/index",
            // "page": "pages/index/index",
            "page": "pages/ucenter/lottery-details/index",
            "width": 430
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
        // const uploadFunc = async () => {
        //     return new Promise((resolve, reject) => {
        //         try {
        //             formUploader.putFile(uploadToken, key, localFile, putExtra,
        //                 (respErr, respBody, respInfo) => {
        //                     if (respInfo.statusCode == 200) {
        //                         return resolve(respBody && respBody.key);
        //                     } else {
        //                         return resolve(0);
        //                     }
        //                 });
        //         } catch (e) {
        //             return resolve(null);
        //         }
        //     })
        // };
        // const url = await uploadFunc();
        var req = http.request(options2, function(res) {
            res.setEncoding("binary");
            var imgData = "";
            res.on('data', function(chunk) {
                imgData += chunk;
            });
            res.on("end", function() {
                fs.writeFile(qrurl, imgData, "binary", function(err) {
                    if (err) {
                        console.log("down fail");
                    }
                    console.log("down success");
                });
            });
        });
        req.write(data);
        req.end();
    }
    // let index = img.lastIndexOf("\/");
    // let filename = img.substring(index + 1, img.length);
    // let localFile = think.ROOT_PATH + '/www/static/deal/' + filename;
    // // let key = 'test.mp4';
    // // 文件上传方法
    // // 配置上传到七牛云的完整路径
    // let key = think.uuid(32);
    // // console.log(key);
    // // return false;
    // let options = {
    //     scope: bucket,
    //     saveKey: key
    // };
    // const putPolicy = new qiniu.rs.PutPolicy(options);
    // // 生成上传凭证
    // const uploadToken = putPolicy.uploadToken(mac);
    // const uploadFunc = async () => {
    //     return new Promise((resolve, reject) => {
    //         try {
    //             formUploader.putFile(
    //                 uploadToken,
    //                 key,
    //                 localFile,
    //                 putExtra,
    //                 (respErr, respBody, respInfo) => {
    //                     if (respInfo.statusCode == 200) {
    //                         return resolve(respBody && respBody.key);
    //                     } else {
    //                         return resolve(0);
    //                     }
    //                 }
    //             );
    //         } catch (e) {
    //             return resolve(null);
    //         }
    //     })
    // };
    // const url = await uploadFunc();
    //     var wx_gettoken_url = 'https://api.weixin.qq.com/cgi-bin/token?grant_type=' + AccessToken.grant_type + '&appid=' + AccessToken.appid + '&secret=' + AccessToken.secret;
    //
    //
    //
    //
    //     var create_time = 0,
    //     now = 0,
    //     token = '';
    //     var createQrcode = {
    //         create: function(config) {
    //             var that = this;
    //             logger.debug('fn：create');
    //             if (this.isInTwoHours()) {
    //                 this.getQrcode(config);
    //             } else {
    //                 getWxToken().then(res => {
    //                     if (res.isSuccess) {
    //                         that.getQrcode(config);
    //                     } else {
    //                         logger.debug('获取token出错');
    //                     }
    //                 })
    //             }
    //         },
    //         //判断是否超过两个小时，将token存储起来，减少token请求。
    //         isInTwoHours: function() {
    //             logger.debug('fn:isTwoHours');
    //             now = new Date().getTime();
    //             var diffHours = (now - create_time) / (60 * 1000);
    //             logger.debug('diffHours：' + diffHours);
    //             if (diffHours < 2) {
    //                 return true;
    //             } else {
    //                 return false;
    //             }
    //         },
    //         //生成二维码
    //         getQrcode: function(config) {
    //             logger.debug('长度是：' + config.arr.length);
    //             for (let i = 0; i < config.arr.length; i++) {
    //                 logger.debug('执行了' + (i + 1) + '次');
    //                 logger.debug('fn：getQrcode');
    //                 //setTimeout用来做延迟请求，一次性发几十个请求，微信服务器会返回繁忙
    //                 //其实可以用队列来处理，但是我不知道怎么弄，就只能用这种低端的处理方法了，看看队列再来改造一下吧。
    //                 setTimeout(function() {
    //                     new Promise(function(resolve, reject) {
    //                         resolve(
    //                             request({
    //                                 method: 'POST',
    //                                 url: 'https://api.weixin.qq.com/cgi-bin/wxaapp/createwxaqrcode?access_token=' + token.access_token,
    //                                 body: JSON.stringify({
    //                                     path: config.arr[i].path,
    //                                     width: config.width
    //                                 })
    //                             }))
    //                     }).then(data => {
    //                         //将微信返回的东西装到文件中。
    //                         data.pipe(fs.createWriteStream('./public/images/' + config.arr[i].name + '.png'));
    //                     })
    //                 }, 100 * i);
    //             }
    //         }
    //     }
    //
    //     var req = require(isHttp ? 'http' : 'https').request(options, function (res) {
    //         var _data = '';
    //         res.on('data', function (chunk) {
    //             _data += chunk;
    //         });
    //         res.on('end', function () {
    //             fn != undefined && fn(_data);
    //         });
    //
    //     });
    // //获取微信的token
    //
    //     async checkinviteAction() {
    //     new Promise(function(resolve, reject) {
    //         resolve(
    //             request({
    //                 method: 'POST',
    //                 url: 'https://api.weixin.qq.com/cgi-bin/wxaapp/createwxaqrcode?access_token=' + token.access_token,
    //                 body: JSON.stringify({
    //                     path: config.arr[i].path,
    //                     width: config.width
    //                 })
    //             }))
    //     }).then(data => {
    //     //将微信返回的东西装到文件中。
    //     data.pipe(fs.createWriteStream('./public/images/' + config.arr[i].name + '.png'));
    // })
    //
    //
    //
    //
    //     var getWxToken = function() {
    //         logger.debug('fn:getWxToken');
    //         var that = this;
    //         return new Promise((resolve, reject) => {
    //             request({
    //                 method: 'GET',
    //                 url: wx_gettoken_url
    //             }, function(err, res, body) {
    //                 if (res) {
    //                     create_time = new Date().getTime();
    //                     token = JSON.parse(body);
    //                     resolve({
    //                         isSuccess: true
    //                     });
    //                 } else {
    //                     logger.debug(err);
    //                     resolve({
    //                         isSuccess: false
    //                     });
    //                 }
    //             })
    //         });
    //     }
}