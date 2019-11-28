const Base = require('./base.js');

module.exports = class extends Base {
    /**
     * index action
     * @return {Promise} []
     */


    async indexAction() {
        const model = this.model('shipper');
        const info = await model.where({
            enabled: 1
        }).select();
        const set = await this.model('settings').where({id:1}).find();
        let data = {
            info:info,
            set:set
        }

        return this.success(data);
    }

    async listAction() {

        const page = this.get('page') || 1;
        const size = this.get('size') || 10;
        const name = this.get('name') || '';
        const model = this.model('shipper');
        const data = await model.where({
            name: ['like', `%${name}%`]
        }).order(['id ASC']).page(page, size).countSelect();
        return this.success(data);
    }

    async infoAction() {
        const id = this.get('id');
        const model = this.model('shipper');
        const data = await model.where({
            id: id
        }).find();
        return this.success(data);
    }

    async storeAction() {
        if (!this.isPost) {
            return false;
        }

        const values = this.post();
        const id = this.post('id');

        const model = this.model('shipper');
        if (id > 0) {
            await model.where({id: id}).update(values);
        } else {
            delete values.id;
            await model.add(values);
        }
        return this.success(values);
    }


    async destoryAction() {
        const id = this.post('id');
        await this.model('freight_template').where({id: id}).limit(1).delete();
        // TODO 删除图片
        return this.success();
    }

    async freightAction() {
        const model = this.model('freight_template');
        const data = await model.where({
            is_delete: 0
        }).select();
        return this.success(data);
    }

    async getareadataAction() {
        let all = await this.model('region').where({type: 1}).field('id,name').select();
        return this.success(all);
    }


    async freightdetailAction() {
        let id = this.post('id');

        const model = this.model('freight_template_group');
        let data = await model.where({
            template_id: id,
            is_delete: 0,
            area: ['<>', 0]
        }).select();

        for (const item of data) {
            let area = item.area;
            if (item.free_by_money > 0) {
                item.freeByMoney = false
            }
            if (item.free_by_number > 0) {
                item.freeByNumber = false
            }
            let areaData = area.split(',');
            let info = await this.model('region').where({id: ['IN', areaData]}).getField('name');
            item.areaName = info.join(',');
        }

        let defaultData = await model.where({
            template_id: id,
            area: 0,
            is_delete: 0
        }).select();

        let freight = await this.model('freight_template').where({id: id}).find();

        let info = {
            freight: freight,
            data: data,
            defaultData: defaultData
        };

        return this.success(info);
    }


    async saveTableAction() {
        let data = this.post('table');
        let def = this.post('defaultData');
        let info = this.post('info');
        let idInfo = []; // 是已存在的id。如果大于零，则去循环。等于零，则先将已存在的data删除，然后判断，1，data的length > 0.则，说明有新的数据
        for (const item of data) {
            if (item.id > 0) {
                idInfo.push(item.id);
            }
        }

        if (idInfo.length != 0) {
            let deleData = await this.model('freight_template_group').where({
                id: ['NOTIN', idInfo],
                template_id: info.id,
                is_default: 0,
                is_delete: 0
            }).getField('id');

            for (const ele of deleData) {
                await this.model('freight_template_detail').where({
                    template_id: info.id,
                    group_id: ele,
                    is_delete: 0
                }).update({is_delete: 1});
            }

            let dbTable = await this.model('freight_template_group').where({
                id: ['NOTIN', idInfo],
                template_id: info.id,
                is_default: 0,
                is_delete: 0
            }).update({is_delete: 1});

            for (const item of data) {
                let id = item.id; // 这个是group_id
                if (id > 0) {

                    let template_id = info.id;

                    let val = {
                        area: item.area,
                        start: item.start,
                        start_fee: item.start_fee,
                        add: item.add,
                        add_fee: item.add_fee,
                        free_by_money: item.free_by_money,
                        free_by_number: item.free_by_number
                    };
                    await this.model('freight_template_group').where({
                        id: id,
                        template_id: template_id,
                        is_delete: 0
                    }).update(val);

                    // 这里要根据area去notin更新


                    let area = item.area;
                    let arr = area.split(',');

                    await this.model('freight_template_detail').where({
                        area: ['NOTIN', arr],
                        template_id: template_id,
                        group_id: id
                    }).update({is_delete: 1});
                    for (const item of arr) {
                        let e = await this.model('freight_template_detail').where({
                            template_id: template_id,
                            area: item,
                            group_id: id
                        }).find();
                        if (think.isEmpty(e)) {
                            await this.model('freight_template_detail').add({
                                template_id: template_id,
                                group_id: id,
                                area: item
                            });
                        }
                    }
                }
                else {
                    let template_id = info.id;
                    let area = item.area.substring(2);
                    let val = {
                        area: area,
                        start: item.start,
                        start_fee: item.start_fee,
                        add: item.add,
                        add_fee: item.add_fee,
                        template_id: template_id,
                        free_by_money: item.free_by_money,
                        free_by_number: item.free_by_number
                    };
                    let groupId = await this.model('freight_template_group').add(val);
                    let areaArr = area.split(',');
                    for (const item of areaArr) {
                        await this.model('freight_template_detail').add({
                            template_id: template_id,
                            group_id: groupId,
                            area: item
                        });
                    }
                }
            }
        }
        else {
            // 这里前台将table全删除了，所以要将原先的数据都删除
            let dbTable = await this.model('freight_template_group').where({
                template_id: info.id,
                is_default: 0,
                is_delete: 0
            }).update({is_delete: 1});
            // 将detail表也要删除！！！

            if (data.length != 0) {
                for (const item of data) {
                    let area = item.area.substring(2);
                    let template_id = info.id;
                    let val = {
                        area: area,
                        start: item.start,
                        start_fee: item.start_fee,
                        add: item.add,
                        add_fee: item.add_fee,
                        template_id: template_id,
                        free_by_money: item.free_by_money,
                        free_by_number: item.free_by_number
                    };
                    let groupId = await this.model('freight_template_group').add(val);
                    //根据area 去循环一下另一张detail表
                    let areaArr = area.split(',');
                    for (const item of areaArr) {
                        await this.model('freight_template_detail').add({
                            template_id: template_id,
                            group_id: groupId,
                            area: item
                        });
                    }

                }
            }
        }

        let upData = {
            start: def[0].start,
            start_fee: def[0].start_fee,
            add: def[0].add,
            add_fee: def[0].add_fee,
            free_by_money: def[0].free_by_money,
            free_by_number: def[0].free_by_number
        };

        await this.model('freight_template_group').where({
            id: def[0].id,
            template_id: info.id,
            is_default: 1
        }).update(upData);

        // await this.model('freight_template_detail').where({
        //     group_id: def[0].id,
        //     template_id: info.id,
        // }).update(upData);


        let tempData = {
            name: info.name,
            package_price: info.package_price,
            freight_type: info.freight_type
        };

        await this.model('freight_template').where({id: info.id}).update(tempData);
        return this.success();
    }

    async addTableAction() {
        let info = this.post('info');
        let data = this.post('table');
        let def = this.post('defaultData');
        // return false;
        let temp_id = await this.model('freight_template').add(info);

        if (temp_id > 0) {
            let upData = {
                start: def[0].start,
                start_fee: def[0].start_fee,
                add: def[0].add,
                add_fee: def[0].add_fee,
                free_by_money: def[0].free_by_money,
                free_by_number: def[0].free_by_number,
                template_id: temp_id,
                is_default: 1
            };

            let groupId = await this.model('freight_template_group').add(upData);
            if (groupId > 0) {
                await this.model('freight_template_detail').add({
                    template_id: temp_id,
                    group_id: groupId,
                    area: 0
                });
            }

            if (data.length > 0) {
                for (const item of data) {
                    let area = item.area.substring(2);
                    let template_id = temp_id;
                    let info = {
                        area: area,
                        start: item.start,
                        start_fee: item.start_fee,
                        add: item.add,
                        add_fee: item.add_fee,
                        template_id: temp_id,
                        free_by_money: item.free_by_money,
                        free_by_number: item.free_by_number
                    };
                    let groupId = await this.model('freight_template_group').add(info);
                    let areaArr = area.split(',');
                    for (const item of areaArr) {
                        await this.model('freight_template_detail').add({
                            template_id: template_id,
                            group_id: groupId,
                            area: item
                        });
                    }
                }
            }
        }

        return this.success();
    }

    async exceptareaAction() {
        const model = this.model('except_area');
        const data = await model.where({
            is_delete: 0
        }).select();

        for (const item of data) {
            let area = item.area;
            let areaData = area.split(',');
            let info = await this.model('region').where({id: ['IN', areaData]}).getField('name');
            item.areaName = info.join(',');
        }

        return this.success(data);
    }

    async exceptAreaDeleteAction() {
        const id = this.post('id');
        await this.model('except_area').where({id: id}).limit(1).update({is_delete: 1});
        await this.model('except_area_detail').where({except_area_id: id}).update({is_delete: 1});
        // TODO 删除图片
        return this.success();
    }


    async exceptAreaDetailAction() {
        let id = this.post('id');
        const model = this.model('except_area');
        let data = await model.where({
            id: id,
            is_delete: 0,
        }).find();
        // let areaData = {}
        let area = data.area;
        let areaData = area.split(',');
        let info = await this.model('region').where({id: ['IN', areaData]}).getField('name');
        data.areaName = info.join(',');
        console.log(data);
        return this.success(data);
    }

    async saveExceptAreaAction() {
        let table = this.post('table');
        let info = this.post('info');
        console.log('--------------------------')

        console.log(table)
        console.log(info)
        let data = {
            area: table[0].area,
            content: info.content
        };
        await this.model('except_area').where({id: info.id}).update(data);

        let area = table[0].area;

        console.log(typeof(area));

        let arr = area.split(',');

        await this.model('except_area_detail').where({
            area: ['NOTIN', arr],
            except_area_id: info.id,
            is_delete: 0
        }).update({is_delete: 1});

        for (const item of arr) {
            let e = await this.model('except_area_detail').where({
                except_area_id: info.id,
                area: item,
                is_delete: 0
            }).find();

            if (think.isEmpty(e)) {
                await this.model('except_area_detail').add({
                    except_area_id: info.id,
                    area: item
                });
            }
        }
        return this.success();
    }

    async addExceptAreaAction() {
        let table = this.post('table');
        let info = this.post('info');

        let data = {
            area: table[0].area.substring(2),
            content: info.content
        };

        let id = await this.model('except_area').add(data);

        let area = table[0].area.substring(2);

        let arr = area.split(',');

        for (const item of arr) {
            await this.model('except_area_detail').add({
                except_area_id: id,
                area: item
            });
        }
        return this.success();
    }


};
