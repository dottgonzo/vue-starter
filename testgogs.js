var GogsClient = require('gogs-client');
var api = new GogsClient('https://git.kernel.online/api/v1');
api.createRepo({
    "name": "demo-repo-fggg",
    "description": "This is a test repository. Yay!",
    "private": false
}, {
    "username": "dottgonzo",
    "password": "kl4huh2plG34IGhiu"
  }).then(function (repo) {
console.log(repo)
}).catch(function(err){
    console.log(err)
});