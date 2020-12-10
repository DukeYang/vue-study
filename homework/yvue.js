class YVue{
  constructor(options) {
    // 1. merge options
    this.$options = options
    // 2. init
    this.el = document.querySelector(options.el)
    this.$data = options.data

    observe(this.$data)
    proxy(this, "$data")
    // 3. mount
    if(this.el) {
      this.$mount(this.el)
    }
  }

  $mount(el) {

  }
}
