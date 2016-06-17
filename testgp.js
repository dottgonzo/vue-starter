var rpj=require("request-promise-json");

rpj.post("https://dottgonzo:kl4huh2plG34IGhiu@git.kernel.online/api/v1/admin/users/kernel/repos",{
    name:"dd",
    private:true
}).then(function(res){
console.log(res)
}).catch(function(err){
    console.log(err)
})
