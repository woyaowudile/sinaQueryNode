/** @format */

const API = require("../api");
const SQL = require("../sql");
const { sendMail } = require("../utils/sendEmail");
const { someDay } = require("../model/methods");
const { quertBefore } = require("../model");

function getContent({ codes, start, end, query }) {
    let period = query.dwm || "d";
    let days = query.days / 1 || 0;

    if (!start) {
        start = someDay(days, "");
    }
    if (!end) {
        end = someDay(days, "");
    }
    return new Promise(async (rl, rj) => {
        // await API.getIG502({code})
        // codes最多可以放6个
        await API.get({
            // 通用属性
            type: "sohu",
            // // sina属性
            // page: 1,
            // num: 100,
            // sohu属性
            codes,
            start,
            end,
            period,
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

/**
 *
 * @param {String} dwm 周期：'天d、周w、月m'
 * @param {String} dwm 周期：'天d、周w、月m'
 */

module.exports = function (app, connection) {
    app.get("/api/update", async (req, res) => {
        console.log(`-------------开始执行 /api/update---------------`);

        let { query } = req;
        let dwm = query.dwm || "d";
        // 获取到today还没被update的code
        let used = await SQL.getTables({
            connection,
            name: "used",
            conditions: `dwm='${dwm}'`,
        });
        let tds = await SQL.getTables({
            connection,
            name: "today",
            conditions: `dwm='${dwm}'`,
        });
        tds = tds.map((v) => v.code);
        let unused = used.filter((v) => !tds.includes(v.code));

        let count = 0,
            stashFailItem = [];
        let fn = async function (unusedArr = unused, num = 6) {
            let item = unusedArr.slice(count, (count += num));
            if (item.length) {
                let codes = item.map((v) => v.code);

                let ret = await getContent({ codes, query });
                // update是多个可以一起调，所以res有可能是多个,如果没有就是null
                let res = ret.data;
                if (!res) {
                    // 如果正常update的6个中有一个没有值，则这6个就会报错，返回的data为null
                    if (ret.err === "{}\n") {
                        // 为空的code，也存起来。(一般init成功的，但是update失败了，基本就是被停牌或下市的)
                        await SQL.setTables({
                            connection,
                            code: item[0].code,
                            type: item[0].type,
                            name: "today",
                            dwm,
                        });
                    } else {
                        // 将失败的合在一起，最后重新一个一个的调用。其中会有没有值的存在，返回一个‘{}\n’来表示
                        stashFailItem = stashFailItem.concat(item);
                    }
                    // 这些code有失败的，注意存储。。
                }
                while (res && res.length) {
                    let [level1] = res.slice(-1);

                    let { code, type } = level1;
                    if (ret.err) {
                        console.log(`>>> 这个${code}有问题： ${ret.err}`);
                        await SQL.setTables({
                            connection,
                            code,
                            type,
                            name: "fail",
                            dwm,
                        });
                    } else {
                        await SQL.save({ connection, item: level1, dwm });
                        await SQL.setTables({
                            connection,
                            code,
                            type,
                            name: "today",
                            dwm,
                        });
                    }
                    res.splice(-1);
                }
                setTimeout(() => {
                    console.log(`------${count}/${unusedArr.length}------`);
                    fn(unusedArr, num);
                }, 100);
            } else {
                if (stashFailItem.length) {
                    count = 0;
                    fn(stashFailItem, 1);
                    stashFailItem = [];
                } else {
                    quertBefore({ dwm, mail: "update" }, connection);
                    // sendMail(`sina update： ${dwm} 成功！`);
                    console.log(`-------------执行完成 /api/update---------------`);
                }
            }
        };
        fn();
    });
};
