const { handleDisconnection } = require('./connection')


const base = 'xxxx'

function handleResult({ err, res, name }) {
    let result = {
        code: 'rl',
        message: `${name} resolve`,
        data: res
    }
    if (err) {
        result = {
            code: 'rj',
            message: `${name}: ${err.message}`,
            data: null
        }
    }
    return result
}

/**
 * 
 * @param {object} connection 数据库返回的对象
 * @param {string} name 表名
 * @param {string} conditions 数据库返回的对象
 * @returns  promise的成功/失败
 */
function createTableSQL({ connection, name, conditions, callback }) {
    /**
     * 类别表： auto_increment自增， PRIMARY KEY：设为主键
     * (id int auto_increment PRIMARY KEY, h float(16), l float(16), o float(16), c float(16), v varchar(32), d varchar(32), code int(10), h varchar(10))
     * 
     */
    return new Promise((rl, rj) => {
        let sql = `CREATE TABLE ${name} (${conditions})`
        connection.query(sql, function(err, res) {
            let result = handleResult({ err, res, name: 'createSQL' })
            eval(result.code)(result)
        })
    })
}
function hasTablesSql({ connection, name}) {
    // 查询某个表是否存在
    return new Promise((rl, rj) => {
        let sql = `SHOW TABLES like '%${name}%'`
        connection.query(sql, function(err, res) {
            let result = handleResult({ err, res, name: `${name}已存在 hasSQL` })
            eval(result.code)(result)
        })
    })
} 

/**
 * 
 * @param {Objec} connection 数据库对象
 * @param {string} name 表名
 * @param {string} distinct 去重查询，这里用来查 list中有多少类别：000,002,600,...
 * @param {string} conditions 条件，接在where 后面
 * @returns promise的成功/失败
 */
function querySQL({ connection, name, distinct, conditions, callback }) {
    // distinct = 'DISTINCT(type)'
    return new Promise((rl, rj) => {
        let sql = `SELECT * FROM ${name}`
        if (conditions) {
            sql += ` where ${conditions}`
        } 
        if (distinct) {
            sql = `SELECT ${distinct} FROM ${name}`
        }
        
        connection.query(sql, function(err, res) {
            let result = handleResult({ err, res, name: 'querySQL' })
            eval(result.code)(result)
        })
    })
}

function insertSQL({connection, name, values, callback}) {
    return new Promise((rl, rj) => {
        // let sql = `INSERT INTO ig502_list(code, type, name, jys) VALUES('000001', '000', '零零幺', 'sz'),('603999', '603', '六零幺', 'sz')`
        let sql = `INSERT INTO ${name} VALUES ${values}`
        connection.query(sql, function(err, res) {
            let result = handleResult({ err, res, name: 'insertSQL' })
            eval(result.code)(result)
        })
    })
}
function updateSQL({ connection, name, values, conditions, callback }) {
    // UPDATE xxxx_000_copy1  SET l='1111',o='111' where code=603999
    return new Promise((rl, rj) => {
        let sql = `UPDATE ${name} SET ${values}`
        if (conditions) {
            sql += ` WHERE ${conditions}`
        }
        connection.query(sql, function(err, res) {
            let result = handleResult({ err, res, name: 'updateSQL' })
            eval(result.code)(result)
        })
    })
}
function deleteSQL({ connection, name, conditions, callback }) {
    // DELETE FROM ig502_today WHERE dwm = 'd'
    return new Promise((rl, rj) => {
        let sql = `DELETE FROM ${name}`
        if (conditions) {
            sql += ` WHERE ${conditions}`
        }
        connection.query(sql, function(err, res) {
            let result = handleResult({ err, res, name: 'deleteSQL' })
            eval(result.code)(result)
        })
    })
}


/* ****************************************************** */

function getList({connection}) {
    return new Promise(async (rl, rj) => {
        console.log(`>>> 开始查询list...`);
        await querySQL({
            connection,
            name: 'ig502_list'
        }).then(res => {
            console.log(`> get list ${res.message}`);
            rl(res.data)
        }).catch(err => {
            console.log(`> get list ${err.message}`);
            rj()
        })
    })
}


function getTables({ connection, name, conditions }) {
    return new Promise(async (rl, rj) => {
        console.log(`>>> 开始查询${name}表...`);
        await querySQL({
            connection,
            name: `${base}_${name}`,
            conditions
        }).then(res => {
            console.log(`> get ${name} ${res.message}`);
            rl(res.data)
        }).catch(err => {
            console.log(`> get ${name} ${err.message}`);
            rj()
        })
    })
}

function setTables({ connection, name, code, type, dwm }) {
    return new Promise(async (rl, rj) => {
        console.log(`>> ${code}: 开始存入${name}表`);
        await insertSQL({
            connection,
            name: `${base}_${name}(code, type, dwm)`,
            values: `('${code}', '${type}', '${dwm}')`
        }).then(d => {
            console.log(`>> set ${name} ${d.message}`);
            rl()
        }).catch(async err => {
            console.log(`>> set ${name} ${err.message}`);
            rj()
        })
    })
}

// function delTables({ connection, code, tableName }) {
//     return new Promise(async (rl, rj) => {
//         let name = `${base}_today`
//         console.log(`>> ${code}: 从${name}中删除失败的内容`);
//         await deleteSQL({
//             connection,
//             name,
//             conditions: `code=${code}`
//         }).then(d => {
//             console.log(`>> del ${code} ${d.message}`);
//             rl()
//         }).catch(err => {
//             console.log(`>> del ${code} ${err.message}`);
//             rj()
//         })
//     })
// }
function deleteEle(data) {
    let arr = ['zf', 'ma10', 'ma20', 'ma60'], result = {
        keys: [],
        values: []
    }
    Object.keys(data).forEach(v => {
        if (!arr.includes(v)) {
            result.keys.push(v)
            result.values.push(data[v])
        }
    })
    return result
}
function save({ connection, item, dwm }) {
    return new Promise(async (rl, rj) => {
        let { code, data, type } = item
        
        let keys = `${deleteEle(data[0]).keys},type,dwm`
        let values = data.map(level1 => {

            return `(${deleteEle(level1).values.map(v => `'${v}'`)},${type},'${dwm}')`
        })

        await insertSQL({
            connection,
            name: `${base}_${type}(${keys})`,
            values: `${values}`
        }).then(d => {
            console.log(`>> save ${code} ${d.message}`);
            rl()
        }).catch(err => {
            console.log(`>> save ${code} ${err.message}`);
            rj()
        })
    })
}

function update({ connection, item, dwm }) {
    
    let { code, data, type } = item
    let { d } = data[0]
    let name = `${base}_${type}`
    
    let row ={...data[0]}
    delete row.zf
    delete row.ma10
    delete row.ma20
    delete row.ma60
    let values = Object.keys(row).map(v => {
        return `${v}='${data[0][v]}'`
    })
    let conditions = `code='${code}' and dwm='${dwm}' and d='${d}'`

    return new Promise(async (rl, rj) => {
        await updateSQL({
            connection,
            name,
            values: `${values}, type='${type}', dwm='${dwm}'`,
            conditions
        }).then(d => {
            console.log(`>> update ${code} ${d.message}`);
            rl()
        }).catch(err => {
            console.log(`>> update ${code} ${err.message}`);
            rj()
        })
    })
}
/* ****************************************************** */


module.exports = {
    base,
    handleDisconnection,
    hasTablesSql,
    createTableSQL,
    querySQL,
    deleteSQL,
    insertSQL,
    getList,
    getTables,
    setTables,
    update,
    save
}