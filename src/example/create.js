const API = require("../api");
const SQL = require("../sql");
const { modelsCode } = require("../utils/code");

function createTables({ connection, name, createConditions, count = "0/0" }) {
    return new Promise(async (rl, rj) => {
        console.log(`>>> （${count}）开始检测 是否存在表：${name}`);
        let has_res = await SQL.hasTablesSql({
            connection,
            name,
        });
        if (!has_res.data.length) {
            console.log("> 不存在，创建中...");
            let creat_res = await SQL.createTableSQL({
                connection,
                name,
                conditions: createConditions,
            });
            console.log(`--------${creat_res.message}--------`);
        } else {
            console.log(`--------${has_res.message}--------`);
        }
        rl();
    });
}

function hasListTables(connection) {
    return new Promise(async (rl, rj) => {
        await createTables({
            connection,
            name: "ig502_list",
            createConditions: `id int auto_increment PRIMARY KEY, code varchar(8), type varchar(4), name varchar(100), jys varchar(10)`,
        });
        rl();
    });
}

function getList(connection) {
    return new Promise(async (rl, rj) => {
        console.log(`>>> 开始获取列表数据`);
        const ret = await API.getList();
        // let results = ret.data.map(level1 => {
        //     return []
        // })
        console.log(`> ${ret.message}`);

        // 1. 先把存在的都删掉
        console.log(`>>> 清空原表(ig502_list)的旧数据`);
        const del_res = await SQL.deleteSQL({
            connection,
            name: "ig502_list",
        });
        console.log(`> ${del_res.message}`);

        // 2. 再添加新取到的
        console.log(`>>> 正在往表(ig502_list)添加新数据`);
        let params = {
            connection,
            name: "ig502_list(code, type, name, jys)",
            values: ret.data,
        };
        const insert_res = await SQL.insertSQL(params);
        console.log(`> ${insert_res.message}`);
        rl();
    });
}

function addTables(connection, name = "") {
    return new Promise(async (rl, rj) => {
        console.log(">>> distinct 表(ig502_list)");
        let q_res = await SQL.querySQL({
            connection,
            name: "ig502_list",
            distinct: `DISTINCT(type)`,
        });
        console.log(`> ${q_res.message}`);

        if (q_res.code === "rl") {
            console.log(`>>>>>>>>>>>> 共${q_res.data.length}条 准备创建_${name}_新表中...`);
            let arr1 = [
                "h varchar(32) COMMENT '最高价'",
                "l varchar(32) COMMENT '最低价'",
                "o varchar(32) COMMENT '开盘价'",
                "c varchar(32) COMMENT '收盘价'",
                "v varchar(32) COMMENT '成交量'",
                "type varchar(10)",
                "zd varchar(10) COMMENT '涨幅'",
            ];
            let arr2 = [
                "e varchar(32) COMMENT '换手额'",
                "zde varchar(32) COMMENT '涨跌额'",
                "zf varchar(10) COMMENT '振幅'",
                "hs varchar(10) COMMENT '换手率'",
                "ma10 varchar(16)",
                "ma20 varchar(16)",
                "ma60 varchar(16)",
            ];
            let arr = [
                "id int auto_increment PRIMARY KEY",
                "sub_id varchar(15) COMMENT '关联表id'",
                "d varchar(32)",
                "code varchar(10)",
                "dwm varchar(10)",
                ...(name ? arr2 : arr1),
            ];
            let count = -1;
            let fn = async function () {
                let item = q_res.data[++count];
                if (item) {
                    await createTables({
                        connection,
                        name: name ? `${SQL.base}_${item.type}_${name}` : `${SQL.base}_${item.type}`,
                        createConditions: arr.join(","),
                        count: `${count + 1}/${q_res.data.length}`,
                    });
                    fn();
                } else {
                    rl();
                }
            };
            fn();
        } else {
            rj(q_res.message);
        }
    });
}

function addOtherTable(connection) {
    return new Promise(async (rl, rj) => {
        let arr1 = ["id int auto_increment PRIMARY KEY", "code varchar(10)", "type varchar(10)", "dwm varchar(10)", "jys varchar(10)"];
        let arr2 = [
            "id int auto_increment PRIMARY KEY",
            "name varchar(10)",
            "name_key varchar(10)",
            "code varchar(10)",
            "level varchar(2) COMMENT '优先级'",
            "find_date varchar(10) COMMENT '出现日期'",
            "buy_date varchar(10) COMMENT '买入日期'",
            "buy varchar(10) COMMENT '买入价格（元）'",
            "sale_reference varchar(10) COMMENT '参考卖出（元）'",
            "sale_date varchar(10) COMMENT '卖出日期'",
            "sale varchar(10) COMMENT '卖出价格（元）'",
            "profit_reference varchar(10) COMMENT '参考利润（元）'",
            "profit varchar(10) COMMENT '实际利润（元）'",
            "wait varchar(4) COMMENT '待定(不确定，需要等待观察)'",
            "remark varchar(255) COMMENT '理由/备注'",
            "type varchar(10)",
            "dwm varchar(10)",
        ];
        let names = [
            { word: `${SQL.base}_fail`, conditions: arr1 },
            { word: `${SQL.base}_used`, conditions: arr1 },
            { word: `${SQL.base}_today`, conditions: arr1 },
            { word: `${SQL.base}_checked`, conditions: arr2 },
        ];
        console.log(`>>>>>>>>>>>> 共${names.length}条 准备创建新表中...`);
        let count = -1;
        let fn = async function () {
            let item = names[++count];
            if (item) {
                await createTables({
                    connection,
                    name: item.word,
                    createConditions: item.conditions,
                    count: `${count + 1}/${names.length}`,
                });
                fn();
            } else {
                console.log(`> addOtherTable resolve`);
                rl();
            }
        };
        fn();
    });
}

function addModelsTable(connection) {
    return new Promise(async (rl, rj) => {
        let arr1 = [
            "id int auto_increment PRIMARY KEY",
            "code varchar(10)",
            "type varchar(10)",
            "start varchar(10)",
            "end varchar(10)",
            "dwm varchar(10)",
            "today varchar(10)",
            "remark varchar(255)",
        ];
        let names = Object.keys(modelsCode).map((v) => ({ word: `${SQL.base}_${v}`, conditions: arr1 }));
        console.log(`>>>>>>>>>>>> 共${names.length}条 准备创建新表中...`);
        let count = -1;
        let fn = async function () {
            let item = names[++count];
            if (item) {
                await createTables({
                    connection,
                    name: item.word,
                    createConditions: item.conditions,
                    count: `${count + 1}/${names.length}`,
                });
                fn();
            } else {
                console.log(`> addModelsTable resolve`);
                rl();
            }
        };
        fn();
    });
}
module.exports = function (app, connection) {
    app.get("/api/createNewTables", async (req, res) => {
        console.log(`-------------开始执行 /api/createNewTables---------------`);
        await hasListTables(connection);

        await getList(connection);

        await addTables(connection);
        await addTables(connection, "sub");

        await addOtherTable(connection);

        await addModelsTable(connection);
        console.log(`-------------执行完成 /api/createNewTables---------------`);
        res.send({ code: 0, message: "创建成功" });
    });
};
