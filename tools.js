// 采集后的一些工具，生成json，js等
const com = require("./com");
const conf = require("./config");
const TB = conf.TB;
const argv = process.argv;
//console.log(argv)

/* 
    node tools.js
    node tools.js json
    node tools.js js
    node tools.js txt
*/

let ext = argv[2] || "json", // 导出文件类型 json  js  txt
  type = argv[3] || "sql", // 从哪里导出 sql  txt (txt后续版本开发)
  exportFile = "./data/";

let kenx;

if (type == "sql") {
  knex = require("knex")({
    client: "mysql2",
    connection: conf.DB,
    pool: { min: 0, max: 7 },
  });
}

if (!["json", "js", "txt"].includes(ext)) {
  ext = "json";
}
exportFile += `${TB}.${ext}`;
exp();

// 生成文件
async function exp() {
  let hasTab = await knex.schema.hasTable(TB);
  if (!hasTab) {
    com.elog(`## 表不存在`);
    knex.destroy();
    return;
  }
  const sourceList = await knex.select(...conf.EXP_FIELD).from(TB);
  let list = com.generatTree2(sourceList);
  switch (ext) {
    case "js":
      com.wFile(exportFile, `const areaList = ${JSON.stringify(list)}`);
      break;
    case "txt":
      expTxt(sourceList);
      break;
    default: // json
      com.wFile(exportFile, JSON.stringify(list));
  }
  knex.destroy();
}

function expTxt(list) {
  let str = `ID\t父级ID\t代码\t代码2\t名称\t级别`;
  for (const row of list) {
    str += `\r\n${row.id}\t${row.pid}\t${row.code}\t${row.code2 || ""}\t${
      row.name
    }\t${row.level}`;
  }
  com.wFile(exportFile, str);
}
