const Base = require('./base.js');
const pinyin = require("pinyin");
const generate = require('nanoid/generate');
module.exports = class extends Base {
    async getAddressesAction() {
        const addressList = await this.model('address').where({
            user_id: think.userId,
            is_delete: 0
        }).order('id desc').select();
        let itemKey = 0;
        for (const addressItem of addressList) {
            addressList[itemKey].province_name = await this.model('region').getRegionName(addressItem.province_id);
            addressList[itemKey].city_name = await this.model('region').getRegionName(addressItem.city_id);
            addressList[itemKey].district_name = await this.model('region').getRegionName(addressItem.district_id);
            addressList[itemKey].full_region = addressList[itemKey].province_name + addressList[itemKey].city_name + addressList[itemKey].district_name;
            itemKey += 1;
        }
        return this.success(addressList);
    }
    async saveAddressAction() {
        let addressId = this.post('id');
        const addressData = {
            name: this.post('name'),
            mobile: this.post('mobile'),
            province_id: this.post('province_id'),
            city_id: this.post('city_id'),
            district_id: this.post('district_id'),
            address: this.post('address'),
            user_id: this.getLoginUserId(),
            is_default: this.post('is_default')
        };
        if (think.isEmpty(addressId)) {
            addressId = await this.model('address').add(addressData);
        } else {
            await this.model('address').where({
                id: addressId,
                user_id: think.userId
            }).update(addressData);
        }
        // 如果设置为默认，则取消其它的默认
        if (this.post('is_default') == 1) {
            await this.model('address').where({
                id: ['<>', addressId],
                user_id: think.userId
            }).update({
                is_default: 0
            });
        }
        const addressInfo = await this.model('address').where({
            id: addressId
        }).find();
        return this.success(addressInfo);
    }
    async deleteAddressAction() {
        let id = this.post('id');
        let d = await this.model('address').where({
            user_id: think.userId,
            id: id
        }).update({
            is_delete: 1
        });
        return this.success(d);
    }
    async addressDetailAction() {
        const addressId = this.get('id');
        const addressInfo = await this.model('address').where({
            user_id: think.userId,
            id: addressId
        }).find();
        if (!think.isEmpty(addressInfo)) {
            addressInfo.province_name = await this.model('region').getRegionName(addressInfo.province_id);
            addressInfo.city_name = await this.model('region').getRegionName(addressInfo.city_id);
            addressInfo.district_name = await this.model('region').getRegionName(addressInfo.district_id);
            addressInfo.full_region = addressInfo.province_name + addressInfo.city_name + addressInfo.district_name;
        }
        return this.success(addressInfo);
    }
};