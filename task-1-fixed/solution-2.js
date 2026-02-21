/**
 * closure
 */

function validateInput(n) {
  if (!Number.isInteger(n) || n < 0) {
    throw new TypeError('n must be a non-negative integer');
  }
}

function calculateFibonacciMetrics(n) {
  validateInput(n);

  const dp = [
    { value: 0, zeroCount: 1, oneCount: 0 },
    { value: 1, zeroCount: 0, oneCount: 1 },
  ];

  if (n < 2) {
    return dp[n];
  }

  for (let index = 2; index <= n; index += 1) {
    const previous = dp[index - 1];
    const beforePrevious = dp[index - 2];
    dp[index] = {
      value: previous.value + beforePrevious.value,
      zeroCount: previous.zeroCount + beforePrevious.zeroCount,
      oneCount: previous.oneCount + beforePrevious.oneCount,
    };
  }

  return dp[n];
}

function createFibonacciSession() {
  let lastResult = null;

  return {
    run(n) {
      lastResult = calculateFibonacciMetrics(n);
      return lastResult.value;
    },
    getCount() {
      if (!lastResult) {
        return { zeroCount: 0, oneCount: 0 };
      }

      return {
        zeroCount: lastResult.zeroCount,
        oneCount: lastResult.oneCount,
      };
    },
    reset() {
      lastResult = null;
    },
  };
}

function main() {
  const session = createFibonacciSession();
  const result = session.run(5);
  console.log(result);
  const { zeroCount, oneCount } = session.getCount();
  console.log(zeroCount, oneCount);
}

main();
