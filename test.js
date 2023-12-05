const com = require("./com");
const puppeteer = require("puppeteer");
const conf = require("./config");

const knex = require("knex")({
  client: "mysql2",
  connection: conf.DB,
  pool: { min: 0, max: 7 },
});

const TB = conf.TB;
const argv = process.argv;
const endLevel = com.int(argv[2] || 3);
let browser;
let MENU = [];
let TIME_S;
// 等级和classname映射表
const LEVEL_MAP = {
  1: ".provincetable a",
  2: ".citytr",
  3: ".countytr a",
  4: ".towntr a",
  5: ".villagetr a",
};

const URL = `https://www.stats.gov.cn/sj/`;

(async () => {
  await checkDB();
  // ...
  browser = await puppeteer.launch({
    headless: "new",
    slowMo: 100,
    defaultViewport: { width: 960, height: 540 },
  });
  const page = await browser.newPage();
  com.elog(`## 获取最新数据链接...`);
  await page.goto(URL, { waitUntil: "networkidle0" });
  const res = await page.evaluate(() => {
    const ele = document.querySelector(".qhdm-year a");
    if (ele) {
      return {
        year: ele.innerText,
        url: ele.href,
      };
    }
    return null;
  });
  if (!res) {
    com.elog(`## 没有获取到最新链接`);
    close();
    return;
  }
  await page.close();
  const { year, url } = res;
  com.elog(`## 最新划分[${year}] ${url}`);
  com.elog(`## 计时开始`);
  TIME_S = +new Date();
  // 采集目录页
  com.elog(`## 开始采集目录页...`);
  const page2 = await browser.newPage();
  await page2.goto(url, { waitUntil: "networkidle0" });
  const res2 = await page2.evaluate((LEVEL_MAP) => {
    const eles = document.querySelectorAll(LEVEL_MAP[1]);
    if (eles.length > 0) {
      const arr = [];
      eles.forEach((e) => {
        arr.push({
          code: "",
          level: 1,
          name: e.innerText.replace(/\n/g, ""),
          url: e.href,
        });
      });
      return arr;
    }
    return null;
  }, LEVEL_MAP);
  if (!res2) {
    com.elog(`## 没用采集到目录`);
    end();
    return;
  }
  await page2.close();
  com.elog(`## 目录页采集成功，共计${MENU.length}条数据`);
  // 开始写数据库
  //   await writeDB(MENU);
  MENU = await writeDB(res2, 0);
  // 判断最终级别
  if (endLevel === 1) {
    end();
    return;
  }
  await step2();
  end();
})();

// 采集二级
async function step2() {
  // 按省份采集
  for (let i = 0; i < MENU.length; i++) {
    const { name, url, id } = MENU[i];
    com.elog(`## 正在采集: ${name}: ${url}`);
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded" });
    const res = await page.evaluate((LEVEL_MAP) => {
      const eles = document.querySelectorAll(LEVEL_MAP[2]);
      if (eles.length > 0) {
        const arr = [];
        eles.forEach((ele) => {
          const as = ele.querySelectorAll("a");
          const tds = ele.querySelectorAll("td");
          if (as) {
            arr.push({
              code: as[0].innerText,
              href: as[0].href,
              name: as[1].innerText,
              level: 2,
            });
          } else {
            arr.push({
              code: tds[0].innerText,
              href: "",
              name: tds[1].innerText,
              level: 2,
            });
          }
        });
        return arr;
      }
      return null;
    }, LEVEL_MAP);
    // console.log(res);
    await page.close();

    const res2 = await writeDB(res, id);

    // console.log(res2);
    if (name === "河北省") break;
    if (endLevel === 2) {
      continue;
    }
    await step3(res2);
  }
}

async function step3(list = []) {}

// 采集4级
async function step4(list = []) {}

// 写数据库 后续：怕有重名的数据，这里使用单条数据写入
async function writeDB_Alone(v, pid = 0) {
  return await knex(TB).insert({
    pid,
    code: v.code,
    name: v.name,
    level: v.level,
  });
}

// 【暂时弃用】写数据库 - 这里使用批量插入，如果需要获取id，在需要的地方进行查询获取
async function writeDB(list = [], pid = 0) {
  //   if (list.length === 0) return;
  //   list = list.map((v) => {
  //     return {
  //       pid,
  //       code: v.code,
  //       name: v.name,
  //       level: v.level,
  //     };
  //   });
  //   await knex(TB).insert(list);
  for (let i = 0; i < list.length; i++) {
    list[i] = {
      ...list[i],
      id: (await writeDB_Alone(list[i], pid))[0],
    };
  }
  return list;
}

async function close() {
  await browser.close();
  await knex.destroy();
}

// 结束
async function end() {
  com.elog(
    `#### 采集完毕 耗时: ${((+new Date() - TIME_S) / 1000).toFixed(2)}s`
  );
  close();
}

async function checkDB() {
  let flag = true;
  // 判断是否存在数据库
  com.elog(`## 检测数据库配置...`);
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
    com.elog(`## 表${TB}创建成功`);
  } else {
    com.elog(`## 数据库检测通过`);
  }
}
