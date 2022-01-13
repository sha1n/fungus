const NoopTransitionHandler = {
  handle<T>(entity: T): Promise<T> {
    return Promise.resolve(entity);
  }
};

export { NoopTransitionHandler };
