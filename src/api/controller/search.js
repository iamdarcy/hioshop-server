const Base = require('./base.js');
//TODO 在后台搜索那里完善，采用专门的搜索开发库
module.exports = class extends Base {
    async indexAction() {
        // 取出输入框默认的关键词
        const defaultKeyword = await this.model('keywords').where({
            is_default: 1
        }).limit(1).find();
        // 取出热闹关键词
        const hotKeywordList = await this.model('keywords').distinct('keyword').field(['keyword', 'is_hot']).limit(10).select();
        const historyKeywordList = await this.model('search_history').distinct('keyword').where({
            user_id: think.userId
        }).limit(10).getField('keyword');
        return this.success({
            defaultKeyword: defaultKeyword,
            historyKeywordList: historyKeywordList,
            hotKeywordList: hotKeywordList
        });
    }
    async helperAction() {
        const keyword = this.get('keyword');
        const keywords = await this.model('keywords').distinct('keyword').where({
            keyword: ['like', keyword + '%']
        }).getField('keyword', 10);
        return this.success(keywords);
    }
    async clearHistoryAction() {
        await this.model('search_history').where({
            user_id: think.userId
        }).delete();
        return this.success();
    }
};