"use strict";
var inquirer = require("inquirer");
var fs = require("fs");
var Promise = require("bluebird");
var pathExists = require("path-exists");
var _ = require("lodash");
var async = require("async");
var path = require("path");
var gitconfig = require("git-config");
var dronesql_1 = require("./patch/dronesql");
var GogsClient = require('gogs-client');
var exec = require("promised-exec");
var jsonfile = require("jsonfile");
var rpj = require("request-promise-json");
var gcs = gitconfig.sync();
var gitConfig = gcs.user;
var cordovadir = "/tmp/cordova" + new Date().getTime();
var vuedir = "/tmp/vue" + new Date().getTime();
var gitrepo = false;
var dir;
var questions = [
    {
        type: 'list',
        name: 'app',
        message: 'Select app model',
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
    }
];
if (pathExists.sync("./.git/config")) {
    var gitcontent = fs.readFileSync("./.git/config").toString("utf-8").replace(/\t/g, '').split('\n');
    for (var i = 0; i < gitcontent.length; i++) {
        if (gitcontent[i].split('@').length > 1) {
            gitrepo = gitcontent[i].split('url = ')[1];
        }
    }
}
if (!gitrepo) {
    questions.push({
        name: "repository",
        type: "input",
        message: "Insert repository",
        validate: function (value) {
            if (value.split("@").length > 1 || value.split("ttp://") > 1) {
                gitrepo = value;
                return true;
            }
            return 'Please enter a valid repository';
        }
    });
}
else {
    dir = path.resolve();
}
function addrepo(appdirectory, user, password, name, dronedbuser, dronedbpassw, droneuser, dronepassw) {
    rpj.post("https://" + user + ":" + password + "@git.kernel.online/api/v1/admin/users/kernel/repos", {
        name: name,
        private: true
    }).then(function (res) {
        dronesql_1.default({
            origin: { host: "kernel.online", port: 3306 },
            auth: {
                password: dronedbpassw,
                user: droneuser,
                database: "drone"
            },
            repo: "testrepo",
            gogs: {
                user: "string",
                password: "string"
            }
        }).then(function () {
            exec("cd " + appdirectory + " && npm i").then(function () {
                console.log("all done for now");
            }).catch(function (err) {
                throw err;
            });
        }).catch(function (err) {
            console.log(err);
        });
    }).catch(function (err) {
        throw err;
    });
}
questions.push({
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
});
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
                            console.log("adding platform " + pla + " in " + dir);
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
                                exec("cp -r " + __dirname + "/vuekit/. " + dir).then(function () {
                                    var pk = require(dir + "/package.json");
                                    var repo = {
                                        type: "git",
                                        url: gitrepo
                                    };
                                    pk.name = a.name;
                                    pk.author = gitConfig.name + " <" + gitConfig.email + ">";
                                    pk.license = "SEE LICENSE IN LICENSE";
                                    jsonfile.writeFileSync(dir + "/package.json", pk, { spaces: 4 });
                                    fs.writeFileSync(dir + "/LICENSE", '(c) Copyright ' + new Date().getFullYear() + ' kernel.online, all rights reserved.');
                                    console.log("installing dependencies, wait a few minutes...");
                                    exec("cd " + dir + " && npm i").then(function () {
                                        exec("mv " + dir + "/gitignorefile " + dir + "/.gitignore").then(function () {
                                            console.log("all done for now");
                                        }).catch(function (err) {
                                            throw err;
                                        });
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

//# sourceMappingURL=data:application/json;base64,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QkFFRixLQUFLLENBQUM7Z0JBRVI7b0JBQ0UsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztvQkFDdkIsS0FBSyxDQUFDO1lBRVYsQ0FBQztRQUNILENBQUM7UUFBQyxJQUFJLENBQUMsQ0FBQztZQUNOLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDdkIsQ0FBQztJQUdILENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFBIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG5pbXBvcnQgKiBhcyBpbnF1aXJlciBmcm9tIFwiaW5xdWlyZXJcIjtcbmltcG9ydCAqIGFzIGZzIGZyb20gXCJmc1wiO1xuaW1wb3J0ICogYXMgUHJvbWlzZSBmcm9tIFwiYmx1ZWJpcmRcIjtcbmltcG9ydCAqIGFzIHBhdGhFeGlzdHMgZnJvbSBcInBhdGgtZXhpc3RzXCI7XG5pbXBvcnQgKiBhcyBjb21tYW5kZXIgZnJvbSBcImNvbW1hbmRlclwiO1xuaW1wb3J0ICogYXMgXyBmcm9tIFwibG9kYXNoXCI7XG5pbXBvcnQgKiBhcyBhc3luYyBmcm9tIFwiYXN5bmNcIjtcbmltcG9ydCAqIGFzIHBhdGggZnJvbSBcInBhdGhcIjtcbmltcG9ydCAqIGFzIGdpdGNvbmZpZyBmcm9tIFwiZ2l0LWNvbmZpZ1wiO1xuaW1wb3J0ICogYXMgcHJvZ3JhbSBmcm9tIFwiY29tbWFuZGVyXCI7XG5cblxuaW1wb3J0IGRyb25lcGF0Y2ggZnJvbSBcIi4vcGF0Y2gvZHJvbmVzcWxcIjtcblxuXG5sZXQgR29nc0NsaWVudCA9IHJlcXVpcmUoJ2dvZ3MtY2xpZW50Jyk7XG5cblxuXG5sZXQgZXhlYyA9IHJlcXVpcmUoXCJwcm9taXNlZC1leGVjXCIpO1xuXG5sZXQganNvbmZpbGUgPSByZXF1aXJlKFwianNvbmZpbGVcIik7XG5sZXQgcnBqID0gcmVxdWlyZShcInJlcXVlc3QtcHJvbWlzZS1qc29uXCIpO1xuXG5cblxuXG5pbnRlcmZhY2UgSWFueUZ1bmN0aW9uIHtcbiAgRnVuY3Rpb246IGFueTtcbn1cblxuXG5pbnRlcmZhY2UgSXF1ZXN0aW9uIHtcblxuICB0eXBlOiBzdHJpbmc7XG4gIG5hbWU6IHN0cmluZztcbiAgbWVzc2FnZTogc3RyaW5nO1xuICBjaG9pY2VzPzogYW55W107XG4gIGRlZmF1bHQ/OiBhbnk7XG4gIHZhbGlkYXRlPzogRnVuY3Rpb247XG4gIGZpbHRlcj86IGFueTtcbiAgd2hlbj86IEZ1bmN0aW9uO1xuXG59XG5cblxuXG5sZXQgZ2NzID0gPGFueT5naXRjb25maWcuc3luYygpO1xuXG5sZXQgZ2l0Q29uZmlnID0gPHsgbmFtZTogc3RyaW5nOyBlbWFpbDogc3RyaW5nIH0+Z2NzLnVzZXI7IC8vIGNhbiBwYXNzIGV4cGxpdCBmaWxlIGlmIHlvdSB3YW50IGFzIHdlbGwgXG5cbmxldCBjb3Jkb3ZhZGlyID0gXCIvdG1wL2NvcmRvdmFcIiArIG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xubGV0IHZ1ZWRpciA9IFwiL3RtcC92dWVcIiArIG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXG5cblxubGV0IGdpdHJlcG86IGFueSA9IGZhbHNlO1xuXG5sZXQgZGlyOiBzdHJpbmc7XG5cblxuXG5sZXQgcXVlc3Rpb25zID0gPElxdWVzdGlvbltdPltcblxuICB7XG4gICAgdHlwZTogJ2xpc3QnLFxuICAgIG5hbWU6ICdhcHAnLFxuICAgIG1lc3NhZ2U6ICdTZWxlY3QgYXBwIG1vZGVsJyxcbiAgICBjaG9pY2VzOiBbJ21vYmlsZScsICdtdWx0aScsICdkZXNrdG9wJywgJ3NlcnZlciddLFxuICAgIHdoZW46IGZ1bmN0aW9uIChhbnN3ZXJzKSB7XG4gICAgICByZXR1cm4gYW5zd2Vycy5jb21tZW50cyAhPT0gJ05vcGUsIGFsbCBnb29kISc7XG4gICAgfVxuICB9LFxuICB7XG4gICAgdHlwZTogJ2lucHV0JyxcbiAgICBuYW1lOiAnbmFtZScsXG4gICAgbWVzc2FnZTogJ0luc2VydCBBcHAgbmFtZScsXG4gICAgdmFsaWRhdGU6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgbGV0IHBhc3M6IGFueSA9ICdQbGVhc2UgZW50ZXIgYSB2YWxpZCBwaG9uZSBudW1iZXInO1xuICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgIHBhc3MgPSB0cnVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHBhc3M7XG4gICAgfVxuICB9LFxuXG4gIHtcbiAgICB0eXBlOiAnY2hlY2tib3gnLFxuICAgIG1lc3NhZ2U6ICdTZWxlY3QgcGxhdGZvcm1zJyxcbiAgICBuYW1lOiAncGxhdGZvcm1zJyxcbiAgICB3aGVuOiBmdW5jdGlvbiAoYW5zd2Vycykge1xuICAgICAgcmV0dXJuIGFuc3dlcnMuYXBwID09PSAnbXVsdGknO1xuICAgIH0sXG4gICAgY2hvaWNlczogW1xuICAgICAge1xuICAgICAgICBuYW1lOiAnQnJvd3NlcidcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIG5hbWU6ICdpT1MnXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBuYW1lOiAnQW5kcm9pZCdcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIG5hbWU6ICdEZXNrdG9wJ1xuICAgICAgfVxuICAgIF0sXG4gICAgdmFsaWRhdGU6IGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgIGxldCBhOiBhbnkgPSB0cnVlO1xuICAgICAgaWYgKGFuc3dlci5sZW5ndGggPCAxKSB7XG4gICAgICAgIGEgPSAnWW91IG11c3QgY2hvb3NlIGF0IGxlYXN0IG9uZSB0b3BwaW5nLic7XG4gICAgICB9XG4gICAgICByZXR1cm4gYTtcbiAgICB9XG4gIH0sXG5cbiAge1xuICAgIHR5cGU6ICdjaGVja2JveCcsXG4gICAgbWVzc2FnZTogJ1NlbGVjdCBtb2JpbGUgcGxhdGZvcm1zJyxcbiAgICBuYW1lOiAnbW9iaWxlJyxcbiAgICB3aGVuOiBmdW5jdGlvbiAoYW5zd2Vycykge1xuICAgICAgcmV0dXJuIGFuc3dlcnMuYXBwID09PSAnbW9iaWxlJztcbiAgICB9LFxuICAgIGNob2ljZXM6IFtcblxuICAgICAge1xuICAgICAgICBuYW1lOiAnaU9TTW9iaWxlJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgbmFtZTogJ0FuZHJvaWQnXG4gICAgICB9XG4gICAgXSxcbiAgICB2YWxpZGF0ZTogZnVuY3Rpb24gKGFuc3dlcikge1xuICAgICAgbGV0IGE6IGFueSA9IHRydWU7XG4gICAgICBpZiAoYW5zd2VyLmxlbmd0aCA8IDEpIHtcbiAgICAgICAgYSA9ICdZb3UgbXVzdCBjaG9vc2UgYXQgbGVhc3Qgb25lIHRvcHBpbmcuJztcbiAgICAgIH1cbiAgICAgIHJldHVybiBhO1xuICAgIH1cbiAgfVxuXG5dO1xuXG5cbmlmIChwYXRoRXhpc3RzLnN5bmMoXCIuLy5naXQvY29uZmlnXCIpKSB7XG5cblxuICBsZXQgZ2l0Y29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhcIi4vLmdpdC9jb25maWdcIikudG9TdHJpbmcoXCJ1dGYtOFwiKS5yZXBsYWNlKC9cXHQvZywgJycpLnNwbGl0KCdcXG4nKTtcblxuXG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBnaXRjb250ZW50Lmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKGdpdGNvbnRlbnRbaV0uc3BsaXQoJ0AnKS5sZW5ndGggPiAxKSB7XG4gICAgICBnaXRyZXBvID0gZ2l0Y29udGVudFtpXS5zcGxpdCgndXJsID0gJylbMV07XG4gICAgfVxuICB9XG5cbn1cblxuXG5pZiAoIWdpdHJlcG8pIHtcblxuXG4gIHF1ZXN0aW9ucy5wdXNoKHtcbiAgICBuYW1lOiBcInJlcG9zaXRvcnlcIixcbiAgICB0eXBlOiBcImlucHV0XCIsXG4gICAgbWVzc2FnZTogXCJJbnNlcnQgcmVwb3NpdG9yeVwiLFxuICAgIHZhbGlkYXRlOiBmdW5jdGlvbiAodmFsdWUpOiBhbnkge1xuXG4gICAgICBpZiAodmFsdWUuc3BsaXQoXCJAXCIpLmxlbmd0aCA+IDEgfHwgdmFsdWUuc3BsaXQoXCJ0dHA6Ly9cIikgPiAxKSB7XG4gICAgICAgIGdpdHJlcG8gPSB2YWx1ZTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiAnUGxlYXNlIGVudGVyIGEgdmFsaWQgcmVwb3NpdG9yeSc7XG4gICAgfVxuXG4gIH0pO1xuXG5cbn0gZWxzZSB7XG5cbiAgZGlyID0gcGF0aC5yZXNvbHZlKCk7XG5cbn1cblxuZnVuY3Rpb24gYWRkcmVwbyhhcHBkaXJlY3RvcnksIHVzZXIsIHBhc3N3b3JkLCBuYW1lLCBkcm9uZWRidXNlciwgZHJvbmVkYnBhc3N3LCBkcm9uZXVzZXIsIGRyb25lcGFzc3cpIHtcblxuICBycGoucG9zdChcImh0dHBzOi8vXCIgKyB1c2VyICsgXCI6XCIgKyBwYXNzd29yZCArIFwiQGdpdC5rZXJuZWwub25saW5lL2FwaS92MS9hZG1pbi91c2Vycy9rZXJuZWwvcmVwb3NcIiwge1xuICAgIG5hbWU6IG5hbWUsXG4gICAgcHJpdmF0ZTogdHJ1ZVxuICB9KS50aGVuKGZ1bmN0aW9uIChyZXMpIHtcblxuXG4gICAgZHJvbmVwYXRjaChcbiAgICAgIHtcbiAgICAgICAgb3JpZ2luOiB7IGhvc3Q6IFwia2VybmVsLm9ubGluZVwiLCBwb3J0OiAzMzA2IH0sXG4gICAgICAgIGF1dGg6IHtcbiAgICAgICAgICBwYXNzd29yZDogZHJvbmVkYnBhc3N3LFxuICAgICAgICAgIHVzZXI6IGRyb25ldXNlcixcbiAgICAgICAgICBkYXRhYmFzZTogXCJkcm9uZVwiXG4gICAgICAgIH0sXG4gICAgICAgIHJlcG86IFwidGVzdHJlcG9cIixcbiAgICAgICAgZ29nczoge1xuICAgICAgICAgIHVzZXI6IFwic3RyaW5nXCIsXG4gICAgICAgICAgcGFzc3dvcmQ6IFwic3RyaW5nXCJcbiAgICAgICAgfVxuICAgICAgfVxuICAgICkudGhlbihmdW5jdGlvbiAoKSB7XG5cblxuICAgICAgZXhlYyhcImNkIFwiICsgYXBwZGlyZWN0b3J5ICsgXCIgJiYgbnBtIGlcIikudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiYWxsIGRvbmUgZm9yIG5vd1wiKVxuICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICB0aHJvdyBlcnJcbiAgICAgIH0pO1xuXG5cbiAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICBjb25zb2xlLmxvZyhlcnIpXG4gICAgfSlcblxuICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgdGhyb3cgZXJyXG4gIH0pO1xuXG59XG5cbnF1ZXN0aW9ucy5wdXNoKHtcbiAgdHlwZTogJ2NvbmZpcm0nLFxuICBuYW1lOiAnY29uZmlybScsXG4gIG1lc3NhZ2U6ICdkbyB5b3Ugd2FuIHRvIGNvbmZpcm0/IChZL24pJyxcbiAgZGVmYXVsdDogZmFsc2UsXG4gIHZhbGlkYXRlOiBmdW5jdGlvbiAodmFsdWU6IHN0cmluZyk6IGFueSB7XG4gICAgbGV0IHJldCA9IGZhbHNlO1xuICAgIGlmICh2YWx1ZSA9PSBcInllc1wiIHx8IHZhbHVlID09IFwiWWVzXCIgfHwgdmFsdWUgPT0gXCJ5XCIgfHwgdmFsdWUgPT0gXCJZXCIpIHtcbiAgICAgIHJldCA9IHRydWU7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH1cbn0pO1xuXG5cblxuZnVuY3Rpb24gcHJvbXB0KCkge1xuICByZXR1cm4gbmV3IFByb21pc2U8YW55PihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cbiAgICBpbnF1aXJlci5wcm9tcHQocXVlc3Rpb25zKS50aGVuKGZ1bmN0aW9uIChhbnN3ZXJzKSB7XG5cbiAgICAgIHJlc29sdmUoYW5zd2Vycyk7XG4gICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgdGhyb3cgRXJyb3IoZXJyKTtcblxuICAgIH0pO1xuICB9KTtcblxufVxuXG5leHBvcnQgPSBmdW5jdGlvbiBjbGkoKSB7XG5cbiAgcHJvbXB0KCkudGhlbihmdW5jdGlvbiAoYSkge1xuXG4gICAgaWYgKGEuY29uZmlybSkge1xuXG4gICAgICBpZiAoIWRpcikgZGlyID0gcGF0aC5yZXNvbHZlKCkgKyAnLycgKyBhLm5hbWU7XG5cblxuICAgICAgc3dpdGNoIChhLmFwcCkge1xuXG4gICAgICAgIGNhc2UgXCJtdWx0aVwiOlxuXG4gICAgICAgICAgZXhlYyhcImNvcmRvdmEgY3JlYXRlIFwiICsgYS5uYW1lICsgXCIgb25saW5lLmtlcm5lbC5cIiArIGEubmFtZSArIFwiIFwiICsgYS5uYW1lKS50aGVuKGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgbGV0IHBsYXRmb3JtcyA9IFtdO1xuXG4gICAgICAgICAgICBfLm1hcChhLnBsYXRmb3JtcywgZnVuY3Rpb24gKHA6IHN0cmluZykge1xuICAgICAgICAgICAgICBpZiAocC50b0xvd2VyQ2FzZSgpID09PSBcImJyb3dzZXJcIiB8fCBwLnRvTG93ZXJDYXNlKCkgPT09IFwiaW9zXCIgfHwgcC50b0xvd2VyQ2FzZSgpID09PSBcImFuZHJvaWRcIikgcGxhdGZvcm1zLnB1c2gocC50b0xvd2VyQ2FzZSgpKVxuICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgYXN5bmMuZWFjaFNlcmllcyhwbGF0Zm9ybXMsIGZ1bmN0aW9uIChwbGEsIGNiKSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYWRkaW5nIHBsYXRmb3JtIFwiICsgcGxhICsgXCIgaW4gXCIgKyBkaXIpO1xuICAgICAgICAgICAgICBleGVjKFwiY2QgXCIgKyBkaXIgKyBcIiAmJiBjb3Jkb3ZhIHBsYXRmb3JtIGFkZCBcIiArIHBsYSArIFwiIC0tc2F2ZVwiKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBjYigpO1xuICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgY2IoZXJyKTtcbiAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgZXJyO1xuXG4gICAgICAgICAgICAgIH0gZWxzZSB7XG5cblxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYWRkaW5nIHZ1ZWtpdCB0byBcIiArIGRpciArIFwiIGZyb20gXCIgKyBfX2Rpcm5hbWUgKyBcIi92dWVraXRcIik7XG5cbiAgICAgICAgICAgICAgICBleGVjKFwiY3AgLXIgXCIgKyBfX2Rpcm5hbWUgKyBcIi92dWVraXQvLiBcIiArIGRpcikudGhlbihmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAgICAgICAgIGxldCBwayA9IHJlcXVpcmUoZGlyICsgXCIvcGFja2FnZS5qc29uXCIpO1xuXG4gICAgICAgICAgICAgICAgICBsZXQgcmVwbyA9IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJnaXRcIixcbiAgICAgICAgICAgICAgICAgICAgdXJsOiBnaXRyZXBvXG4gICAgICAgICAgICAgICAgICB9O1xuXG5cbiAgICAgICAgICAgICAgICAgIHBrLm5hbWUgPSBhLm5hbWU7XG4gICAgICAgICAgICAgICAgICBway5hdXRob3IgPSBnaXRDb25maWcubmFtZSArIFwiIDxcIiArIGdpdENvbmZpZy5lbWFpbCArIFwiPlwiO1xuICAgICAgICAgICAgICAgICAgcGsubGljZW5zZSA9IFwiU0VFIExJQ0VOU0UgSU4gTElDRU5TRVwiO1xuICAgICAgICAgICAgICAgICAgLy8gICBway5yZXBvc2l0b3J5ID0gcmVwbzsgIFJFUE9UT0RPIFdJVEggSU5JVFxuXG4gICAgICAgICAgICAgICAgICBqc29uZmlsZS53cml0ZUZpbGVTeW5jKGRpciArIFwiL3BhY2thZ2UuanNvblwiLCBwaywgeyBzcGFjZXM6IDQgfSlcblxuICAgICAgICAgICAgICAgICAgZnMud3JpdGVGaWxlU3luYyhkaXIgKyBcIi9MSUNFTlNFXCIsICcoYykgQ29weXJpZ2h0ICcgKyBuZXcgRGF0ZSgpLmdldEZ1bGxZZWFyKCkgKyAnIGtlcm5lbC5vbmxpbmUsIGFsbCByaWdodHMgcmVzZXJ2ZWQuJyk7XG4gICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImluc3RhbGxpbmcgZGVwZW5kZW5jaWVzLCB3YWl0IGEgZmV3IG1pbnV0ZXMuLi5cIik7XG5cbiAgICAgICAgICAgICAgICAgIGV4ZWMoXCJjZCBcIiArIGRpciArIFwiICYmIG5wbSBpXCIpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBleGVjKFwibXYgXCIgKyBkaXIgKyBcIi9naXRpZ25vcmVmaWxlIFwiICsgZGlyICsgXCIvLmdpdGlnbm9yZVwiKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImFsbCBkb25lIGZvciBub3dcIilcbiAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgIHRocm93IGVyclxuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBlcnJcbiAgICAgICAgICAgICAgICAgIH0pO1xuXG5cblxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgIHRocm93IGVyclxuICAgICAgICAgICAgICAgIH0pO1xuXG5cblxuXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICB0aHJvdyBlcnI7XG5cbiAgICAgICAgICB9KVxuXG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBjb25zb2xlLmxvZyhcInRvZG9vb29cIik7XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5sb2coXCJFeGl0IVwiKTtcbiAgICB9XG5cblxuICB9KTtcbn0iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
