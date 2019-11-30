### 海风小店，开源商城（服务端）

+ 基于开源项目NideShop重建，精简了一些功能的同时完善了一些功能，并重新设计了UI
+ 测试数据来自上述开源项目
+ 服务端api基于Ｎode.js+ThinkJS+MySQL

### 本项目需要配合  
微信小程序项目：GitHub: https://github.com/iamdarcy/hioshop-miniprogram  
管理后台项目：GitHub: https://github.com/iamdarcy/hioshop-admin

阿里云主机：低至3折
<a target="_blank" href="https://www.aliyun.com/acts/hotsale?userCode=zm04niet">立即去看看</a>

### 本地开发环境配置
+ 克隆项目到本地
```
git clone https://github.com/iamdarcy/hioshop-server
```
+ 创建数据库hiolabsDB并导入项目根目录下的hioshop.sql  
推荐使用软件Navicat创建和管理数据库，也可以用以下命令创建：
```
CREATE SCHEMA `hiolabsDB` DEFAULT CHARACTER SET utf8mb4 ;
```
> 注意数据库字符编码为utf8mb4 
+ 更改数据库配置
  src/common/config/database.js
```
const mysql = require('think-model-mysql');

module.exports = {
    handle: mysql,
    database: 'hiolabsDB',
    prefix: 'hiolabs_',
    encoding: 'utf8mb4',
    host: '127.0.0.1',
    port: '3306',
    user: 'root',
    password: '123123', //你的密码
    dateStrings: true
};
```

+ 填写微信登录和微信支付配置

src/common/config/config.js
```
// default config
module.exports = {
  default_module: 'api',
  weixin: {
    appid: '', // 小程序 appid
    secret: '', // 小程序密钥
    mch_id: '', // 商户帐号ID
    partner_key: '', // 微信支付密钥
    notify_url: '' // 微信异步通知，例：https://www.hiolabs.com/api/pay/notify
  }
};
```

+ 安装依赖并启动
```
npm install
npm start
```
启动后，本地访问 http://127.0.0.1:8360/

### 功能列表
+ 首页：搜索、Banner、公告、分类Icons、分类商品列表
+ 详情页：加入购物车、立即购买、选择规格
+ 搜索页：排序
+ 分类页：分页加载商品
+ 我的页面：订单（待付款，待发货，待收货），足迹，收货地址

### 项目截图
请参考微信小程序项目：https://github.com/iamdarcy/hioshop-miniprogram

- 项目地址：https://github.com/iamdarcy/hioshop-server
- 喜欢别忘了 Star，有问题可通过微信、QQ群联系我，谢谢您的关注。
<img width="750" height="400" src="http://lucky-other.meiweiyuxian.com/github/contact.jpg"/>
