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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFDQSxJQUFZLFFBQVEsV0FBTSxVQUFVLENBQUMsQ0FBQTtBQUNyQyxJQUFZLEVBQUUsV0FBTSxJQUFJLENBQUMsQ0FBQTtBQUN6QixJQUFZLE9BQU8sV0FBTSxVQUFVLENBQUMsQ0FBQTtBQUNwQyxJQUFZLFVBQVUsV0FBTSxhQUFhLENBQUMsQ0FBQTtBQUUxQyxJQUFZLENBQUMsV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUM1QixJQUFZLEtBQUssV0FBTSxPQUFPLENBQUMsQ0FBQTtBQUMvQixJQUFZLElBQUksV0FBTSxNQUFNLENBQUMsQ0FBQTtBQUM3QixJQUFZLFNBQVMsV0FBTSxZQUFZLENBQUMsQ0FBQTtBQUl4Qyx5QkFBdUIsa0JBQWtCLENBQUMsQ0FBQTtBQUcxQyxJQUFJLFVBQVUsR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUM7QUFJeEMsSUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBRXBDLElBQUksUUFBUSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNuQyxJQUFJLEdBQUcsR0FBRyxPQUFPLENBQUMsc0JBQXNCLENBQUMsQ0FBQztBQUUxQyxJQUFJLFFBQVEsR0FBRyxLQUFLLENBQUM7QUF1QnJCLElBQUksR0FBRyxHQUFRLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUVoQyxJQUFJLFNBQVMsR0FBb0MsR0FBRyxDQUFDLElBQUksQ0FBQztBQUUxRCxJQUFJLFVBQVUsR0FBRyxjQUFjLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUN2RCxJQUFJLE1BQU0sR0FBRyxVQUFVLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUkvQyxJQUFJLE9BQU8sR0FBUSxLQUFLLENBQUM7QUFFekIsSUFBSSxHQUFXLENBQUM7QUFJaEIsSUFBSSxTQUFTLEdBQWdCO0lBRTNCO1FBQ0UsSUFBSSxFQUFFLE1BQU07UUFDWixJQUFJLEVBQUUsS0FBSztRQUNYLE9BQU8sRUFBRSxrQkFBa0I7UUFDM0IsT0FBTyxFQUFFLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDO1FBQ2pELElBQUksRUFBRSxVQUFVLE9BQU87WUFDckIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEtBQUssaUJBQWlCLENBQUM7UUFDaEQsQ0FBQztLQUNGO0lBQ0Q7UUFDRSxJQUFJLEVBQUUsT0FBTztRQUNiLElBQUksRUFBRSxNQUFNO1FBQ1osT0FBTyxFQUFFLGlCQUFpQjtRQUMxQixRQUFRLEVBQUUsVUFBVSxLQUFLO1lBQ3ZCLElBQUksSUFBSSxHQUFRLG1DQUFtQyxDQUFDO1lBQ3BELEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7Z0JBQ1YsSUFBSSxHQUFHLElBQUksQ0FBQztZQUNkLENBQUM7WUFDRCxNQUFNLENBQUMsSUFBSSxDQUFDO1FBQ2QsQ0FBQztLQUNGO0lBRUQ7UUFDRSxJQUFJLEVBQUUsVUFBVTtRQUNoQixPQUFPLEVBQUUsa0JBQWtCO1FBQzNCLElBQUksRUFBRSxXQUFXO1FBQ2pCLElBQUksRUFBRSxVQUFVLE9BQU87WUFDckIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEtBQUssT0FBTyxDQUFDO1FBQ2pDLENBQUM7UUFDRCxPQUFPLEVBQUU7WUFDUDtnQkFDRSxJQUFJLEVBQUUsU0FBUzthQUNoQjtZQUNEO2dCQUNFLElBQUksRUFBRSxLQUFLO2FBQ1o7WUFDRDtnQkFDRSxJQUFJLEVBQUUsU0FBUzthQUNoQjtZQUNEO2dCQUNFLElBQUksRUFBRSxTQUFTO2FBQ2hCO1NBQ0Y7UUFDRCxRQUFRLEVBQUUsVUFBVSxNQUFNO1lBQ3hCLElBQUksQ0FBQyxHQUFRLElBQUksQ0FBQztZQUNsQixFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3RCLENBQUMsR0FBRyx1Q0FBdUMsQ0FBQztZQUM5QyxDQUFDO1lBQ0QsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUNYLENBQUM7S0FDRjtJQUVEO1FBQ0UsSUFBSSxFQUFFLFVBQVU7UUFDaEIsT0FBTyxFQUFFLHlCQUF5QjtRQUNsQyxJQUFJLEVBQUUsUUFBUTtRQUNkLElBQUksRUFBRSxVQUFVLE9BQU87WUFDckIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEtBQUssUUFBUSxDQUFDO1FBQ2xDLENBQUM7UUFDRCxPQUFPLEVBQUU7WUFFUDtnQkFDRSxJQUFJLEVBQUUsV0FBVzthQUNsQjtZQUNEO2dCQUNFLElBQUksRUFBRSxTQUFTO2FBQ2hCO1NBQ0Y7UUFDRCxRQUFRLEVBQUUsVUFBVSxNQUFNO1lBQ3hCLElBQUksQ0FBQyxHQUFRLElBQUksQ0FBQztZQUNsQixFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3RCLENBQUMsR0FBRyx1Q0FBdUMsQ0FBQztZQUM5QyxDQUFDO1lBQ0QsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUNYLENBQUM7S0FDRjtDQUVGLENBQUM7QUFHRixFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUdyQyxJQUFJLFVBQVUsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUluRyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUMzQyxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3hDLE9BQU8sR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzdDLENBQUM7SUFDSCxDQUFDO0FBRUgsQ0FBQztBQUdELEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUdiLFNBQVMsQ0FBQyxJQUFJLENBQUM7UUFDYixJQUFJLEVBQUUsWUFBWTtRQUNsQixJQUFJLEVBQUUsT0FBTztRQUNiLE9BQU8sRUFBRSxtQkFBbUI7UUFDNUIsUUFBUSxFQUFFLFVBQVUsS0FBSztZQUV2QixFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM3RCxPQUFPLEdBQUcsS0FBSyxDQUFDO2dCQUNoQixRQUFRLEdBQUcsSUFBSSxDQUFDO2dCQUNoQixNQUFNLENBQUMsSUFBSSxDQUFDO1lBQ2QsQ0FBQztZQUVELE1BQU0sQ0FBQyxpQ0FBaUMsQ0FBQztRQUMzQyxDQUFDO0tBRUYsQ0FBQyxDQUFDO0FBR0wsQ0FBQztBQUFDLElBQUksQ0FBQyxDQUFDO0lBRU4sR0FBRyxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUV2QixDQUFDO0FBRUQsaUJBQWlCLFlBQVksRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFFLFNBQVMsRUFBRSxVQUFVO0lBRW5HLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsUUFBUSxHQUFHLG9EQUFvRCxFQUFFO1FBQ2xHLElBQUksRUFBRSxJQUFJO1FBQ1YsT0FBTyxFQUFFLElBQUk7S0FDZCxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRztRQUduQixrQkFBVSxDQUNSO1lBQ0UsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLGVBQWUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFO1lBQzdDLElBQUksRUFBRTtnQkFDSixRQUFRLEVBQUUsWUFBWTtnQkFDdEIsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsUUFBUSxFQUFFLE9BQU87YUFDbEI7WUFDRCxJQUFJLEVBQUUsVUFBVTtZQUNoQixJQUFJLEVBQUU7Z0JBQ0osSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsUUFBUSxFQUFFLFFBQVE7YUFDbkI7U0FDRixDQUNGLENBQUMsSUFBSSxDQUFDO1lBR0wsSUFBSSxDQUFDLEtBQUssR0FBRyxZQUFZLEdBQUcsV0FBVyxDQUFDLENBQUMsSUFBSSxDQUFDO2dCQUM1QyxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUE7WUFDakMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRztnQkFDcEIsTUFBTSxHQUFHLENBQUE7WUFDWCxDQUFDLENBQUMsQ0FBQztRQUdMLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7WUFDcEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNsQixDQUFDLENBQUMsQ0FBQTtJQUVKLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7UUFDcEIsTUFBTSxHQUFHLENBQUE7SUFDWCxDQUFDLENBQUMsQ0FBQztBQUVMLENBQUM7QUFFRCxTQUFTLENBQUMsSUFBSSxDQUFDO0lBQ2IsSUFBSSxFQUFFLFNBQVM7SUFDZixJQUFJLEVBQUUsU0FBUztJQUNmLE9BQU8sRUFBRSw4QkFBOEI7SUFDdkMsT0FBTyxFQUFFLEtBQUs7SUFDZCxRQUFRLEVBQUUsVUFBVSxLQUFhO1FBQy9CLElBQUksR0FBRyxHQUFHLEtBQUssQ0FBQztRQUNoQixFQUFFLENBQUMsQ0FBQyxLQUFLLElBQUksS0FBSyxJQUFJLEtBQUssSUFBSSxLQUFLLElBQUksS0FBSyxJQUFJLEdBQUcsSUFBSSxLQUFLLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNyRSxHQUFHLEdBQUcsSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUNELE1BQU0sQ0FBQyxHQUFHLENBQUM7SUFDYixDQUFDO0NBQ0YsQ0FBQyxDQUFDO0FBSUg7SUFDRSxNQUFNLENBQUMsSUFBSSxPQUFPLENBQU0sVUFBVSxPQUFPLEVBQUUsTUFBTTtRQUUvQyxRQUFRLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLE9BQU87WUFFL0MsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ25CLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7WUFDcEIsTUFBTSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFbkIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUVMLENBQUM7QUFFRCxpQkFBUztJQUVQLE1BQU0sRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUM7UUFFdkIsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFFZCxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztnQkFBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBRzlDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUVkLEtBQUssT0FBTztvQkFFVixJQUFJLENBQUMsaUJBQWlCLEdBQUcsQ0FBQyxDQUFDLElBQUksR0FBRyxpQkFBaUIsR0FBRyxDQUFDLENBQUMsSUFBSSxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDO3dCQUVoRixJQUFJLFNBQVMsR0FBRyxFQUFFLENBQUM7d0JBRW5CLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQVM7NEJBQ3BDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsS0FBSyxTQUFTLElBQUksQ0FBQyxDQUFDLFdBQVcsRUFBRSxLQUFLLEtBQUssSUFBSSxDQUFDLENBQUMsV0FBVyxFQUFFLEtBQUssU0FBUyxDQUFDO2dDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUE7d0JBQ2xJLENBQUMsQ0FBQyxDQUFBO3dCQUVGLEtBQUssQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFFLFVBQVUsR0FBRyxFQUFFLEVBQUU7NEJBQzNDLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEdBQUcsR0FBRyxHQUFHLE1BQU0sR0FBRyxHQUFHLENBQUMsQ0FBQzs0QkFDckQsSUFBSSxDQUFDLEtBQUssR0FBRyxHQUFHLEdBQUcsMkJBQTJCLEdBQUcsR0FBRyxHQUFHLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQztnQ0FDckUsRUFBRSxFQUFFLENBQUM7NEJBQ1AsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRztnQ0FDcEIsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDOzRCQUNWLENBQUMsQ0FBQyxDQUFBO3dCQUVKLENBQUMsRUFBRSxVQUFVLEdBQUc7NEJBQ2QsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQ0FDUixNQUFNLEdBQUcsQ0FBQzs0QkFFWixDQUFDOzRCQUFDLElBQUksQ0FBQyxDQUFDO2dDQUdOLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLEdBQUcsR0FBRyxHQUFHLFFBQVEsR0FBRyxTQUFTLEdBQUcsU0FBUyxDQUFDLENBQUM7Z0NBRTFFLElBQUksQ0FBQyxRQUFRLEdBQUcsU0FBUyxHQUFHLFlBQVksR0FBRyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7b0NBRW5ELElBQUksRUFBRSxHQUFHLE9BQU8sQ0FBQyxHQUFHLEdBQUcsZUFBZSxDQUFDLENBQUM7b0NBRXhDLElBQUksSUFBSSxHQUFHO3dDQUNULElBQUksRUFBRSxLQUFLO3dDQUNYLEdBQUcsRUFBRSxPQUFPO3FDQUNiLENBQUM7b0NBR0YsRUFBRSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO29DQUNqQixFQUFFLENBQUMsTUFBTSxHQUFHLFNBQVMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxHQUFHLFNBQVMsQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDO29DQUMxRCxFQUFFLENBQUMsT0FBTyxHQUFHLHdCQUF3QixDQUFDO29DQUN0QyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO3dDQUNiLEVBQUUsQ0FBQyxVQUFVLEdBQUcsT0FBTyxDQUFDO29DQUMxQixDQUFDO29DQUNELFFBQVEsQ0FBQyxhQUFhLENBQUMsR0FBRyxHQUFHLGVBQWUsRUFBRSxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtvQ0FFaEUsRUFBRSxDQUFDLGFBQWEsQ0FBQyxHQUFHLEdBQUcsVUFBVSxFQUFFLGdCQUFnQixHQUFHLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFLEdBQUcsc0NBQXNDLENBQUMsQ0FBQztvQ0FDekgsT0FBTyxDQUFDLEdBQUcsQ0FBQyw4Q0FBOEMsQ0FBQyxDQUFDO29DQUU1RCxJQUFJLENBQUMsS0FBSyxHQUFHLEdBQUcsR0FBRyxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUM7d0NBQ25DLElBQUksQ0FBQyxLQUFLLEdBQUcsR0FBRyxHQUFHLGlCQUFpQixHQUFHLEdBQUcsR0FBRyxhQUFhLENBQUMsQ0FBQyxJQUFJLENBQUM7NENBRS9ELEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7Z0RBQ2IsSUFBSSxDQUFDLEtBQUssR0FBRyxHQUFHLEdBQUcsdUNBQXVDLEdBQUcsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDO29EQUN6RSxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUE7Z0RBQ2pDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7b0RBQ3BCLE1BQU0sR0FBRyxDQUFBO2dEQUNYLENBQUMsQ0FBQyxDQUFDOzRDQUNMLENBQUM7NENBRUQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO3dDQUNqQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHOzRDQUNwQixNQUFNLEdBQUcsQ0FBQTt3Q0FDWCxDQUFDLENBQUMsQ0FBQztvQ0FFTCxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHO3dDQUNwQixNQUFNLEdBQUcsQ0FBQTtvQ0FDWCxDQUFDLENBQUMsQ0FBQztnQ0FJTCxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHO29DQUNwQixNQUFNLEdBQUcsQ0FBQTtnQ0FDWCxDQUFDLENBQUMsQ0FBQzs0QkFLTCxDQUFDO3dCQUNILENBQUMsQ0FBQyxDQUFBO29CQUVKLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUc7d0JBQ3BCLE1BQU0sR0FBRyxDQUFDO29CQUVaLENBQUMsQ0FBQyxDQUFBO29CQUVGLEtBQUssQ0FBQztnQkFFUjtvQkFDRSxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO29CQUN2QixLQUFLLENBQUM7WUFFVixDQUFDO1FBQ0gsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ04sT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN2QixDQUFDO0lBR0gsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUEiLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzQ29udGVudCI6WyJcbmltcG9ydCAqIGFzIGlucXVpcmVyIGZyb20gXCJpbnF1aXJlclwiO1xuaW1wb3J0ICogYXMgZnMgZnJvbSBcImZzXCI7XG5pbXBvcnQgKiBhcyBQcm9taXNlIGZyb20gXCJibHVlYmlyZFwiO1xuaW1wb3J0ICogYXMgcGF0aEV4aXN0cyBmcm9tIFwicGF0aC1leGlzdHNcIjtcbmltcG9ydCAqIGFzIGNvbW1hbmRlciBmcm9tIFwiY29tbWFuZGVyXCI7XG5pbXBvcnQgKiBhcyBfIGZyb20gXCJsb2Rhc2hcIjtcbmltcG9ydCAqIGFzIGFzeW5jIGZyb20gXCJhc3luY1wiO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tIFwicGF0aFwiO1xuaW1wb3J0ICogYXMgZ2l0Y29uZmlnIGZyb20gXCJnaXQtY29uZmlnXCI7XG5pbXBvcnQgKiBhcyBwcm9ncmFtIGZyb20gXCJjb21tYW5kZXJcIjtcblxuXG5pbXBvcnQgZHJvbmVwYXRjaCBmcm9tIFwiLi9wYXRjaC9kcm9uZXNxbFwiO1xuXG5cbmxldCBHb2dzQ2xpZW50ID0gcmVxdWlyZSgnZ29ncy1jbGllbnQnKTtcblxuXG5cbmxldCBleGVjID0gcmVxdWlyZShcInByb21pc2VkLWV4ZWNcIik7XG5cbmxldCBqc29uZmlsZSA9IHJlcXVpcmUoXCJqc29uZmlsZVwiKTtcbmxldCBycGogPSByZXF1aXJlKFwicmVxdWVzdC1wcm9taXNlLWpzb25cIik7XG5cbmxldCB0b2FkZGdpdCA9IGZhbHNlO1xuXG5cbmludGVyZmFjZSBJYW55RnVuY3Rpb24ge1xuICBGdW5jdGlvbjogYW55O1xufVxuXG5cbmludGVyZmFjZSBJcXVlc3Rpb24ge1xuXG4gIHR5cGU6IHN0cmluZztcbiAgbmFtZTogc3RyaW5nO1xuICBtZXNzYWdlOiBzdHJpbmc7XG4gIGNob2ljZXM/OiBhbnlbXTtcbiAgZGVmYXVsdD86IGFueTtcbiAgdmFsaWRhdGU/OiBGdW5jdGlvbjtcbiAgZmlsdGVyPzogYW55O1xuICB3aGVuPzogRnVuY3Rpb247XG5cbn1cblxuXG5cbmxldCBnY3MgPSA8YW55PmdpdGNvbmZpZy5zeW5jKCk7XG5cbmxldCBnaXRDb25maWcgPSA8eyBuYW1lOiBzdHJpbmc7IGVtYWlsOiBzdHJpbmcgfT5nY3MudXNlcjsgLy8gY2FuIHBhc3MgZXhwbGl0IGZpbGUgaWYgeW91IHdhbnQgYXMgd2VsbCBcblxubGV0IGNvcmRvdmFkaXIgPSBcIi90bXAvY29yZG92YVwiICsgbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5sZXQgdnVlZGlyID0gXCIvdG1wL3Z1ZVwiICsgbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cblxuXG5sZXQgZ2l0cmVwbzogYW55ID0gZmFsc2U7XG5cbmxldCBkaXI6IHN0cmluZztcblxuXG5cbmxldCBxdWVzdGlvbnMgPSA8SXF1ZXN0aW9uW10+W1xuXG4gIHtcbiAgICB0eXBlOiAnbGlzdCcsXG4gICAgbmFtZTogJ2FwcCcsXG4gICAgbWVzc2FnZTogJ1NlbGVjdCBhcHAgbW9kZWwnLFxuICAgIGNob2ljZXM6IFsnbW9iaWxlJywgJ211bHRpJywgJ2Rlc2t0b3AnLCAnc2VydmVyJ10sXG4gICAgd2hlbjogZnVuY3Rpb24gKGFuc3dlcnMpIHtcbiAgICAgIHJldHVybiBhbnN3ZXJzLmNvbW1lbnRzICE9PSAnTm9wZSwgYWxsIGdvb2QhJztcbiAgICB9XG4gIH0sXG4gIHtcbiAgICB0eXBlOiAnaW5wdXQnLFxuICAgIG5hbWU6ICduYW1lJyxcbiAgICBtZXNzYWdlOiAnSW5zZXJ0IEFwcCBuYW1lJyxcbiAgICB2YWxpZGF0ZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICBsZXQgcGFzczogYW55ID0gJ1BsZWFzZSBlbnRlciBhIHZhbGlkIHBob25lIG51bWJlcic7XG4gICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgcGFzcyA9IHRydWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gcGFzcztcbiAgICB9XG4gIH0sXG5cbiAge1xuICAgIHR5cGU6ICdjaGVja2JveCcsXG4gICAgbWVzc2FnZTogJ1NlbGVjdCBwbGF0Zm9ybXMnLFxuICAgIG5hbWU6ICdwbGF0Zm9ybXMnLFxuICAgIHdoZW46IGZ1bmN0aW9uIChhbnN3ZXJzKSB7XG4gICAgICByZXR1cm4gYW5zd2Vycy5hcHAgPT09ICdtdWx0aSc7XG4gICAgfSxcbiAgICBjaG9pY2VzOiBbXG4gICAgICB7XG4gICAgICAgIG5hbWU6ICdCcm93c2VyJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgbmFtZTogJ2lPUydcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIG5hbWU6ICdBbmRyb2lkJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgbmFtZTogJ0Rlc2t0b3AnXG4gICAgICB9XG4gICAgXSxcbiAgICB2YWxpZGF0ZTogZnVuY3Rpb24gKGFuc3dlcikge1xuICAgICAgbGV0IGE6IGFueSA9IHRydWU7XG4gICAgICBpZiAoYW5zd2VyLmxlbmd0aCA8IDEpIHtcbiAgICAgICAgYSA9ICdZb3UgbXVzdCBjaG9vc2UgYXQgbGVhc3Qgb25lIHRvcHBpbmcuJztcbiAgICAgIH1cbiAgICAgIHJldHVybiBhO1xuICAgIH1cbiAgfSxcblxuICB7XG4gICAgdHlwZTogJ2NoZWNrYm94JyxcbiAgICBtZXNzYWdlOiAnU2VsZWN0IG1vYmlsZSBwbGF0Zm9ybXMnLFxuICAgIG5hbWU6ICdtb2JpbGUnLFxuICAgIHdoZW46IGZ1bmN0aW9uIChhbnN3ZXJzKSB7XG4gICAgICByZXR1cm4gYW5zd2Vycy5hcHAgPT09ICdtb2JpbGUnO1xuICAgIH0sXG4gICAgY2hvaWNlczogW1xuXG4gICAgICB7XG4gICAgICAgIG5hbWU6ICdpT1NNb2JpbGUnXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBuYW1lOiAnQW5kcm9pZCdcbiAgICAgIH1cbiAgICBdLFxuICAgIHZhbGlkYXRlOiBmdW5jdGlvbiAoYW5zd2VyKSB7XG4gICAgICBsZXQgYTogYW55ID0gdHJ1ZTtcbiAgICAgIGlmIChhbnN3ZXIubGVuZ3RoIDwgMSkge1xuICAgICAgICBhID0gJ1lvdSBtdXN0IGNob29zZSBhdCBsZWFzdCBvbmUgdG9wcGluZy4nO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGE7XG4gICAgfVxuICB9XG5cbl07XG5cblxuaWYgKHBhdGhFeGlzdHMuc3luYyhcIi4vLmdpdC9jb25maWdcIikpIHtcblxuXG4gIGxldCBnaXRjb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKFwiLi8uZ2l0L2NvbmZpZ1wiKS50b1N0cmluZyhcInV0Zi04XCIpLnJlcGxhY2UoL1xcdC9nLCAnJykuc3BsaXQoJ1xcbicpO1xuXG5cblxuICBmb3IgKGxldCBpID0gMDsgaSA8IGdpdGNvbnRlbnQubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoZ2l0Y29udGVudFtpXS5zcGxpdCgnQCcpLmxlbmd0aCA+IDEpIHtcbiAgICAgIGdpdHJlcG8gPSBnaXRjb250ZW50W2ldLnNwbGl0KCd1cmwgPSAnKVsxXTtcbiAgICB9XG4gIH1cblxufVxuXG5cbmlmICghZ2l0cmVwbykge1xuXG5cbiAgcXVlc3Rpb25zLnB1c2goe1xuICAgIG5hbWU6IFwicmVwb3NpdG9yeVwiLFxuICAgIHR5cGU6IFwiaW5wdXRcIixcbiAgICBtZXNzYWdlOiBcIkluc2VydCByZXBvc2l0b3J5XCIsXG4gICAgdmFsaWRhdGU6IGZ1bmN0aW9uICh2YWx1ZSk6IGFueSB7XG5cbiAgICAgIGlmICh2YWx1ZS5zcGxpdChcIkBcIikubGVuZ3RoID4gMSB8fCB2YWx1ZS5zcGxpdChcInR0cDovL1wiKSA+IDEpIHtcbiAgICAgICAgZ2l0cmVwbyA9IHZhbHVlO1xuICAgICAgICB0b2FkZGdpdCA9IHRydWU7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gJ1BsZWFzZSBlbnRlciBhIHZhbGlkIHJlcG9zaXRvcnknO1xuICAgIH1cblxuICB9KTtcblxuXG59IGVsc2Uge1xuXG4gIGRpciA9IHBhdGgucmVzb2x2ZSgpO1xuXG59XG5cbmZ1bmN0aW9uIGFkZHJlcG8oYXBwZGlyZWN0b3J5LCB1c2VyLCBwYXNzd29yZCwgbmFtZSwgZHJvbmVkYnVzZXIsIGRyb25lZGJwYXNzdywgZHJvbmV1c2VyLCBkcm9uZXBhc3N3KSB7XG5cbiAgcnBqLnBvc3QoXCJodHRwczovL1wiICsgdXNlciArIFwiOlwiICsgcGFzc3dvcmQgKyBcIkBnaXQua2VybmVsLm9ubGluZS9hcGkvdjEvYWRtaW4vdXNlcnMva2VybmVsL3JlcG9zXCIsIHtcbiAgICBuYW1lOiBuYW1lLFxuICAgIHByaXZhdGU6IHRydWVcbiAgfSkudGhlbihmdW5jdGlvbiAocmVzKSB7XG5cblxuICAgIGRyb25lcGF0Y2goXG4gICAgICB7XG4gICAgICAgIG9yaWdpbjogeyBob3N0OiBcImtlcm5lbC5vbmxpbmVcIiwgcG9ydDogMzMwNiB9LFxuICAgICAgICBhdXRoOiB7XG4gICAgICAgICAgcGFzc3dvcmQ6IGRyb25lZGJwYXNzdyxcbiAgICAgICAgICB1c2VyOiBkcm9uZXVzZXIsXG4gICAgICAgICAgZGF0YWJhc2U6IFwiZHJvbmVcIlxuICAgICAgICB9LFxuICAgICAgICByZXBvOiBcInRlc3RyZXBvXCIsXG4gICAgICAgIGdvZ3M6IHtcbiAgICAgICAgICB1c2VyOiBcInN0cmluZ1wiLFxuICAgICAgICAgIHBhc3N3b3JkOiBcInN0cmluZ1wiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICApLnRoZW4oZnVuY3Rpb24gKCkge1xuXG5cbiAgICAgIGV4ZWMoXCJjZCBcIiArIGFwcGRpcmVjdG9yeSArIFwiICYmIG5wbSBpXCIpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcImFsbCBkb25lIGZvciBub3dcIilcbiAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgdGhyb3cgZXJyXG4gICAgICB9KTtcblxuXG4gICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgY29uc29sZS5sb2coZXJyKVxuICAgIH0pXG5cbiAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgIHRocm93IGVyclxuICB9KTtcblxufVxuXG5xdWVzdGlvbnMucHVzaCh7XG4gIHR5cGU6ICdjb25maXJtJyxcbiAgbmFtZTogJ2NvbmZpcm0nLFxuICBtZXNzYWdlOiAnZG8geW91IHdhbiB0byBjb25maXJtPyAoWS9uKScsXG4gIGRlZmF1bHQ6IGZhbHNlLFxuICB2YWxpZGF0ZTogZnVuY3Rpb24gKHZhbHVlOiBzdHJpbmcpOiBhbnkge1xuICAgIGxldCByZXQgPSBmYWxzZTtcbiAgICBpZiAodmFsdWUgPT0gXCJ5ZXNcIiB8fCB2YWx1ZSA9PSBcIlllc1wiIHx8IHZhbHVlID09IFwieVwiIHx8IHZhbHVlID09IFwiWVwiKSB7XG4gICAgICByZXQgPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9XG59KTtcblxuXG5cbmZ1bmN0aW9uIHByb21wdCgpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlPGFueT4oZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXG4gICAgaW5xdWlyZXIucHJvbXB0KHF1ZXN0aW9ucykudGhlbihmdW5jdGlvbiAoYW5zd2Vycykge1xuXG4gICAgICByZXNvbHZlKGFuc3dlcnMpO1xuICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgIHRocm93IEVycm9yKGVycik7XG5cbiAgICB9KTtcbiAgfSk7XG5cbn1cblxuZXhwb3J0ID0gZnVuY3Rpb24gY2xpKCkge1xuXG4gIHByb21wdCgpLnRoZW4oZnVuY3Rpb24gKGEpIHtcblxuICAgIGlmIChhLmNvbmZpcm0pIHtcblxuICAgICAgaWYgKCFkaXIpIGRpciA9IHBhdGgucmVzb2x2ZSgpICsgJy8nICsgYS5uYW1lO1xuXG5cbiAgICAgIHN3aXRjaCAoYS5hcHApIHtcblxuICAgICAgICBjYXNlIFwibXVsdGlcIjpcblxuICAgICAgICAgIGV4ZWMoXCJjb3Jkb3ZhIGNyZWF0ZSBcIiArIGEubmFtZSArIFwiIG9ubGluZS5rZXJuZWwuXCIgKyBhLm5hbWUgKyBcIiBcIiArIGEubmFtZSkudGhlbihmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAgIGxldCBwbGF0Zm9ybXMgPSBbXTtcblxuICAgICAgICAgICAgXy5tYXAoYS5wbGF0Zm9ybXMsIGZ1bmN0aW9uIChwOiBzdHJpbmcpIHtcbiAgICAgICAgICAgICAgaWYgKHAudG9Mb3dlckNhc2UoKSA9PT0gXCJicm93c2VyXCIgfHwgcC50b0xvd2VyQ2FzZSgpID09PSBcImlvc1wiIHx8IHAudG9Mb3dlckNhc2UoKSA9PT0gXCJhbmRyb2lkXCIpIHBsYXRmb3Jtcy5wdXNoKHAudG9Mb3dlckNhc2UoKSlcbiAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgIGFzeW5jLmVhY2hTZXJpZXMocGxhdGZvcm1zLCBmdW5jdGlvbiAocGxhLCBjYikge1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImFkZGluZyBwbGF0Zm9ybSBcIiArIHBsYSArIFwiIGluIFwiICsgZGlyKTtcbiAgICAgICAgICAgICAgZXhlYyhcImNkIFwiICsgZGlyICsgXCIgJiYgY29yZG92YSBwbGF0Zm9ybSBhZGQgXCIgKyBwbGEgKyBcIiAtLXNhdmVcIikudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgY2IoKTtcbiAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIGNiKGVycik7XG4gICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHRocm93IGVycjtcblxuICAgICAgICAgICAgICB9IGVsc2Uge1xuXG5cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImFkZGluZyB2dWVraXQgdG8gXCIgKyBkaXIgKyBcIiBmcm9tIFwiICsgX19kaXJuYW1lICsgXCIvdnVla2l0XCIpO1xuXG4gICAgICAgICAgICAgICAgZXhlYyhcImNwIC1yIFwiICsgX19kaXJuYW1lICsgXCIvdnVla2l0Ly4gXCIgKyBkaXIpLnRoZW4oZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICAgICAgICBsZXQgcGsgPSByZXF1aXJlKGRpciArIFwiL3BhY2thZ2UuanNvblwiKTtcblxuICAgICAgICAgICAgICAgICAgbGV0IHJlcG8gPSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiZ2l0XCIsXG4gICAgICAgICAgICAgICAgICAgIHVybDogZ2l0cmVwb1xuICAgICAgICAgICAgICAgICAgfTtcblxuXG4gICAgICAgICAgICAgICAgICBway5uYW1lID0gYS5uYW1lO1xuICAgICAgICAgICAgICAgICAgcGsuYXV0aG9yID0gZ2l0Q29uZmlnLm5hbWUgKyBcIiA8XCIgKyBnaXRDb25maWcuZW1haWwgKyBcIj5cIjtcbiAgICAgICAgICAgICAgICAgIHBrLmxpY2Vuc2UgPSBcIlNFRSBMSUNFTlNFIElOIExJQ0VOU0VcIjtcbiAgICAgICAgICAgICAgICAgIGlmICh0b2FkZGdpdCkge1xuICAgICAgICAgICAgICAgICAgICBway5yZXBvc2l0b3J5ID0gZ2l0cmVwbztcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGpzb25maWxlLndyaXRlRmlsZVN5bmMoZGlyICsgXCIvcGFja2FnZS5qc29uXCIsIHBrLCB7IHNwYWNlczogNCB9KVxuXG4gICAgICAgICAgICAgICAgICBmcy53cml0ZUZpbGVTeW5jKGRpciArIFwiL0xJQ0VOU0VcIiwgJyhjKSBDb3B5cmlnaHQgJyArIG5ldyBEYXRlKCkuZ2V0RnVsbFllYXIoKSArICcga2VybmVsLm9ubGluZSwgYWxsIHJpZ2h0cyByZXNlcnZlZC4nKTtcbiAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiaW5zdGFsbGluZyBkZXBlbmRlbmNpZXMsIHdhaXQgZmV3IG1pbnV0ZXMuLi5cIik7XG5cbiAgICAgICAgICAgICAgICAgIGV4ZWMoXCJjZCBcIiArIGRpciArIFwiICYmIG5wbSBpXCIpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBleGVjKFwibXYgXCIgKyBkaXIgKyBcIi9naXRpZ25vcmVmaWxlIFwiICsgZGlyICsgXCIvLmdpdGlnbm9yZVwiKS50aGVuKGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgICAgICAgICAgIGlmICh0b2FkZGdpdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXhlYyhcImNkIFwiICsgZGlyICsgXCImJiBnaXQgaW5pdCAmJiBnaXQgcmVtb3RlIGFkZCBvcmlnaW4gXCIgKyBnaXRyZXBvKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJhbGwgZG9uZSBmb3Igbm93XCIpXG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IGVyclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJhbGwgZG9uZSBmb3Igbm93XCIpXG4gICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBlcnJcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgZXJyXG4gICAgICAgICAgICAgICAgICB9KTtcblxuXG5cbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICB0aHJvdyBlcnJcbiAgICAgICAgICAgICAgICB9KTtcblxuXG5cblxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuXG4gICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgdGhyb3cgZXJyO1xuXG4gICAgICAgICAgfSlcblxuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgY29uc29sZS5sb2coXCJ0b2Rvb29vXCIpO1xuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiRXhpdCFcIik7XG4gICAgfVxuXG5cbiAgfSk7XG59Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
