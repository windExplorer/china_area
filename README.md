# 中国统计用区划代码

#### 介绍

全国统计用区划代码和城乡划分代码采集

#### 软件架构

- 本项目采用nodejs + mysql
- 当前采集的是最新的2019年的全国统计用区划代码和城乡划分代码
- 目标地址 [2019年 全国统计用区划代码和城乡划分代码](http://www.stats.gov.cn/tjsj/tjbz/tjyqhdmhcxhfdm/2019/index.html)
- 项目创建日期: 2020/08/17

#### 文件介绍

- area_null.sql 空表数据
- area.sql 省市区 3级数据
- config.js 配置文件
- com.js 共用方法文件
- index.js 主文件

#### 安装教程

1.  创建msyql数据库 `china_area`, 使用字符集: `uft8mb4`, 排序规则: `utf8mb4_general_ci`
2.  将项目根目录下的`area_null.js`导入到刚刚创建的数据库`china_area`中
3.  配置淘宝npm镜像 `npm config set registry https://registry.npm.taobao.org`
4.  命令行打开到项目根目录，输入 `npm install` 下载必需库
5.  配置一下`config.js`中的 `db` 属性
6.  运行 `node index.js` 即可开始采集

#### 使用说明

1.  `node index.js` 采集 `省、市、区` 三级
2.  `node index.js 5` 采集 `省、市、区、镇、村` 五级(最高级别)
3.  `node index.js 3 1` 显示采集的`url`地址
4.  助您采集顺利

#### 当前版本bug

1. 三级成功数据条数 大概是 3722 条
2. 由于程序是一次性采集完成的，不存在断点续爬。如果遇到停留时间很久，可以运行 `truncate area` 清空数据库表之后重新采集, 总有一次会采集成功的
3. 采集完成之后，如果在`./logs/err_log.txt`中出现错误，请使用上一条的结局方案重试
4. 有时候会停留很久，可能是网络问题，不必太在意，可以去做点其他事情

#### 版本更新

##### Version 0.0.2 2020/08/17
1. 加入重试，否则会出现请求失败导致数据不全
2. 如果是<3级的数据, 区域代码只存储前面6位数

##### Version 0.0.1 2020/08/17
1. 基本功能
2. 采集数据存储到 `msyql`