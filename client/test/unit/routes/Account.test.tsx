import '@testing-library/jest-dom';
import React from 'react';
import Account from 'route/account/Account';
import { screen } from '@testing-library/react';
import { useAuth } from 'react-oidc-context';
import { mockUser } from 'test/__mocks__/global_mocks';
import {
  renderWithRouter,
  testAccountSettings,
  testStaticAccountProfile,
} from 'test/unit/unit.testUtil';
import { useSelector, useDispatch } from 'react-redux';
import { DEFAULT_SETTINGS } from 'store/settings.slice';
import { DEFAULT_BENCHMARK } from 'store/benchmark.slice';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock('page/Layout', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const R = require('react');
  return { __esModule: true, default: (p: { children: unknown }) => R.createElement('div', null, p.children) };
});
/* eslint-enable @typescript-eslint/no-require-imports */

jest.mock('react-oidc-context');

/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock('components/tab/TabComponent', () => {
  const R = require('react');
  return {
    __esModule: true,
    default: ({
      assetType,
    }: {
      assetType: { label: string; body: React.ReactNode }[];
    }) => {
      const [active, setActive] = R.useState(0);
      return R.createElement(
        'div',
        null,
        assetType.map((tab: { label: string }, i: number) =>
          R.createElement(
            'button',
            { key: tab.label, onClick: () => setActive(i) },
            tab.label,
          ),
        ),
        assetType[active]?.body,
      );
    },
  };
});
/* eslint-enable @typescript-eslint/no-require-imports */

describe('AccountTabs', () => {
  let accountMockUser = mockUser;
  function setupTest(groups: string[] | string) {
    accountMockUser.profile.groups = groups;
    (useAuth as jest.Mock).mockReturnValue({
      user: accountMockUser,
    });
    renderWithRouter(<Account />, { route: '/private' });
  }

  beforeEach(() => {
    (useSelector as unknown as jest.Mock).mockImplementation(
      (selector: (state: unknown) => unknown) =>
        selector({
          settings: DEFAULT_SETTINGS,
          benchmark: DEFAULT_BENCHMARK,
          snackbar: { open: false, message: '', severity: 'info' },
          menu: { isOpen: false },
          auth: { userName: '' },
        }),
    );
    (useDispatch as unknown as jest.Mock).mockReturnValue(jest.fn());
  });
  afterEach(() => {
    accountMockUser = mockUser;
  });

  test('renders the Settings tab correctly', async () => {
    setupTest([]);
    await testAccountSettings(accountMockUser);
  });

  test('renders AccountTabs with correct profile information when user is in 0 groups', () => {
    setupTest([]);
    testStaticAccountProfile(accountMockUser);

    const groupInfo = screen.getByText(/belong to/);
    expect(groupInfo).toHaveProperty(
      'innerHTML',
      '<b>username</b> does not belong to any groups.',
    );
  });

  test('renders AccountTabs with correct profile information when user is in 1 group', () => {
    setupTest('group-one');
    testStaticAccountProfile(accountMockUser);

    const groupInfo = screen.getByText(/belongs to/);
    expect(groupInfo).toHaveProperty(
      'innerHTML',
      '<b>username</b> belongs to <b>group-one</b> group.',
    );
  });

  test('renders AccountTabs with correct profile information when user is in 2 groups', () => {
    setupTest(['first-group', 'second-group']);
    testStaticAccountProfile(accountMockUser);

    const groupInfo = screen.getByText(/belongs to/);
    expect(groupInfo).toHaveProperty(
      'innerHTML',
      '<b>username</b> belongs to <b>first-group</b> and <b>second-group</b> groups.',
    );
  });

  test('renders AccountTabs with correct profile information when user is in 3 groups', () => {
    setupTest(['group1', 'group2', 'group3']);

    testStaticAccountProfile(accountMockUser);

    const groupInfo = screen.getByText(/belongs to/);
    expect(groupInfo).toHaveProperty(
      'innerHTML',
      '<b>username</b> belongs to <b>group1</b>, <b>group2</b> and <b>group3</b> groups.',
    );
  });

  test('renders AccountTabs with correct profile information when user is in more than 3 groups', () => {
    setupTest(['g1', 'g2', 'g3', 'g4', 'g5']);

    testStaticAccountProfile(accountMockUser);

    const groupInfo = screen.getByText(/belongs to/);
    expect(groupInfo).toHaveProperty(
      'innerHTML',
      '<b>username</b> belongs to <b>g1</b>, <b>g2</b>, <b>g3</b>, <b>g4</b> and <b>g5</b> groups.',
    );
  });
});
