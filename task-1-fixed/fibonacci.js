function validateFibonacciInput(n) {
  if (!Number.isInteger(n) || n < 0) {
    throw new TypeError('n must be a non-negative integer');
  }
}

export default function fibonacci(n) {
  validateFibonacciInput(n);

  if (n < 2) {
    return n;
  }

  let previous = 0;
  let current = 1;

  for (let index = 2; index <= n; index += 1) {
    const next = previous + current;
    previous = current;
    current = next;
  }

  return current;
}
