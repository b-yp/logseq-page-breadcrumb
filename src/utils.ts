export const debounce = <T extends (...args: unknown[]) => void>(func: T, wait: number = 500) => {
  let timeout: NodeJS.Timeout;
  return function(this: ThisParameterType<T>, ...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  }
}
