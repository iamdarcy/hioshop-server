const jwt = require('jsonwebtoken');
const secret = 'sdfsdfsdf123123!ASDasdasdasdasda';
module.exports = class extends think.Service {
    /**
     * 根据header中的x-hioshop-token值获取用户id
     */
    getUserId(token) {
        if (!token) {
            return 0;
        }
        const result = this.parse(token);
        if (think.isEmpty(result) || result.user_id <= 0) {
            return 0;
        }
        return result.user_id;
    }
    parse(token) {
        if (token) {
            try {
                return jwt.verify(token, secret);
            } catch (err) {
                return null;
            }
        }
        return null;
    }
	async create(userInfo) {
	    const token = jwt.sign(userInfo, secret);
	    return token;
	}
	/**
	 * 根据值获取用户信息
	 */
	async getUserInfo() {
	    const userId = await this.getUserId();
	    if (userId <= 0) {
	        return null;
	    }
	    const userInfo = await this.model('user').field(['id', 'username', 'nickname', 'gender', 'avatar', 'birthday']).where({
	        id: userId
	    }).find();
	    return think.isEmpty(userInfo) ? null : userInfo;
	}
    async verify() {
        const result = await this.parse();
        if (think.isEmpty(result)) {
            return false;
        }
        return true;
    }
};