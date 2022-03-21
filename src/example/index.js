/** @format */

const create = require("./create");
const init = require("./init");
const update = require("./update");
const query = require("./query");
const download = require("./download");
const duplicate = require("./duplicate");

const apps = [create, init, update, query, download, duplicate];

function runApi(app, connection) {
    apps.forEach((item) => {
        if (typeof item === "function") {
            item(app, connection);
        }
    });
}

module.exports = {
    runApi,
};
