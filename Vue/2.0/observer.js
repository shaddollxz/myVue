/*
 * @Author: shaddollxz
 * @Date: 2021-07-27 23:05:06
 * @LastEditTime: 2021-07-28 13:13:34
 * @Description: 将$data的数据改为响应式
 */
import Dep from "./dep.js";

const dep = new Dep();

export default class Observer {
    constructor(vm) {
        this.vm = vm;
    }
    observeData() {
        const data = this.vm.$data;
        for (const key in data) {
            data[key] = this.ref(data[key]);
        }
    }
    // *===============↓ 将数据转换为响应式数据的方法 ↓===============* //
    reactive(data) {
        return new Proxy(data, {
            get(target, p) {
                window.target && dep.add(window.target);
                window.target = null; //? 将watch实例保存后删除
                return Reflect.get(target, p);
            },
            //todo 修改对象属性后修改Vnode
            set(target, p, value) {
                target._isref
                    ? Reflect.set(target, "value", value)
                    : Reflect.set(target, p, value);

                dep.notify();

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
