const Base = require('./base.js');
const moment = require('moment');
const fs = require('fs');
const path = require("path");
const qiniu = require('qiniu');
module.exports = class extends Base {
    /**
     * index action
     * @return {Promise} []
     */
    async indexAction() {
        const page = this.get('page') || 1;
        const size = this.get('size');
        const name = this.get('name') || '';
        const model = this.model('goods');
        const data = await model.where({
            name: ['like', `%${name}%`],
            is_delete: 0
        }).order(['sort_order asc']).page(page, size).countSelect();
        // let newData = data;
        for (const item of data.data) {
            const info = await this.model('category').where({
                id: item.category_id
            }).find();
            item.category_name = info.name;
            if (item.is_on_sale == 1) {
                item.is_on_sale = true;
            } else {
                item.is_on_sale = false;
            }
            if (item.is_index == 1) {
                item.is_index = true;
            } else {
                item.is_index = false;
            }
            let product = await this.model('product').where({
                goods_id: item.id,
                is_delete: 0
            }).select();
            for (const ele of product) {
                let spec = await this.model('goods_specification').where({
                    id: ele.goods_specification_ids,
                    is_delete: 0
                }).find();
                ele.value = spec.value;
                ele.is_on_sale = ele.is_on_sale ? "1" : "0";
            }
            item.product = product;
        }
        return this.success(data);
    }
    async getExpressDataAction() {
        let kd = [];
        let cate = [];
        const kdData = await this.model('freight_template').where({
            is_delete: 0
        }).select();
        for (const item of kdData) {
            kd.push({
                value: item.id,
                label: item.name
            })
        }
        const cateData = await this.model('category').where({
            parent_id: 0
        }).select();
        for (const item of cateData) {
            cate.push({
                value: item.id,
                label: item.name
            })
        }
        let infoData = {
            kd: kd,
            cate: cate
        };
        return this.success(infoData);
    }
    async copygoodsAction() {
        const goodsId = this.post('id');
        let data = await this.model('goods').where({
            id: goodsId
        }).find();
        delete data.id;
        data.is_on_sale = 0;
        let insertId = await this.model('goods').add(data);
        let goodsGallery = await this.model('goods_gallery').where({
            goods_id: goodsId,
            is_delete:0,
        }).select();
        for (const item of goodsGallery) {
            let gallery = {
                img_url: item.img_url,
                sort_order: item.sort_order,
                goods_id: insertId
            }
            await this.model('goods_gallery').add(gallery);
        }
        return this.success(insertId);
    }
    async updateStock(goods_sn, goods_number) {
        console.log('存在，现在就更新');
        await this.model('product').where({
            goods_sn: goods_sn
        }).update({
            goods_number: goods_number
        });
    }
    async updateGoodsNumberAction() {
        let all_goods = await this.model('goods').where({
            is_delete: 0,
            is_on_sale: 1
        }).select();
        for (const item of all_goods) {
            let goodsSum = await this.model('product').where({
                goods_id: item.id
            }).sum('goods_number');
            await this.model('goods').where({
                id: item.id
            }).update({
                goods_number: goodsSum
            });
            await think.timeout(2000);
        }
        return this.success();
    }
    async onsaleAction() {
        const page = this.get('page') || 1;
        const size = this.get('size');
        const model = this.model('goods');
        const data = await model.where({
            is_delete: 0,
            is_on_sale: 1
        }).order(['sort_order asc']).page(page, size).countSelect();
        for (const item of data.data) {
            const info = await this.model('category').where({
                id: item.category_id
            }).find();
            item.category_name = info.name;
            // if (info.parent_id != 0) {
            //     const parentInfo = await this.model('category').where({id: info.parent_id}).find();
            //     item.category_p_name = parentInfo.name;
            // }
            if (item.is_on_sale == 1) {
                item.is_on_sale = true;
            } else {
                item.is_on_sale = false;
            }
            if (item.is_index == 1) {
                item.is_index = true;
            } else {
                item.is_index = false;
            }
            let product = await this.model('product').where({
                goods_id: item.id,
                is_delete: 0
            }).select();
            for (const ele of product) {
                let spec = await this.model('goods_specification').where({
                    id: ele.goods_specification_ids,
                    is_delete: 0
                }).find();
                ele.value = spec.value;
                ele.is_on_sale = ele.is_on_sale ? "1" : "0";
            }
            item.product = product;
        }
        return this.success(data);
    }
    async outAction() {
        const page = this.get('page') || 1;
        const size = this.get('size');
        const model = this.model('goods');
        const data = await model.where({
            is_delete: 0,
            goods_number: ['<=', 0]
        }).order(['sort_order asc']).page(page, size).countSelect();
        for (const item of data.data) {
            const info = await this.model('category').where({
                id: item.category_id
            }).find();
            item.category_name = info.name;
            if (item.is_on_sale == 1) {
                item.is_on_sale = true;
            } else {
                item.is_on_sale = false;
            }
            if (item.is_index == 1) {
                item.is_index = true;
            } else {
                item.is_index = false;
            }
            let product = await this.model('product').where({
                goods_id: item.id,
                is_delete: 0
            }).select();
            for (const ele of product) {
                let spec = await this.model('goods_specification').where({
                    id: ele.goods_specification_ids,
                    is_delete: 0
                }).find();
                ele.value = spec.value;
                ele.is_on_sale = ele.is_on_sale ? "1" : "0";
            }
            item.product = product;
        }
        return this.success(data);
    }
    async dropAction() {
        const page = this.get('page') || 1;
        const size = this.get('size');
        const model = this.model('goods');
        const data = await model.where({
            is_delete: 0,
            is_on_sale: 0
        }).order(['id DESC']).page(page, size).countSelect();
        for (const item of data.data) {
            const info = await this.model('category').where({
                id: item.category_id
            }).find();
            item.category_name = info.name;
            if (item.is_on_sale == 1) {
                item.is_on_sale = true;
            } else {
                item.is_on_sale = false;
            }
            if (item.is_index == 1) {
                item.is_index = true;
            } else {
                item.is_index = false;
            }
            let product = await this.model('product').where({
                goods_id: item.id,
                is_delete: 0
            }).select();
            for (const ele of product) {
                let spec = await this.model('goods_specification').where({
                    id: ele.goods_specification_ids,
                    is_delete: 0
                }).find();
                ele.value = spec.value;
                ele.is_on_sale = ele.is_on_sale ? "1" : "0";
            }
            item.product = product;
        }
        return this.success(data);
    }
    async sortAction() {
        const page = this.get('page') || 1;
        const size = this.get('size');
        const model = this.model('goods');
        const index = this.get('index');
        if (index == 1) {
            const data = await model.where({
                is_delete: 0
            }).order(['sell_volume DESC']).page(page, size).countSelect();
            for (const item of data.data) {
                const info = await this.model('category').where({
                    id: item.category_id
                }).find();
                item.category_name = info.name;
                if (item.is_on_sale == 1) {
                    item.is_on_sale = true;
                } else {
                    item.is_on_sale = false;
                }
                if (item.is_index == 1) {
                    item.is_index = true;
                } else {
                    item.is_index = false;
                }
                let product = await this.model('product').where({
                    goods_id: item.id,
                    is_delete: 0
                }).select();
                for (const ele of product) {
                    let spec = await this.model('goods_specification').where({
                        id: ele.goods_specification_ids,
                        is_delete: 0
                    }).find();
                    ele.value = spec.value;
                    ele.is_on_sale = ele.is_on_sale ? "1" : "0";
                }
                item.product = product;
            }
            return this.success(data);
        } else if (index == 2) {
            const data = await model.where({
                is_delete: 0
            }).order(['retail_price DESC']).page(page, size).countSelect();
            for (const item of data.data) {
                const info = await this.model('category').where({
                    id: item.category_id
                }).find();
                item.category_name = info.name;
                if (item.is_on_sale == 1) {
                    item.is_on_sale = true;
                } else {
                    item.is_on_sale = false;
                }
                if (item.is_index == 1) {
                    item.is_index = true;
                } else {
                    item.is_index = false;
                }
                let product = await this.model('product').where({
                    goods_id: item.id,
                    is_delete: 0
                }).select();
                for (const ele of product) {
                    let spec = await this.model('goods_specification').where({
                        id: ele.goods_specification_ids,
                        is_delete: 0
                    }).find();
                    ele.value = spec.value;
                    ele.is_on_sale = ele.is_on_sale ? "1" : "0";
                }
                item.product = product;
            }
            return this.success(data);
        } else if (index == 3) {
            const data = await model.where({
                is_delete: 0
            }).order(['goods_number DESC']).page(page, size).countSelect();
            for (const item of data.data) {
                const info = await this.model('category').where({
                    id: item.category_id
                }).find();
                item.category_name = info.name;
                if (item.is_on_sale == 1) {
                    item.is_on_sale = true;
                } else {
                    item.is_on_sale = false;
                }
                if (item.is_index == 1) {
                    item.is_index = true;
                } else {
                    item.is_index = false;
                }
                let product = await this.model('product').where({
                    goods_id: item.id,
                    is_delete: 0
                }).select();
                for (const ele of product) {
                    let spec = await this.model('goods_specification').where({
                        id: ele.goods_specification_ids,
                        is_delete: 0
                    }).find();
                    ele.value = spec.value;
                    ele.is_on_sale = ele.is_on_sale ? "1" : "0";
                }
                item.product = product;
            }
            return this.success(data);
        }
    }
    async saleStatusAction() {
        const id = this.get('id');
        const status = this.get('status');
        let sale = 0;
        if (status == 'true') {
            sale = 1;
        }
        const model = this.model('goods');
        await model.where({
            id: id
        }).update({
            is_on_sale: sale
        });
        await this.model('cart').where({
            goods_id: id
        }).update({
            is_on_sale: sale,
            checked: sale
        });
    }
    async productStatusAction() {
        const id = this.get('id');
        const status = this.get('status');
        const model = this.model('product');
        await model.where({
            id: id
        }).update({
            is_on_sale: status
        });
		// 4.14更新
		await this.model('cart').where({
			product_id: id,
			is_delete: 0
		}).update({
			is_on_sale: status
		})
    }
    async indexShowStatusAction() {
        const id = this.get('id');
        const status = this.get('status');
        let stat = 0;
        if (status == 'true') {
            stat = 1;
        }
        const model = this.model('goods');
        await model.where({
            id: id
        }).update({
            is_index: stat
        });
    }
    async infoAction() {
        const id = this.get('id');
        const model = this.model('goods');
        const data = await model.where({
            id: id
        }).find();
        let category_id = data.category_id;
        let infoData = {
            info: data,
            category_id: category_id,
        };
        return this.success(infoData);
    }
    async getAllSpecificationAction() {
        const specInfo = await this.model('specification').where({
            id: ['>', 0]
        }).select();
        let specOptionsData = [];
        for (const spitem of specInfo) {
            let info = {
                value: spitem.id,
                label: spitem.name
            };
            specOptionsData.push(info);
        }
        return this.success(specOptionsData);
    }
    async getAllCategory1Action() { // 我写的算法
        const model = this.model('category');
        const data = await model.where({
            is_show: 1,
            level: 'L1'
        }).select();
        const c_data = await model.where({
            is_show: 1,
            level: 'L2'
        }).select();
        let newData = [];
        for (const item of data) {
            let children = [];
            for (const citem of c_data) {
                if (citem.parent_id == item.id) {
                    children.push({
                        value: citem.id,
                        label: citem.name
                    })
                }
            }
            newData.push({
                value: item.id,
                label: item.name,
                children: children
            });
        }
        return this.success(newData);
    }
    async getAllCategoryAction() { // 晓玲的算法，她要
        const model = this.model('category');
        const data = await model.where({
            is_show: 1,
            level: 'L1'
        }).field('id,name').select();
        let newData = [];
        for (const item of data) {
            let children = [];
            const c_data = await model.where({
                is_show: 1,
                level: 'L2',
                parent_id: item.id
            }).field('id,name').select();
            for (const c_item of c_data) {
                children.push({
                    value: c_item.id,
                    label: c_item.name
                })
            }
            newData.push({
                value: item.id,
                label: item.name,
                children: children
            });
        }
        return this.success(newData);
    }
    async storeAction() {
        const values = this.post('info');
        const specData = this.post('specData');
        const specValue = this.post('specValue');
        const cateId = this.post('cateId');
        const model = this.model('goods');
        let picUrl = values.list_pic_url;
        let goods_id = values.id;
        values.category_id = cateId;
        values.is_index = values.is_index ? 1 : 0;
        values.is_new = values.is_new ? 1 : 0;
        let id = values.id;
        if (id > 0) {
            await model.where({
                id: id
            }).update(values);
            await this.model('cart').where({
                goods_id: id
            }).update({
                checked: values.is_on_sale,
                is_on_sale: values.is_on_sale,
                list_pic_url: picUrl,
                freight_template_id: values.freight_template_id
            });
            await this.model('product').where({
                goods_id: id
            }).update({
                is_delete: 1
            });
            await this.model('goods_specification').where({
                goods_id: id
            }).update({
                is_delete: 1
            });
            for (const item of specData) {
                if (item.id > 0) {
                    await this.model('cart').where({
                        product_id: item.id,
                        is_delete: 0,
                    }).update({
                        retail_price: item.retail_price,
                        goods_specifition_name_value: item.value,
                        goods_sn: item.goods_sn
                    });
                    delete item.is_delete;
                    item.is_delete = 0;
                    await this.model('product').where({
                        id: item.id
                    }).update(item);
                    let specificationData = {
                        value: item.value,
                        specification_id: specValue,
                        is_delete: 0
                    };
                    await this.model('goods_specification').where({
                        id: item.goods_specification_ids
                    }).update(specificationData);
                } else {
                    let specificationData = {
                        value: item.value,
                        goods_id: id,
                        specification_id: specValue
                    }
                    let specId = await this.model('goods_specification').add(specificationData);
                    item.goods_specification_ids = specId;
                    item.goods_id = id;
                    await this.model('product').add(item);
                }
            }
        } else {
            delete values.id;
            goods_id = await model.add(values);
            for (const item of specData) {
                let specificationData = {
                    value: item.value,
                    goods_id: goods_id,
                    specification_id: specValue
                }
                let specId = await this.model('goods_specification').add(specificationData);
                item.goods_specification_ids = specId;
                item.goods_id = goods_id;
                item.is_on_sale = 1;
                await this.model('product').add(item);
            }
        }
        let pro = await this.model('product').where({
            goods_id: goods_id,
            is_on_sale: 1,
            is_delete: 0
        }).select();
        if (pro.length > 1) {
            let goodsNum = await this.model('product').where({
                goods_id: goods_id,
                is_on_sale: 1,
                is_delete: 0
            }).sum('goods_number');
            let retail_price = await this.model('product').where({
                goods_id: goods_id,
                is_on_sale: 1,
                is_delete: 0
            }).getField('retail_price');
            let maxPrice = Math.max(...retail_price);
            let minPrice = Math.min(...retail_price);
            let cost = await this.model('product').where({
                goods_id: goods_id,
                is_on_sale: 1,
                is_delete: 0
            }).getField('cost');
            let maxCost = Math.max(...cost);
            let minCost = Math.min(...cost);
            let goodsPrice = '';
            if(minPrice == maxPrice){
                goodsPrice = minPrice;
            }
            else{
                goodsPrice = minPrice + '~' + maxPrice;
            }
            let costPrice = minCost + '~' + maxCost;
            await this.model('goods').where({
                id: goods_id
            }).update({
                goods_number: goodsNum,
                retail_price: goodsPrice,
                cost_price: costPrice,
                min_retail_price: minPrice,
                min_cost_price: minCost,
            });
        } else {
            let info = {
                goods_number: pro[0].goods_number,
                retail_price: pro[0].retail_price,
                cost_price: pro[0].cost,
                min_retail_price: pro[0].retail_price,
                min_cost_price: pro[0].cost,
            }
            await this.model('goods').where({
                id: goods_id
            }).update(info);
        }
        return this.success(values);
    }
    async updatePriceAction() {
        let data = this.post('');
        // console.log(data);
        await this.model('goods_specification').where({
            id: data.goods_specification_ids
        }).update({
            value: data.value
        });
        await this.model('product').where({
            id: data.id
        }).update(data);
        await this.model('cart').where({
            product_id: data.id,
            is_delete: 0,
        }).update({
            retail_price: data.retail_price,
            goods_specifition_name_value: data.value,
            goods_sn: data.goods_sn
        });
        delete data.value;
        let goods_id = data.goods_id;
        let pro = await this.model('product').where({
            goods_id: goods_id,
            is_on_sale: 1,
            is_delete: 0
        }).select();
        if (pro.length > 1) {
            let goodsNum = await this.model('product').where({
                goods_id: goods_id,
                is_on_sale: 1,
                is_delete: 0
            }).sum('goods_number');
            let retail_price = await this.model('product').where({
                goods_id: goods_id,
                is_on_sale: 1,
                is_delete: 0
            }).getField('retail_price');
            let maxPrice = Math.max(...retail_price);
            let minPrice = Math.min(...retail_price);
            let cost = await this.model('product').where({
                goods_id: goods_id,
                is_on_sale: 1,
                is_delete: 0
            }).getField('cost');
            let maxCost = Math.max(...cost);
            let minCost = Math.min(...cost);
            let goodsPrice = '';
            if(minPrice == maxPrice){
                goodsPrice = minPrice;
            }
            else{
                goodsPrice = minPrice + '~' + maxPrice;
            }
            let costPrice = minCost + '~' + maxCost;
            await this.model('goods').where({
                id: goods_id
            }).update({
                goods_number: goodsNum,
                retail_price: goodsPrice,
                cost_price: costPrice,
                min_retail_price: minPrice,
                min_cost_price: minCost,
            });
        } else {
            let info = {
                goods_number: pro[0].goods_number,
                retail_price: pro[0].retail_price,
                cost_price: pro[0].cost,
                min_retail_price: pro[0].retail_price,
                min_cost_price: pro[0].cost,
            }
            await this.model('goods').where({
                id: goods_id
            }).update(info);
        }
        return this.success();
    }
    async checkSkuAction() {
        const info = this.post('info');
        if (info.id > 0) {
            const model = this.model('product');
            const data = await model.where({
                id: ['<>', info.id],
                goods_sn: info.goods_sn,
                is_delete: 0
            }).find();
            if (!think.isEmpty(data)) {
                return this.fail(100, '重复')
            } else {
                return this.success();
            }
        } else {
            const model = this.model('product');
            const data = await model.where({
                goods_sn: info.goods_sn,
                is_delete: 0
            }).find();
            if (!think.isEmpty(data)) {
                return this.fail(100, '重复')
            } else {
                return this.success();
            }
        }
    }
    async updateSortAction() {
        const id = this.post('id');
        const sort = this.post('sort');
        const model = this.model('goods');
        const data = await model.where({
            id: id
        }).update({
            sort_order: sort
        });
        return this.success(data);
    }
    async updateShortNameAction() {
        const id = this.post('id');
        const short_name = this.post('short_name');
        const model = this.model('goods');
        const data = await model.where({
            id: id
        }).update({
            short_name: short_name
        });
        return this.success(data);
    }
    async galleryListAction() {
        const id = this.get('id');
        const model = this.model('goods_gallery');
        const data = await model.where({
            goods_id: id,
            is_delete:0
        }).select();
        // console.log(data);
        return this.success(data);
    }
    async galleryAction() {
        const url = this.post('url');
        const id = this.post('goods_id');
        let info = {
            goods_id: id,
            img_url: url
        }
        await this.model('goods_gallery').add(info);
        return this.success();
    }
    async getGalleryListAction() {
        const goodsId = this.post('goodsId');
        const data = await this.model('goods_gallery').where({
            goods_id: goodsId,
            is_delete:0
        }).select();
        let galleryData = [];
        for (const item of data) {
            let pdata = {
                id: item.id,
                url: item.img_url
            }
            galleryData.push(pdata);
        }
        let info = {
            galleryData: galleryData,
        }
        return this.success(info);
    }
    async deleteGalleryFileAction() {
        const url = this.post('url');
        const id = this.post('id');
        await this.model('goods_gallery').where({
            id: id
        }).limit(1).update({
            is_delete: 1
        });
        return this.success('文件删除成功');
    }
    async galleryEditAction() {
        if (!this.isPost) {
            return false;
        }
        const values = this.post();
        let data = values.data;
        // console.log(data);
        const model = this.model('goods_gallery');
        for (const item of data) {
            let id = item.id;
            let sort = parseInt(item.sort_order);
            // console.log(sort);
            await this.model('goods_gallery').where({
                id: id
            }).update({
                sort_order: sort
            });
        }
        return this.success();
    }
    async deleteListPicUrlAction() {
        const id = this.post('id');
        console.log(id);
        await this.model('goods').where({
            id: id
        }).limit(1).update({
            list_pic_url: 0
        });
        return this.success();
    }
    async destoryAction() {
        const id = this.post('id');
        await this.model('goods').where({
            id: id
        }).limit(1).update({
            is_delete: 1
        });
        await this.model('product').where({
            goods_id: id
        }).update({
            is_delete: 1
        });
        await this.model('goods_specification').where({
            goods_id: id
        }).update({
            is_delete: 1
        });
        // TODO 删除图片
        return this.success();
    }
    async uploadHttpsImageAction() {
        let url = this.post('url');
        console.log('----------------------');
        console.log(url);
        let accessKey = think.config('qiniuHttps.access_key');
        let secretKey = think.config('qiniuHttps.secret_key');
        let domain = think.config('qiniuHttps.domain');
        var mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
        var config = new qiniu.conf.Config();
        let zoneNum = think.config('qiniuHttps.zoneNum');
        if(zoneNum == 0){
            config.zone = qiniu.zone.Zone_z0;
        }
        else if(zoneNum == 1){
            config.zone = qiniu.zone.Zone_z1;
        }
        else if(zoneNum == 2){
            config.zone = qiniu.zone.Zone_z2;
        }
        else if(zoneNum == 3){
            config.zone = qiniu.zone.Zone_na0;
        }

        else if(zoneNum == 4){
            config.zone = qiniu.zone.Zone_as0;
        }
        var bucketManager = new qiniu.rs.BucketManager(mac, config);
        let bucket = think.config('qiniuHttps.bucket');
        let key = think.uuid(32);
        await think.timeout(500);
        const uploadQiniu = async() => {
            return new Promise((resolve, reject) => {
                try {
                    bucketManager.fetch(url, bucket, key, function(err, respBody, respInfo) {
                        if (err) {
                            console.log(err);
                            //throw err;
                        } else {
                            if (respInfo.statusCode == 200) {
                                resolve(respBody.key)
                            } else {
                                console.log(respInfo.statusCode);
                            }
                        }
                    });
                } catch (e) {
                    return resolve(null);
                }
            })
        };
        const httpsUrl = await uploadQiniu();
        console.log(httpsUrl);
        let lastUrl = domain + httpsUrl;
        return this.success(lastUrl);
    }
};