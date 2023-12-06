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
  TB: "area5", // 表名,json文件,js文件名
  NO_ZX: true, // 有一些 "省直辖县级行政区划" 和 "自治区直辖县级行政区划" 如果是true则跳过该级别直接采集里面的数据
  SHOW_LINK: false, // 是否输出链接地址

  /* -- 下列是备用的配置项，暂时没用到 -- */
  RE_TRY: 10, // 重试次数
  SHORT_CODE: false, // 短的code(如果采集的数据<=3级,并且此项为true,那么采集到的code会进行精简)
  SEQ_LOG: "./seq.log", // 无用
  ERR_LOG: `./log/err_${com.now2()}.log`, //错误日志文件
  LINE: 2, // 无用
  CHARSET: "utf-8", // 2021年用的是utf-8，以往用的是gb2312
  /* -- 上面是备用的配置项，暂时没用到 -- */
};
