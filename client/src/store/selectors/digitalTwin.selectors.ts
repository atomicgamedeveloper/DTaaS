import { RootState } from 'store/store';

export const selectDigitalTwinByName = (name: string) => (state: RootState) =>
  state.digitalTwin.digitalTwin[name];

export const selectDigitalTwins = (state: RootState) =>
  Object.values(state.digitalTwin.digitalTwin);

export const selectShouldFetchDigitalTwins = (state: RootState) =>
  state.digitalTwin.shouldFetchDigitalTwins;
