/** @format */

const API = require("../api");
const SQL = require("../sql");
const { quertBefore } = require("../model");
const { someDay, getRequest, queryByStr } = require("../model/methods");
const { getHolidays } = require("../api");

function getContent({ codes, query, sliceLength = 94 }) {
    let period = query.dwm || "d";
    let days = query.days / 1 || 0;
    let start = query.start;
    let end = query.end;

    if (!start) {
        start = someDay(days + sliceLength, "");
    }
    if (!end) {
        end = someDay(days, "");
    }
    return new Promise(async (rl, rj) => {
        // await API.getIG502({code})
        /**
         * 1. codes最多可以放6个
         * 2. 如果使用‘sohu’,则sliceLength必须设置，
         *      设置为1可用于处理zf，考虑到1可能还是节假日，所以设置初始值10
         *      如果需要ma，则设置为10、20、60...
         *      60/5(一周) = 12周；12*7=84天；84+10=94
         *      考虑到跨度2个多月，可能还有其他节假日，以最长的国庆、中秋|过年、元旦。除周末最多5+1，按10天算
         */
        await API.get({
            // 通用属性
            sliceLength,
            method: "update",
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
        return new Promise(async (rl, rj) => {
            let { query } = req;
            let { type = "update", dwm = "d" } = query;
            let isUpdateType = type === "update";

            console.log(`-------------开始执行 /api/update?${dwm}---------------`);
            // 获取到today还没被update的code
            let used = await SQL.getTables({
                connection,
                name: "used",
                conditions: `dwm='${dwm}'`,
            });
            console.log(`>> used：${used.length}`);
            let tds = await SQL.getTables({
                connection,
                name: "today",
                conditions: `dwm='${dwm}'`,
            });
            console.log(`>> tds：${tds.length}`);
            tds = tds.map((v) => v.code);
            let unused = used.filter((v) => !tds.includes(v.code));

            let count = 0,
                stashFailItem = [];
            let fn = async function (unusedArr = unused, num = 6) {
                let item = unusedArr.slice(count, (count += num));
                if (item.length && isUpdateType) {
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
                            let { jys } = item.find((v) => v.code === code) || {};
                            await SQL.save({ connection, item: level1, dwm });
                            await SQL.setTables({
                                connection,
                                code,
                                type,
                                name: "today",
                                dwm,
                                jys,
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
                        let url = "http://localhost:3334/api/duplicate/remove";
                        const str = queryByStr(query);
                        if (str) {
                            url += `?${str}`;
                        }
                        isUpdateType && (await getRequest(url));
                        await quertBefore({ dwm, mail: "update", isUpdateType }, connection);
                        // sendMail(`sina update： ${dwm} 成功！`);
                        rl();
                        console.log(`-------------执行完成 /api/update?${dwm}---------------`);
                    }
                }
            };
            fn();
        });
    });
};
