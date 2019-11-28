const Base = require('./base.js');
const moment = require('moment');

module.exports = class extends Base {
    /**
     * index action
     * @return {Promise} []
     */
    async indexAction() {
        const model = this.model('notice');
        const data = await model.select();

        for (const item of data) {
            item.end_time = moment.unix(item.end_time).format('YYYY-MM-DD HH:mm:ss');
        }

        return this.success(data);
    }

    async updateContentAction() {
        const id = this.post('id');
        const content = this.post('content');
        const model = this.model('notice');
        const data = await model.where({id: id}).update({content: content});
        return this.success(data);
    }


    async addAction() {
        const content = this.post('content');
        let end_time = this.post('time');

        end_time = parseInt(new Date(end_time).getTime() / 1000);

        let info = {
            content:content,
            end_time:end_time
        }
        const model = this.model('notice');
        const data = await model.add(info);
        return this.success(data);
    }


    async updateAction() {
        const content = this.post('content');
        let end_time = this.post('time');
        let id = this.post('id');

        end_time = parseInt(new Date(end_time).getTime() / 1000);
        const currentTime = parseInt(new Date().getTime() / 1000);


        let info = {
            content:content,
            end_time:end_time
        };

        if(end_time > currentTime){
            info.is_delete = 0;
        }
        else{
            info.is_delete = 1;
        }
        const model = this.model('notice');
        const data = await model.where({id:id}).update(info);
        return this.success(data);
    }


    async destoryAction() {
        const id = this.post('id');
        await this.model('notice').where({id: id}).limit(1).delete();
        // TODO 删除图片

        return this.success();
    }
};
