"use strict";
var inquirer = require("inquirer");
var fs = require("fs");
var Promise = require("bluebird");
var pathExists = require("path-exists");
var _ = require("lodash");
var async = require("async");
var path = require("path");
var exec = require("promised-exec");
var cordovadir = "/tmp/cordova" + new Date().getTime();
var vuedir = "/tmp/vue" + new Date().getTime();
var gitrepo = false;
if (pathExists.sync("./.git/config")) {
    var gitcontent = fs.readFileSync("./.git/config").toString("utf-8").replace(/\t/g, '').split('\n');
    for (var i = 0; i < gitcontent.length; i++) {
        if (gitcontent[i].split('@').length > 1) {
            gitrepo = gitcontent[i].split('url = ')[1];
        }
    }
}
var questions = [
    {
        type: 'list',
        name: 'app',
        message: 'For leaving a comment, you get a freebie',
        choices: ['mobile', 'multi', 'desktop', 'server'],
        when: function (answers) {
            return answers.comments !== 'Nope, all good!';
        }
    },
    {
        type: 'input',
        name: 'name',
        message: 'Insert App name',
        validate: function (value) {
            var pass = 'Please enter a valid phone number';
            if (value) {
                pass = true;
            }
            return pass;
        }
    },
    {
        type: 'checkbox',
        message: 'Select platforms',
        name: 'platforms',
        when: function (answers) {
            return answers.app === 'multi';
        },
        choices: [
            {
                name: 'Browser'
            },
            {
                name: 'iOS'
            },
            {
                name: 'Android'
            },
            {
                name: 'Desktop'
            }
        ],
        validate: function (answer) {
            var a = true;
            if (answer.length < 1) {
                a = 'You must choose at least one topping.';
            }
            return a;
        }
    },
    {
        type: 'checkbox',
        message: 'Select mobile platforms',
        name: 'mobile',
        when: function (answers) {
            return answers.app === 'mobile';
        },
        choices: [
            {
                name: 'iOSMobile'
            },
            {
                name: 'Android'
            }
        ],
        validate: function (answer) {
            var a = true;
            if (answer.length < 1) {
                a = 'You must choose at least one topping.';
            }
            return a;
        }
    },
    {
        type: 'confirm',
        name: 'confirm',
        message: 'do you wan to confirm? (Y/n)',
        default: false,
        validate: function (value) {
            var ret = false;
            if (value == "yes" || value == "Yes" || value == "y" || value == "Y") {
                ret = true;
            }
            return ret;
        }
    }
];
var dir;
if (!gitrepo) {
    questions.push({
        name: "repository",
        type: "input",
        message: "Insert repository",
        validate: function (value) {
            if (value.split("@").length > 1 || value.split("ttp://") > 1) {
                return true;
            }
            return 'Please enter a valid repository';
        }
    });
}
else {
    dir = path.resolve();
}
function prompt() {
    return new Promise(function (resolve, reject) {
        inquirer.prompt(questions).then(function (answers) {
            resolve(answers);
        }).catch(function (err) {
            throw Error(err);
        });
    });
}
module.exports = function cli() {
    prompt().then(function (a) {
        if (a.confirm) {
            if (!dir)
                dir = path.resolve() + '/' + a.name;
            switch (a.app) {
                case "multi":
                    exec("cordova create " + a.name + " online.kernel." + a.name + " " + a.name).then(function () {
                        var platforms = [];
                        _.map(a.platforms, function (p) {
                            if (p.toLowerCase() === "browser" || p.toLowerCase() === "ios" || p.toLowerCase() === "android")
                                platforms.push(p.toLowerCase());
                        });
                        async.eachSeries(platforms, function (pla, cb) {
                            console.log("adding platform " + pla + "in " + dir);
                            exec("cd " + dir + " && cordova platform add " + pla + " --save").then(function () {
                                cb();
                            }).catch(function (err) {
                                cb(err);
                            });
                        }, function (err) {
                            if (err) {
                                throw err;
                            }
                            else {
                                console.log("adding vuekit to " + dir + " from " + __dirname + "/vuekit");
                                exec("cp -a " + __dirname + "/vuekit " + dir).then(function () {
                                    exec("cd " + dir + " npm i").then(function () {
                                        console.log("all done for now");
                                    }).catch(function (err) {
                                        throw err;
                                    });
                                }).catch(function (err) {
                                    throw err;
                                });
                            }
                        });
                    }).catch(function (err) {
                        throw err;
                    });
                    break;
                default:
                    console.log("todoooo");
                    break;
            }
        }
        else {
            console.log("Exit!");
        }
    });
};

//# sourceMappingURL=data:application/json;base64,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dkIsQ0FBQztJQUdILENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFBIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG5pbXBvcnQgKiBhcyBpbnF1aXJlciBmcm9tIFwiaW5xdWlyZXJcIjtcbmltcG9ydCAqIGFzIGZzIGZyb20gXCJmc1wiO1xuaW1wb3J0ICogYXMgUHJvbWlzZSBmcm9tIFwiYmx1ZWJpcmRcIjtcbmltcG9ydCAqIGFzIHBhdGhFeGlzdHMgZnJvbSBcInBhdGgtZXhpc3RzXCI7XG5pbXBvcnQgKiBhcyBjb21tYW5kZXIgZnJvbSBcImNvbW1hbmRlclwiO1xuaW1wb3J0ICogYXMgXyBmcm9tIFwibG9kYXNoXCI7XG5pbXBvcnQgKiBhcyBhc3luYyBmcm9tIFwiYXN5bmNcIjtcbmltcG9ydCAqIGFzIHBhdGggZnJvbSBcInBhdGhcIjtcblxuXG5sZXQgZXhlYyA9IHJlcXVpcmUoXCJwcm9taXNlZC1leGVjXCIpO1xuXG5pbnRlcmZhY2UgSWFueUZ1bmN0aW9uIHtcbiAgRnVuY3Rpb246IGFueTtcbn1cblxuXG5pbnRlcmZhY2UgSXF1ZXN0aW9uIHtcblxuICB0eXBlOiBzdHJpbmc7XG4gIG5hbWU6IHN0cmluZztcbiAgbWVzc2FnZTogc3RyaW5nO1xuICBjaG9pY2VzPzogYW55W107XG4gIGRlZmF1bHQ/OiBhbnk7XG4gIHZhbGlkYXRlPzogRnVuY3Rpb247XG4gIGZpbHRlcj86IGFueTtcbiAgd2hlbj86IEZ1bmN0aW9uO1xuXG59XG5cbmxldCBjb3Jkb3ZhZGlyID0gXCIvdG1wL2NvcmRvdmFcIiArIG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xubGV0IHZ1ZWRpciA9IFwiL3RtcC92dWVcIiArIG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXG5cblxubGV0IGdpdHJlcG86IGFueSA9IGZhbHNlO1xuXG5cbmlmIChwYXRoRXhpc3RzLnN5bmMoXCIuLy5naXQvY29uZmlnXCIpKSB7XG5cblxuICBsZXQgZ2l0Y29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhcIi4vLmdpdC9jb25maWdcIikudG9TdHJpbmcoXCJ1dGYtOFwiKS5yZXBsYWNlKC9cXHQvZywgJycpLnNwbGl0KCdcXG4nKTtcblxuXG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBnaXRjb250ZW50Lmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKGdpdGNvbnRlbnRbaV0uc3BsaXQoJ0AnKS5sZW5ndGggPiAxKSB7XG4gICAgICBnaXRyZXBvID0gZ2l0Y29udGVudFtpXS5zcGxpdCgndXJsID0gJylbMV07XG4gICAgfVxuICB9XG59XG5cbmxldCBxdWVzdGlvbnMgPSA8SXF1ZXN0aW9uW10+W1xuXG4gIHtcbiAgICB0eXBlOiAnbGlzdCcsXG4gICAgbmFtZTogJ2FwcCcsXG4gICAgbWVzc2FnZTogJ0ZvciBsZWF2aW5nIGEgY29tbWVudCwgeW91IGdldCBhIGZyZWViaWUnLFxuICAgIGNob2ljZXM6IFsnbW9iaWxlJywgJ211bHRpJywgJ2Rlc2t0b3AnLCAnc2VydmVyJ10sXG4gICAgd2hlbjogZnVuY3Rpb24gKGFuc3dlcnMpIHtcbiAgICAgIHJldHVybiBhbnN3ZXJzLmNvbW1lbnRzICE9PSAnTm9wZSwgYWxsIGdvb2QhJztcbiAgICB9XG4gIH0sXG4gIHtcbiAgICB0eXBlOiAnaW5wdXQnLFxuICAgIG5hbWU6ICduYW1lJyxcbiAgICBtZXNzYWdlOiAnSW5zZXJ0IEFwcCBuYW1lJyxcbiAgICB2YWxpZGF0ZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICBsZXQgcGFzczogYW55ID0gJ1BsZWFzZSBlbnRlciBhIHZhbGlkIHBob25lIG51bWJlcic7XG4gICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgcGFzcyA9IHRydWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gcGFzcztcbiAgICB9XG4gIH0sXG5cbiAge1xuICAgIHR5cGU6ICdjaGVja2JveCcsXG4gICAgbWVzc2FnZTogJ1NlbGVjdCBwbGF0Zm9ybXMnLFxuICAgIG5hbWU6ICdwbGF0Zm9ybXMnLFxuICAgIHdoZW46IGZ1bmN0aW9uIChhbnN3ZXJzKSB7XG4gICAgICByZXR1cm4gYW5zd2Vycy5hcHAgPT09ICdtdWx0aSc7XG4gICAgfSxcbiAgICBjaG9pY2VzOiBbXG4gICAgICB7XG4gICAgICAgIG5hbWU6ICdCcm93c2VyJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgbmFtZTogJ2lPUydcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIG5hbWU6ICdBbmRyb2lkJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgbmFtZTogJ0Rlc2t0b3AnXG4gICAgICB9XG4gICAgXSxcbiAgICB2YWxpZGF0ZTogZnVuY3Rpb24gKGFuc3dlcikge1xuICAgICAgbGV0IGE6IGFueSA9IHRydWU7XG4gICAgICBpZiAoYW5zd2VyLmxlbmd0aCA8IDEpIHtcbiAgICAgICAgYSA9ICdZb3UgbXVzdCBjaG9vc2UgYXQgbGVhc3Qgb25lIHRvcHBpbmcuJztcbiAgICAgIH1cbiAgICAgIHJldHVybiBhO1xuICAgIH1cbiAgfSxcblxuICB7XG4gICAgdHlwZTogJ2NoZWNrYm94JyxcbiAgICBtZXNzYWdlOiAnU2VsZWN0IG1vYmlsZSBwbGF0Zm9ybXMnLFxuICAgIG5hbWU6ICdtb2JpbGUnLFxuICAgIHdoZW46IGZ1bmN0aW9uIChhbnN3ZXJzKSB7XG4gICAgICByZXR1cm4gYW5zd2Vycy5hcHAgPT09ICdtb2JpbGUnO1xuICAgIH0sXG4gICAgY2hvaWNlczogW1xuXG4gICAgICB7XG4gICAgICAgIG5hbWU6ICdpT1NNb2JpbGUnXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBuYW1lOiAnQW5kcm9pZCdcbiAgICAgIH1cbiAgICBdLFxuICAgIHZhbGlkYXRlOiBmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICBsZXQgYTogYW55ID0gdHJ1ZTtcbiAgICAgIGlmIChhbnN3ZXIubGVuZ3RoIDwgMSkge1xuICAgICAgICBhID0gJ1lvdSBtdXN0IGNob29zZSBhdCBsZWFzdCBvbmUgdG9wcGluZy4nO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGE7XG4gICAgfVxuICB9LFxuXG4gIHtcbiAgICB0eXBlOiAnY29uZmlybScsXG4gICAgbmFtZTogJ2NvbmZpcm0nLFxuICAgIG1lc3NhZ2U6ICdkbyB5b3Ugd2FuIHRvIGNvbmZpcm0/IChZL24pJyxcbiAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICB2YWxpZGF0ZTogZnVuY3Rpb24gKHZhbHVlOiBzdHJpbmcpOiBhbnkge1xuICAgICAgbGV0IHJldCA9IGZhbHNlO1xuICAgICAgaWYgKHZhbHVlID09IFwieWVzXCIgfHwgdmFsdWUgPT0gXCJZZXNcIiB8fCB2YWx1ZSA9PSBcInlcIiB8fCB2YWx1ZSA9PSBcIllcIikge1xuICAgICAgICByZXQgPSB0cnVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG4gIH1cblxuXTtcblxuXG5sZXQgZGlyOiBzdHJpbmc7XG5cbmlmICghZ2l0cmVwbykge1xuXG4gIHF1ZXN0aW9ucy5wdXNoKHtcbiAgICBuYW1lOiBcInJlcG9zaXRvcnlcIixcbiAgICB0eXBlOiBcImlucHV0XCIsXG4gICAgbWVzc2FnZTogXCJJbnNlcnQgcmVwb3NpdG9yeVwiLFxuICAgIHZhbGlkYXRlOiBmdW5jdGlvbiAodmFsdWUpOiBhbnkge1xuXG4gICAgICBpZiAodmFsdWUuc3BsaXQoXCJAXCIpLmxlbmd0aCA+IDEgfHwgdmFsdWUuc3BsaXQoXCJ0dHA6Ly9cIikgPiAxKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gJ1BsZWFzZSBlbnRlciBhIHZhbGlkIHJlcG9zaXRvcnknO1xuICAgIH1cblxuICB9KTtcblxuXG59IGVsc2Uge1xuXG4gIGRpciA9IHBhdGgucmVzb2x2ZSgpO1xuXG59XG5cblxuZnVuY3Rpb24gcHJvbXB0KCkge1xuICByZXR1cm4gbmV3IFByb21pc2U8YW55PihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cbiAgICBpbnF1aXJlci5wcm9tcHQocXVlc3Rpb25zKS50aGVuKGZ1bmN0aW9uIChhbnN3ZXJzKSB7XG5cbiAgICAgIHJlc29sdmUoYW5zd2Vycyk7XG4gICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgdGhyb3cgRXJyb3IoZXJyKTtcblxuICAgIH0pO1xuICB9KTtcblxufVxuXG5leHBvcnQgPSBmdW5jdGlvbiBjbGkoKSB7XG5cbiAgcHJvbXB0KCkudGhlbihmdW5jdGlvbiAoYSkge1xuXG4gICAgaWYgKGEuY29uZmlybSkge1xuXG4gICAgICBpZiAoIWRpcikgZGlyID0gcGF0aC5yZXNvbHZlKCkgKyAnLycgKyBhLm5hbWU7XG5cblxuICAgICAgc3dpdGNoIChhLmFwcCkge1xuXG4gICAgICAgIGNhc2UgXCJtdWx0aVwiOlxuXG4gICAgICAgICAgZXhlYyhcImNvcmRvdmEgY3JlYXRlIFwiICsgYS5uYW1lICsgXCIgb25saW5lLmtlcm5lbC5cIiArIGEubmFtZSArIFwiIFwiICsgYS5uYW1lKS50aGVuKGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgbGV0IHBsYXRmb3JtcyA9IFtdO1xuXG4gICAgICAgICAgICBfLm1hcChhLnBsYXRmb3JtcywgZnVuY3Rpb24gKHA6IHN0cmluZykge1xuICAgICAgICAgICAgICBpZiAocC50b0xvd2VyQ2FzZSgpID09PSBcImJyb3dzZXJcIiB8fCBwLnRvTG93ZXJDYXNlKCkgPT09IFwiaW9zXCIgfHwgcC50b0xvd2VyQ2FzZSgpID09PSBcImFuZHJvaWRcIikgcGxhdGZvcm1zLnB1c2gocC50b0xvd2VyQ2FzZSgpKVxuICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgYXN5bmMuZWFjaFNlcmllcyhwbGF0Zm9ybXMsIGZ1bmN0aW9uIChwbGEsIGNiKSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYWRkaW5nIHBsYXRmb3JtIFwiICsgcGxhKyBcImluIFwiK2Rpcik7XG4gICAgICAgICAgICAgIGV4ZWMoXCJjZCBcIiArIGRpciArIFwiICYmIGNvcmRvdmEgcGxhdGZvcm0gYWRkIFwiICsgcGxhICsgXCIgLS1zYXZlXCIpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGNiKCk7XG4gICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjYihlcnIpO1xuICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBlcnI7XG5cbiAgICAgICAgICAgICAgfSBlbHNlIHtcblxuXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJhZGRpbmcgdnVla2l0IHRvIFwiICsgZGlyICsgXCIgZnJvbSBcIiArIF9fZGlybmFtZSArIFwiL3Z1ZWtpdFwiKTtcblxuICAgICAgICAgICAgICAgIGV4ZWMoXCJjcCAtYSBcIiArIF9fZGlybmFtZSArIFwiL3Z1ZWtpdCBcIiArIGRpcikudGhlbihmdW5jdGlvbiAoKSB7XG5cblxuICAgICAgICAgICAgICAgICAgZXhlYyhcImNkIFwiICsgZGlyICsgXCIgbnBtIGlcIikudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYWxsIGRvbmUgZm9yIG5vd1wiKVxuICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBlcnJcbiAgICAgICAgICAgICAgICAgIH0pO1xuXG5cbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICB0aHJvdyBlcnJcbiAgICAgICAgICAgICAgICB9KTtcblxuXG5cblxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuXG4gICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgdGhyb3cgZXJyO1xuXG4gICAgICAgICAgfSlcblxuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgY29uc29sZS5sb2coXCJ0b2Rvb29vXCIpO1xuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiRXhpdCFcIik7XG4gICAgfVxuXG5cbiAgfSk7XG59Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
