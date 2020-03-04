const path = require('path');
module.exports = [
{
    interval: '60s',
    enable: true,
    immediate: true,
    handle: "crontab/timetask"
}, 
{
    interval: '10s',
    enable: false,
    immediate: true,
    handle: "crontab/resetSql"
}
]