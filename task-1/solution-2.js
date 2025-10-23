/**
 * closure
 */

function createFibonacciWithCounter() {
  let zeroCount = 0;
  let oneCount = 0;

  function fibonacci(n) {
    if (n === 0) {
      zeroCount++;
      return 0;
    }
    if (n === 1) {
      oneCount++;
      return 1;
    }

    return fibonacci(n - 1) + fibonacci(n - 2);
  }

  return {
    fibonacci,
    getCount: () => ({ zeroCount, oneCount }),
    reset: () => {
      zeroCount = 0;
      oneCount = 0;
    },
  };
}

function main() {
  const fib = createFibonacciWithCounter();
  const result = fib.fibonacci(5);
  console.log(result);
  const { zeroCount, oneCount } = fib.getCount();
  console.log(zeroCount, oneCount);
}
main();
