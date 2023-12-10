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
const LOOP_CHECK_CLASS = [LEVEL_MAP[2], LEVEL_MAP[3], LEVEL_MAP[4], LEVEL_MAP[5]];
const LEVEL_STR = {
  1: "省",
  2: "市",
  3: "区/县",
  4: "镇/街道",
  5: "村/社区",
};

// 最后的层级
let LAST_DATA = []
let LAST_DATA_IDS = []

const URL = `https://www.stats.gov.cn/sj/`;

(async () => {
  TIME_S = +new Date();
  com.elog(
    `###### 开始采集: 采集最终等级LV${endLevel}-【${LEVEL_STR[endLevel]}】`
  );
  const cdb = await checkDB();
  // ...
  browser = await puppeteer.launch({
    headless: "new",
    // slowMo: 100, // 慢速采集
    // defaultViewport: { width: 960, height: 540 },
  });
  if(!cdb) {
    // 如果数据库存在数据，就增量采集
    await ContinueStep();
  } else {
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
            href: e.href,
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
    elog("目录", 1, `采集成功, 共计${res2.length}条数据`);
    // 开始写数据库
    MENU = await writeDB(res2, 0);
    // 判断最终级别
    if (endLevel === 1) {
      await end();
    }
    for (let i = 0; i < MENU.length; i++) {
      await step2(MENU[i]);
    }
  }
  
  await end();
  return;
})();

// 采集二级
async function step2(row) {
  const LV = 2;
  // 按省份采集
  const { name, href, id } = row;
    elog(name, LV, "开始采集", href);
    let res = await grabCom(href, [LEVEL_MAP[2]]);
    if (!res) {
      elog(name, LV, "没采集到数据, 跳过");
      return
    }
    res = res.map((v) => ({ ...v, level: LV }));
    if (conf.NO_ZX) {
      const arr2 = res.filter((v) => v.name.includes("直辖"));
      if (arr2.length > 0) {
        elog(name, LV, "提权【直辖】数据");
        // 提权 省直辖县级行政区划 内数据, 筛选出 直辖 相关的, 直接采集到数据进行填充
        const res2 = await step2_2(arr2, 2);
        elog(name, LV, `提权【直辖】数据完毕, 共${res2.length}条`);
        res = res.filter((v) => !v.name.includes("直辖"));
        res = [...res, ...res2];
      }
    }
    const res2 = await writeDB(res, id);
    elog(name, LV, `下级数据（${LEVEL_STR[LV]}）写入完毕, 共${res2.length}条`);
    if (endLevel <= 2) {
      elog(name, LV, `采集级别设置为2, 不进行后续级别采集`);
      return
    }
    // 如果是采集高于2级, 继续采集后续等级
    await step3(res2, 3);
    elog(name, LV, "采集完毕");
  
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
      // com.elog(`## [LV${level}]采集地址为空, 跳过`);
      elog(v.name, level, `采集地址为空, 跳过`);
      continue;
    }
    let res = await grabCom(v.href);
    if (!res) {
      // com.elog(`## [LV${level}]没有采集到数据, 跳过`);
      elog(v.name, level, `没有采集到数据, 跳过`);
      continue;
    }
    res = res.map((v) => ({ ...v, level }));
    const res2 = await writeDB(res, v.id);
    // com.elog(
    //   `## [LV${level}]【${v.name}】下${LEVEL_STR[level]}写入数据库完毕, 共${res2.length}条`
    // );
    elog(
      v.name,
      level,
      `下级数据（${LEVEL_STR[level]}）写入完毕, 共${res2.length}条`
    );
    if (endLevel <= level) {
      // com.elog(`## 采集级别设置为${level}, 不进行后续级别采集`);
      elog(v.name, level, `采集级别设置为${level}, 不进行后续级别采集`);
      continue;
    }
    // 如果是采集高于当前等级, 继续采集下一级
    if (level < 5) {
      await step3(res2, level + 1);
    }
    elog(v.name, level, `采集完毕`);
  }
}

// 通用采集函数
async function grabCom(U, CLASSES = LOOP_CHECK_CLASS) {
  let attempts = 0;
  let lastError = null;
  const page = await browser.newPage();
  while (attempts < conf.RE_TRY) {
    try {
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
            let name = '', code2 = ''
            if (as && as.length > 0) {
              if(as.length === 3) {
                code2 = as[1].innerText;
                name = as[2].innerText;
              } else {
                name = as[1].innerText
              }
              arr.push({
                code: as[0].innerText,
                href: as[0].href,
                name,
                code2
                // level: 2,
              });
            } else {
              if(tds.length === 3) {
                code2 = tds[1].innerText;
                name = tds[2].innerText;
              } else {
                name = tds[1].innerText
              }
              arr.push({
                code: tds[0].innerText,
                href: "",
                name,
                code2
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
    } catch (err) {
      lastError = err;
      // console.error(`Attempt ${attempts + 1} failed: ${error.message}`);
      elog(
        "通用采集",
        0,
        `页面请求失败, 正在进行第${attempts + 1}重试 错误信息: ${err?.message}`,
        U
      );
      await new Promise((resolve) =>
        setTimeout(resolve, conf.DELAY_MS * attempts)
      );
      attempts++;
    }
  }
  // throw new Error(`Max retries (${maxRetries}) reached. Last error: ${lastError.message}`);
  // 重试结束依然报错
  elog(
    "通用采集",
    -1,
    `页面请求失败, 已重试${attempts}次, 终止重试, 终止采集, 最后一次错误信息: ${err?.message}`,
    U
  );
  await end();
}

// 断点续采 - 这个断点续采只针对同级别，后续再开发不限制级别的续采
async function ContinueStep() {
  // 从数据库获取所有记录
  let records = await knex(TB).select();
  COUNT = records.length
  records = records.map(v => ({...v, href: v.url}))
  // 获取最后一条数据的所有层级数据
  let last = records[records.length - 1];
  let count = 0
  let arr = [last]
  let ids = [last.id]
  while(count < 5) {
    count ++
    // 找pid
    const row = records.find((item) => item.id === last.pid);
    if(row) {
      last = row
      arr.push(last)
      ids.push(last.id)
    } else {
      break
    }
  }
  arr.reverse()
  ids.reverse()
  LAST_DATA = JSON.parse(JSON.stringify(arr))
  LAST_DATA_IDS = JSON.parse(JSON.stringify(ids))
  // console.log(ids)
  // 将数据转换成树状结构
  const tree = com.generatTree2(records)
  // await com.wFile('./tmp/tmp-0.json', JSON.stringify(tree.map((item) => ({...item, children: []}))));
  // 写入缓存文件，测试用
  await com.wFile('./tmp/tmp.json', JSON.stringify(tree));
  // 通过递归循环遍历树状结构
  await ContinueRecursion(tree)
}

// 递归断点续采
async function ContinueRecursion(tree) { 
  // 因为是递归，正常进行采集，判断层级和子集
  for(let i = 0; i < tree.length; i++) {
    const row = tree[i]
    // if(row.name === '山西省') {
    //   console.log('山西')
    //   await end()
    //   return
    // }
    // console.log(row.id, row.name, row.level === endLevel -1, row.children.length, LAST_DATA_IDS)
    await ContinueRecursion(row.children)
    
    // 先判断层级
    // 如果是倒数第二级别，只需要判断子集是否有数据，如果有就退出
    if(row.level === endLevel - 1) {
      // elog(row.name, row.level, '续采中', row.href)
      if(row.children.length > 0) {
        // 再判断一下id是否在ids里面, 不在就表示采集完成，退出递归
        if(!LAST_DATA_IDS.includes(row.id)) {
          continue
        }
      }
      // 子集没有数据就采集 - 使用通用采集
      await step3([row], row.level + 1)
    } else if (row.level < endLevel - 1) {
      // 如果层级小于倒数第二级别，就判断是否有子集，如果没有就采集，如果有就继续递归子集
      if(row.children.length === 0) {
        await step3([row], row.level + 1)
      } else {
        await ContinueRecursion(row.children)
      }
    } else {
      // 如果是最后一级别，直接退出
      return
    }
  }
}

// 写数据库 后续：怕有重名的数据, 这里使用单条数据写入
async function writeDB_Alone(v, pid = 0) {
  // if(LAST_DATA_IDS.length && LAST_DATA_IDS.includes(pid)) {
  //   // 从数据库查询，有的话就不写入
  //   const data = await knex(TB).where({pid, name: v.name}).select();
  //   if(data.length > 0) {
  //     return [[data[0].id], 1]
  //   }
  // }
  // 先检查
  if(LAST_DATA_IDS.length) {
    const data = await knex(TB).where({pid, name: v.name}).select();
    if(data && data.length > 0) {
      return [[data[0].id], 1]
    }
  }
  
  return [
    await knex(TB).insert({
      pid,
      code: v.code,
      code2: v?.code2 ?? "",
      name: v.name,
      level: v.level,
      url: v?.href ?? "",
    }), 0
  ]
}

// 写数据库 - 用循环单个插入, 返回带id的数组
async function writeDB(list = [], pid = 0) {
  // 断点续采，如果pid是倒数第二级别的id
  let jump = 0
  for (let i = 0; i < list.length; i++) {
    let id = (await writeDB_Alone(list[i], pid))
    jump += id[1]
    list[i] = {
      ...list[i],
      id: id[0],
    };
  }
  // 此处新增采集数量
  COUNT += list.length;
  COUNT -= jump
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
    `###### 采集完毕, 共${COUNT}条数据,  耗时: ${(
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
      "  `url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '链接'," +
      "  PRIMARY KEY (`id`) USING BTREE" +
      ") ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;";
    await knex.schema.raw(sql).catch(async (e) => {
      console.log(e.toString());
      com.elog(`## 表创建失败`);
      await end();
    });
    com.elog(`## 表${TB}创建成功`);
  } else {
    // 这里判断表已经存在，获取表中的数据并且接着最后的数据继续采集
    const count = await knex(TB).count('id as total');
    // console.log(count[0].total);
    if (count[0].total > 0) { 
      flag = false;
    }
    com.elog(`## 表${TB}已存在, 检测通过, 继续采集`);
  }
  return flag;
}
