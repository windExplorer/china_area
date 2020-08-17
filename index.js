const cheerio = require('cheerio')
const mysql = require('mysql')
// const fs = require('fs')
const com = require('./com')
const conf = require('./config')
const { sleep, str_cut } = require('./com')

let db = mysql.createConnection(conf.db)
com.db = db
const TB = 'area'
const ERROR = `./error_log${+ new Date()}.txt`

// const com = new com()

com.TB = TB
com.ERROR = ERROR

// 获取命令行参数：0 1 2
// 2: 采集级别，默认全部，一般是3级[省市区],最高5级
// 3: 显示url地址，默认2: false
const argv = process.argv
//console.log(argv)

let domain = 'http://www.stats.gov.cn/tjsj/tjbz/tjyqhdmhcxhfdm/2019/'
, end_level = argv[2] || 3
, show_link = argv[3] || 2
end_level = com.int(end_level)
show_link = show_link == 1 ? true : false

let total = 0
, count = 0
, re_try = conf.re_try || 5

start()


async function start() {
    let time_s = +new Date()
    console.log(com.elog(`##### 开始采集数据[2019年统计用区划和城乡划分代码]: ${show_link ? domain : ''}`))
    let u = domain
    , d = await com.req_iconv(u)
    if(d == -1) {
        console.log(com.elog('### 请求出错，退出作业'))
        db.end()
        return
    }
    let $ = cheerio.load(d)
    , res = $('.provincetr a')
    if(res.length == 0) {
        console.log(com.elog(`### 没有找到数据`))
        return
    }
    total += res.length
    for(let i = 0; i < res.length; i ++) {
        let  grab_time_s = +new Date()
        let dom = $(res[i])
        , name = dom.text()
        , link_str = dom.attr('href').split('.')[0] + '/'
        , link = u + dom.attr('href')
        let data = {
            pid: 0,
            code: '',
            name: name,
            level: 1
        }
        console.log()
        console.log()
        console.log(com.elog(`#### [${count}/${total}] 正在采集 ${name}`))
        let id = await com.add(data)
        count += 1
        // console.log(id)
        if(id > 0) {
            console.log(com.elog(`#### 开始插入 ${name} 数据: `))
            let ret = await grab(id, link, 2, link_str)
            console.log(com.elog(`##################### ${ret}`))
        }
        console.log(com.elog(`#### ${name} 采集完毕 耗时: ${((+new Date() - grab_time_s)/1000).toFixed(2)}s`))
    }    


    db.end()
    console.log(com.elog(`##### 全部采集完毕，共采集[${count}/${total}] 耗时: ${((+new Date() - time_s)/1000).toFixed(2)}s`))
    
}


function grab(pid, link, level, link_str) {
    return new Promise((resolve, reject) => {
        (async () => {
            //await sleep(1500)
            let tag = 'citytr'
            , lv = 2
            , u_str = link_str
            if(level == 2) {
                lv = 2
                u_str = ''
            }
            if(level == 3) {
                tag = 'countytr'
                lv = 3
            } else if(level == 4) {
                tag = 'towntr'
                lv = 4
            } else if(level == 5) {
                tag = 'villagetr'
                lv = 5
            }
            let d, $, res
            //console.log(`link_Str: ${u_str}  level: ${level}  length: ${res.length} url: ${link}`)
            //console.log(link)
            //console.log(res.length + `[${link}]`)
            let sec = 0
            for(let i = 0; i <= re_try; i ++) {
                let tmp_d = await com.req_iconv(link)
                , tmp_$ = cheerio.load(tmp_d)
                , tmp_res = tmp_$(`.${tag}`)
                if(tmp_res.length == 0 && i < re_try) {
                    sec += 10
                    console.log(com.elog(`###### 没有数据，${sec}秒后进行第${i+1}次重试`))
                    db.end()
                    await sleep(sec*1000)
                    db = mysql.createConnection(conf.db)
                    com.db = db
                } else {
                    d = tmp_d
                    $ = tmp_$
                    res = tmp_res
                    break
                }
            }
            if(res.length == 0) {
                com.logFile(com.elog(`重试结束，但仍然失败: ${link}  => no result\r\n`))
                resolve('no result')
            }
            
            total += res.length
            for(let i = 0; i < res.length; i ++) {
                let dom = $(res[i])
                , td = dom.find('td')
                , a = dom.find('a')
                , str = u_str
                //console.log(td.length)
                if(a.length == 0) {
                    let code = td.eq(0).text()
                    let data = {
                        pid: pid,
                        code: end_level <= 3 ? str_cut(code) : code,
                        name: td.eq(1).text(),
                        level: lv,
                    }
                    if(td.length == 3) {
                        data.code2 = data.name
                        data.name = td.eq(2).text()
                    }
                    //console.log(data)
                    console.log(com.elog(`### [${count}/${total}] 正在采集1 ${data.name} [${show_link ? link : '*_*'}]`))
                    let ret_pid = await com.add(data)
                    count += 1
                    //resolve(ret_pid)
                    continue
                } else {
                    let code = a.eq(0).text()
                    let data = {
                        pid: pid,
                        code: end_level <= 3 ? str_cut(code) : code,
                        name: a.eq(1).text(),
                        level: lv
                    }
                    if(td.length == 3) {
                        data.code2 = data.name
                        data.name = a.eq(2).text()
                    }
                    //console.log(data)
                    console.log(com.elog(`### [${count}/${total}] 正在采集2 ${data.name} [${show_link ? link : '*_*'}]`))
                    let ret_pid = await com.add(data)
                    count += 1
                    if(lv >= end_level) {
                        continue
                    }
                    // 继续遍历
                    let u = a.eq(0).attr('href')
                    link = domain + str + u
                    //console.log(link)
                    //console.log(`继续遍历: ${link}`)
                    str = u_str + u.split('/')[0] + '/'
                    await grab(ret_pid, link, lv+1, str)
                }
            }

            resolve('grab section end')
        })(pid, link, level, link_str)
        
        //return 'success'
    })
    
    
}
