const Base = require('./base.js');
const fs = require('fs');
const _ = require('lodash');
const moment = require('moment');
module.exports = class extends Base {
    async getfriendAction() {
        const id = this.get('id');
        let info = await this.model('user').where({
            id: id
        }).field('nickname,avatar').find();
        info.nickname = Buffer.from(info.nickname, 'base64').toString();
        return this.success(info);
    }
};