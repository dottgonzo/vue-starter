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
                                    pk.repository = repo;
                                    jsonfile.writeFileSync(dir + "/package.json", pk, { spaces: 4 });
                                    fs.writeFileSync(dir + "/LICENSE", '(c) Copyright ' + new Date().getFullYear() + ' kernel.online, all rights reserved.');
                                    rpj.post("https://" + a.kernel_user + ":" + a.kernel_password + "@git.kernel.online/api/v1/admin/users/kernel/repos", {
                                        name: a.name,
                                        private: true
                                    }).then(function (res) {
                                        dronesql_1.default({
                                            origin: { host: "kernel.online", port: 3306 },
                                            auth: {
                                                password: "fHHffG4LFHfg463r763gKre",
                                                user: "root",
                                                database: "drone"
                                            },
                                            repo: "testrepo",
                                            gogs: {
                                                user: "string",
                                                password: "string"
                                            }
                                        }).then(function () {
                                            exec("cd " + dir + " && npm i").then(function () {
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

//# sourceMappingURL=data:application/json;base64,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QUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7Z0RBQ3BCLE1BQU0sR0FBRyxDQUFBOzRDQUNYLENBQUMsQ0FBQyxDQUFDO3dDQUdMLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7NENBQ3BCLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7d0NBQ2xCLENBQUMsQ0FBQyxDQUFBO29DQUVKLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7d0NBQ3BCLE1BQU0sR0FBRyxDQUFBO29DQUNYLENBQUMsQ0FBQyxDQUFDO2dDQUlMLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7b0NBQ3BCLE1BQU0sR0FBRyxDQUFBO2dDQUNYLENBQUMsQ0FBQyxDQUFDOzRCQUtMLENBQUM7d0JBQ0gsQ0FBQyxDQUFDLENBQUE7b0JBRUosQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRzt3QkFDcEIsTUFBTSxHQUFHLENBQUM7b0JBRVosQ0FBQyxDQUFDLENBQUE7b0JBRUYsS0FBSyxDQUFDO2dCQUVSO29CQUNFLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7b0JBQ3ZCLEtBQUssQ0FBQztZQUVWLENBQUM7UUFDSCxDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDTixPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3ZCLENBQUM7SUFHSCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQSIsImZpbGUiOiJpbmRleC5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxuaW1wb3J0ICogYXMgaW5xdWlyZXIgZnJvbSBcImlucXVpcmVyXCI7XG5pbXBvcnQgKiBhcyBmcyBmcm9tIFwiZnNcIjtcbmltcG9ydCAqIGFzIFByb21pc2UgZnJvbSBcImJsdWViaXJkXCI7XG5pbXBvcnQgKiBhcyBwYXRoRXhpc3RzIGZyb20gXCJwYXRoLWV4aXN0c1wiO1xuaW1wb3J0ICogYXMgY29tbWFuZGVyIGZyb20gXCJjb21tYW5kZXJcIjtcbmltcG9ydCAqIGFzIF8gZnJvbSBcImxvZGFzaFwiO1xuaW1wb3J0ICogYXMgYXN5bmMgZnJvbSBcImFzeW5jXCI7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgKiBhcyBnaXRjb25maWcgZnJvbSBcImdpdC1jb25maWdcIjtcbmltcG9ydCAqIGFzIHByb2dyYW0gZnJvbSBcImNvbW1hbmRlclwiO1xuXG5cbmltcG9ydCBkcm9uZXBhdGNoIGZyb20gXCIuL3BhdGNoL2Ryb25lc3FsXCI7XG5cblxubGV0IEdvZ3NDbGllbnQgPSByZXF1aXJlKCdnb2dzLWNsaWVudCcpO1xuXG5cblxubGV0IGV4ZWMgPSByZXF1aXJlKFwicHJvbWlzZWQtZXhlY1wiKTtcblxubGV0IGpzb25maWxlID0gcmVxdWlyZShcImpzb25maWxlXCIpO1xubGV0IHJwaiA9IHJlcXVpcmUoXCJyZXF1ZXN0LXByb21pc2UtanNvblwiKTtcblxuXG5cblxuaW50ZXJmYWNlIElhbnlGdW5jdGlvbiB7XG4gIEZ1bmN0aW9uOiBhbnk7XG59XG5cblxuaW50ZXJmYWNlIElxdWVzdGlvbiB7XG5cbiAgdHlwZTogc3RyaW5nO1xuICBuYW1lOiBzdHJpbmc7XG4gIG1lc3NhZ2U6IHN0cmluZztcbiAgY2hvaWNlcz86IGFueVtdO1xuICBkZWZhdWx0PzogYW55O1xuICB2YWxpZGF0ZT86IEZ1bmN0aW9uO1xuICBmaWx0ZXI/OiBhbnk7XG4gIHdoZW4/OiBGdW5jdGlvbjtcblxufVxuXG5cblxubGV0IGdjcyA9IDxhbnk+Z2l0Y29uZmlnLnN5bmMoKTtcblxubGV0IGdpdENvbmZpZyA9IDx7IG5hbWU6IHN0cmluZzsgZW1haWw6IHN0cmluZyB9Pmdjcy51c2VyOyAvLyBjYW4gcGFzcyBleHBsaXQgZmlsZSBpZiB5b3Ugd2FudCBhcyB3ZWxsIFxuXG5sZXQgY29yZG92YWRpciA9IFwiL3RtcC9jb3Jkb3ZhXCIgKyBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbmxldCB2dWVkaXIgPSBcIi90bXAvdnVlXCIgKyBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblxuXG5cbmxldCBnaXRyZXBvOiBhbnkgPSBmYWxzZTtcblxubGV0IGRpcjogc3RyaW5nO1xuXG5cblxubGV0IHF1ZXN0aW9ucyA9IDxJcXVlc3Rpb25bXT5bXG5cbiAge1xuICAgIHR5cGU6ICdsaXN0JyxcbiAgICBuYW1lOiAnYXBwJyxcbiAgICBtZXNzYWdlOiAnU2VsZWN0IGFwcCBtb2RlbCcsXG4gICAgY2hvaWNlczogWydtb2JpbGUnLCAnbXVsdGknLCAnZGVza3RvcCcsICdzZXJ2ZXInXSxcbiAgICB3aGVuOiBmdW5jdGlvbiAoYW5zd2Vycykge1xuICAgICAgcmV0dXJuIGFuc3dlcnMuY29tbWVudHMgIT09ICdOb3BlLCBhbGwgZ29vZCEnO1xuICAgIH1cbiAgfSxcbiAge1xuICAgIHR5cGU6ICdpbnB1dCcsXG4gICAgbmFtZTogJ25hbWUnLFxuICAgIG1lc3NhZ2U6ICdJbnNlcnQgQXBwIG5hbWUnLFxuICAgIHZhbGlkYXRlOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIGxldCBwYXNzOiBhbnkgPSAnUGxlYXNlIGVudGVyIGEgdmFsaWQgcGhvbmUgbnVtYmVyJztcbiAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICBwYXNzID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBwYXNzO1xuICAgIH1cbiAgfSxcblxuICB7XG4gICAgdHlwZTogJ2NoZWNrYm94JyxcbiAgICBtZXNzYWdlOiAnU2VsZWN0IHBsYXRmb3JtcycsXG4gICAgbmFtZTogJ3BsYXRmb3JtcycsXG4gICAgd2hlbjogZnVuY3Rpb24gKGFuc3dlcnMpIHtcbiAgICAgIHJldHVybiBhbnN3ZXJzLmFwcCA9PT0gJ211bHRpJztcbiAgICB9LFxuICAgIGNob2ljZXM6IFtcbiAgICAgIHtcbiAgICAgICAgbmFtZTogJ0Jyb3dzZXInXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBuYW1lOiAnaU9TJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgbmFtZTogJ0FuZHJvaWQnXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBuYW1lOiAnRGVza3RvcCdcbiAgICAgIH1cbiAgICBdLFxuICAgIHZhbGlkYXRlOiBmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICBsZXQgYTogYW55ID0gdHJ1ZTtcbiAgICAgIGlmIChhbnN3ZXIubGVuZ3RoIDwgMSkge1xuICAgICAgICBhID0gJ1lvdSBtdXN0IGNob29zZSBhdCBsZWFzdCBvbmUgdG9wcGluZy4nO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGE7XG4gICAgfVxuICB9LFxuXG4gIHtcbiAgICB0eXBlOiAnY2hlY2tib3gnLFxuICAgIG1lc3NhZ2U6ICdTZWxlY3QgbW9iaWxlIHBsYXRmb3JtcycsXG4gICAgbmFtZTogJ21vYmlsZScsXG4gICAgd2hlbjogZnVuY3Rpb24gKGFuc3dlcnMpIHtcbiAgICAgIHJldHVybiBhbnN3ZXJzLmFwcCA9PT0gJ21vYmlsZSc7XG4gICAgfSxcbiAgICBjaG9pY2VzOiBbXG5cbiAgICAgIHtcbiAgICAgICAgbmFtZTogJ2lPU01vYmlsZSdcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIG5hbWU6ICdBbmRyb2lkJ1xuICAgICAgfVxuICAgIF0sXG4gICAgdmFsaWRhdGU6IGZ1bmN0aW9uIChhbnN3ZXIpIHtcbiAgICAgIGxldCBhOiBhbnkgPSB0cnVlO1xuICAgICAgaWYgKGFuc3dlci5sZW5ndGggPCAxKSB7XG4gICAgICAgIGEgPSAnWW91IG11c3QgY2hvb3NlIGF0IGxlYXN0IG9uZSB0b3BwaW5nLic7XG4gICAgICB9XG4gICAgICByZXR1cm4gYTtcbiAgICB9XG4gIH1cblxuXTtcblxuXG5pZiAocGF0aEV4aXN0cy5zeW5jKFwiLi8uZ2l0L2NvbmZpZ1wiKSkge1xuXG5cbiAgbGV0IGdpdGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoXCIuLy5naXQvY29uZmlnXCIpLnRvU3RyaW5nKFwidXRmLThcIikucmVwbGFjZSgvXFx0L2csICcnKS5zcGxpdCgnXFxuJyk7XG5cblxuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgZ2l0Y29udGVudC5sZW5ndGg7IGkrKykge1xuICAgIGlmIChnaXRjb250ZW50W2ldLnNwbGl0KCdAJykubGVuZ3RoID4gMSkge1xuICAgICAgZ2l0cmVwbyA9IGdpdGNvbnRlbnRbaV0uc3BsaXQoJ3VybCA9ICcpWzFdO1xuICAgIH1cbiAgfVxuXG59XG5cblxuaWYgKCFnaXRyZXBvKSB7XG5cblxuICBxdWVzdGlvbnMucHVzaCh7XG4gICAgbmFtZTogXCJyZXBvc2l0b3J5XCIsXG4gICAgdHlwZTogXCJpbnB1dFwiLFxuICAgIG1lc3NhZ2U6IFwiSW5zZXJ0IHJlcG9zaXRvcnlcIixcbiAgICB2YWxpZGF0ZTogZnVuY3Rpb24gKHZhbHVlKTogYW55IHtcblxuICAgICAgaWYgKHZhbHVlLnNwbGl0KFwiQFwiKS5sZW5ndGggPiAxIHx8IHZhbHVlLnNwbGl0KFwidHRwOi8vXCIpID4gMSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuICdQbGVhc2UgZW50ZXIgYSB2YWxpZCByZXBvc2l0b3J5JztcbiAgICB9XG5cbiAgfSk7XG5cblxufSBlbHNlIHtcblxuICBkaXIgPSBwYXRoLnJlc29sdmUoKTtcblxufVxuXG5cblxucXVlc3Rpb25zLnB1c2goe1xuICB0eXBlOiAnY29uZmlybScsXG4gIG5hbWU6ICdjb25maXJtJyxcbiAgbWVzc2FnZTogJ2RvIHlvdSB3YW4gdG8gY29uZmlybT8gKFkvbiknLFxuICBkZWZhdWx0OiBmYWxzZSxcbiAgdmFsaWRhdGU6IGZ1bmN0aW9uICh2YWx1ZTogc3RyaW5nKTogYW55IHtcbiAgICBsZXQgcmV0ID0gZmFsc2U7XG4gICAgaWYgKHZhbHVlID09IFwieWVzXCIgfHwgdmFsdWUgPT0gXCJZZXNcIiB8fCB2YWx1ZSA9PSBcInlcIiB8fCB2YWx1ZSA9PSBcIllcIikge1xuICAgICAgcmV0ID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfVxufSk7XG5cblxuXG5mdW5jdGlvbiBwcm9tcHQoKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZTxhbnk+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblxuICAgIGlucXVpcmVyLnByb21wdChxdWVzdGlvbnMpLnRoZW4oZnVuY3Rpb24gKGFuc3dlcnMpIHtcblxuICAgICAgcmVzb2x2ZShhbnN3ZXJzKTtcbiAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICB0aHJvdyBFcnJvcihlcnIpO1xuXG4gICAgfSk7XG4gIH0pO1xuXG59XG5cbmV4cG9ydCA9IGZ1bmN0aW9uIGNsaSgpIHtcblxuICBwcm9tcHQoKS50aGVuKGZ1bmN0aW9uIChhKSB7XG5cbiAgICBpZiAoYS5jb25maXJtKSB7XG5cbiAgICAgIGlmICghZGlyKSBkaXIgPSBwYXRoLnJlc29sdmUoKSArICcvJyArIGEubmFtZTtcblxuXG4gICAgICBzd2l0Y2ggKGEuYXBwKSB7XG5cbiAgICAgICAgY2FzZSBcIm11bHRpXCI6XG5cbiAgICAgICAgICBleGVjKFwiY29yZG92YSBjcmVhdGUgXCIgKyBhLm5hbWUgKyBcIiBvbmxpbmUua2VybmVsLlwiICsgYS5uYW1lICsgXCIgXCIgKyBhLm5hbWUpLnRoZW4oZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICBsZXQgcGxhdGZvcm1zID0gW107XG5cbiAgICAgICAgICAgIF8ubWFwKGEucGxhdGZvcm1zLCBmdW5jdGlvbiAocDogc3RyaW5nKSB7XG4gICAgICAgICAgICAgIGlmIChwLnRvTG93ZXJDYXNlKCkgPT09IFwiYnJvd3NlclwiIHx8IHAudG9Mb3dlckNhc2UoKSA9PT0gXCJpb3NcIiB8fCBwLnRvTG93ZXJDYXNlKCkgPT09IFwiYW5kcm9pZFwiKSBwbGF0Zm9ybXMucHVzaChwLnRvTG93ZXJDYXNlKCkpXG4gICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICBhc3luYy5lYWNoU2VyaWVzKHBsYXRmb3JtcywgZnVuY3Rpb24gKHBsYSwgY2IpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJhZGRpbmcgcGxhdGZvcm0gXCIgKyBwbGEgKyBcIiBpbiBcIiArIGRpcik7XG4gICAgICAgICAgICAgIGV4ZWMoXCJjZCBcIiArIGRpciArIFwiICYmIGNvcmRvdmEgcGxhdGZvcm0gYWRkIFwiICsgcGxhICsgXCIgLS1zYXZlXCIpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGNiKCk7XG4gICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjYihlcnIpO1xuICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBlcnI7XG5cbiAgICAgICAgICAgICAgfSBlbHNlIHtcblxuXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJhZGRpbmcgdnVla2l0IHRvIFwiICsgZGlyICsgXCIgZnJvbSBcIiArIF9fZGlybmFtZSArIFwiL3Z1ZWtpdFwiKTtcblxuICAgICAgICAgICAgICAgIGV4ZWMoXCJjcCAtciBcIiArIF9fZGlybmFtZSArIFwiL3Z1ZWtpdC8uIFwiICsgZGlyKS50aGVuKGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgICAgICAgbGV0IHBrID0gcmVxdWlyZShkaXIgKyBcIi9wYWNrYWdlLmpzb25cIik7XG5cbiAgICAgICAgICAgICAgICAgIGxldCByZXBvID0ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcImdpdFwiLFxuICAgICAgICAgICAgICAgICAgICB1cmw6IFwiZ2l0K2h0dHBzOi8vZ2l0aHViLmNvbS9kb3R0Z29uem8vdnVlLXN0YXJ0ZXIuZ2l0XCJcbiAgICAgICAgICAgICAgICAgIH07XG5cblxuICAgICAgICAgICAgICAgICAgcGsubmFtZSA9IGEubmFtZTtcbiAgICAgICAgICAgICAgICAgIHBrLmF1dGhvciA9IGdpdENvbmZpZy5uYW1lICsgXCIgPFwiICsgZ2l0Q29uZmlnLmVtYWlsICsgXCI+XCI7XG4gICAgICAgICAgICAgICAgICBway5saWNlbnNlID0gXCJTRUUgTElDRU5TRSBJTiBMSUNFTlNFXCI7XG4gICAgICAgICAgICAgICAgICBway5yZXBvc2l0b3J5ID0gcmVwbztcblxuICAgICAgICAgICAgICAgICAganNvbmZpbGUud3JpdGVGaWxlU3luYyhkaXIgKyBcIi9wYWNrYWdlLmpzb25cIiwgcGssIHsgc3BhY2VzOiA0IH0pXG5cbiAgICAgICAgICAgICAgICAgIGZzLndyaXRlRmlsZVN5bmMoZGlyICsgXCIvTElDRU5TRVwiLCAnKGMpIENvcHlyaWdodCAnICsgbmV3IERhdGUoKS5nZXRGdWxsWWVhcigpICsgJyBrZXJuZWwub25saW5lLCBhbGwgcmlnaHRzIHJlc2VydmVkLicpO1xuXG5cbiAgICAgICAgICAgICAgICAgIHJwai5wb3N0KFwiaHR0cHM6Ly9cIiArIGEua2VybmVsX3VzZXIgKyBcIjpcIiArIGEua2VybmVsX3Bhc3N3b3JkICsgXCJAZ2l0Lmtlcm5lbC5vbmxpbmUvYXBpL3YxL2FkbWluL3VzZXJzL2tlcm5lbC9yZXBvc1wiLCB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGEubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgcHJpdmF0ZTogdHJ1ZVxuICAgICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiAocmVzKSB7XG5cblxuICAgICAgICAgICAgICAgICAgICBkcm9uZXBhdGNoKFxuICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9yaWdpbjogeyBob3N0OiBcImtlcm5lbC5vbmxpbmVcIiwgcG9ydDogMzMwNiB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgYXV0aDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBwYXNzd29yZDogXCJmSEhmZkc0TEZIZmc0NjNyNzYzZ0tyZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB1c2VyOiBcInJvb3RcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YWJhc2U6IFwiZHJvbmVcIlxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcG86IFwidGVzdHJlcG9cIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGdvZ3M6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdXNlcjogXCJzdHJpbmdcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgcGFzc3dvcmQ6IFwic3RyaW5nXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICkudGhlbihmdW5jdGlvbiAoKSB7XG5cblxuICAgICAgICAgICAgICAgICAgICAgIGV4ZWMoXCJjZCBcIiArIGRpciArIFwiICYmIG5wbSBpXCIpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJhbGwgZG9uZSBmb3Igbm93XCIpXG4gICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgZXJyXG4gICAgICAgICAgICAgICAgICAgICAgfSk7XG5cblxuICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKVxuICAgICAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IGVyclxuICAgICAgICAgICAgICAgICAgfSk7XG5cblxuXG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgdGhyb3cgZXJyXG4gICAgICAgICAgICAgICAgfSk7XG5cblxuXG5cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcblxuICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIHRocm93IGVycjtcblxuICAgICAgICAgIH0pXG5cbiAgICAgICAgICBicmVhaztcblxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIGNvbnNvbGUubG9nKFwidG9kb29vb1wiKTtcbiAgICAgICAgICBicmVhaztcblxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmxvZyhcIkV4aXQhXCIpO1xuICAgIH1cblxuXG4gIH0pO1xufSJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
