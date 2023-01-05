/** @format */

const SQL = require("../sql");
const { someDay } = require("../model/methods");

module.exports = function (app, connection) {
    app.get("/api/query", async (req, res) => {
        console.log(`-------------开始执行 /api/query---------------`);

        let {
            days,
            startDate,
            endDate,
            dwm = "d",
            pageSize = 25,
            page = 1,
            status,
            count = -1,
            codes = ["600", "601", "603", "000", "002"],
            name = "isKlyh",
            isToday,
        } = req.query;
        let d = someDay(days, "-");

        let conditions = ` dwm='${dwm}' and type in (${codes.map((v) => `'${v}'`)}) `;
        if (status) {
            conditions += ` and  trend_status = '${status}'`;
        }
        if (isToday === "Y") {
            conditions += ` and today=${isToday}`;
        } else {
            conditions += startDate ? ` and start >= '${startDate}'` : "";
            conditions += endDate ? ` and end <= '${endDate}'` : "";
        }

        conditions += ` LIMIT ${(page - 1) * pageSize}, ${pageSize}`;
        const datas = await SQL.getTables({ connection, name, conditions });
        const total = await SQL.querySQL({ connection, name: `${SQL.base}_${name}`, select: "count(*)" });

        const sendResults = {
            code: 0,
            page,
            pageSize,
            total: total.data[0]["count(*)"],
            data: datas,
        };
        if (!datas.length) {
            sendResults.msg = "暂无数据";
            res.send(sendResults);

            return;
        }

        // 查询图表展示的数据
        const charts = {};
        datas.forEach((v) => {
            if (charts[v.code]) {
                const { start, end } = charts[v.code];
                charts[v.code] = {
                    start: v.start < start ? v.start : start,
                    end: v.end < end ? v.end : end,
                };
            } else {
                charts[v.code] = {
                    start: v.start,
                    end: v.end,
                };
            }
        });

        const a1 = [...new Set(datas.map((v) => v.code))];
        conditions = ` dwm='${dwm}' and code in (${a1.map((v) => `'${v}'`)}) `;
        const chartsDatas = await SQL.querySQL({ connection, name: `${SQL.base}_${a1[0].slice(0, 3)}`, conditions });
        sendResults.data.forEach((v) => {
            // const { start, end } = v;
            const start = chartsDatas.data.findIndex((d) => d.code === v.code && d.d === v.start);
            const end = chartsDatas.data.findIndex((d) => d.code === v.code && d.d === v.end);
            const datas = chartsDatas.data.slice(start - 60, end + 31).filter((d) => d.code === v.code);
            v.datas = datas;
        });
        console.log(`-------------执行完成 /api/query---------------`);
        res.send(sendResults);
    });

    app.get("/api/email", async (req, res) => {
        console.log(`-------------开始执行 /api/email---------------`);

        let { d, days = 0 } = req.query;
        let date = d || someDay(days);
        const queryRes = await SQL.querySQL({
            connection,
            name: `${SQL.base}_email`,
            conditions: `d = ${date}`,
        });
        console.log("》》 -- 查询email成功 -- 《《");
        res.send(getSend({ result: queryRes }));
    });
};
