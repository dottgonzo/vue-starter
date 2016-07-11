import Vue from 'vue';
import { sync } from 'vuex-router-sync';
import App from './App';
import VueRouter from 'vue-router' // vue-router instance
import Store from './store';


Vue.use(VueRouter);


const router = new VueRouter();

const approuter = Vue.extend({});



router.map({
    '/': {
        component: App
    }
});






sync(Store, router);

router.start(approuter, '#appContainer'); // must stay after map and syncing

/* eslint-disable no-console */
console.log(store.state);

