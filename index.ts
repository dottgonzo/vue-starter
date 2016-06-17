
import * as inquirer from "inquirer";
import * as fs from "fs";
import * as Promise from "bluebird";
import * as pathExists from "path-exists";



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



let gitrepo: any = false;


if (pathExists.sync("./.git/config")) {


  let gitcontent = fs.readFileSync("./.git/config").toString("utf-8").replace(/\t/g, '').split('\n');



  for (let i = 0; i < gitcontent.length; i++) {
    if (gitcontent[i].split('@').length > 1) {
      gitrepo = gitcontent[i].split('url = ')[1];
    }
  }
}

let questions = <Iquestion[]>[



  {
    type: 'list',
    name: 'app',
    message: 'For leaving a comment, you get a freebie',
    choices: ['web', 'mobile', 'multi', 'desktop'],
    when: function (answers) {
      return answers.comments !== 'Nope, all good!';
    }
  },
  {
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
  }

];




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


prompt().then(function (a) {
  console.log("answer: "+a);

  console.log(a);


});
