class App {
  public _value = 0

  constructor () {
  }

  private inc() {
    this._value++;
  }

  get value() {
    return this._value;
  }
}

export default new App()