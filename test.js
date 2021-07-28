import Vue from "./Vue/2.0/vue.js";

const options = {
    data() {
        console.log(this);
        return {
            count: 0,
            counter: {
                innerCounter: {
                    count: 0,
                },
            },
        };
    },
    methouds: {
        sub() {
            this.counter.innerCounter.count--;
            this.count--;
        },
        add() {
            this.counter.innerCounter.count++;
            this.count++;
        },
        jian() {
            this.$emit("jian");
        },
    },
};
Vue.createApp(options).mount("#app");
