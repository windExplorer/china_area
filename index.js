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
let COUNT = 0;
// 等级和classname映射表
const LEVEL_MAP = {
  1: ".provincetable a",
  2: ".citytr",
  3: ".countytr",
  4: ".towntr",
  5: ".villagetr",
};
// 循环检测class
const LOOP_CHECK_CLASS = [LEVEL_MAP[3], LEVEL_MAP[4], LEVEL_MAP[5]];
const LEVEL_STR = {
  1: "省",
  2: "市",
  3: "区/县",
  4: "镇/街道",
  5: "村/社区",
};

const URL = `https://www.stats.gov.cn/sj/`;

(async () => {
  TIME_S = +new Date();
  com.elog(
    `###### 开始采集: 采集最终等级LV${endLevel}-【${LEVEL_STR[endLevel]}】`
  );
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
    await end();
  }
  await page.close();
  const { year, url } = res;
  com.elog(`## 最新划分[${year}]`);
  // 采集目录页
  elog("目录", 1, "开始采集...", url);
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
    elog("目录", 1, `没采集到目录`);
    await end();
  }
  await page2.close();
  elog("目录", 1, `采集成功，共计${res2.length}条数据`);
  // 开始写数据库
  MENU = await writeDB(res2, 0);
  // 判断最终级别
  if (endLevel === 1) {
    await end();
  }
  await step2();
  await end();
})();

// 采集二级
async function step2() {
  const LV = 2;
  // 按省份采集
  for (let i = 0; i < MENU.length; i++) {
    const { name, url, id } = MENU[i];
    elog(name, LV, "开始采集", url);
    let res = await grabCom(url, [LEVEL_MAP[2]]);
    if (!res) {
      elog(name, LV, "没采集到数据，跳过");
      continue;
    }
    res = res.map((v) => ({ ...v, level: LV }));
    if (conf.NO_ZX) {
      const arr2 = res.filter((v) => v.name.includes("直辖"));
      if (arr2.length > 0) {
        elog(name, LV, "提权【直辖】数据");
        // 提权 省直辖县级行政区划 内数据, 筛选出 直辖 相关的，直接采集到数据进行填充
        const res2 = await step2_2(arr2, 2);
        elog(name, LV, `提权【直辖】数据完毕，共${res2.length}条`);
        res = res.filter((v) => !v.name.includes("直辖"));
        res = [...res, ...res2];
      }
    }
    const res2 = await writeDB(res, id);
    elog(name, LV, `下级数据（${LEVEL_STR[LV]}）写入完毕，共${res2.length}条`);
    if (endLevel <= 2) {
      elog(name, LV, `采集级别设置为2，不进行后续级别采集`);
      continue;
    }
    // 如果是采集高于2级，继续采集后续等级
    await step3(res2, 3);
    elog(name, LV, "采集完毕");
  }
}

// - 从这里开始自适应class - 通用采集 - 返回每次采集的数组
async function step2_2(list = [], level = 2) {
  const arr = [];
  // 通用采集
  for (let i = 0; i < list.length; i++) {
    const v = list[i];
    if (!v.href) {
      continue;
    }
    elog(v.name, level, `开始采集`);
    let res = await grabCom(v.href);
    if (res) {
      arr.push(...res.map((v) => ({ ...v, level })));
    }
  }
  return arr;
}

// 3 - 4 - 5级 递归采集
async function step3(list = [], level = 3) {
  for (let i = 0; i < list.length; i++) {
    const v = list[i];

    // com.elog(`## [LV${level}]正在采集 ${v.name}: ${v.href}`);
    elog(v.name, level, `开始采集`, v.href);
    if (!v.href) {
      // com.elog(`## [LV${level}]采集地址为空，跳过`);
      elog(v.name, level, `采集地址为空，跳过`);
      continue;
    }
    let res = await grabCom(v.href);
    if (!res) {
      // com.elog(`## [LV${level}]没有采集到数据，跳过`);
      elog(v.name, level, `没有采集到数据，跳过`);
      continue;
    }
    res = res.map((v) => ({ ...v, level }));
    const res2 = await writeDB(res, v.id);
    // com.elog(
    //   `## [LV${level}]【${v.name}】下${LEVEL_STR[level]}写入数据库完毕，共${res2.length}条`
    // );
    elog(
      v.name,
      level,
      `下级数据（${LEVEL_STR[level]}）写入完毕，共${res2.length}条`
    );
    if (endLevel <= level) {
      // com.elog(`## 采集级别设置为${level}，不进行后续级别采集`);
      elog(v.name, level, `采集级别设置为${level}，不进行后续级别采集`);
      continue;
    }
    // 如果是采集高于当前等级，继续采集下一级
    if (level < 5) {
      await step3(res2, level + 1);
    }
    elog(v.name, level, `采集完毕`);
  }
}

// 通用采集函数
async function grabCom(U, CLASSES = LOOP_CHECK_CLASS) {
  const page = await browser.newPage();
  await page.goto(U, { waitUntil: "domcontentloaded" });
  let res = await page.evaluate((CLASSES) => {
    // 循环检测类型
    let eles;
    for (let i = 0; i < CLASSES.length; i++) {
      eles = document.querySelectorAll(CLASSES[i]);
      if (eles && eles.length > 0) {
        break;
      }
    }
    if (eles.length > 0) {
      const arr = [];
      eles.forEach((ele) => {
        const as = ele.querySelectorAll("a");
        const tds = ele.querySelectorAll("td");
        if (as && as.length > 0) {
          arr.push({
            code: as[0].innerText,
            href: as[0].href,
            name: as[1].innerText,
            // level: 2,
          });
        } else {
          arr.push({
            code: tds[0].innerText,
            href: "",
            name: tds[1].innerText,
            // level: 2,
          });
        }
      });
      return arr.length > 0 ? arr : null;
    }
    return null;
  }, CLASSES);
  await page.close();
  return res;
}

// 写数据库 后续：怕有重名的数据，这里使用单条数据写入
async function writeDB_Alone(v, pid = 0) {
  return await knex(TB).insert({
    pid,
    code: v.code,
    name: v.name,
    level: v.level,
  });
}

// 写数据库 - 用循环单个插入，返回带id的数组
async function writeDB(list = [], pid = 0) {
  for (let i = 0; i < list.length; i++) {
    list[i] = {
      ...list[i],
      id: (await writeDB_Alone(list[i], pid))[0],
    };
  }
  // 此处新增采集数量
  COUNT += list.length;
  return list;
}

async function close() {
  browser && (await browser.close());
  knex && (await knex.destroy());
}

// 结束
async function end() {
  await close();
  com.elog(
    `###### 采集完毕，共${COUNT}条数据， 耗时: ${(
      (+new Date() - TIME_S) /
      1000
    ).toFixed(2)}s`
  );
  process.exit();
}

// 输出格式化
function elog(name = "", level = "", str = "", link = "") {
  let s = `##[已采集: ${COUNT}]## 正在采集*[LV${level}]【${name}】*${str}`;
  if (conf.SHOW_LINK && link) {
    s += ` 目标地址: ${link}`;
  }
  com.elog(s);
}

async function checkDB() {
  let flag = true;
  // 判断是否存在数据库
  com.elog(`## 检测数据库配置...`);
  let hasTab;
  try {
    hasTab = await knex.schema.hasTable(TB);
  } catch (e) {
    com.elog(`## 数据库检测失败!`);
    await end();
  }
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
    await knex.schema.raw(sql).catch(async (e) => {
      console.log(e.toString());
      com.elog(`## 表创建失败`);
      await end();
    });
    com.elog(`## 表${TB}创建成功`);
  } else {
    com.elog(`## 数据库检测通过`);
  }
}
