import render from "./Render.js";
import Dep from "./Dep.js";
import emit from "./eventBind.js";
import nextTick from "./nextTick.js";

const dep = new Dep();

export default class Vue {
    constructor() {
        this.el = "document";
        this.mountHTML = "mountHTML";
        this.datas = Object.create(null);
        this.methouds = Object.create(null);
        this.emit = emit;
        this.nextTick = nextTick;
    }
    static createApp(options) {
        //? 将data代理到vm上
        const vm = new Proxy(new Vue(), {
            get(target, p) {
                if (Reflect.get(target, p)) {
                    return Reflect.get(target, p);
                } else {
                    return target.datas[p]._isref ? target.datas[p].value : target.datas[p];
                }
            },
            set(target, p, value) {
                if (target[p]) {
                    Reflect.set(target, p, value);
                } else if (target.datas[p]?._isref) {
                    Reflect.set(target.datas[p], "value", value);
                } else {
                    Reflect.set(target.datas, p, value);
                }
                return true;
            },
        });
        //? onBeforeCreate
        options.onBeforCreate?.call(vm);
        const data = options.data.call(vm);
        for (const key in data) {
            vm.datas[key] = vm.ref(data[key]);
        }
        for (const key in options.methouds) {
            vm.methouds[key] = options.methouds[key].bind(vm);
        }
        //? onCreated
        options.onCreated?.call(vm);
        return vm;
    }
    mount(el) {
        //todo 初始化
        this.init(el);
        //todo 渲染数据
        //! onBeforeMounted
        render(this);
        //! onMounted
        return this;
    }

    init(el) {
        this.el = this.getEl(el);
        this.mountHTML = this.el.innerHTML;
    }

    getEl(el) {
        if (!(el instanceof Element)) {
            try {
                return document.querySelector(el);
            } catch {
                throw "没有选中挂载元素";
            }
        } else return el;
    }

    // *===============↓ 将数据转换为响应式数据的方法 ↓===============* //
    reactive(data) {
        const vm = this; //! 固定VUE实例，不然下面的refresh无法使用
        return new Proxy(data, {
            //todo 修改对象属性后修改Vnode
            set(target, p, value) {
                target._isref
                    ? Reflect.set(target, "value", value)
                    : Reflect.set(target, p, value);

                dep.notify(vm);

                return true;
            },
        });
    }
    ref(data) {
        //? 基本数据类型会被包装为对象再进行代理
        if (typeof data != "object") {
            data = {
                value: data,
                _isref: true,
                toSting() {
                    return this.value;
                },
            };
        }
        return this.reactive(data);
    }
}
