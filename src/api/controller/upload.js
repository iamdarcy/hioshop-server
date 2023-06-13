const Base = require("./base.js");
const fs = require("fs");
const path = require("path");

module.exports = class extends Base {
  async uploadAvatarAction() {
    const file = this.file('upload_file');
    let fileType = file.type;
    const spliceLength = fileType.lastIndexOf("/");
    let fileTypeText = fileType.slice(spliceLength + 1);
    if (think.isEmpty(file)) {
      return this.fail("保存失败");
    }
    const that = this;
    let name = think.uuid(32) + "." + fileTypeText;
    const filename = "/static/upload/avatar/" + name;
    const is = fs.createReadStream(file.path);
    const os = fs.createWriteStream(think.ROOT_PATH + "/www" + filename);
    is.pipe(os);
    return that.success({
      name: name,
      fileUrl: filename,
    });
  }

  // async deleteFileAction() {
  //     const url = this.post('para');
  //     let newUrl = url.lastIndexOf("/");
  //     let fileName = url.substring(newUrl + 1);
  //     let delePath = './www/static/upload/goods/detail/' + fileName;
  //     fs.unlink(delePath, function (err) {
  //         if (err) throw err;
  //         return false;
  //     });
  //     return this.success('文件删除成功');
  // }
};
