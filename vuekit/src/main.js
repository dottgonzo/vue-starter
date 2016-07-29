"use strict";
var vue_1 = require('vue');
var vuex_router_sync_1 = require('vuex-router-sync');
var vue_router_1 = require('vue-router');
var store_1 = require('./store');
var App_1 = require('./App');
vue_1.default.use(vue_router_1.default);
var router = new vue_router_1.default();
var approuter = vue_1.default.extend({});
router.map({
    '/': {
        component: App_1.default
    }
});
vuex_router_sync_1.sync(store_1.default, router);
router.start(approuter, '#appContainer');
console.log(store_1.default.state);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInZ1ZWtpdC9zcmMvbWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsb0JBQWdCLEtBQUssQ0FBQyxDQUFBO0FBQ3RCLGlDQUFxQixrQkFBa0IsQ0FBQyxDQUFBO0FBQ3hDLDJCQUFzQixZQUN0QixDQUFDLENBRGlDO0FBQ2xDLHNCQUFrQixTQUFTLENBQUMsQ0FBQTtBQUM1QixvQkFBZ0IsT0FBTyxDQUFDLENBQUE7QUFHeEIsYUFBRyxDQUFDLEdBQUcsQ0FBQyxvQkFBUyxDQUFDLENBQUM7QUFHbkIsSUFBTSxNQUFNLEdBQUcsSUFBSSxvQkFBUyxFQUFFLENBQUM7QUFFL0IsSUFBTSxTQUFTLEdBQUcsYUFBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUlqQyxNQUFNLENBQUMsR0FBRyxDQUFDO0lBQ1AsR0FBRyxFQUFFO1FBQ0QsU0FBUyxFQUFFLGFBQUc7S0FDakI7Q0FDSixDQUFDLENBQUM7QUFPSCx1QkFBSSxDQUFDLGVBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztBQUVwQixNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxlQUFlLENBQUMsQ0FBQztBQUd6QyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyIsImZpbGUiOiJ2dWVraXQvc3JjL21haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgVnVlIGZyb20gJ3Z1ZSc7XG5pbXBvcnQgeyBzeW5jIH0gZnJvbSAndnVleC1yb3V0ZXItc3luYyc7XG5pbXBvcnQgVnVlUm91dGVyIGZyb20gJ3Z1ZS1yb3V0ZXInIC8vIHZ1ZS1yb3V0ZXIgaW5zdGFuY2VcbmltcG9ydCBTdG9yZSBmcm9tICcuL3N0b3JlJztcbmltcG9ydCBBcHAgZnJvbSAnLi9BcHAnO1xuXG5cblZ1ZS51c2UoVnVlUm91dGVyKTtcblxuXG5jb25zdCByb3V0ZXIgPSBuZXcgVnVlUm91dGVyKCk7XG5cbmNvbnN0IGFwcHJvdXRlciA9IFZ1ZS5leHRlbmQoe30pO1xuXG5cblxucm91dGVyLm1hcCh7XG4gICAgJy8nOiB7XG4gICAgICAgIGNvbXBvbmVudDogQXBwXG4gICAgfVxufSk7XG5cblxuXG5cblxuXG5zeW5jKFN0b3JlLCByb3V0ZXIpO1xuXG5yb3V0ZXIuc3RhcnQoYXBwcm91dGVyLCAnI2FwcENvbnRhaW5lcicpOyAvLyBtdXN0IHN0YXkgYWZ0ZXIgbWFwIGFuZCBzeW5jaW5nXG5cbi8qIGVzbGludC1kaXNhYmxlIG5vLWNvbnNvbGUgKi9cbmNvbnNvbGUubG9nKFN0b3JlLnN0YXRlKTtcblxuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
