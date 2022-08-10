/** @format */

const fs = require("fs");

function getApps() {
    return new Promise((rl, rj) => {
        const path = "./src/example";
        fs.readdir(path, (err, files) => {
            if (err) {
                rj(err);
            }
            const lists = files
                .map((v) => {
                    if (v !== "index.js") {
                        return require(`./${v}`);
                    }
                })
                .filter((v) => v);
            rl(lists);
        });
    });
}

async function runApi(app, connection) {
    const apps = await getApps();
    apps.forEach((item) => {
        if (typeof item === "function") {
            item(app, connection);
        }
    });
}

module.exports = {
    runApi,
};
