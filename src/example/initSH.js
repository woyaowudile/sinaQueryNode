/** @format */

const API = require("../api");
const { someDay } = require("../model/methods");

function getContent({ query }) {
    let period = query.dwm || "d";
    /**
     * 例如国庆节，这时候end应该是放假前的一天，
     * 这个code比如，最后的时间是2018-12-31.
     * 这时候无法去判断，这个code还有没有存入used表的价值
     * 具体，参考 api/index/的get()
     */
    let days = query.days / 1 || 0;
    let start = query.start || 19920601;
    let end = query.end;
    if (!start) {
        start = someDay(days, "");
    }
    if (!end) {
        end = someDay(days, "");
    }
    let others = {
        days: someDay(days, "-"),
    };
    return new Promise(async (rl, rj) => {
        // await API.getIG502({code})
        // codes最多可以放6个
        await API.get({
            // 通用属性
            type: "dfcf",
            codes: {
                jys: "sh",
                code: "000001",
            },
            start,
            end,
            period,
            ...others,
        })
            .then(async (d) => {
                console.log(`>> ${d.url} -> ${d.message}`);
                rl(d);
            })
            .catch((err) => {
                console.log(`>> getContent ${err.message}`);
                rj();
            });
    });
}

module.exports = function (app, connection) {
    app.get("/api/initSH", async (req, res) => {
        console.log("-------------开始执行 /api/initSH---------------");
        const content = await getContent(req);
        debugger;
        console.log(`》》-- 执行完成 /api/initSH${type} --《《`);
        res.send("ok");
    });
};
