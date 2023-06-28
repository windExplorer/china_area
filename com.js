const moment = require("moment");
const fs = require("fs");
const path = require("path");
const got = require("got");
const iconv = require("iconv-lite");

const userAgents = [
  "Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.8.0.12) Gecko/20070731 Ubuntu/dapper-security Firefox/1.5.0.12",
  "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0; Acoo Browser; SLCC1; .NET CLR 2.0.50727; Media Center PC 5.0; .NET CLR 3.0.04506)",
  "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/535.11 (KHTML, like Gecko) Chrome/17.0.963.56 Safari/535.11",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_3) AppleWebKit/535.20 (KHTML, like Gecko) Chrome/19.0.1036.7 Safari/535.20",
  "Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.9.0.8) Gecko Fedora/1.9.0.8-1.fc10 Kazehakase/0.5.6",
  "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.71 Safari/537.1 LBBROWSER",
  "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Win64; x64; Trident/5.0; .NET CLR 3.5.30729; .NET CLR 3.0.30729; .NET CLR 2.0.50727; Media Center PC 6.0) ,Lynx/2.8.5rel.1 libwww-FM/2.14 SSL-MM/1.4.1 GNUTLS/1.2.9",
  "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322; .NET CLR 2.0.50727)",
  "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0; SLCC2; .NET CLR 2.0.50727; .NET CLR 3.5.30729; .NET CLR 3.0.30729; Media Center PC 6.0; .NET4.0C; .NET4.0E; QQBrowser/7.0.3698.400)",
  "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; QQDownload 732; .NET4.0C; .NET4.0E)",
  "Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:2.0b13pre) Gecko/20110307 Firefox/4.0b13pre",
  "Opera/9.80 (Macintosh; Intel Mac OS X 10.6.8; U; fr) Presto/2.9.168 Version/11.52",
  "Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.8.0.12) Gecko/20070731 Ubuntu/dapper-security Firefox/1.5.0.12",
  "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0; SLCC2; .NET CLR 2.0.50727; .NET CLR 3.5.30729; .NET CLR 3.0.30729; Media Center PC 6.0; .NET4.0C; .NET4.0E; LBBROWSER)",
  "Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.9.0.8) Gecko Fedora/1.9.0.8-1.fc10 Kazehakase/0.5.6",
  "Mozilla/5.0 (X11; U; Linux; en-US) AppleWebKit/527+ (KHTML, like Gecko, Safari/419.3) Arora/0.6",
  "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0; SLCC2; .NET CLR 2.0.50727; .NET CLR 3.5.30729; .NET CLR 3.0.30729; Media Center PC 6.0; .NET4.0C; .NET4.0E; QQBrowser/7.0.3698.400)",
  "Opera/9.25 (Windows NT 5.1; U; en), Lynx/2.8.5rel.1 libwww-FM/2.14 SSL-MM/1.4.1 GNUTLS/1.2.9",
  "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.125 Safari/537.36 Edg/84.0.522.59",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.108 Safari/537.36",
];

module.exports = {
  async req(u) {
    let res = null,
      flag = true,
      re = 5;
    for (let i = 0; i <= re; i++) {
      flag = true;
      res = await got(u, {
        headers: {
          "X-Forwarded-For": this.randIp(),
          "user-agent": userAgents[this.rand_num(0, userAgents.length - 1)],
        },
        timeout: 5000,
      }).catch((e) => {
        flag = false;
        console.log(`# ${e.toString()}`);
      });
      if (!flag) {
        this.elog(`# 正在重试: ${u}`);
        await this.sleep(1500);
        continue;
      }
      break;
    }
    return res || null;
  },
  async req_iconv(u, code = "gb2312") {
    let res = null,
      flag = true,
      re = 5;
    for (let i = 0; i <= re; i++) {
      flag = true;
      res = await got(u, {
        headers: {
          "X-Forwarded-For": this.randIp(),
          "user-agent": userAgents[this.rand_num(0, userAgents.length - 1)],
        },
        timeout: 5000,
      }).catch((e) => {
        flag = false;
        this.elog(`# ${e.toString()}`);
      });
      if (!flag) {
        this.elog(`# 正在重试: ${u}`);
        await this.sleep(1500);
        continue;
      }
      break;
    }
    let body;
    if (flag && res && res.rawBody) {
      body = iconv.decode(res.rawBody, code).toString();
    }
    return body || null;
  },
  formatDiffTime(s) {
    let diff = +new Date() - s;
  },
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
  // 获取连接中的id
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
    console.log(`[${this.now()}] ${txt}`);
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
  wFile(file, txt = "", flag = "w") { // flag w a
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
    list.map((v) => (dict[v.id] = v));
    let arr = [];
    list.map((v) => {
      if (dict[v.pid]) {
        (dict[v.pid].children || (dict[v.pid].children = [])).push(
          (v.children = []) && v // 如果最后一条不加children就直接v
        );
      } else {
        arr.push(v);
      }
    });
    return arr;
  },
};
