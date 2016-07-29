"use strict";
var vue_1 = require('vue');
var vuex_1 = require('vuex');
vue_1.default.use(vuex_1.default);
var state = {
    count: 0
};
var mutations = {
    INCREMENT: function (state) {
        state.count++;
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = new vuex_1.default.Store({
    state: state,
    mutations: mutations
});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInZ1ZWtpdC9zcmMvc3RvcmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLG9CQUFnQixLQUFLLENBQUMsQ0FBQTtBQUN0QixxQkFBaUIsTUFBTSxDQUFDLENBQUE7QUFFeEIsYUFBRyxDQUFDLEdBQUcsQ0FBQyxjQUFJLENBQUMsQ0FBQztBQUdkLElBQU0sS0FBSyxHQUFHO0lBQ1osS0FBSyxFQUFFLENBQUM7Q0FDVCxDQUFDO0FBRUYsSUFBTSxTQUFTLEdBQUc7SUFDaEIsU0FBUyxZQUFDLEtBQUs7UUFDYixLQUFLLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDZixDQUFDO0NBQ0YsQ0FBQztBQUVGO2tCQUFlLElBQUksY0FBSSxDQUFDLEtBQUssQ0FBQztJQUM1QixPQUFBLEtBQUs7SUFDTCxXQUFBLFNBQVM7Q0FDVixDQUFDLENBQUMiLCJmaWxlIjoidnVla2l0L3NyYy9zdG9yZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBWdWUgZnJvbSAndnVlJztcbmltcG9ydCBWdWV4IGZyb20gJ3Z1ZXgnO1xuXG5WdWUudXNlKFZ1ZXgpO1xuXG5cbmNvbnN0IHN0YXRlID0ge1xuICBjb3VudDogMFxufTtcblxuY29uc3QgbXV0YXRpb25zID0ge1xuICBJTkNSRU1FTlQoc3RhdGUpIHtcbiAgICBzdGF0ZS5jb3VudCsrXG4gIH1cbn07XG5cbmV4cG9ydCBkZWZhdWx0IG5ldyBWdWV4LlN0b3JlKHtcbiAgc3RhdGUsXG4gIG11dGF0aW9uc1xufSk7XG5cbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
