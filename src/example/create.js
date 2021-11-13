
const API = require('../api')
const SQL = require('../sql')

function createTables({connection, name, createConditions, count='0/0'}) {

    return new Promise(async (rl, rj) => {
        console.log(`>>> （${count}）开始检测 是否存在表：${name}`);
        let has_res = await SQL.hasTablesSql({
            connection,
            name
        })
        if (!has_res.data.length) {
            console.log('> 不存在，创建中...');
            let creat_res = await SQL.createTableSQL({
                connection,
                name,
                conditions: createConditions
            })
            console.log(`--------${creat_res.message}--------`);
        } else {
            console.log(`--------${has_res.message}--------`);
        }
        rl()
    })
}

function hasListTables(connection) {
    return new Promise(async (rl, rj) => {
        await createTables({
            connection,
            name: 'ig502_list',
            createConditions: `id int auto_increment PRIMARY KEY, code varchar(8), type varchar(4), name varchar(100), jys varchar(10)`
        })
        rl()
    })
}

function getList(connection) {
    return new Promise(async (rl, rj) => {
        console.log(`>>> 开始获取列表数据`);
        const ret = await API.getList()
        // let results = ret.data.map(level1 => {
        //     return []
        // })
        console.log(`> ${ret.message}`);

        // 1. 先把存在的都删掉
        console.log(`>>> 清空原表(ig502_list)的旧数据`);
        const del_res = await SQL.deleteSQL({
            connection,
            name: 'ig502_list'
        })
        console.log(`> ${del_res.message}`);

        // 2. 再添加新取到的
        console.log(`>>> 正在往表(ig502_list)添加新数据`);
        let params = {
            connection,
            name: 'ig502_list(code, type, name, jys)',
            values: ret.data
        }
        const insert_res = await SQL.insertSQL(params)
        console.log(`> ${insert_res.message}`);
        rl()
    })
}

function addTables(connection) {
    return new Promise(async (rl, rj) => {
        console.log('>>> distinct 表(ig502_list)');
        let q_res = await SQL.querySQL({
            connection,
            name: 'ig502_list',
            distinct: `DISTINCT(type)`
        })
        console.log(`> ${q_res.message}`);

        if (q_res.code === 'rl') {    
            console.log(`>>>>>>>>>>>> 共${q_res.data.length}条 准备创建新表中...`);
            let arr = [
                'id int auto_increment PRIMARY KEY',
                'h varchar(32)',
                'l varchar(32)',
                'o varchar(32)',
                'c varchar(32)',
                'v varchar(32)',
                'e varchar(32)',
                'zde varchar(32)',
                // 'zf varchar(10)',
                'hs varchar(10)',
                'zd varchar(10)',
                // 'ma10 varchar(16)',
                // 'ma20 varchar(16)',
                // 'ma60 varchar(16)',
                'd varchar(32)',
                'code varchar(10)',
                'type varchar(10)',
                'dwm varchar(10)'
            ]
            let count = -1
            let fn = async function () {
                let item = q_res.data[++count]
                if (item) {
                    await createTables({
                        connection,
                        name: `${SQL.base}_${item.type}`,
                        createConditions: arr.join(','),
                        count: `${count+1}/${q_res.data.length}`
                    })
                    fn()
                } else {
                    rl()
                }
            }
            fn()
        } else {
            rj(q_res.message)
        }
    })
}

function addOtherTable(connection) {
    return new Promise(async (rl, rj) => {
        let arr = [
            'id int auto_increment PRIMARY KEY',
            'code varchar(10)',
            'type varchar(10)',
            'dwm varchar(10)'
        ]
        let names = [`${SQL.base}_fail`, `${SQL.base}_used`, `${SQL.base}_today`]
        console.log(`>>>>>>>>>>>> 共${names.length}条 准备创建新表中...`);
        let count = -1
        let fn = async function () {
            let item = names[++count]
            if (item) {
                await createTables({
                    connection,
                    name: item,
                    createConditions: `${arr}`,
                    count: `${count+1}/${names.length}`
                })
                fn()
            } else {
                console.log(`> addOtherTable resolve`);
                rl()
            }
        }
        fn()
    })
}

module.exports = function (app, connection) {
    app.get('/api/createNewTables',  async (req, res) => {
        console.log(`-------------开始执行 /api/createNewTables---------------`);
        await hasListTables(connection)
        
        await getList(connection)

        await addTables(connection)

        await addOtherTable(connection)
        
        console.log(`-------------执行完成 /api/createNewTables---------------`);
    })
}