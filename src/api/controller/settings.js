const Base = require("./base.js");
module.exports = class extends Base {
  async showSettingsAction() {
    let info = await this.model("show_settings")
      .where({
        id: 1,
      })
      .find();
    return this.success(info);
  }
  async saveAction() {
    let userId = this.getLoginUserId();
    let name = this.post("name");
    let mobile = this.post("mobile");
    let nickName = this.post("nickName");
    let avatar = this.post("avatar");
    let name_mobile = 0;
    if (name != "" && mobile != "") {
      name_mobile = 1;
    }
    const newbuffer = Buffer.from(nickName);
    let nickname = newbuffer.toString("base64");
    let data = {
      name: name,
      mobile: mobile,
      nickname: nickname,
      avatar: avatar,
      name_mobile: name_mobile,
    };
    let info = await this.model("user")
      .where({
        id: userId,
      })
      .update(data);
    return this.success(info);
  }
  async userDetailAction() {
    let userId = this.getLoginUserId();
    if (userId != 0) {
      let info = await this.model("user")
        .where({
          id: userId,
        })
        .field("id,mobile,name,nickname,avatar")
        .find();
      info.nickname = Buffer.from(info.nickname, "base64").toString();
      return this.success(info);
    }
    else{
      return this.fail(100,'未登录')
    }
  }
};
