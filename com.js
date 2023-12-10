const moment = require("moment");
const fs = require("fs");
const path = require("path");
const pretty = require("pino-pretty");
const fileStream = fs.createWriteStream(`./log/app-${+new Date()}.log`);
const pino = require("pino");
const logger = pino(
  {},
  pino.multistream([
    { stream: fileStream },
    // { stream: process.stdout }, // 控制台输出
    { stream: pretty() },
  ])
);

module.exports = {
  formatFileName(dir, name) {
    let file = "";
    for (let i = 0; ; i++) {
      if (i == 0) file = `${dir}${name}.txt`;
      else file = `${dir}${name}_${i}.txt`;
      if (fs.existsSync(file)) {
        continue;
      } else {
        break;
      }
    }
    return file;
  },
  getUrlId(url) {
    let r = url.split("/");
    r = r[r.length - 1];
    r = r.split(".")[0];
    return r;
  },
  enBase64(str) {
    return Buffer.from(str).toString("base64");
  },
  deBase64(str) {
    return Buffer.from(str, "base64").toString();
  },
  // 休眠 ms
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },
  elog(txt) {
    // console.log(`[${this.now()}] ${txt}`);
    logger.info(txt);
  },
  time() {
    return new Date().toLocaleString();
  },
  now() {
    return moment().format("YYYY-MM-DD kk:mm:ss");
  },
  now2() {
    return moment().format("YYYYMMDDkkmmss");
  },
  // 递归创建目录 同步方法
  mkdirsSync(dirname) {
    if (fs.existsSync(dirname)) {
      return true;
    } else {
      if (this.mkdirsSync(path.dirname(dirname))) {
        fs.mkdirSync(dirname);
        return true;
      } else return false;
    }
  },
  // 格式化文件尺寸
  renderSize(value) {
    if (null == value || value == "") {
      return "0 Bytes";
    }
    let unitArr = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"],
      index = 0,
      srcsize = parseFloat(value);
    index = Math.floor(Math.log(srcsize) / Math.log(1024));
    let size = srcsize / Math.pow(1024, index);
    size = size.toFixed(2); //保留的小数位数
    return size + unitArr[index];
  },
  // &#x unicode转中文
  de_unesc(str) {
    if (str) return unescape(str.replace(/&#x/g, "%u").replace(/;/g, ""));
    else return str;
  },
  // 中文转 &#x unicode
  en_unesc(str) {
    return str.replace(/[^\u0000-\u00FF]/g, function (a) {
      return escape(a).replace(/(%u)(\w{4})/gi, "&#x$2;");
    });
  },
  // 随机数字
  rand_num(Min, Max) {
    let Range = Max - Min,
      Rand = Math.random();
    return Min + Math.round(Rand * Range);
  },
  // 时间戳(ms)转正常日期
  time_to_date(t) {
    return moment(t).format("YYYY-MM-DD");
  },
  // 时间戳转日期+时分秒
  time_to_datetime(t) {
    return moment(t).format("YYYY-M-D h:mm:ss");
  },
  trim(str) {
    //删除左右两端的空格
    return str.replace(/(^\s*)|(\s*$)/g, "");
  },
  ltrim(str) {
    //删除左边的空格
    return str.replace(/(^\s*)/g, "");
  },
  rtrim(str) {
    //删除右边的空格
    return str.replace(/(\s*$)/g, "");
  },
  atrim(str) {
    // 删除所有空
    return str.replace(/\s/g, "");
  },
  // 写文件
  wFile(file, txt = "", flag = "w") {
    // flag w a
    fs.writeFileSync(file, txt, { flag: flag });
  },
  // 计算文件大小
  fSize(file) {
    return this.renderSize(fs.statSync(file).size);
  },
  // 删除文件
  rm_file(file) {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  },
  // fread 读取文件
  fRead(file) {
    if (fs.existsSync(file)) return fs.readFileSync(file, "utf-8") || 0;
    else return false;
  },
  // 全局替换某些文字
  arep(str, txt, txt2 = "") {
    let regExp = new RegExp(this.escapeRegex(txt), "g");
    str = str.replace(regExp, txt2);
    return str;
  },
  // 正则转义
  escapeRegex(string) {
    return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  },
  // 随机ip
  randIp() {
    return (
      Math.floor(Math.random() * (10 - 255) + 255) +
      "." +
      Math.floor(Math.random() * (10 - 255) + 255) +
      "." +
      Math.floor(Math.random() * (10 - 255) + 255) +
      "." +
      Math.floor(Math.random() * (10 - 255) + 255)
    );
  },
  int(str) {
    return parseInt(str);
  },
  // 字符串截取
  str_cut(str, len = 6, start = 0) {
    return str.substr(start, len);
  },
  // 生成树
  generatTree(list = [], pid = 0) {
    let arr = [];
    for (let i = 0; i < list.length; i++) {
      let v = list[i];
      if (v.pid === pid) {
        v.children = [];
        v.children = this.generatTree(list, v.id);
        arr.push(v);
      }
    }
    return arr;
  },
  // 生成树 - 优质方法
  generatTree2(list = []) {
    let dict = {};
    list = list.map((v) => {
      dict[v.id] = v
      return {
        ...v,
        children: []  // 防止第一层没有children
      }
    });
    let arr = [];
    list.map((v) => {
      if (dict[v.pid]) {
        (dict[v.pid].children || (dict[v.pid].children = [])).push(
          (v.children = []) && v // 如果最后一条不加children就直接
        );
      } else {
        arr.push(v);
      }
    });
    return arr;
  },
};
