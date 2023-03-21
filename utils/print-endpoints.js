const listEndpoints = require("express-list-endpoints");

function logEndpoints(app) {
  const enpointsList = listEndpoints(app);

  for (let i = 0; i < enpointsList.length; i++) {
    console.log(
      `[${
        enpointsList[i].methods == "GET"
          ? `\x1b[32m${enpointsList[i].methods}\x1b[0m     `
          : `${
              enpointsList[i].methods == "POST"
                ? `\x1b[33m${enpointsList[i].methods}\x1b[0m    `
                : `${
                    enpointsList[i].methods == "PATCH"
                      ? `\x1b[90m${enpointsList[i].methods}\x1b[0m   `
                      : `${
                          enpointsList[i].methods == "DELETE"
                            ? `\x1b[31m${enpointsList[i].methods}\x1b[0m  `
                            : ""
                        }`
                  }`
            }`
      }] ${enpointsList[i].path} -- \x1b[2m${enpointsList[i].middlewares}\x1b[0m `
    );
  }
}

module.exports = logEndpoints;
