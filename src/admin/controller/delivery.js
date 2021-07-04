const Base = require('./base.js');
module.exports = class extends Base {
    /**
     * index action
     * @return {Promise} []
     */
    async indexAction() {
        const data = await this.model('shipper').where({
            enabled:1
        }).select();
        return this.success(data);
    }
};