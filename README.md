# 基本结构

这里我根据自己的理解模仿了Vue的单文件写法，通过给`Vue.createApp`传入参数再挂载元素来实现页面与数据的互动。

其中理解不免有错，希望大佬轻喷。

# 收集数据

>  这里将`Vue.createApp()`里的参数叫做options

data可以是一个对象或者函数，在是函数的时候必须ruturn出一个对象，该对象里的数据会被vm直接调用。

可以直接先获取options，然后将里面的data函数执行一次再把结果挂载到实例上，methods等对象也可以直接挂载：（这里忽略了data是对象的情况，只按照是函数来处理）

```javascript
class Vue{
    constructor() {
        this.datas = Object.create(null);
    }
    static createApp(options){
        const vm = new Vue();
        vm.datas = options.data?.call(vm);
        for (const key in options.methouds) {
            vm.methouds[key] = options.methouds[key].bind(vm);
        }
        return vm;
    }
}
```

当然这样只是会获得一个Vue实例，上面有输入的数据，这些数据还不会与页面发生互动。

# Vue 的响应式数据

Vue的数据双向绑定是通过代理注入来实现的，在vue2中使用`Object.defineProperty`而到了vue3使用的是[`Proxy`API](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Proxy)。虽然用的方法不同，但核心思想是一样的：截获数据的改变，然后进行页面更新。

这样就可以试着写出获得代理数据的方法：

```javascript
class Vue{
    constructor() {}
    
    static createApp(options){
        const vm = new Vue();
        const data = options.data?.call(vm);
        for (const key in data) {
            vm.datas[key] = vm.ref(data[key]);
        }
        return vm;
    }
    
    reactive(data) {
        const vm = this; //! 固定VUE实例，不然下面的notify无法使用
        return new Proxy(data, {
            //todo 修改对象属性后修改Vnode
            set(target, p, value) {
                target._isref
                    ? Reflect.set(target, "value", value)
                    : Reflect.set(target, p, value);
                
                //todo 在这里通知，然后修改页面
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
```

现在如果data中设置的数据发生了改变，那么就会调用`dep.notify`来改变页面内容。

# vm代理datas等数据

因为再模板里是不会写`this.datas.xxx`来调用数据的，这里也可以使用代理来把datas中的数据放到vm上：

```javascript
class Vue {
    constructor() {
        //! 因为vm代理了datas 以后在vm上添加新属性会被移动到datas中，所以如果是实例上的属性要像el一样占位
        this.el = "document";
        this.mountHTML = "mountHTML";
        this.datas = Object.create(null);
        this.methouds = Object.create(null);
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
        const data = options.data?.call(vm);
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
}
```

这样通过`createApp`获得的Vue实例直接访问并修改收集到的datas里的数据。

# 挂载

通过`Vue.createApp`可以获得一个Vue实例，这样只需要调用实例中的`mount`方法就可以进行挂载了，在挂载后就马上进行数据的渲染。

`vm.mount`接收一个参数，可以是css选择器的字符串，也可以直接是html节点：

```javascript
class Vue{
    constructor() {}
    mount(el) {
        //todo 初始化
        this.init(el);
        //todo 渲染数据
        render(this);
        return this;
    }

    init(el) {
        this.el = this.getEl(el);
        this.mountHTML = this.el.innerHTML; //? 获得挂载时元素的模板
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
}
```

# 渲染页面

Vue渲染页面使用了**VNode**来记录并按照它进行页面的渲染，在每次更新数据时获得数据更新的地方并通过**diff算法**来比较旧VNode和更新数据后VNode的不同来对页面进行渲染。

这里不做太复杂处理，直接把挂载节点的`innerHTML`作为模板，通过正则进行捕获并修改，然后渲染到页面上，同时如果有通过`@ 或 v-on`绑定的事件，则按照情况进行处理：

- 如果是原生的事件，则直接添加进去；
- 如果是非原生的事件，则通过on来记录，以后用emit来进行触发。

```javascript
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
    fragment.appendChild(createEle(vm, ele)); //? 最后这里再执行一次把最后的一个元素也渲染
    ele = null;

    //? 清空原来的DOM
    vm.el.innerHTML = "";
    vm.el.appendChild(fragment);
}

//? 放入原生事件，用字典储存，这里只记录了click
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
            //todo 先判断是不是原生事件，是就直接绑定，不然用eventBinder来注册
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
```

这里的正则用了具名组匹配符，可以通过我的[这篇博客](https://juejin.cn/post/6988125365495431181)来了解。

这里渲染函数只是进行简单渲染，没有考虑到字符和数据同时出现的情况，也没有考虑标签嵌套的问题，只能平铺标签。。。

# 注册事件

事件注册就是一个标准的发布订阅者模式的实现了，可以看看我的[这篇博客](https://www.cnblogs.com/shaddollxz/p/15008833.html)(讲的并不详细）

这里对事件绑定进行了简化，只保留了`on off emit`三个方法：

```javascript
class Event {
    constructor() {
        this.collector = Object.create(null);
    }
    on(eName, cb) {
        this.collector[eName] ? this.collector[eName].push(cb) : (this.collector[eName] = [cb]);
    }
    off(eName, cb) {
        if (!(eName && cb)) {
            this.collector = Object.create(null);
        } else if (eName && !cb) {
            delete this.collector[eName];
        } else {
            this.collector[eName].splice(this.collector[eName].indexOf(cb), 0);
        }
        return this;
    }
    emit(eName, ...arg) {
        for (const cb of this.collector[eName]) {
            cb(...arg);
        }
    }
}

const eventBinder = new Event();

export { eventBinder };
export default eventBinder.emit.bind(eventBinder); //! emit会被注册到vm上，让它的this始终指向eventBinder

```

# 更新页面

有了渲染函数就可以根据数据的变化来渲染页面了，如果一次有多个数据进行修改，那么会触发多次渲染函数，这是明显的性能浪费，所以引用`任务队列`和`锁`的概念来保证一次操作只会重新渲染一次页面：

```javascript
// Dep.js
export default class Dep {
    constructor() {
        this.lock = true;
    }

    notify(vm) {
        //? onBeforeUpdate
        //! 把更新视图放到微任务队列，即使多个数据改变也只渲染一次
        if (this.lock) {
            this.lock = false;
            //! 应该在这里运用diff算法更新DOM树 这里只是重新渲染一次页面
            nextTick(render, vm);
            nextTick(() => (this.lock = true)); //? onupdated
        }
    }
}
// nextTick.js
export default function nextTick(cb, ...arg) {
    Promise.resolve().then(() => {
        cb(...arg);
    });
}
```

# 结语

通过这些简单的代码就实现了一个简单的页面-数据双向绑定，[代码地址]()

说不定还会试着加入其它功能。
