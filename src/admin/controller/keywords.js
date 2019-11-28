const Base = require('./base.js');
const moment = require('moment');
module.exports = class extends Base {
    /**
     * index action
     * @return {Promise} []
     */
    async indexAction() {
        const page = this.get('page') || 1;
        const size = this.get('size') || 10;
        const name = this.get('name') || '';

        const model = this.model('cart');
        const data = await model.where({goods_name: ['like', `%${name}%`]}).order(['id DESC']).page(page, size).countSelect();

        for (const item of data.data) {
            item.add_time = moment.unix(item.add_time).format('YYYY-MM-DD HH:mm:ss');
        }

        return this.success(data);
    }

};
