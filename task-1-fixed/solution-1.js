/**
 * class
 */

function validateInput(n) {
  if (!Number.isInteger(n) || n < 0) {
    throw new TypeError('n must be a non-negative integer');
  }
}

function buildFibonacciTable(n) {
  const table = [
    { value: 0, zeroCount: 1, oneCount: 0 },
    { value: 1, zeroCount: 0, oneCount: 1 },
  ];

  if (n < 2) {
    return table;
  }

  for (let index = 2; index <= n; index += 1) {
    const previous = table[index - 1];
    const beforePrevious = table[index - 2];
    table[index] = {
      value: previous.value + beforePrevious.value,
      zeroCount: previous.zeroCount + beforePrevious.zeroCount,
      oneCount: previous.oneCount + beforePrevious.oneCount,
    };
  }

  return table;
}

class FibonacciAnalyzer {
  analyze(n) {
    validateInput(n);
    const table = buildFibonacciTable(n);
    const entry = table[n];

    return {
      value: entry.value,
      zeroCount: entry.zeroCount,
      oneCount: entry.oneCount,
    };
  }
}

function main() {
  const analyzer = new FibonacciAnalyzer();
  const { value, zeroCount, oneCount } = analyzer.analyze(5);
  console.log(value);
  console.log(zeroCount, oneCount);
}

main();
