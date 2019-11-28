module.exports = class extends think.Model {
    async addFootprint(userId, goodsId) {
        // 用户已经登录才可以添加到足迹

        const currentTime = parseInt(new Date().getTime() / 1000);

        if (userId > 0 && goodsId > 0) {
            let info = await this.where({
                goods_id: goodsId,
                user_id: userId
            }).find();
            if (think.isEmpty(info)) {
                await this.add({
                    goods_id: goodsId,
                    user_id: userId,
                    add_time: currentTime
                });
            }
            else {
                const add_time = currentTime;
                await this.where({
                    goods_id: goodsId,
                    user_id: userId
                }).update({add_time: add_time});
            }
        }

    }
};
