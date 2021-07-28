import Observer from "./observer.js";
import render from "./render.js";
import emit from "./eventBind.js";
import { nextTick, getEl } from "./util.js";
import Watcher from "./watcher.js";

export default class Vue {
    constructor() {
        this.$el = "document";

        this.$data = Object.create(null);
        this.$methouds = Object.create(null);

        this.$emit = emit;
        this.$nextTick = nextTick;
        this.$watch = function (key, cb) {
            new Watcher(this, key, cb);
        };
    }
    static createApp(options) {
        //? 将data代理到vm上
        const vm = new Proxy(new Vue(), {
            get(target, p) {
                if (Reflect.get(target, p)) {
                    return Reflect.get(target, p);
                } else {
                    return target.$data[p]._isref ? target.$data[p].value : target.$data[p];
                }
            },
            set(target, p, value) {
                if (target[p]) {
                    Reflect.set(target, p, value);
                } else if (target.$data[p]?._isref) {
                    Reflect.set(target.$data[p], "value", value);
                } else {
                    Reflect.set(target.$data, p, value);
                }
                return true;
            },
        });

        options.onBeforCreate?.call(vm);

        vm.$data = options.data.call(vm);
        new Observer(vm).observeData(); //! 将data的数据转为响应式

        for (const key in options.methouds) {
            vm.$methouds[key] = options.methouds[key].bind(vm);
        }

        options.onCreated?.call(vm);
        return vm;
    }
    mount(el) {
        //! onBeforeMounted
        //todo 初始化
        this.$el = getEl(el);
        //todo 渲染数据
        render(this.$el, this);
        //! onMounted
        return this;
    }
}
