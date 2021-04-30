# 中国统计用区划代码

## 介绍

全国统计用区划代码和城乡划分代码采集

## 软件架构

- 本项目采用nodejs + mysql
- 当前采集的是最新的全国统计用区划代码和城乡划分代码(会自动检测最新的数据源)
- 目标地址 [全国统计用区划代码和城乡划分代码](http://www.stats.gov.cn/tjsj/tjbz/tjyqhdmhcxhfdm/)
- 项目(V0)创建日期: 2020/08/17 `详情可参见v0目录`
- V1版本创建日期: 2021/04/28

## 说明

- 软件不是很完善，但基本能满足需要。
- 不想自己采集可以直接使用项目中的数据库文件
    - `v1-3级.sql`  省市区三级
    - `v1-5级.sql`  省市区镇村五级
- *数据中包括港澳台地区*
- 有问题可以联系qq: `1479221500`，可以一起探讨交流技术
- 也欢迎将问题提交到issue

## 安装教程

1. 创建`msyql`数据库 `china_area`或者其他名字
    - 推荐使用`mysql8.0` 或 `mysql5.7`
    - 使用字符集: `uft8mb4`
    - 排序规则: `utf8mb4_general_ci`
3. 配置淘宝`npm`镜像 
    - `npm config set registry https://registry.npm.taobao.org` 
    - 也可以用`cnpm`
4. 命令行打开到项目根目录，输入 `npm install` 或 `cnpm install` 安装必需库
5. 配置一下`config.js` (配置项跟着注释来)
6. 运行 `node index.js` 即可开始采集

## 使用说明

1. `node index.js` 采集 `省、市、区` 三级
2. `node index.js 5` 采集 `省、市、区、镇、村` 五级(最高级别)
3. 2020年省市区3级成功数据条数大概是 `3721` 条
    - 经过测试：`57~60秒`可以采集完毕
4. 2020年5级的成功数据大概是 `679237` 条
    - 经过测试：`4.7~5小时`能采集完


## 更新日志

### V1.0

- 时间: 2021/04/28
- 更新:
    - 只需要创建数据库，配置表名会自动检测并创建表(如果表已经存在，会继续执行)
    - 优化了got请求，加入随机UA和伪造随机ip(不知道有没有啥效果)
    - 采集比上一版本更加稳定
    - 会自动检测最新的数据源(上一版本只能采集2019年，需要手动修改链接)
    - 将数据库操作模块由`msyql`换成`kenx + mysql2`(用起来简单很多)
- 缺陷:
    - 如果采集中断开，无法在断开的位置采集，期待下次优化
    - 由于是逐条采集，4级和5级的数据量比较多，所消耗的时间有点多，或许值得等待，但如果中途出错，就难受了
    - 日志和报错的记录还不太完善(没啥空弄)


### V0.3 2020/08/17 23:00:00

1. 将request全部换成got
2. 修复已知bug

### V0.2 2020/08/17

1. 加入重试，否则会出现请求失败导致数据不全
2. 如果是<3级的数据, 区域代码只存储前面6位数

### V0.1 2020/08/17
1. 基本功能
2. 采集数据存储到 `msyql`
