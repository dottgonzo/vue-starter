import Vue from 'vue';
import { sync } from 'vuex-router-sync';
import Vuex from 'vuex';
import App from './App';
import VueRouter from 'vue-router';
Vue.use(VueRouter);
Vue.use(Vuex);
const router = new VueRouter();
const approuter = Vue.extend({});
router.map({
    '/': {
        component: App
    }
});
// Now we can start the app!
const state = {
    count: 0
};
const mutations = {
    INCREMENT(state) {
        state.count++;
    }
};
const store = new Vuex.Store({
    state,
    mutations
});
sync(store, router);
router.start(approuter, '#appContainer'); // must stay after map and syncing
/* eslint-disable no-console */
console.log(store.state);
