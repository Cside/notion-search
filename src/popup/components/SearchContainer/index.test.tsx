import { act, cleanup, render } from '@testing-library/react';
import React from 'react';

import { $, userEventSetup } from '../../../../test/helpers';
import { axios } from '../../../axios';
import { BLOCK_TYPE, SORT_BY, TABLE_TYPE } from '../../constants';
import * as emptySearchResultsCallout from '../Callout/EmptySearchResults';
import { QueryParamProvider } from '../QueryParamProvider';
import { SearchContainer } from '../SearchContainer';

beforeEach(() => {
  jest
    .spyOn(emptySearchResultsCallout, 'EmptySearchResultsCallout')
    .mockReturnValue(<></>);
});

afterEach(() => {
  cleanup();
});

beforeAll(() => {
  jest.useFakeTimers(); // debounce 対策
  // Object のインスタンスは spy できないので
});
afterAll(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const renderAndWaitEffect = async (component: JSX.Element) => {
  const result = await act(() => render(component));
  // debounce 対策。await act が待てるのは setState と非同期処理だけで、タイマーまでは進めない
  await act(() => jest.runOnlyPendingTimers());
  return result;
};

test('filter options', async () => {
  const user = userEventSetup({
    advanceTimers: jest.runOnlyPendingTimers,
  });
  const spy = jest
    .spyOn(axios, 'post')
    .mockResolvedValue({ data: { results: [], total: 0 } });

  await renderAndWaitEffect(
    <QueryParamProvider>
      <SearchContainer
        isPopup={false}
        workspace={{ id: 'space-id', name: 'space-name' }}
      />
    </QueryParamProvider>,
  );

  const elem = $('.test-filter-only-title');
  expect(elem).not.toHaveClass('selected');

  // やや冗長だが、spy.mock.lastCall を比較するよりも、コケた場合の出力が親切（そもそも何回呼ばれたとか教えてくれる）
  expect(spy).toHaveBeenLastCalledWith(
    expect.any(String),
    expect.not.objectContaining({
      filters: expect.objectContaining({ navigableBlockContentOnly: true }),
    }),
  );

  await user.click(elem);
  expect(elem).toHaveClass('selected');

  expect(spy).toHaveBeenLastCalledWith(
    expect.any(String),
    expect.objectContaining({
      filters: expect.objectContaining({ navigableBlockContentOnly: true }),
    }),
  );
});

test('sort options', async () => {
  const user = userEventSetup({
    advanceTimers: jest.runOnlyPendingTimers,
  });
  const spy = jest
    .spyOn(axios, 'post')
    .mockResolvedValue({ data: { results: [], total: 0 } });

  await renderAndWaitEffect(
    <QueryParamProvider>
      <SearchContainer
        isPopup={false}
        workspace={{ id: 'space-id', name: 'space-name' }}
      />
    </QueryParamProvider>,
  );

  const input = $<HTMLInputElement>('.query');
  const select = $<HTMLSelectElement>('.sorts');
  expect(select.value).toBe(SORT_BY.RELEVANCE);

  for (const {
    input: { query, selection },
    expected,
  } of [
    {
      input: {
        query: 'test',
        selection: SORT_BY.LAST_EDITED,
      },
      expected: { field: 'lastEdited', direction: 'desc' },
    },
    {
      input: {
        query: 'test',
        selection: SORT_BY.CREATED,
      },
      expected: { field: 'created', direction: 'desc' },
    },
    {
      input: {
        query: 'test',
        selection: SORT_BY.RELEVANCE,
      },
      expected: { field: 'relevance' },
    },
    {
      input: {
        query: '',
        selection: SORT_BY.RELEVANCE,
      },
      expected: { field: 'created', direction: 'desc' },
    },
  ]) {
    if (query === '') {
      await user.clear(input);
    } else {
      await user.type(input, query);
    }
    await user.selectOptions(select, selection);
    expect(select).toHaveValue(selection);
    expect(spy).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        sort: expect.objectContaining(expected),
      }),
    );
  }
});

describe('gets last search result', () => {
  const query = 'test';
  const user = userEventSetup({
    advanceTimers: jest.runOnlyPendingTimers,
  });
  const blockId = 'block-id';

  beforeEach(() => {
    jest.spyOn(axios, 'post').mockResolvedValue({
      data: {
        results: [{ id: blockId }],
        recordMap: {
          block: {
            [blockId]: {
              value: {
                id: blockId,
                parent_id: 'parent-id',
                parent_table: TABLE_TYPE.WORKSPACE,
                type: BLOCK_TYPE.PAGE,
              },
            },
          },
        },
        total: 1,
      },
    });
  });

  test.each([
    { input: false, expected: '' },
    { input: true, expected: query },
  ])('isPopup: $input', async ({ input, expected }) => {
    const container = (
      <QueryParamProvider>
        <SearchContainer
          isPopup={input}
          workspace={{ id: 'space-id', name: 'space-name' }}
        />
      </QueryParamProvider>
    );

    const { unmount } = await act(() => renderAndWaitEffect(container));
    let inputElem = $<HTMLInputElement>('.query');
    expect(inputElem).toHaveValue('');

    await user.type(inputElem, query);
    unmount();

    history.replaceState(null, '', '/');

    await act(() => render(container));
    inputElem = $<HTMLInputElement>('.query');
    expect(inputElem).toHaveValue(expected);
    /* eslint  jest/no-conditional-expect: 0 */
    if (expected) {
      expect($<HTMLInputElement>(`.test-item-${blockId}`)).toBeInTheDocument();
    }
  });
});
