const Base = require('./base.js');
module.exports = class extends Base {
    async showSettingsAction() {
        let info = await this.model('show_settings').where({
            id: 1
        }).find();
        return this.success(info);
    }
    async saveAction() {
        let name = this.post('name');
        let mobile = this.post('mobile');
        var myreg = /^(((13[0-9]{1})|(15[0-9]{1})|(18[0-9]{1})|(17[0-9]{1})|(16[0-9]{1})|(19[0-9]{1}))+\d{8})$/;
        if (mobile.length < 11) {
            return this.fail(200, '长度不对');
        } else if (!myreg.test(mobile)) {
            return this.fail(300, '手机不对哦');
        }
        if (name == '' || mobile == '') {
            return this.fail(100, '不能为空')
        }
        let data = {
            name: name,
            mobile: mobile,
            name_mobile: 1
        };
        let info = await this.model('user').where({
            id: think.userId
        }).update(data);
        return this.success(info);
    }
    async userDetailAction() {
        let info = await this.model('user').where({
            id: think.userId
        }).field('mobile,name').find();
        return this.success(info);
    }
};