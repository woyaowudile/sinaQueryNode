/** @format */

const create = require("./create");
const initSH = require("./initSH");
const init = require("./init");
const update = require("./update");
const query = require("./query");
const clear = require("./clear");
const download = require("./download");
const duplicate = require("./duplicate");
const test = require("./test");

const apps = [create, initSH, init, update, query, clear, download, duplicate, test];

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
