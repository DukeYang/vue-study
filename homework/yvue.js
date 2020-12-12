

// eslint-disable-next-line no-unused-vars
class YVue {

  constructor(options) {
    // 1. merge options
    this.$options = options
    // 2. init
    this.$el = document.querySelector(options.el)
    this.$data = options.data

    observe(this.$data)
    proxy(this)

    // new Compiler(options.el, this)
    // 3. mount
    if (this.$el) {
      this.$mount()
    }
  }

  $mount() {
    const updateComponent = () => {
      // render
      const {
        render
      } = this.$options
      // const el = render.call(this)

      // this.$el = el
      const vnode = render.call(this, this.$createElement)
      this._update(vnode)
    }

    new Watcher(this, updateComponent)

  }

  $createElement(tag, props, children) {
    return {
      tag,
      props,
      children
    }
  }

  _update(vnode) {
    const prevVnode = this._vnode
    if (!prevVnode) {
      // init
      this.__patch__(this.$el, vnode)
    } else {
      // update
      this.__patch__(prevVnode, vnode)
    }
    this._vnode = vnode
  }

  __patch__(oldVnode, vnode) {
    if (oldVnode.nodeType) {
      // init
      const parent = oldVnode.parentElement
      const refElm = oldVnode.nextSibling
      const el = this.createElm(vnode)
      // props
      parent.insertBefore(el, refElm)
      parent.removeChild(oldVnode)
    } else {
      // update
      // props
      const el = vnode.$elm = oldVnode.$elm
      const oldProps = oldVnode.props || {}
      const newProps = vnode.props || {}
      for (const key in newProps) {
        el.setAttribute(key, newProps[key])
      }

      for (const key in oldProps) {
        if (!(key in newProps)) {
          el.removeAttribute(key)
        }
      }

      const oldChildren = oldVnode.children
      const newChildren = vnode.children
      if (typeof newChildren !== 'string') {
        // el.textContent = ''
        if (typeof oldChildren === 'string') {
          el.innerHTML = ''
          newChildren.forEach(child => {
            el.appendChild(this.createElm(child))
          })
        } else {
          this.updateChildren(el, oldChildren, newChildren)
        }
      } else if (typeof oldChildren === 'string') {
        if (oldChildren !== newChildren)
          el.textContent = newChildren
      } else {
        el.textContent = newChildren
      }
    }
  }

  updateChildren(parent, oldChildren, newChildren) {
    const len = Math.min(oldChildren.length, newChildren.length)
    for (let i = 0; i < len; i++) {
      this.__patch__(oldChildren[i], newChildren[i])
    }

    if (oldChildren.length > newChildren.length) {
      oldChildren.slice(len).forEach(c => parent.removeChild(c.$elm))
    } else if (oldChildren.length < newChildren.length) {
      newChildren.slice(len).forEach(c => parent.appendChild(this.createElm(c)))
    }
  }

  createElm(vnode) {
    if (vnode.tag in this.$components.keys) {
      vnode.$elm = this.components[vnode.tag].$elm
    } else {
      const el = document.createElement(vnode.tag)

      if (vnode.props) {
        Object.keys(vnode.props).forEach(key => {
          el.setAttribute(key, vnode.props[key])
        })
      }

      if (vnode.children) {
        if (typeof vnode.children === 'string') {
          el.textContent = vnode.children
        } else {
          vnode.children.forEach(childNode => {
            el.appendChild(this.createElm(childNode))
          });
        }
      }
      vnode.$elm = el
    }
  }
}

function defineReactive(obj, key, val) {
  observe(val)
  const dep = new Dep()

  Object.defineProperty(obj, key, {
    get() {
      Dep.target && dep.addDep(Dep.target)
      return val
    },
    set(v) {
      if (v !== val) {
        val = v
        dep.notify()
      }
    }
  })
}

function observe(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return
  }
  new Observer(obj)
}

function proxy(vm) {
  Object.keys(vm.$data).forEach(key => {
    Object.defineProperty(vm, key, {
      get() {
        return vm.$data[key]
      },
      set(v) {
        vm.$data[key] = v
      }
    })
  })
}

class Observer {
  constructor(obj) {
    this.value = obj
    if (Array.isArray(obj)) {
      // obj.forEach(key => {
      //   defineReactive(obj, key, obj[key])
      // });
    } else {
      this.walk(obj)
    }
  }

  walk(obj) {
    Object.keys(obj).forEach(key => {
      defineReactive(obj, key, obj[key])
    })
  }
}


class Watcher {
  constructor(vm, fn) {
    this.vm = vm
    this.getter = fn

    this.get()
  }

  get() {
    Dep.target = this
    this.getter.call(this.vm)
    Dep.target = null
  }

  update() {
    this.get()
    // this.updaterFn.call(this.vm, this.vm[this.key])
  }
}

class Dep {
  constructor() {
    this.deps = new Set()
  }

  addDep(d) {
    this.deps.add(d)
  }

  notify() {
    this.deps.forEach(watcher =>
      watcher.update()
    )
  }
}


// eslint-disable-next-line no-unused-vars
class Compiler {
  constructor(el, vm) {
    this.$vm = vm
    this.$el = document.querySelector(el)
    this.compile(this.$el)
  }

  compile(el) {
    el.childNodes.forEach(node => {
      if (node.nodeType === 1) {
        this.compileElement(node)
        if (node.childNodes.length > 0) {
          this.compile(node)
        }
      } else if (this.isInter(node)) {
        this.compileText(node)
      }
    });
  }

  compileElement(node) {
    const attrs = node.attributes

    Array.from(attrs).forEach(attr => {
      const attrName = attr.attrName
      const exp = attr.value
      if (this.isDir(attrName)) {
        const dir = attrName.substring(2)
        this[dir] && this[dir](node, exp)
      }
    })
  }

  isInter(node) {
    return node.nodeType === 3 && /\{\{(.*)\}\}/.test(node.textContent)
  }

  isDir(attrName) {
    return attrName.startsWith('y-')
  }

  update(node, exp, dir) {
    const fn = this[dir + 'Updater']
    fn && fn(node, this.$vm[exp])

    new Watcher(this.$vm, exp, function (val) {
      fn && fn(node, val)
    })
  }

  compileText(node) {
    this.update(node, RegExp.$1, 'text')
  }

  textUpdater(node, val) {
    node.textContent = val
  }

  text(node, exp) {
    this.update(node, exp, 'text')
  }

  html(node, exp) {
    this.update(node, exp, 'html')
  }

  htmlUpdater(node, val) {
    node.innerHTML = val
  }
}


function initGlobalAPI() {

  const type = 'component'
  YVue[type] = function (id, definition) {
    if (!definition) {
      return this.$options[type + 's'][id]
    } else {
      this.$options[type + 's'][id] = definition
      return definition
    }
  }
}

initGlobalAPI()
