/**
 * memoized recursive
 */

function validateInput(n) {
  if (!Number.isInteger(n) || n < 0) {
    throw new TypeError('n must be a non-negative integer');
  }
}

function createMemoizedFibonacci() {
  const memo = new Map([
    [0, 0],
    [1, 1],
  ]);

  function fibonacci(n) {
    if (memo.has(n)) {
      return memo.get(n);
    }

    const value = fibonacci(n - 1) + fibonacci(n - 2);
    memo.set(n, value);
    return value;
  }

  return fibonacci;
}

function countBaseCalls(n) {
  const counts = [
    { zero: 1, one: 0 },
    { zero: 0, one: 1 },
  ];

  if (n < 2) {
    return counts[n];
  }

  for (let index = 2; index <= n; index += 1) {
    counts[index] = {
      zero: counts[index - 1].zero + counts[index - 2].zero,
      one: counts[index - 1].one + counts[index - 2].one,
    };
  }

  return counts[n];
}

function runFibonacciWithCounter(n) {
  validateInput(n);
  const fibonacci = createMemoizedFibonacci();
  const value = fibonacci(n);
  const counter = countBaseCalls(n);

  return { value, counter };
}

function main() {
  const { value, counter } = runFibonacciWithCounter(5);
  console.log(value);
  console.log(counter.zero, counter.one);
}

main();
