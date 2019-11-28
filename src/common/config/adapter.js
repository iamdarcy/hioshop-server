const fileCache = require('think-cache-file');
const {
    Console,
    File,
    DateFile
} = require('think-logger3');
const path = require('path');
const database = require('./database.js');
const nunjucks = require('think-view-nunjucks');
const isDev = think.env === 'development';
/**
 * cache adapter config
 * @type {Object}
 */
exports.cache = {
    type: 'file',
    common: {
        timeout: 24 * 60 * 60 * 1000 // millisecond
    },
    file: {
        handle: fileCache,
        cachePath: path.join(think.ROOT_PATH, 'runtime/cache'), // absoulte path is necessarily required
        pathDepth: 1,
        gcInterval: 24 * 60 * 60 * 1000 // gc interval
    }
};
/**
 * model adapter config
 * @type {Object}
 */
exports.model = {
    type: 'mysql',
    common: {
        logConnect: isDev,
        logSql: isDev,
        logger: msg => think.logger.info(msg)
    },
    mysql: database
};
/**
 * logger adapter config
 * @type {Object}
 */
exports.logger = {
    type: isDev ? 'console' : 'dateFile',
    console: {
        handle: Console
    },
    file: {
        handle: File,
        backups: 10, // max chunk number
        absolute: true,
        maxLogSize: 50 * 1024, // 50M
        filename: path.join(think.ROOT_PATH, 'logs/app.log')
    },
    dateFile: {
        handle: DateFile,
        level: 'ALL',
        absolute: true,
        pattern: '-yyyy-MM-dd',
        alwaysIncludePattern: true,
        filename: path.join(think.ROOT_PATH, 'logs/app.log')
    }
};
exports.view = {
    type: 'nunjucks', // 这里指定默认的模板引擎是 nunjucks
    common: {
        viewPath: path.join(think.ROOT_PATH, 'view'), //模板文件的根目录
        sep: '_', //Controller 与 Action 之间的连接符
        extname: '.html' //模板文件扩展名
    },
    nunjucks: {
        handle: nunjucks,
        beforeRender: () => {}, // 模板渲染预处理
        options: { // 模板引擎额外的配置参数
        }
    }
}