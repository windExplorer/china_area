const com = require("./com");
const conf = require("./config");
const cheerio = require("cheerio");

const knex = require("knex")({
  client: "mysql2",
  connection: conf.DB,
  pool: { min: 0, max: 7 },
});

const TB = conf.TB;

// const HOME_URL = "http://www.stats.gov.cn/sj/";

// const BASE = "http://www.stats.gov.cn/tjsj/tjbz/tjyqhdmhcxhfdm/";
const BASE = "http://www.stats.gov.cn";

// 获取命令行参数：0 1 [2 3] (node index.js)
// 命令: node
// 第一个参数: index.js

// 场景一（默认场景）
/* 
    [选填]第二个参数(数字): 采集级别，默认3级。一般是3级[省市区]，最高5级
    [选填]第三个参数: 显示url地址，默认2: false, 可选1
*/

// 场景二（该场景的前提是场景一采集完毕）
/* 
    [选填]第二个参数(tree): 生成树形结构，是数据库中采集的数据转换成树。目前暂不支持选择级别，默认就是数据库中存在的。
    [选填]第三个参数(json): 生成文件格式，默认是json，可选js, json
*/
const argv = process.argv;
//console.log(argv)
const ERR_LOG = com.ERR_LOG;
let total = 0,
  count = 0,
  domain = "",
  re_try = conf.RE_TRY || 5,
  end_level = argv[2] || 3,
  show_link = argv[3] || 2,
  exportFile = "";
if ("tree" === end_level) {
  if (!["json", "js"].includes(show_link)) {
    show_link = "json";
  }
  exportFile = `${TB}.${show_link}`;
  exp();
} else {
  end_level = com.int(end_level);
  show_link = show_link == 1 ? true : false;
  start();
}

// 生成文件
async function exp() {
  let hasTab = await knex.schema.hasTable(TB);
  if (!hasTab) {
    com.elog(`## 表不存在`);
    knex.destroy();
    return;
  }
  const sourceList = await knex.select().from(TB);
  let list = com.generatTree2(sourceList);
  switch (show_link) {
    case "js":
      com.wFile(exportFile, `const areaList = ${JSON.stringify(list)}`);
      break;
    default:
      com.wFile(exportFile, JSON.stringify(list));
  }
  knex.destroy();
}

// 采集数据
async function start() {
  let flag = true;
  // 判断是否存在数据库
  let hasTab = await knex.schema.hasTable(TB);
  if (!hasTab) {
    // 创建数据库表
    let sql =
      "CREATE TABLE `" +
      TB +
      "`  (" +
      "  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '编号'," +
      "  `pid` bigint(20) NULL DEFAULT 0 COMMENT '父节点'," +
      "  `code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '统计用区划代码'," +
      "  `code2` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '城乡分类代码'," +
      "  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '名称'," +
      "  `level` tinyint(2) NULL DEFAULT 0 COMMENT '级别'," +
      "  PRIMARY KEY (`id`) USING BTREE" +
      ") ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;";

    let createTab = await knex.schema.raw(sql).catch((e) => {
      console.log(e.toString());
      com.elog(`## 表创建失败`);
      flag = false;
    });
    if (!createTab) {
      com.elog(`## 表创建失败`);
      flag = false;
    }
    if (!flag) {
      knex.destroy();
      return;
    }
    com.elog(`表${TB}创建成功`);
  }
  // 获取最新的链接
  const home_url = `${BASE}/sj/`;
  let res = await com.req(home_url);
  //let body = iconv.decode(res.rawBody, 'utf8').toString()
  let body = res.body;
  if (!body) {
    com.elog(`## 没有获取到数据 ${home_url}`);
    knex.destroy();
    return;
  }
  let $ = cheerio.load(body);
  let a = $(".qhdm-year a:eq(0)");
  let url = a.attr("href");
  let year = com.trim(a.text());
  if (!url) {
    com.elog(`## 没有获取到最新链接`);
    knex.destroy();
    return;
  }
  // url = BASE + url
  com.elog(`## 最新划分[${year}] ${url}`);
  // 正式开始采集
  await step2(url);

  knex.destroy();
}

async function step2(u) {
  let time_s = +new Date(),
    d = await com.req_iconv(u, conf.CHARSET),
    u0 = u.split("/");
  u0[u0.length - 1] = "";
  u0 = u0.join("/");
  domain = u0;
  if (!d) {
    com.elog("### 请求出错，退出作业");
    return false;
  }
  let $ = cheerio.load(d),
    res = $(".provincetr a");
  if (res.length == 0) {
    com.elog(`### 没有找到数据`);
    return false;
  }
  total += res.length;
  for (let i = 0; i < res.length; i++) {
    let grab_time_s = +new Date();
    let dom = $(res[i]),
      name = dom.text(),
      link_str = dom.attr("href").split(".")[0] + "/",
      link = u0 + dom.attr("href");
    let data = {
      pid: 0,
      code: "",
      name: name,
      level: 1,
    };
    console.log();
    console.log();
    com.elog(`#### [${count}/${total}] 正在采集 ${name}`);
    let id = await knex(TB).insert(data);
    count += 1;
    // console.log(id)
    if (id > 0) {
      com.elog(`#### 开始插入 ${name} 数据: `);
      let ret = await grab(id, link, 2, link_str);
      com.elog(`##################### ${ret}`);
    }
    com.elog(
      `#### ${name} 采集完毕 耗时: ${(
        (+new Date() - grab_time_s) /
        1000
      ).toFixed(2)}s`
    );
  }
  com.elog(
    `##### 全部采集完毕，共采集[${count}/${total}] 耗时: ${(
      (+new Date() - time_s) /
      1000
    ).toFixed(2)}s`
  );
  return true;
}

function grab(pid, link, level, link_str) {
  return new Promise((resolve, reject) => {
    (async () => {
      //await com.sleep(1500)
      let tag = "citytr",
        lv = 2,
        u_str = link_str;
      if (level == 2) {
        lv = 2;
        u_str = "";
      }
      if (level == 3) {
        tag = "countytr";
        lv = 3;
      } else if (level == 4) {
        tag = "towntr";
        lv = 4;
      } else if (level == 5) {
        tag = "villagetr";
        lv = 5;
      }
      let d, $, res;
      //console.log(`link_Str: ${u_str}  level: ${level}  length: ${res.length} url: ${link}`)
      //console.log(link)
      //console.log(res.length + `[${link}]`)
      let sec = 0;
      for (let i = 0; i <= re_try; i++) {
        let tmp_d = await com.req_iconv(link, conf.CHARSET);
        if (!tmp_d) {
          if (i < re_try) {
            sec += 10;
            com.elog(`###### 没有数据，${sec}秒后进行第${i + 1}次重试`);
            await com.sleep(sec * 1000);
            continue;
          }
        }
        let tmp_$ = cheerio.load(tmp_d),
          tmp_res = tmp_$(`.${tag}`);

        if (tmp_res.length == 0) {
          tag = "towntr";
          tmp_res = tmp_$(`.${tag}`);
          if (tmp_res.length == 0) {
            tag = "villagetr";
            tmp_res = tmp_$(`.${tag}`);
          }
        }
        d = tmp_d;
        $ = tmp_$;
        res = tmp_res;
        break;
      }
      if (res.length == 0) {
        com.elog(`重试结束，但仍然失败: ${link}  => no result\r\n`);
        // 写日志
        com.wFile(
          ERR_LOG,
          `重试结束，但仍然失败: ${link}  => no result\r\n`,
          "a"
        );
        resolve("no result");
      }

      total += res.length;
      for (let i = 0; i < res.length; i++) {
        let dom = $(res[i]),
          td = dom.find("td"),
          a = dom.find("a"),
          str = u_str;
        //console.log(td.length)
        if (a.length == 0) {
          let code = td.eq(0).text();
          let data = {
            pid: pid,
            code: conf.SHORT_CODE && end_level <= 3 ? com.str_cut(code) : code,
            name: td.eq(1).text(),
            level: lv,
          };
          if (td.length == 3) {
            data.code2 = data.name;
            data.name = td.eq(2).text();
          }
          //console.log(data)
          com.elog(
            `### [${count}/${total}] 正在采集1 ${data.name} [${
              show_link ? link : "*_*"
            }]`
          );
          let ret_pid = await knex(TB).insert(data);
          count += 1;
          //resolve(ret_pid)
          continue;
        } else {
          let code = a.eq(0).text();
          let data = {
            pid: pid,
            code: conf.SHORT_CODE && end_level <= 3 ? com.str_cut(code) : code,
            name: a.eq(1).text(),
            level: lv,
          };
          if (td.length == 3) {
            data.code2 = data.name;
            data.name = a.eq(2).text();
          }
          //console.log(data)
          com.elog(
            `### [${count}/${total}] 正在采集2 ${data.name} [${
              show_link ? link : "*_*"
            }]`
          );
          let ret_pid = await knex(TB).insert(data);
          count += 1;
          if (lv >= end_level) {
            continue;
          }
          // 继续遍历
          let u = a.eq(0).attr("href");
          if (u) {
            link = domain + str + u;
            //console.log(link)
            // console.log(`继续遍历: ${link}`, a.attr("href"));
            str = u_str + u.split("/")[0] + "/";
            await grab(ret_pid, link, lv + 1, str);
          } else {
            com.elog(
              `### [${count}/${total}] 没有了2 ${data.name} [${
                show_link ? link : "*_*"
              }]`
            );
          }
        }
      }

      resolve("grab section end");
    })(pid, link, level, link_str);

    //return 'success'
  });
}
