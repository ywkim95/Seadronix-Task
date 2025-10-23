/**
 * global variables
 */
let counter = {
  zero: 0,
  one: 0,
};

function fibonacci(n) {
  if (n === 0) {
    counter.zero++;
    return 0;
  }
  if (n === 1) {
    counter.one++;
    return 1;
  }

  return fibonacci(n - 1) + fibonacci(n - 2);
}

function main() {
  const result = fibonacci(5);
  console.log(result);
  console.log(counter.zero, counter.one);
}

main();
