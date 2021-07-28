/*
 * @Author: shaddollxz
 * @Date: 2021-07-27 17:53:25
 * @LastEditTime: 2021-07-27 21:06:51
 * @Description:
 * 通过正则表达式解析html文本，然后用解析到的数据构建文档碎片
 * 最后清空挂载的app，重新填入文档
 */

import { eventBinder } from "./eventBind.js";

export default function render(vm) {
    const regexp =
        /(?<tag>(?<=<)[^\/]+?(?=(>|\s)))|\{\{(\s*)(?<data>.+?)(\s*)\}\}|(?<text>(?<=>)\S+?(?=<))|(?<eName>(?<=@|(v-on:))\S+?)(=")(?<event>\S+?(?="))/g;
    const fragment = document.createDocumentFragment();
    let ele = {};
    //? 每次匹配到tag就把获得的信息转成标签
    for (const result of vm.mountHTML.matchAll(regexp)) {
        if (result.groups.tag && ele.tag) {
            fragment.appendChild(createEle(vm, ele));
            ele = {};
        }
        Object.assign(ele, JSON.parse(JSON.stringify(result.groups)));
    }
    fragment.appendChild(createEle(vm, ele));
    ele = null;

    //? 清空原来的DOM
    vm.el.innerHTML = "";
    vm.el.appendChild(fragment);
}

//? 放入原生事件，用字典储存
const OrangeEvents = { click: Symbol() };

/**
 * 根据解析的数据创建放入文档碎片的元素
 */
function createEle(vm, options) {
    const { tag, text, data, eName, event } = options;
    if (tag) {
        const ele = document.createElement(tag);
        if (data) {
            ele.innerText = getByPath(vm, data);
        }
        if (text) {
            ele.innerText = text;
        }
        if (event) {
            //todo 先判断是不是原生事件，是就直接绑定，不然用Event.js来注册
            if (OrangeEvents[eName]) {
                ele.addEventListener(eName, vm.methouds[event]);
            } else {
                eventBinder.off(eName); //? 因为这里render的实现是重新全部渲染，所以要清空对应的事件缓存
                eventBinder.on(eName, vm.methouds[event].bind(vm));
            }
        }
        return ele;
    }
}

/**
 * 通过字符串来访问对象中的属性
 */
function getByPath(obj, path) {
    const pathArr = path.split(".");
    return pathArr.reduce((result, curr) => {
        return result[curr];
    }, obj);
}
