module.exports = class extends think.Controller {
    async __before() {
        // 根据token值获取用户id
        think.token = this.ctx.header['x-nideshop-token'] || '';
        const tokenSerivce = think.service('token', 'api');
        think.userId = await tokenSerivce.getUserId();
        const publicController = this.config('publicController');
        const publicAction = this.config('publicAction');
        // 如果为非公开，则验证用户是否登录
        const controllerAction = this.ctx.controller + '/' + this.ctx.action;
        // if (!publicController.includes(this.ctx.controller) && !publicAction.includes(controllerAction)) {
        //   if (think.userId <= 0) {
        //     return this.fail(401, '请先登录');
        //   }
        // }
    }
    /**
     * 获取时间戳
     * @returns {Number}
     */
    getTime() {
        return parseInt(Date.now() / 1000);
    }
    /**
     * 获取当前登录用户的id
     * @returns {*}
     */
    getLoginUserId() {
        return think.userId;
    }
    //  timestampToTime (unixtimestamp){  
    //    var unixtimestamp = new Date(unixtimestamp*1000);  
    //    var year = 1900 + unixtimestamp.getYear();  
    //    var month = "0" + (unixtimestamp.getMonth() + 1);  
    //    var date = "0" + unixtimestamp.getDate();  
    //    var hour = "0" + unixtimestamp.getHours();  
    //    var minute = "0" + unixtimestamp.getMinutes();  
    //    var second = "0" + unixtimestamp.getSeconds();  
    //    return year + "-" + month.substring(month.length-2, month.length)  + "-" + date.substring(date.length-2, date.length)  
    //        + " " + hour.substring(hour.length-2, hour.length) + ":"  
    //        + minute.substring(minute.length-2, minute.length) + ":"  
    //        + second.substring(second.length-2, second.length);  
    // } 
};