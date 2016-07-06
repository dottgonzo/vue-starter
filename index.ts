
import * as inquirer from "inquirer";
import * as fs from "fs";
import * as Promise from "bluebird";
import * as pathExists from "path-exists";
import * as commander from "commander";
import * as _ from "lodash";
import * as async from "async";
import * as path from "path";
import * as gitconfig from "git-config";
import * as program from "commander";


import dronepatch from "./patch/dronesql";


let GogsClient = require('gogs-client');



let exec = require("promised-exec");

let jsonfile = require("jsonfile");
let rpj = require("request-promise-json");




interface IanyFunction {
  Function: any;
}


interface Iquestion {

  type: string;
  name: string;
  message: string;
  choices?: any[];
  default?: any;
  validate?: Function;
  filter?: any;
  when?: Function;

}



let gcs = <any>gitconfig.sync();

let gitConfig = <{ name: string; email: string }>gcs.user; // can pass explit file if you want as well 

let cordovadir = "/tmp/cordova" + new Date().getTime();
let vuedir = "/tmp/vue" + new Date().getTime();



let gitrepo: any = false;

let dir: string;



let questions = <Iquestion[]>[

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
      let pass: any = 'Please enter a valid phone number';
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
      let a: any = true;
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
      let a: any = true;
      if (answer.length < 1) {
        a = 'You must choose at least one topping.';
      }
      return a;
    }
  }

];


if (pathExists.sync("./.git/config")) {


  let gitcontent = fs.readFileSync("./.git/config").toString("utf-8").replace(/\t/g, '').split('\n');



  for (let i = 0; i < gitcontent.length; i++) {
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
    validate: function (value): any {

      if (value.split("@").length > 1 || value.split("ttp://") > 1) {
        return true;
      }

      return 'Please enter a valid repository';
    }

  });


} else {

  dir = path.resolve();

}

function addrepo(appdirectory, user, password, name, dronedbuser, dronedbpassw, droneuser, dronepassw) {

  rpj.post("https://" + user + ":" + password + "@git.kernel.online/api/v1/admin/users/kernel/repos", {
    name: name,
    private: true
  }).then(function (res) {


    dronepatch(
      {
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
      }
    ).then(function () {


      exec("cd " + appdirectory + " && npm i").then(function () {
        console.log("all done for now")
      }).catch(function (err) {
        throw err
      });


    }).catch(function (err) {
      console.log(err)
    })

  }).catch(function (err) {
    throw err
  });

}

questions.push({
  type: 'confirm',
  name: 'confirm',
  message: 'do you wan to confirm? (Y/n)',
  default: false,
  validate: function (value: string): any {
    let ret = false;
    if (value == "yes" || value == "Yes" || value == "y" || value == "Y") {
      ret = true;
    }
    return ret;
  }
});



function prompt() {
  return new Promise<any>(function (resolve, reject) {

    inquirer.prompt(questions).then(function (answers) {

      resolve(answers);
    }).catch(function (err) {
      throw Error(err);

    });
  });

}

export = function cli() {

  prompt().then(function (a) {

    if (a.confirm) {

      if (!dir) dir = path.resolve() + '/' + a.name;


      switch (a.app) {

        case "multi":

          exec("cordova create " + a.name + " online.kernel." + a.name + " " + a.name).then(function () {

            let platforms = [];

            _.map(a.platforms, function (p: string) {
              if (p.toLowerCase() === "browser" || p.toLowerCase() === "ios" || p.toLowerCase() === "android") platforms.push(p.toLowerCase())
            })

            async.eachSeries(platforms, function (pla, cb) {
              console.log("adding platform " + pla + " in " + dir);
              exec("cd " + dir + " && cordova platform add " + pla + " --save").then(function () {
                cb();
              }).catch(function (err) {
                cb(err);
              })

            }, function (err) {
              if (err) {
                throw err;

              } else {


                console.log("adding vuekit to " + dir + " from " + __dirname + "/vuekit");

                exec("cp -r " + __dirname + "/vuekit/. " + dir).then(function () {

                  let pk = require(dir + "/package.json");

                  let repo = {
                    type: "git",
                    url: "git+https://github.com/dottgonzo/vue-starter.git"
                  };


                  pk.name = a.name;
                  pk.author = gitConfig.name + " <" + gitConfig.email + ">";
                  pk.license = "SEE LICENSE IN LICENSE";
                  //   pk.repository = repo;

                  jsonfile.writeFileSync(dir + "/package.json", pk, { spaces: 4 })

                  fs.writeFileSync(dir + "/LICENSE", '(c) Copyright ' + new Date().getFullYear() + ' kernel.online, all rights reserved.');

                  exec("cd " + dir + " && npm i").then(function () {
                    console.log("all done for now")
                  }).catch(function (err) {
                    throw err
                  });



                }).catch(function (err) {
                  throw err
                });




              }
            })

          }).catch(function (err) {
            throw err;

          })

          break;

        default:
          console.log("todoooo");
          break;

      }
    } else {
      console.log("Exit!");
    }


  });
}