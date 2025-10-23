/**
 * class
 */

class FibnoacciCounter {
  #zeroCount = 0;
  #oneCount = 0;
  fibonacci(n) {
    if (n === 0) {
      this.#zeroCount++;
      return 0;
    } else if (n === 1) {
      this.#oneCount++;
      return 1;
    } else {
      return this.fibonacci(n - 1) + this.fibonacci(n - 2);
    }
  }

  reset() {
    this.#oneCount = 0;
    this.#zeroCount = 0;
  }

  getCount() {
    return {
      zeroCount: this.#zeroCount,
      oneCount: this.#oneCount,
    };
  }
}

function main() {
  const fibnoacciCounter = new FibnoacciCounter();
  const result = fibnoacciCounter.fibonacci(5);
  console.log(result);
  const { oneCount, zeroCount } = fibnoacciCounter.getCount();
  console.log(zeroCount, oneCount);
}

main();
