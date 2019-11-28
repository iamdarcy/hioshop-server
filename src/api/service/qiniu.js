const qiniu = require('qiniu');
module.exports = class extends think.Service {
    async getQiniuToken() {
        let accessKey = think.config('qiniu_miniapp.access_key');
        let secretKey = think.config('qiniu_miniapp.secret_key');
        let bucket =  think.config('qiniu_miniapp.bucket');
        let domain =  think.config('qiniu_miniapp.domain');
        let mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
        let currentTime = parseInt(new Date().getTime() / 1000) + 600;
        let key = think.uuid(32);
        let options = {
            scope:bucket,
            deadline:currentTime,
            saveKey:key
        };
        let putPolicy = new qiniu.rs.PutPolicy(options);
        let uploadToken=putPolicy.uploadToken(mac);
        let data = {
            uploadToken:uploadToken,
            domain:domain
        };
        return data;
    }
};
