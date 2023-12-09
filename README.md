# 中国统计用区划代码

# 采集速度有点慢...

## 介绍

全国统计用区划代码和城乡划分代码采集

## 软件架构

- 本项目采用 nodejs + mysql
- 当前采集的是最新的全国统计用区划代码和城乡划分代码(会自动检测最新的数据源)
- 目标地址 [全国统计用区划代码和城乡划分代码](http://www.stats.gov.cn/sj/)
- 项目(V0)创建日期: 2020/08/17 `详情可参见分支2021 的 v0目录`
- V1 版本创建日期: 2021/04/28 `详情可见分支2021`
- V2 版本创建日期: 2023/06/28 `2022分支`
- V3 版本创建日期: 2023/12/06 `master分支`

## 说明

- 软件不是很完善，但基本能满足需要。
- 不想自己采集可以直接使用项目中的数据库文件
  - `data/area.sql` 省市区三级 (2023-12-06 采集)
  - `data/area_full.sql` 全量数据 (2023-12-07 采集)
- `.sql`导出工具: `navicat`
- **数据中不包括港澳台地区**
- 可将问题提交到 issue
- 可加 QQ: `1479221500`，一起探讨交流技术
- 可加群聊天吹水: `320327825`

## 安装教程

1. 创建`msyql`数据库 `china_area`或者其他名字
   - 推荐使用`mysql8.0` 或 `mysql5.7`
   - 使用字符集: `uft8mb4`
   - 排序规则: `utf8mb4_general_ci`
2. 推荐使用 `yarn`
   - `npm install -g yarn`
   - `yarn config set registry https://registry.npmmirror.com`
   - `yarn`
3. 如果不想使用 `yarn` 也可以使用 `npm`
   - `npm config set registry https://registry.npmmirror.com`
   - 也可以用`cnpm`: `npm install -g cnpm --registry=https://registry.npmmirror.com`
   - `npm install` 或 `cnpm install`
4. 配置一下`config.js` (配置项跟着注释来)
5. 运行 `yarn go` 或 `npm run go` 即可开始采集

## 使用说明 （如果是 npm，则将 yarn xx 改成 npm run xx）

0. 如果是 windows 平台，需要先输入命令 `chcp 65001` 否则会中文乱码
1. `yarn go` 采集 `省市区` 三个级别
2. `yarn full` 采集 `省市区镇村` 五个级别，全量采集
3. `yarn exp` 采集完成后执行，生成 `json` 文件
4. `yarn exp js` 采集完成后执行，生成 `js` 文件
5. `yarn exp txt` 采集完成后执行，生成 `txt` 文件

## 注意事项

1. 采集前请检查`config.js`中`TB`是否修改，默认会继续往后面添加数据，建议使用空表。
2. `windows`平台采集前需要输入命令 `chcp 65001`，否则会乱码，参考[unicode-and-windows-terminal](https://getpino.io/#/docs/help?id=unicode-and-windows-terminal)
3. ~~采集 5 级数据可能会导致内存溢出，需要时不时手动清理一下内存，后续版本想办法修复，3 级没什么问题。~~
4. 请不要开多个进程采集，可能导致请求出错而终止，触发防采集机制。
5. 采集的时候也别浏览相关页面，可能触发防采集机制。
6. 采集速度变慢了，习惯就好(!\_!) 稳定最重要~~
7. 需要有耐心！

## 数据采集测试

> 多次测试结论: 首次采集完成后会有缓存，后续采集会变快

- [2023-12-08] 2023 年的省市区数据总共 `4072` 条数据，采集用时: `69.45秒`
- [2023-12-08] 2023 年的省市区数据总共 `4072` 条数据，采集用时: `150.45秒`
- [2023-12-08] 2023 年的省市区数据总共 `4072` 条数据，采集用时: `423.42秒`
- [2023-12-07] 2023 年的省市区数据总共 `4072` 条数据，采集用时: `48.55秒`
- [2023-12-07] 2023 年全量数据共 `665376` 条数据，采集用时: `51387.27秒` 大约 `14小时17分钟`
- [2023-12-06] 2023 年的省市区数据总共 `4072` 条数据，采集用时: `419.76秒`
- [2023-06-28] 2022 年的省市区数据总共 `3711` 条数据，经多次采集测试，最快用时: `41.63秒`
- [2023-06-28] 2022 年全量数据共 `664476` 条数据，采集用时: `9666.50秒` 大约 `2小时41分钟`

## 开发计划

- 断点采集
  - 多层级采集会遇到采集请求报错采集中断，不得不重新采集，太浪费时间，后续希望能添加在报错的地方继续采集的功能，防止之前采集的数据报废。
  - 思路: 回头再思考一番
    - 数据库记录采集 url
    - 断点续采集就是获取数据库信息生成树形结构，递归遍历判断
- 支持更多数据
  - 港澳台
  - 其他国家
- 图形界面
  - electron
  - web
  - 等等
- 脱离 mysql 数据库
  - 直接生成 json
  - 等等
- 支持更多数据库
  - sqlite
  - postgreSQL
  - mongodb
  - mariadb
  - 等等
- 支持更多数据操作
  - 数据多样查询
  - 数据按需导出
- 支持更多采集操作
  - 只采集某个省份
  - 只采集某个城市
  - 只采集某个区县
  - 只采集某个乡镇
  - 等等

## 更新日志

### V3.4

- 时间: 2023/12/09 19:00
- 内容:
  - 增加续采功能
  - 发现问题: 采集速度有点慢

### V3.3

- 时间: 2023/12/07 15:50
- 内容:
  - 大幅提升采集速度

### V3.2

- 时间: 2023/12/07 01:20
- 内容:
  - 采集了几个小时请求超时报错，添加重试功能，重新采集

### V3.1

- 时间: 2023/12/06
- 内容:
  - 更新所有依赖
  - 新增日志插件`pino`，优化日志输出
  - 解决采集高于 3 级别内存占用太多的 bug
  - 值得注意的是: windows 平台采集前输入命令 `chcp 65001` 设置控制台的字符编码为 UTF-8，以便正确显示和处理 Unicode 字符。

### V3.0

- 时间: 2023/12/06
- 内容:
  - 重构代码，弃用 `got` + `cheerio`，原因是太不稳定，经常请求超时
  - 重构代码，使用新的采集框架 `puppeteer`，删除一些非必要的库
  - 重构代码，更新采集规则
  - 优化采集逻辑，将`省直辖县级行政区划`等区划合并到上一级，可看配置项 `NO_ZX`，默认是开启，详情可看 ISSUE [I826LM](https://gitee.com/sshift/china_area/issues/I826LM)
  - 还存在 `县直辖村级区划`，级别太低了，这个暂时先不管，后面有需求再优化
  - ~~更新全量数据 `data/area_full.sql`~~
  - 更新 3 级数据 `data/area.sql`
  - 重构代码后，采集速度变慢了，习惯就好(i_i) 稳定最重要~~

### V2.1

- 时间: 2023/06/29
- 内容:
  - 采集全量数据 `data/area_full.sql`

### V2.0

- 时间: 2023/06/28
- 内容:
  - 官网改版了，更新采集源链接和采集规则
  - 改用 yarn
  - 优化使用方法，简化命令

### V1.2

- 时间: 2022/01/14
- 内容:
  - 更新 2021 年数据采集规则: 数据编码由 gb2312 改为 utf8
  - 数据库存储的城市编码默认改为长编码。由于某些地区直接跳过了第三级导致短码一样（广东中山、广东东莞，海南儋州等）
  - 2021 年三级数据采集为 100s 左右，共 3717 条
  - 2020 年的数据已转移到了 data/2020 中，2021 年数据请自行采集生成

### V1.1

- 时间: 2021/12/23
- 更新:
  - 新增生成 json 和 js 文件

### V1.0

- 时间: 2021/04/28
- 更新:
  - 只需要创建数据库，配置表名会自动检测并创建表(如果表已经存在，会继续执行)
  - 优化了 got 请求，加入随机 UA 和伪造随机 ip(不知道有没有啥效果)
  - 采集比上一版本更加稳定
  - 会自动检测最新的数据源(上一版本只能采集 2019 年，需要手动修改链接)
  - 将数据库操作模块由`msyql`换成`kenx + mysql2`(用起来简单很多)
- 缺陷:
  - 如果采集中断开，无法在断开的位置采集，期待下次优化
  - 由于是逐条采集，4 级和 5 级的数据量比较多，所消耗的时间有点多，或许值得等待，但如果中途出错，就难受了
  - 日志和报错的记录还不太完善(没啥空弄)

### V0.3 2020/08/17 23:00:00

1. 将 request 全部换成 got
2. 修复已知 bug

### V0.2 2020/08/17

1. 加入重试，否则会出现请求失败导致数据不全
2. 如果是<3 级的数据, 区域代码只存储前面 6 位数

### V0.1 2020/08/17

1. 基本功能
2. 采集数据存储到 `msyql`
