const Base = require('./base.js');
module.exports = class extends Base {
    async infoAction() {
        const region = await this.model('region').getRegionInfo(this.get('regionId'));
        return this.success(region);
    }
    async listAction() {
        const regionList = await this.model('region').getRegionList(this.get('parentId'));
        return this.success(regionList);
    }
    async dataAction() {
        let parentId = this.post('parent_id');
        let info = await this.model('region').where({
            parent_id: parentId
        }).getField('id,name');
        return this.success(info);
    }
    async codeAction() {
        let province = this.post('Province');
        let city = this.post('City');
        let country = this.post('Country');
        let provinceInfo = await this.model('region').where({
            name: province
        }).field('id').find();
        let province_id = provinceInfo.id;
        let cityInfo = await this.model('region').where({
            name: city
        }).field('id').find();
        let city_id = cityInfo.id;
        let countryInfo = await this.model('region').where({
            name: country
        }).field('id').find();
        let country_id = countryInfo.id;
        let data = {
            province_id: province_id,
            city_id: city_id,
            country_id: country_id
        }
        return this.success(data);
    }
};