const fs = require('fs')
const request = require('request')
const axios = require('axios')
// const mysql = require('mysql')
const path = require('path')
// const os = require('os')
const iconv = require('iconv-lite') // 中文转码
const moment = require('moment') // 时间格式化处理
const got = require('got')

// const cheerio = require('cheerio')
const userAgents = [
    'Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.8.0.12) Gecko/20070731 Ubuntu/dapper-security Firefox/1.5.0.12',
    'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0; Acoo Browser; SLCC1; .NET CLR 2.0.50727; Media Center PC 5.0; .NET CLR 3.0.04506)',
    'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/535.11 (KHTML, like Gecko) Chrome/17.0.963.56 Safari/535.11',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_3) AppleWebKit/535.20 (KHTML, like Gecko) Chrome/19.0.1036.7 Safari/535.20',
    'Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.9.0.8) Gecko Fedora/1.9.0.8-1.fc10 Kazehakase/0.5.6',
    'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.71 Safari/537.1 LBBROWSER',
    'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Win64; x64; Trident/5.0; .NET CLR 3.5.30729; .NET CLR 3.0.30729; .NET CLR 2.0.50727; Media Center PC 6.0) ,Lynx/2.8.5rel.1 libwww-FM/2.14 SSL-MM/1.4.1 GNUTLS/1.2.9',
    'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322; .NET CLR 2.0.50727)',
    'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0; SLCC2; .NET CLR 2.0.50727; .NET CLR 3.5.30729; .NET CLR 3.0.30729; Media Center PC 6.0; .NET4.0C; .NET4.0E; QQBrowser/7.0.3698.400)',
    'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; QQDownload 732; .NET4.0C; .NET4.0E)',
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:2.0b13pre) Gecko/20110307 Firefox/4.0b13pre',
    'Opera/9.80 (Macintosh; Intel Mac OS X 10.6.8; U; fr) Presto/2.9.168 Version/11.52',
    'Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.8.0.12) Gecko/20070731 Ubuntu/dapper-security Firefox/1.5.0.12',
    'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0; SLCC2; .NET CLR 2.0.50727; .NET CLR 3.5.30729; .NET CLR 3.0.30729; Media Center PC 6.0; .NET4.0C; .NET4.0E; LBBROWSER)',
    'Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.9.0.8) Gecko Fedora/1.9.0.8-1.fc10 Kazehakase/0.5.6',
    'Mozilla/5.0 (X11; U; Linux; en-US) AppleWebKit/527+ (KHTML, like Gecko, Safari/419.3) Arora/0.6',
    'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0; SLCC2; .NET CLR 2.0.50727; .NET CLR 3.5.30729; .NET CLR 3.0.30729; Media Center PC 6.0; .NET4.0C; .NET4.0E; QQBrowser/7.0.3698.400)',
    'Opera/9.25 (Windows NT 5.1; U; en), Lynx/2.8.5rel.1 libwww-FM/2.14 SSL-MM/1.4.1 GNUTLS/1.2.9',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.125 Safari/537.36 Edg/84.0.522.59',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.108 Safari/537.36',
]


module.exports =  {
    ERROR: 'error_com.txt',
    db: null,
    TB: null,
    // 请求
    req(u) {
        //console.log(u)
        return new Promise((resolve, reject) => {
            request.get({
                url: u, 
                maxRedirects: 1,
                headers: {
                    'user-agent': userAgents[this.rand_num(0, userAgents.length - 1)]
                }
            }, (err, res, body) => {
                if(!err && res.statusCode == 200) {
                    resolve(body)
                } else {
                    // 写错误文件
                    this.logFile(this.elog(`req_error: ${err} => ${u}\r\n`))
                    resolve(null)
                }
            })
        }).catch(err => {
            this.logFile(this.elog(`req_error: ${err} => ${u}\r\n`))
            reject(-1)
        })
    },
    // 转码请求
    req_iconv(u, t = 'gb2312') {
        //console.log(u)
        return new Promise((resolve, reject) => {
            request.get({
                url: u,
                maxRedirects: 1,
                headers: {
                    'user-agent': userAgents[this.rand_num(0, userAgents.length - 1)]
                },
                encoding: null //设置encoding
            }, (err, res, body) => {
                if(!err && res.statusCode == 200) {
                    if(body.length !== 0) {
                        resolve(iconv.decode(body, t).toString())
                    } else {
                       // 写错误文件
                        this.logFile(this.elog(`req_error: ${err} => ${u}\r\n`))
                        resolve(null)
                    }
                } else {
                    // 写错误文件
                    this.logFile(this.elog(`req_error: ${err} => ${u}\r\n`))
                    //this.logFile(this.elog(`${u}\r\n`))
                    resolve(null)
                }
                
            })
        }).catch(err => {
            this.logFile(this.elog(`${err}\r\n`))
            this.logFile(this.elog(`${u}\r\n`))
            reject(-1)
        })
    },
    // 请求
    req_axios(u) {
        //console.log(u)
        return new Promise((resolve, reject) => {
            axios.get(u, {
                headers: {
                    'user-agent': userAgents[this.rand_num(0, userAgents.length - 1)]
                },
            }).then(res => {
                if(res && res.data) {
                    resolve(res.data)
                } else {
                   // 写错误文件
                    this.logFile(this.elog(`${err}\r\n`))
                    this.logFile(this.elog(`${u}\r\n`))
                    resolve(null) 
                }
            })
        }).catch(err => {
            this.logFile(this.elog(`${err}\r\n`))
            this.logFile(this.elog(`${u}\r\n`))
            reject(null)
        })
    },
    // got请求
    async req_got(u) {
        try {
            let res = await got(u)
            if(res && res.statusCode == 200 && res.body.length != 0) {
                return res.body
            } else {
                this.logFile(this.elog(`Error: ${res.statusCode} ${res.statusMessage} => ${u}\r\n`))
                return null
            }
            //=> '<!doctype html> ...'
        } catch (error) {
            //console.log(error.response.body)
            this.logFile(this.elog(`Error: ${error.response.body} => ${u}\r\n`))
            return null
            //=> 'Internal server error ...'
        }
    },
    // got_iconv请求
    async req_got_iconv(u, code = 'gb2312') {
        let req = got(u, {maxRedirects: 5, retry: 0})
        try {
            let res = await req
            if(res && res.statusCode == 200 && res.body.length != 0) {
                req.cancel()
                return iconv.decode(res.rawBody, code).toString()
            } else {
                req.cancel()
                this.logFile(this.elog(`Error: ${res.statusCode} ${res.statusMessage} => ${u}\r\n`))
                return null
            }
            //=> '<!doctype html> ...'
        } catch (err) {
            req.cancel()
            //console.log(error)
            //console.log(error.response.body)
            this.logFile(this.elog(`Error: ${err.statusCode} ${err.statusMessage} => ${u}\r\n`))
            return null
            //=> 'Internal server error ...'
        }
    },
    // 数据库添加
    add(data) {
        return new Promise((resolve, reject) => {
            this.db.query(`INSERT INTO ${this.TB} SET ?`, data, (error, results, fields) => {
                //if (error) throw error
                if(error) {
                    this.logFile(this.elog(`写库失败! ${error} \r\n`))
                    resolve(null)
                }
                else  {
                    // console.log(results)
                    resolve(results.insertId)
                }
                    
            })
        }).catch(err => {
            reject(null)
        })
    },
    
    // 查找 
    select(sql) {
        return new Promise((resolve, reject) => {
            this.db.query(sql, (error, results, fields) => {
                //if (error) throw error
                if(error) {
                    console.log(error)
                    this.logFile(this.elog(`查询失败! ${error} \r\n`))
                    resolve(null)
                }
                else  
                    resolve(results)
            })
        }).catch(err => {
            reject(-1)
        })
    },

    // 修改
    update(sql) {
        return new Promise((resolve, reject) => {
            this.db.query(sql, (error, results, fields) => {
                //if (error) throw error
                if(error) {
                    this.logFile(this.elog(`更新失败! ${error} \r\n`))
                    resolve(null)
                }
                else  
                    resolve(results)
            })
        }).catch(err => {
            reject(-1)
        })

    },

    // 删除
    delete(sql) {
        return new Promise((resolve, reject) => {
            this.db.query(sql, (error, results, fields) => {
                //if (error) throw error
                if(error) {
                    this.logFile(this.elog(`删除失败! ${error} \r\n`))
                    resolve(null)
                }
                else  
                    resolve(results)
            })
        }).catch(err => {
            reject(-1)
        })

    },

    // 下载文件
    downloadImage(src, dest, callback) {
        src = encodeURI(src)
        request.head(src, (err, res, body) => {
            // console.log('content-type:', res.headers['content-type']);
            // console.log('content-length:', res.headers['content-length']);
            if (src) {
                request(src).pipe(fs.createWriteStream(dest)).on('close', function() {
                    callback(null, dest)
                })
            }
        })
    },
    // 递归创建目录 同步方法
    mkdirsSync(dirname) {
        if (fs.existsSync(dirname)) {
            return true
        } else {
            if (this.mkdirsSync(path.dirname(dirname))) {
                fs.mkdirSync(dirname);
                return true
            } else 
                return false
        }
    },
    
    // 休眠 ms
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    },
    
    elog(txt) {
        return `[${this.time()}] ${txt}`
    },
    
    logFile(txt) {
        //txt = this.elog(txt)
        this.mkdirsSync('./logs/')
        fs.writeFileSync('./logs/'+this.ERROR, txt, {flag: 'a'})
    },
    // 随机数字
    rand_num(Min, Max) {
		let Range = Max - Min
		, Rand = Math.random()
		return(Min + Math.round(Rand * Range))
    },
    time() {
        return new Date().toLocaleString()
    },
    // 时间戳(ms)转正常日期
    time_to_date(t) {
        return moment(t).format('YYYY-MM-DD')
    },
    // 时间戳转日期+时分秒
    time_to_datetime(t) {
        return moment(t).format('YYYY-M-D h:mm:ss')
    },
    trim(str) { //删除左右两端的空格
　　     return str.replace(/(^\s*)|(\s*$)/g, "")
　　},
    ltrim(str) { //删除左边的空格
　　     return str.replace(/(^\s*)/g,"")
　　},
    rtrim(str) { //删除右边的空格
　　     return str.replace(/(\s*$)/g,"")
　　},
    int(str) {
        return parseInt(str)
    },
    // 字符串截取
    str_cut(str, len = 6, start = 0) {
        return str.substr(start, len)
    }
}