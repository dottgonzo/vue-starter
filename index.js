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
var toaddgit = false;
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
                toaddgit = true;
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
                                    if (toaddgit) {
                                        pk.repository = gitrepo;
                                    }
                                    jsonfile.writeFileSync(dir + "/package.json", pk, { spaces: 4 });
                                    fs.writeFileSync(dir + "/LICENSE", '(c) Copyright ' + new Date().getFullYear() + ' kernel.online, all rights reserved.');
                                    console.log("installing dependencies, wait few minutes...");
                                    exec("cd " + dir + " && npm i").then(function () {
                                        exec("mv " + dir + "/gitignorefile " + dir + "/.gitignore").then(function () {
                                            if (toaddgit) {
                                                exec("cd " + dir + "&& git init && git remote add origin " + gitrepo).then(function () {
                                                    console.log("all done for now");
                                                }).catch(function (err) {
                                                    throw err;
                                                });
                                            }
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

//# sourceMappingURL=data:application/json;base64,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QUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRzs0Q0FDcEIsTUFBTSxHQUFHLENBQUE7d0NBQ1gsQ0FBQyxDQUFDLENBQUM7b0NBRUwsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRzt3Q0FDcEIsTUFBTSxHQUFHLENBQUE7b0NBQ1gsQ0FBQyxDQUFDLENBQUM7Z0NBSUwsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRztvQ0FDcEIsTUFBTSxHQUFHLENBQUE7Z0NBQ1gsQ0FBQyxDQUFDLENBQUM7NEJBS0wsQ0FBQzt3QkFDSCxDQUFDLENBQUMsQ0FBQTtvQkFFSixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHO3dCQUNwQixNQUFNLEdBQUcsQ0FBQztvQkFFWixDQUFDLENBQUMsQ0FBQTtvQkFFRixLQUFLLENBQUM7Z0JBRVI7b0JBQ0UsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztvQkFDdkIsS0FBSyxDQUFDO1lBRVYsQ0FBQztRQUNILENBQUM7UUFBQyxJQUFJLENBQUMsQ0FBQztZQUNOLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDdkIsQ0FBQztJQUdILENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFBIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG5pbXBvcnQgKiBhcyBpbnF1aXJlciBmcm9tIFwiaW5xdWlyZXJcIjtcbmltcG9ydCAqIGFzIGZzIGZyb20gXCJmc1wiO1xuaW1wb3J0ICogYXMgUHJvbWlzZSBmcm9tIFwiYmx1ZWJpcmRcIjtcbmltcG9ydCAqIGFzIHBhdGhFeGlzdHMgZnJvbSBcInBhdGgtZXhpc3RzXCI7XG5pbXBvcnQgKiBhcyBjb21tYW5kZXIgZnJvbSBcImNvbW1hbmRlclwiO1xuaW1wb3J0ICogYXMgXyBmcm9tIFwibG9kYXNoXCI7XG5pbXBvcnQgKiBhcyBhc3luYyBmcm9tIFwiYXN5bmNcIjtcbmltcG9ydCAqIGFzIHBhdGggZnJvbSBcInBhdGhcIjtcbmltcG9ydCAqIGFzIGdpdGNvbmZpZyBmcm9tIFwiZ2l0LWNvbmZpZ1wiO1xuaW1wb3J0ICogYXMgcHJvZ3JhbSBmcm9tIFwiY29tbWFuZGVyXCI7XG5cblxuaW1wb3J0IGRyb25lcGF0Y2ggZnJvbSBcIi4vcGF0Y2gvZHJvbmVzcWxcIjtcblxuXG5sZXQgR29nc0NsaWVudCA9IHJlcXVpcmUoJ2dvZ3MtY2xpZW50Jyk7XG5cblxuXG5sZXQgZXhlYyA9IHJlcXVpcmUoXCJwcm9taXNlZC1leGVjXCIpO1xuXG5sZXQganNvbmZpbGUgPSByZXF1aXJlKFwianNvbmZpbGVcIik7XG5sZXQgcnBqID0gcmVxdWlyZShcInJlcXVlc3QtcHJvbWlzZS1qc29uXCIpO1xuXG5sZXQgdG9hZGRnaXQgPSBmYWxzZTtcblxuXG5pbnRlcmZhY2UgSWFueUZ1bmN0aW9uIHtcbiAgRnVuY3Rpb246IGFueTtcbn1cblxuXG5pbnRlcmZhY2UgSXF1ZXN0aW9uIHtcblxuICB0eXBlOiBzdHJpbmc7XG4gIG5hbWU6IHN0cmluZztcbiAgbWVzc2FnZTogc3RyaW5nO1xuICBjaG9pY2VzPzogYW55W107XG4gIGRlZmF1bHQ/OiBhbnk7XG4gIHZhbGlkYXRlPzogRnVuY3Rpb247XG4gIGZpbHRlcj86IGFueTtcbiAgd2hlbj86IEZ1bmN0aW9uO1xuXG59XG5cblxuXG5sZXQgZ2NzID0gPGFueT5naXRjb25maWcuc3luYygpO1xuXG5sZXQgZ2l0Q29uZmlnID0gPHsgbmFtZTogc3RyaW5nOyBlbWFpbDogc3RyaW5nIH0+Z2NzLnVzZXI7IC8vIGNhbiBwYXNzIGV4cGxpdCBmaWxlIGlmIHlvdSB3YW50IGFzIHdlbGwgXG5cbmxldCBjb3Jkb3ZhZGlyID0gXCIvdG1wL2NvcmRvdmFcIiArIG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xubGV0IHZ1ZWRpciA9IFwiL3RtcC92dWVcIiArIG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXG5cblxubGV0IGdpdHJlcG86IGFueSA9IGZhbHNlO1xuXG5sZXQgZGlyOiBzdHJpbmc7XG5cblxuXG5sZXQgcXVlc3Rpb25zID0gPElxdWVzdGlvbltdPltcblxuICB7XG4gICAgdHlwZTogJ2xpc3QnLFxuICAgIG5hbWU6ICdhcHAnLFxuICAgIG1lc3NhZ2U6ICdTZWxlY3QgYXBwIG1vZGVsJyxcbiAgICBjaG9pY2VzOiBbJ21vYmlsZScsICdtdWx0aScsICdkZXNrdG9wJywgJ3NlcnZlciddLFxuICAgIHdoZW46IGZ1bmN0aW9uIChhbnN3ZXJzKSB7XG4gICAgICByZXR1cm4gYW5zd2Vycy5jb21tZW50cyAhPT0gJ05vcGUsIGFsbCBnb29kISc7XG4gICAgfVxuICB9LFxuICB7XG4gICAgdHlwZTogJ2lucHV0JyxcbiAgICBuYW1lOiAnbmFtZScsXG4gICAgbWVzc2FnZTogJ0luc2VydCBBcHAgbmFtZScsXG4gICAgdmFsaWRhdGU6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgbGV0IHBhc3M6IGFueSA9ICdQbGVhc2UgZW50ZXIgYSB2YWxpZCBwaG9uZSBudW1iZXInO1xuICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgIHBhc3MgPSB0cnVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHBhc3M7XG4gICAgfVxuICB9LFxuXG4gIHtcbiAgICB0eXBlOiAnY2hlY2tib3gnLFxuICAgIG1lc3NhZ2U6ICdTZWxlY3QgcGxhdGZvcm1zJyxcbiAgICBuYW1lOiAncGxhdGZvcm1zJyxcbiAgICB3aGVuOiBmdW5jdGlvbiAoYW5zd2Vycykge1xuICAgICAgcmV0dXJuIGFuc3dlcnMuYXBwID09PSAnbXVsdGknO1xuICAgIH0sXG4gICAgY2hvaWNlczogW1xuICAgICAge1xuICAgICAgICBuYW1lOiAnQnJvd3NlcidcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIG5hbWU6ICdpT1MnXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBuYW1lOiAnQW5kcm9pZCdcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIG5hbWU6ICdEZXNrdG9wJ1xuICAgICAgfVxuICAgIF0sXG4gICAgdmFsaWRhdGU6IGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgIGxldCBhOiBhbnkgPSB0cnVlO1xuICAgICAgaWYgKGFuc3dlci5sZW5ndGggPCAxKSB7XG4gICAgICAgIGEgPSAnWW91IG11c3QgY2hvb3NlIGF0IGxlYXN0IG9uZSB0b3BwaW5nLic7XG4gICAgICB9XG4gICAgICByZXR1cm4gYTtcbiAgICB9XG4gIH0sXG5cbiAge1xuICAgIHR5cGU6ICdjaGVja2JveCcsXG4gICAgbWVzc2FnZTogJ1NlbGVjdCBtb2JpbGUgcGxhdGZvcm1zJyxcbiAgICBuYW1lOiAnbW9iaWxlJyxcbiAgICB3aGVuOiBmdW5jdGlvbiAoYW5zd2Vycykge1xuICAgICAgcmV0dXJuIGFuc3dlcnMuYXBwID09PSAnbW9iaWxlJztcbiAgICB9LFxuICAgIGNob2ljZXM6IFtcblxuICAgICAge1xuICAgICAgICBuYW1lOiAnaU9TTW9iaWxlJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgbmFtZTogJ0FuZHJvaWQnXG4gICAgICB9XG4gICAgXSxcbiAgICB2YWxpZGF0ZTogZnVuY3Rpb24gKGFuc3dlcikge1xuICAgICAgbGV0IGE6IGFueSA9IHRydWU7XG4gICAgICBpZiAoYW5zd2VyLmxlbmd0aCA8IDEpIHtcbiAgICAgICAgYSA9ICdZb3UgbXVzdCBjaG9vc2UgYXQgbGVhc3Qgb25lIHRvcHBpbmcuJztcbiAgICAgIH1cbiAgICAgIHJldHVybiBhO1xuICAgIH1cbiAgfVxuXG5dO1xuXG5cbmlmIChwYXRoRXhpc3RzLnN5bmMoXCIuLy5naXQvY29uZmlnXCIpKSB7XG5cblxuICBsZXQgZ2l0Y29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhcIi4vLmdpdC9jb25maWdcIikudG9TdHJpbmcoXCJ1dGYtOFwiKS5yZXBsYWNlKC9cXHQvZywgJycpLnNwbGl0KCdcXG4nKTtcblxuXG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBnaXRjb250ZW50Lmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKGdpdGNvbnRlbnRbaV0uc3BsaXQoJ0AnKS5sZW5ndGggPiAxKSB7XG4gICAgICBnaXRyZXBvID0gZ2l0Y29udGVudFtpXS5zcGxpdCgndXJsID0gJylbMV07XG4gICAgfVxuICB9XG5cbn1cblxuXG5pZiAoIWdpdHJlcG8pIHtcblxuXG4gIHF1ZXN0aW9ucy5wdXNoKHtcbiAgICBuYW1lOiBcInJlcG9zaXRvcnlcIixcbiAgICB0eXBlOiBcImlucHV0XCIsXG4gICAgbWVzc2FnZTogXCJJbnNlcnQgcmVwb3NpdG9yeVwiLFxuICAgIHZhbGlkYXRlOiBmdW5jdGlvbiAodmFsdWUpOiBhbnkge1xuXG4gICAgICBpZiAodmFsdWUuc3BsaXQoXCJAXCIpLmxlbmd0aCA+IDEgfHwgdmFsdWUuc3BsaXQoXCJ0dHA6Ly9cIikgPiAxKSB7XG4gICAgICAgIGdpdHJlcG8gPSB2YWx1ZTtcbiAgICAgICAgdG9hZGRnaXQgPSB0cnVlO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuICdQbGVhc2UgZW50ZXIgYSB2YWxpZCByZXBvc2l0b3J5JztcbiAgICB9XG5cbiAgfSk7XG5cblxufSBlbHNlIHtcblxuICBkaXIgPSBwYXRoLnJlc29sdmUoKTtcblxufVxuXG5mdW5jdGlvbiBhZGRyZXBvKGFwcGRpcmVjdG9yeSwgdXNlciwgcGFzc3dvcmQsIG5hbWUsIGRyb25lZGJ1c2VyLCBkcm9uZWRicGFzc3csIGRyb25ldXNlciwgZHJvbmVwYXNzdykge1xuXG4gIHJwai5wb3N0KFwiaHR0cHM6Ly9cIiArIHVzZXIgKyBcIjpcIiArIHBhc3N3b3JkICsgXCJAZ2l0Lmtlcm5lbC5vbmxpbmUvYXBpL3YxL2FkbWluL3VzZXJzL2tlcm5lbC9yZXBvc1wiLCB7XG4gICAgbmFtZTogbmFtZSxcbiAgICBwcml2YXRlOiB0cnVlXG4gIH0pLnRoZW4oZnVuY3Rpb24gKHJlcykge1xuXG5cbiAgICBkcm9uZXBhdGNoKFxuICAgICAge1xuICAgICAgICBvcmlnaW46IHsgaG9zdDogXCJrZXJuZWwub25saW5lXCIsIHBvcnQ6IDMzMDYgfSxcbiAgICAgICAgYXV0aDoge1xuICAgICAgICAgIHBhc3N3b3JkOiBkcm9uZWRicGFzc3csXG4gICAgICAgICAgdXNlcjogZHJvbmV1c2VyLFxuICAgICAgICAgIGRhdGFiYXNlOiBcImRyb25lXCJcbiAgICAgICAgfSxcbiAgICAgICAgcmVwbzogXCJ0ZXN0cmVwb1wiLFxuICAgICAgICBnb2dzOiB7XG4gICAgICAgICAgdXNlcjogXCJzdHJpbmdcIixcbiAgICAgICAgICBwYXNzd29yZDogXCJzdHJpbmdcIlxuICAgICAgICB9XG4gICAgICB9XG4gICAgKS50aGVuKGZ1bmN0aW9uICgpIHtcblxuXG4gICAgICBleGVjKFwiY2QgXCIgKyBhcHBkaXJlY3RvcnkgKyBcIiAmJiBucG0gaVwiKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJhbGwgZG9uZSBmb3Igbm93XCIpXG4gICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIHRocm93IGVyclxuICAgICAgfSk7XG5cblxuICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgIGNvbnNvbGUubG9nKGVycilcbiAgICB9KVxuXG4gIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICB0aHJvdyBlcnJcbiAgfSk7XG5cbn1cblxucXVlc3Rpb25zLnB1c2goe1xuICB0eXBlOiAnY29uZmlybScsXG4gIG5hbWU6ICdjb25maXJtJyxcbiAgbWVzc2FnZTogJ2RvIHlvdSB3YW4gdG8gY29uZmlybT8gKFkvbiknLFxuICBkZWZhdWx0OiBmYWxzZSxcbiAgdmFsaWRhdGU6IGZ1bmN0aW9uICh2YWx1ZTogc3RyaW5nKTogYW55IHtcbiAgICBsZXQgcmV0ID0gZmFsc2U7XG4gICAgaWYgKHZhbHVlID09IFwieWVzXCIgfHwgdmFsdWUgPT0gXCJZZXNcIiB8fCB2YWx1ZSA9PSBcInlcIiB8fCB2YWx1ZSA9PSBcIllcIikge1xuICAgICAgcmV0ID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfVxufSk7XG5cblxuXG5mdW5jdGlvbiBwcm9tcHQoKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZTxhbnk+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblxuICAgIGlucXVpcmVyLnByb21wdChxdWVzdGlvbnMpLnRoZW4oZnVuY3Rpb24gKGFuc3dlcnMpIHtcblxuICAgICAgcmVzb2x2ZShhbnN3ZXJzKTtcbiAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICB0aHJvdyBFcnJvcihlcnIpO1xuXG4gICAgfSk7XG4gIH0pO1xuXG59XG5cbmV4cG9ydCA9IGZ1bmN0aW9uIGNsaSgpIHtcblxuICBwcm9tcHQoKS50aGVuKGZ1bmN0aW9uIChhKSB7XG5cbiAgICBpZiAoYS5jb25maXJtKSB7XG5cbiAgICAgIGlmICghZGlyKSBkaXIgPSBwYXRoLnJlc29sdmUoKSArICcvJyArIGEubmFtZTtcblxuXG4gICAgICBzd2l0Y2ggKGEuYXBwKSB7XG5cbiAgICAgICAgY2FzZSBcIm11bHRpXCI6XG5cbiAgICAgICAgICBleGVjKFwiY29yZG92YSBjcmVhdGUgXCIgKyBhLm5hbWUgKyBcIiBvbmxpbmUua2VybmVsLlwiICsgYS5uYW1lICsgXCIgXCIgKyBhLm5hbWUpLnRoZW4oZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICBsZXQgcGxhdGZvcm1zID0gW107XG5cbiAgICAgICAgICAgIF8ubWFwKGEucGxhdGZvcm1zLCBmdW5jdGlvbiAocDogc3RyaW5nKSB7XG4gICAgICAgICAgICAgIGlmIChwLnRvTG93ZXJDYXNlKCkgPT09IFwiYnJvd3NlclwiIHx8IHAudG9Mb3dlckNhc2UoKSA9PT0gXCJpb3NcIiB8fCBwLnRvTG93ZXJDYXNlKCkgPT09IFwiYW5kcm9pZFwiKSBwbGF0Zm9ybXMucHVzaChwLnRvTG93ZXJDYXNlKCkpXG4gICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICBhc3luYy5lYWNoU2VyaWVzKHBsYXRmb3JtcywgZnVuY3Rpb24gKHBsYSwgY2IpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJhZGRpbmcgcGxhdGZvcm0gXCIgKyBwbGEgKyBcIiBpbiBcIiArIGRpcik7XG4gICAgICAgICAgICAgIGV4ZWMoXCJjZCBcIiArIGRpciArIFwiICYmIGNvcmRvdmEgcGxhdGZvcm0gYWRkIFwiICsgcGxhICsgXCIgLS1zYXZlXCIpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGNiKCk7XG4gICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjYihlcnIpO1xuICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBlcnI7XG5cbiAgICAgICAgICAgICAgfSBlbHNlIHtcblxuXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJhZGRpbmcgdnVla2l0IHRvIFwiICsgZGlyICsgXCIgZnJvbSBcIiArIF9fZGlybmFtZSArIFwiL3Z1ZWtpdFwiKTtcblxuICAgICAgICAgICAgICAgIGV4ZWMoXCJjcCAtciBcIiArIF9fZGlybmFtZSArIFwiL3Z1ZWtpdC8uIFwiICsgZGlyKS50aGVuKGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgICAgICAgbGV0IHBrID0gcmVxdWlyZShkaXIgKyBcIi9wYWNrYWdlLmpzb25cIik7XG5cbiAgICAgICAgICAgICAgICAgIGxldCByZXBvID0ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcImdpdFwiLFxuICAgICAgICAgICAgICAgICAgICB1cmw6IGdpdHJlcG9cbiAgICAgICAgICAgICAgICAgIH07XG5cblxuICAgICAgICAgICAgICAgICAgcGsubmFtZSA9IGEubmFtZTtcbiAgICAgICAgICAgICAgICAgIHBrLmF1dGhvciA9IGdpdENvbmZpZy5uYW1lICsgXCIgPFwiICsgZ2l0Q29uZmlnLmVtYWlsICsgXCI+XCI7XG4gICAgICAgICAgICAgICAgICBway5saWNlbnNlID0gXCJTRUUgTElDRU5TRSBJTiBMSUNFTlNFXCI7XG4gICAgICAgICAgICAgICAgICBpZiAodG9hZGRnaXQpIHtcbiAgICAgICAgICAgICAgICAgICAgcGsucmVwb3NpdG9yeSA9IGdpdHJlcG87XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBqc29uZmlsZS53cml0ZUZpbGVTeW5jKGRpciArIFwiL3BhY2thZ2UuanNvblwiLCBwaywgeyBzcGFjZXM6IDQgfSlcblxuICAgICAgICAgICAgICAgICAgZnMud3JpdGVGaWxlU3luYyhkaXIgKyBcIi9MSUNFTlNFXCIsICcoYykgQ29weXJpZ2h0ICcgKyBuZXcgRGF0ZSgpLmdldEZ1bGxZZWFyKCkgKyAnIGtlcm5lbC5vbmxpbmUsIGFsbCByaWdodHMgcmVzZXJ2ZWQuJyk7XG4gICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImluc3RhbGxpbmcgZGVwZW5kZW5jaWVzLCB3YWl0IGZldyBtaW51dGVzLi4uXCIpO1xuXG4gICAgICAgICAgICAgICAgICBleGVjKFwiY2QgXCIgKyBkaXIgKyBcIiAmJiBucG0gaVwiKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgZXhlYyhcIm12IFwiICsgZGlyICsgXCIvZ2l0aWdub3JlZmlsZSBcIiArIGRpciArIFwiLy5naXRpZ25vcmVcIikudGhlbihmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICBpZiAodG9hZGRnaXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4ZWMoXCJjZCBcIiArIGRpciArIFwiJiYgZ2l0IGluaXQgJiYgZ2l0IHJlbW90ZSBhZGQgb3JpZ2luIFwiICsgZ2l0cmVwbykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYWxsIGRvbmUgZm9yIG5vd1wiKVxuICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBlcnJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgIH1cblxuXG4gICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBlcnJcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgZXJyXG4gICAgICAgICAgICAgICAgICB9KTtcblxuXG5cbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICB0aHJvdyBlcnJcbiAgICAgICAgICAgICAgICB9KTtcblxuXG5cblxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuXG4gICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgdGhyb3cgZXJyO1xuXG4gICAgICAgICAgfSlcblxuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgY29uc29sZS5sb2coXCJ0b2Rvb29vXCIpO1xuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiRXhpdCFcIik7XG4gICAgfVxuXG5cbiAgfSk7XG59Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
