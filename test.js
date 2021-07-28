import Vue from "./Vue/2.0/vue.js";

const options = {
    data() {
        return {
            count: 0,
            counter: {
                count: 0,
            },
        };
    },
    methouds: {
        sub() {
            this.counter.count--;
            this.count--;
        },
        add() {
            this.counter.count++;
            this.count++;
        },
        jian() {
            this.$emit("jian");
        },
    },
    onCreated() {
        console.log(this);
    },
};
Vue.createApp(options).mount("#app");
