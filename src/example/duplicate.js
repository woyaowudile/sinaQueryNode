const SQL = require("../sql");
const $methods = require("../model/methods");

module.exports = function (app, connection) {
    app.get("/api/duplicate/remove", async (req, res) => {
        let { query } = req;
        console.log(`-------------开始执行 /api/duplicate/remove---------------`);
        const days = query.start || $methods.someDay(query.days || 0);

        const getLists = await SQL.querySQL({
            connection,
            name: "ig502_list",
            distinct: "DISTINCT type",
        });
        const types = getLists.data.map((v) => v.type);
        let i = -1;
        let fn = async function () {
            let type = types[++i];
            if (type) {
                console.log(`》 去重查询：xxxx_${type}`);
                const query = await SQL.querySQL({
                    connection,
                    name: `xxxx_${type}`,
                    select: "min(id) id, code, d",
                    conditions: `d='${days}' GROUP BY code, d HAVING COUNT(*) > 1`,
                });
                const ids = query.data.map((v) => v.id);
                if (ids.length) {
                    await SQL.deleteSQL({
                        connection,
                        name: `xxxx_${type}`,
                        conditions: `id in (${ids})`,
                    });
                    console.log(`------ 删除重复数据成功`);
                } else {
                    console.log(`》 未查询到重复数据`);
                }
                fn();
            } else {
                console.log(`-------------《去重已完成》-------------`);
                res.send("duplicate remove - ok");
            }
        };
        fn();
    });
};
