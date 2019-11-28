// default config
module.exports = {
  // 可以公开访问的Controller
  publicController: [
    // 格式为controller
    'index',
    'catalog',
    'auth',
    'goods',
    'search',
    'region',
    'address'
  ],

  // 可以公开访问的Action
  publicAction: [
    // 格式为： controller+action
    'cart/index',
    'cart/add',
    'cart/checked',
    'cart/update',
    'cart/delete',
    'cart/goodscount',
    'pay/notify'
  ]
};
