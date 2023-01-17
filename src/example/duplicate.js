const SQL = require("../sql");
const { someDay } = require("../model/methods");

module.exports = function (app, connection) {
    app.get("/api/duplicate/remove", async (req, res) => {
        let { query } = req;
        console.log(`-------------开始执行 /api/duplicate/remove---------------`);
        const days = someDay(query.days || 0, "-", +query.start);

        const getLists = await SQL.querySQL({
            connection,
            name: "ig502_list",
            distinct: "DISTINCT type",
        });

        // 获取到所有需要去重的表名
        let types = getLists.data.map((v) => v.type);
        types.push("email");
        let fields = {
            email: "name, code, d",
        };

        // 去重逻辑
        let i = -1;
        let fn = async function () {
            let type = types[++i];
            if (type) {
                console.log(`》 去重查询：${SQL.base}_${type}`);
                // const query = await SQL.querySQL({
                //     connection,
                //     name: `${SQL.base}_${type}`,
                //     select: `max(id) id, ${fields[type] || "code, d"}`,
                //     conditions: `d>='${days}' GROUP BY ${fields[type] || "code, d"}`,
                // });
                // const ids = query.data.map((v) => v.id);

                // 大约3分钟， 优化方向： 例总共10条，其中有一条重复出现5次， 如何查询出来这5条
                const query = await SQL.deleteSQL({
                    connection,
                    name: `${SQL.base}_${type}`,
                    conditions: `id not in (SELECT id from (SELECT max(id) id, ${fields[type] || "code, d"} FROM ${SQL.base}_${type} GROUP BY ${
                        fields[type] || "code, d"
                    }) as a)`,
                });
                if (query.data.affectedRows > 0) {
                    console.log(`------ 删除重复数据成功`);
                } else {
                    console.log(`》  未查询到重复数据`);
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
