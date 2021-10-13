

function getList({connection}) {
    return new Promise(async (rl, rj) => {
        console.log(`>>> 开始查询list...`);
        await SQL.querySQL({
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


function getTables({ connection, name }) {
    return new Promise(async (rl, rj) => {
        console.log(`>>> 开始查询${name}表...`);
        await SQL.querySQL({
            connection,
            name: `${SQL.base}_${name}`
        }).then(res => {
            console.log(`> get ${name} ${res.message}`);
            rl(res.data)
        }).catch(err => {
            console.log(`> get ${name} ${err.message}`);
            rj()
        })
    })
}

function setTables({ connection, name, code, type }) {
    return new Promise(async (rl, rj) => {
        console.log(`>> ${code}: 开始存入${name}表`);
        await SQL.insertSQL({
            connection,
            name: `${SQL.base}_${name}(code, type)`,
            values: `(${code}, ${type})`
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
//         let name = `${SQL.base}_today`
//         console.log(`>> ${code}: 从${name}中删除失败的内容`);
//         await SQL.deleteSQL({
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

function save({ connection, item }) {
    return new Promise(async (rl, rj) => {
        let { code, data, type } = item
        let codeType = code.slice(0, 3)
        let keys = `${Object.keys(data[0])},type`
        let values = data.map(level1 => {
            return `(${Object.values(level1).map(v => `'${v}'`)},${codeType})`
        })
        await SQL.insertSQL({
            connection,
            name: `${SQL.base}_${type}(${keys})`,
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

module.exports = {
    getList,
    getTables,
    setTables,
    save
}