import store from 'store/store';

const BenchmarkConfig = {
  get trials(): number {
    return store.getState().benchmark.trials;
  },
  get runnerTag1(): string {
    return store.getState().settings.RUNNER_TAG;
  },
  get runnerTag2(): string {
    return store.getState().benchmark.secondaryRunnerTag;
  },
};

export default BenchmarkConfig;
