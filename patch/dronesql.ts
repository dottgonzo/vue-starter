import * as Promise from "bluebird";

import kmysql = require("kernelmysql");

export default function (obj: { gogs: { user: string, password: string }, repo: string, origin: { host: string, port: number }, auth: { password: string, user: string, database: string } }) {
    return new Promise(function (resolve, reject) {


        let Kmysql = new kmysql(obj);

        Kmysql.init();

        let Store = Kmysql.connection;

        let repo_clone;
        let repo_id;
        Store.query('SELECT * FROM `repos` WHERE `repo_name` = "' + obj.repo + '"', function (error, results, fields) {

            if (error) {
                Kmysql.disconnect();
                reject(error);
            } else if (results) {
                let repo = JSON.parse(JSON.stringify(results[0]));
                repo_id = repo.repo_id;
                repo_clone = repo.repo_clone.split("//")[0] + "//" + obj.gogs.user + ":" + obj.gogs.password + "@" + repo.repo_clone.split("//")[1];
                console.log(repo_clone);
                console.log(repo_id);


                Store.query('UPDATE repos SET repo_clone = ? WHERE repo_id = ?', [repo_clone, repo_id], function (err, results) {

                    if (error) {
                        reject(error)
                    } else if (results) {
                        console.log(results);
                        resolve(results);
                    }


                    Kmysql.disconnect();
                });
            }
            // error will be an Error if one occurred during the query 
            // results will contain the results of the query 
            // fields will contain information about the returned results fields (if any) 
        });



    })

}
