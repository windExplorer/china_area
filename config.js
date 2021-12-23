// 其中数据库是需要手动创建，而表名不需要
const com = require("./com");
module.exports = {
  // 数据库配置
  DB: {
    host: "127.0.0.1",
    port: "3306",
    user: "root",
    password: "root",
    database: "china_area",
    charset: "utf8mb4",
  },
  RE_TRY: 10, // 重试次数
  TB: "area", // 表名,json文件,js文件名
  SHORT_CODE: true, // 短的code(如果采集的数据<=3级,并且此项为true,那么采集到的code会进行精简)
  // SEQ_LOG: './seq.log', // 无用
  ERR_LOG: `./log/err_${com.now2()}.log`, //错误日志文件
  // LINE: 2, // 无用
};
