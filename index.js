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
                                        url: "git+https://github.com/dottgonzo/vue-starter.git"
                                    };
                                    pk.name = a.name;
                                    pk.author = gitConfig.name + " <" + gitConfig.email + ">";
                                    pk.license = "SEE LICENSE IN LICENSE";
                                    jsonfile.writeFileSync(dir + "/package.json", pk, { spaces: 4 });
                                    fs.writeFileSync(dir + "/LICENSE", '(c) Copyright ' + new Date().getFullYear() + ' kernel.online, all rights reserved.');
                                    exec("cd " + dir + " && npm i").then(function () {
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

//# sourceMappingURL=data:application/json;base64,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ZW50IjpbIlxuaW1wb3J0ICogYXMgaW5xdWlyZXIgZnJvbSBcImlucXVpcmVyXCI7XG5pbXBvcnQgKiBhcyBmcyBmcm9tIFwiZnNcIjtcbmltcG9ydCAqIGFzIFByb21pc2UgZnJvbSBcImJsdWViaXJkXCI7XG5pbXBvcnQgKiBhcyBwYXRoRXhpc3RzIGZyb20gXCJwYXRoLWV4aXN0c1wiO1xuaW1wb3J0ICogYXMgY29tbWFuZGVyIGZyb20gXCJjb21tYW5kZXJcIjtcbmltcG9ydCAqIGFzIF8gZnJvbSBcImxvZGFzaFwiO1xuaW1wb3J0ICogYXMgYXN5bmMgZnJvbSBcImFzeW5jXCI7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgKiBhcyBnaXRjb25maWcgZnJvbSBcImdpdC1jb25maWdcIjtcbmltcG9ydCAqIGFzIHByb2dyYW0gZnJvbSBcImNvbW1hbmRlclwiO1xuXG5cbmltcG9ydCBkcm9uZXBhdGNoIGZyb20gXCIuL3BhdGNoL2Ryb25lc3FsXCI7XG5cblxubGV0IEdvZ3NDbGllbnQgPSByZXF1aXJlKCdnb2dzLWNsaWVudCcpO1xuXG5cblxubGV0IGV4ZWMgPSByZXF1aXJlKFwicHJvbWlzZWQtZXhlY1wiKTtcblxubGV0IGpzb25maWxlID0gcmVxdWlyZShcImpzb25maWxlXCIpO1xubGV0IHJwaiA9IHJlcXVpcmUoXCJyZXF1ZXN0LXByb21pc2UtanNvblwiKTtcblxuXG5cblxuaW50ZXJmYWNlIElhbnlGdW5jdGlvbiB7XG4gIEZ1bmN0aW9uOiBhbnk7XG59XG5cblxuaW50ZXJmYWNlIElxdWVzdGlvbiB7XG5cbiAgdHlwZTogc3RyaW5nO1xuICBuYW1lOiBzdHJpbmc7XG4gIG1lc3NhZ2U6IHN0cmluZztcbiAgY2hvaWNlcz86IGFueVtdO1xuICBkZWZhdWx0PzogYW55O1xuICB2YWxpZGF0ZT86IEZ1bmN0aW9uO1xuICBmaWx0ZXI/OiBhbnk7XG4gIHdoZW4/OiBGdW5jdGlvbjtcblxufVxuXG5cblxubGV0IGdjcyA9IDxhbnk+Z2l0Y29uZmlnLnN5bmMoKTtcblxubGV0IGdpdENvbmZpZyA9IDx7IG5hbWU6IHN0cmluZzsgZW1haWw6IHN0cmluZyB9Pmdjcy51c2VyOyAvLyBjYW4gcGFzcyBleHBsaXQgZmlsZSBpZiB5b3Ugd2FudCBhcyB3ZWxsIFxuXG5sZXQgY29yZG92YWRpciA9IFwiL3RtcC9jb3Jkb3ZhXCIgKyBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbmxldCB2dWVkaXIgPSBcIi90bXAvdnVlXCIgKyBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblxuXG5cbmxldCBnaXRyZXBvOiBhbnkgPSBmYWxzZTtcblxubGV0IGRpcjogc3RyaW5nO1xuXG5cblxubGV0IHF1ZXN0aW9ucyA9IDxJcXVlc3Rpb25bXT5bXG5cbiAge1xuICAgIHR5cGU6ICdsaXN0JyxcbiAgICBuYW1lOiAnYXBwJyxcbiAgICBtZXNzYWdlOiAnU2VsZWN0IGFwcCBtb2RlbCcsXG4gICAgY2hvaWNlczogWydtb2JpbGUnLCAnbXVsdGknLCAnZGVza3RvcCcsICdzZXJ2ZXInXSxcbiAgICB3aGVuOiBmdW5jdGlvbiAoYW5zd2Vycykge1xuICAgICAgcmV0dXJuIGFuc3dlcnMuY29tbWVudHMgIT09ICdOb3BlLCBhbGwgZ29vZCEnO1xuICAgIH1cbiAgfSxcbiAge1xuICAgIHR5cGU6ICdpbnB1dCcsXG4gICAgbmFtZTogJ25hbWUnLFxuICAgIG1lc3NhZ2U6ICdJbnNlcnQgQXBwIG5hbWUnLFxuICAgIHZhbGlkYXRlOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIGxldCBwYXNzOiBhbnkgPSAnUGxlYXNlIGVudGVyIGEgdmFsaWQgcGhvbmUgbnVtYmVyJztcbiAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICBwYXNzID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBwYXNzO1xuICAgIH1cbiAgfSxcblxuICB7XG4gICAgdHlwZTogJ2NoZWNrYm94JyxcbiAgICBtZXNzYWdlOiAnU2VsZWN0IHBsYXRmb3JtcycsXG4gICAgbmFtZTogJ3BsYXRmb3JtcycsXG4gICAgd2hlbjogZnVuY3Rpb24gKGFuc3dlcnMpIHtcbiAgICAgIHJldHVybiBhbnN3ZXJzLmFwcCA9PT0gJ211bHRpJztcbiAgICB9LFxuICAgIGNob2ljZXM6IFtcbiAgICAgIHtcbiAgICAgICAgbmFtZTogJ0Jyb3dzZXInXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBuYW1lOiAnaU9TJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgbmFtZTogJ0FuZHJvaWQnXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBuYW1lOiAnRGVza3RvcCdcbiAgICAgIH1cbiAgICBdLFxuICAgIHZhbGlkYXRlOiBmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICBsZXQgYTogYW55ID0gdHJ1ZTtcbiAgICAgIGlmIChhbnN3ZXIubGVuZ3RoIDwgMSkge1xuICAgICAgICBhID0gJ1lvdSBtdXN0IGNob29zZSBhdCBsZWFzdCBvbmUgdG9wcGluZy4nO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGE7XG4gICAgfVxuICB9LFxuXG4gIHtcbiAgICB0eXBlOiAnY2hlY2tib3gnLFxuICAgIG1lc3NhZ2U6ICdTZWxlY3QgbW9iaWxlIHBsYXRmb3JtcycsXG4gICAgbmFtZTogJ21vYmlsZScsXG4gICAgd2hlbjogZnVuY3Rpb24gKGFuc3dlcnMpIHtcbiAgICAgIHJldHVybiBhbnN3ZXJzLmFwcCA9PT0gJ21vYmlsZSc7XG4gICAgfSxcbiAgICBjaG9pY2VzOiBbXG5cbiAgICAgIHtcbiAgICAgICAgbmFtZTogJ2lPU01vYmlsZSdcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIG5hbWU6ICdBbmRyb2lkJ1xuICAgICAgfVxuICAgIF0sXG4gICAgdmFsaWRhdGU6IGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgIGxldCBhOiBhbnkgPSB0cnVlO1xuICAgICAgaWYgKGFuc3dlci5sZW5ndGggPCAxKSB7XG4gICAgICAgIGEgPSAnWW91IG11c3QgY2hvb3NlIGF0IGxlYXN0IG9uZSB0b3BwaW5nLic7XG4gICAgICB9XG4gICAgICByZXR1cm4gYTtcbiAgICB9XG4gIH1cblxuXTtcblxuXG5pZiAocGF0aEV4aXN0cy5zeW5jKFwiLi8uZ2l0L2NvbmZpZ1wiKSkge1xuXG5cbiAgbGV0IGdpdGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoXCIuLy5naXQvY29uZmlnXCIpLnRvU3RyaW5nKFwidXRmLThcIikucmVwbGFjZSgvXFx0L2csICcnKS5zcGxpdCgnXFxuJyk7XG5cblxuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgZ2l0Y29udGVudC5sZW5ndGg7IGkrKykge1xuICAgIGlmIChnaXRjb250ZW50W2ldLnNwbGl0KCdAJykubGVuZ3RoID4gMSkge1xuICAgICAgZ2l0cmVwbyA9IGdpdGNvbnRlbnRbaV0uc3BsaXQoJ3VybCA9ICcpWzFdO1xuICAgIH1cbiAgfVxuXG59XG5cblxuaWYgKCFnaXRyZXBvKSB7XG5cblxuICBxdWVzdGlvbnMucHVzaCh7XG4gICAgbmFtZTogXCJyZXBvc2l0b3J5XCIsXG4gICAgdHlwZTogXCJpbnB1dFwiLFxuICAgIG1lc3NhZ2U6IFwiSW5zZXJ0IHJlcG9zaXRvcnlcIixcbiAgICB2YWxpZGF0ZTogZnVuY3Rpb24gKHZhbHVlKTogYW55IHtcblxuICAgICAgaWYgKHZhbHVlLnNwbGl0KFwiQFwiKS5sZW5ndGggPiAxIHx8IHZhbHVlLnNwbGl0KFwidHRwOi8vXCIpID4gMSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuICdQbGVhc2UgZW50ZXIgYSB2YWxpZCByZXBvc2l0b3J5JztcbiAgICB9XG5cbiAgfSk7XG5cblxufSBlbHNlIHtcblxuICBkaXIgPSBwYXRoLnJlc29sdmUoKTtcblxufVxuXG5mdW5jdGlvbiBhZGRyZXBvKGFwcGRpcmVjdG9yeSwgdXNlciwgcGFzc3dvcmQsIG5hbWUsIGRyb25lZGJ1c2VyLCBkcm9uZWRicGFzc3csIGRyb25ldXNlciwgZHJvbmVwYXNzdykge1xuXG4gIHJwai5wb3N0KFwiaHR0cHM6Ly9cIiArIHVzZXIgKyBcIjpcIiArIHBhc3N3b3JkICsgXCJAZ2l0Lmtlcm5lbC5vbmxpbmUvYXBpL3YxL2FkbWluL3VzZXJzL2tlcm5lbC9yZXBvc1wiLCB7XG4gICAgbmFtZTogbmFtZSxcbiAgICBwcml2YXRlOiB0cnVlXG4gIH0pLnRoZW4oZnVuY3Rpb24gKHJlcykge1xuXG5cbiAgICBkcm9uZXBhdGNoKFxuICAgICAge1xuICAgICAgICBvcmlnaW46IHsgaG9zdDogXCJrZXJuZWwub25saW5lXCIsIHBvcnQ6IDMzMDYgfSxcbiAgICAgICAgYXV0aDoge1xuICAgICAgICAgIHBhc3N3b3JkOiBkcm9uZWRicGFzc3csXG4gICAgICAgICAgdXNlcjogZHJvbmV1c2VyLFxuICAgICAgICAgIGRhdGFiYXNlOiBcImRyb25lXCJcbiAgICAgICAgfSxcbiAgICAgICAgcmVwbzogXCJ0ZXN0cmVwb1wiLFxuICAgICAgICBnb2dzOiB7XG4gICAgICAgICAgdXNlcjogXCJzdHJpbmdcIixcbiAgICAgICAgICBwYXNzd29yZDogXCJzdHJpbmdcIlxuICAgICAgICB9XG4gICAgICB9XG4gICAgKS50aGVuKGZ1bmN0aW9uICgpIHtcblxuXG4gICAgICBleGVjKFwiY2QgXCIgKyBhcHBkaXJlY3RvcnkgKyBcIiAmJiBucG0gaVwiKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJhbGwgZG9uZSBmb3Igbm93XCIpXG4gICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIHRocm93IGVyclxuICAgICAgfSk7XG5cblxuICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgIGNvbnNvbGUubG9nKGVycilcbiAgICB9KVxuXG4gIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICB0aHJvdyBlcnJcbiAgfSk7XG5cbn1cblxucXVlc3Rpb25zLnB1c2goe1xuICB0eXBlOiAnY29uZmlybScsXG4gIG5hbWU6ICdjb25maXJtJyxcbiAgbWVzc2FnZTogJ2RvIHlvdSB3YW4gdG8gY29uZmlybT8gKFkvbiknLFxuICBkZWZhdWx0OiBmYWxzZSxcbiAgdmFsaWRhdGU6IGZ1bmN0aW9uICh2YWx1ZTogc3RyaW5nKTogYW55IHtcbiAgICBsZXQgcmV0ID0gZmFsc2U7XG4gICAgaWYgKHZhbHVlID09IFwieWVzXCIgfHwgdmFsdWUgPT0gXCJZZXNcIiB8fCB2YWx1ZSA9PSBcInlcIiB8fCB2YWx1ZSA9PSBcIllcIikge1xuICAgICAgcmV0ID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfVxufSk7XG5cblxuXG5mdW5jdGlvbiBwcm9tcHQoKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZTxhbnk+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblxuICAgIGlucXVpcmVyLnByb21wdChxdWVzdGlvbnMpLnRoZW4oZnVuY3Rpb24gKGFuc3dlcnMpIHtcblxuICAgICAgcmVzb2x2ZShhbnN3ZXJzKTtcbiAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICB0aHJvdyBFcnJvcihlcnIpO1xuXG4gICAgfSk7XG4gIH0pO1xuXG59XG5cbmV4cG9ydCA9IGZ1bmN0aW9uIGNsaSgpIHtcblxuICBwcm9tcHQoKS50aGVuKGZ1bmN0aW9uIChhKSB7XG5cbiAgICBpZiAoYS5jb25maXJtKSB7XG5cbiAgICAgIGlmICghZGlyKSBkaXIgPSBwYXRoLnJlc29sdmUoKSArICcvJyArIGEubmFtZTtcblxuXG4gICAgICBzd2l0Y2ggKGEuYXBwKSB7XG5cbiAgICAgICAgY2FzZSBcIm11bHRpXCI6XG5cbiAgICAgICAgICBleGVjKFwiY29yZG92YSBjcmVhdGUgXCIgKyBhLm5hbWUgKyBcIiBvbmxpbmUua2VybmVsLlwiICsgYS5uYW1lICsgXCIgXCIgKyBhLm5hbWUpLnRoZW4oZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICBsZXQgcGxhdGZvcm1zID0gW107XG5cbiAgICAgICAgICAgIF8ubWFwKGEucGxhdGZvcm1zLCBmdW5jdGlvbiAocDogc3RyaW5nKSB7XG4gICAgICAgICAgICAgIGlmIChwLnRvTG93ZXJDYXNlKCkgPT09IFwiYnJvd3NlclwiIHx8IHAudG9Mb3dlckNhc2UoKSA9PT0gXCJpb3NcIiB8fCBwLnRvTG93ZXJDYXNlKCkgPT09IFwiYW5kcm9pZFwiKSBwbGF0Zm9ybXMucHVzaChwLnRvTG93ZXJDYXNlKCkpXG4gICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICBhc3luYy5lYWNoU2VyaWVzKHBsYXRmb3JtcywgZnVuY3Rpb24gKHBsYSwgY2IpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJhZGRpbmcgcGxhdGZvcm0gXCIgKyBwbGEgKyBcIiBpbiBcIiArIGRpcik7XG4gICAgICAgICAgICAgIGV4ZWMoXCJjZCBcIiArIGRpciArIFwiICYmIGNvcmRvdmEgcGxhdGZvcm0gYWRkIFwiICsgcGxhICsgXCIgLS1zYXZlXCIpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGNiKCk7XG4gICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjYihlcnIpO1xuICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBlcnI7XG5cbiAgICAgICAgICAgICAgfSBlbHNlIHtcblxuXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJhZGRpbmcgdnVla2l0IHRvIFwiICsgZGlyICsgXCIgZnJvbSBcIiArIF9fZGlybmFtZSArIFwiL3Z1ZWtpdFwiKTtcblxuICAgICAgICAgICAgICAgIGV4ZWMoXCJjcCAtciBcIiArIF9fZGlybmFtZSArIFwiL3Z1ZWtpdC8uIFwiICsgZGlyKS50aGVuKGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgICAgICAgbGV0IHBrID0gcmVxdWlyZShkaXIgKyBcIi9wYWNrYWdlLmpzb25cIik7XG5cbiAgICAgICAgICAgICAgICAgIGxldCByZXBvID0ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcImdpdFwiLFxuICAgICAgICAgICAgICAgICAgICB1cmw6IFwiZ2l0K2h0dHBzOi8vZ2l0aHViLmNvbS9kb3R0Z29uem8vdnVlLXN0YXJ0ZXIuZ2l0XCJcbiAgICAgICAgICAgICAgICAgIH07XG5cblxuICAgICAgICAgICAgICAgICAgcGsubmFtZSA9IGEubmFtZTtcbiAgICAgICAgICAgICAgICAgIHBrLmF1dGhvciA9IGdpdENvbmZpZy5uYW1lICsgXCIgPFwiICsgZ2l0Q29uZmlnLmVtYWlsICsgXCI+XCI7XG4gICAgICAgICAgICAgICAgICBway5saWNlbnNlID0gXCJTRUUgTElDRU5TRSBJTiBMSUNFTlNFXCI7XG4gICAgICAgICAgICAgICAgICAvLyAgIHBrLnJlcG9zaXRvcnkgPSByZXBvO1xuXG4gICAgICAgICAgICAgICAgICBqc29uZmlsZS53cml0ZUZpbGVTeW5jKGRpciArIFwiL3BhY2thZ2UuanNvblwiLCBwaywgeyBzcGFjZXM6IDQgfSlcblxuICAgICAgICAgICAgICAgICAgZnMud3JpdGVGaWxlU3luYyhkaXIgKyBcIi9MSUNFTlNFXCIsICcoYykgQ29weXJpZ2h0ICcgKyBuZXcgRGF0ZSgpLmdldEZ1bGxZZWFyKCkgKyAnIGtlcm5lbC5vbmxpbmUsIGFsbCByaWdodHMgcmVzZXJ2ZWQuJyk7XG5cbiAgICAgICAgICAgICAgICAgIGV4ZWMoXCJjZCBcIiArIGRpciArIFwiICYmIG5wbSBpXCIpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImFsbCBkb25lIGZvciBub3dcIilcbiAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgZXJyXG4gICAgICAgICAgICAgICAgICB9KTtcblxuXG5cbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICB0aHJvdyBlcnJcbiAgICAgICAgICAgICAgICB9KTtcblxuXG5cblxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuXG4gICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgdGhyb3cgZXJyO1xuXG4gICAgICAgICAgfSlcblxuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgY29uc29sZS5sb2coXCJ0b2Rvb29vXCIpO1xuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiRXhpdCFcIik7XG4gICAgfVxuXG5cbiAgfSk7XG59Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
