import { debounce } from 'throttle-debounce';
import { axios } from '../../axios';
import { NOTION_BASE_URL } from '../../constants';
import { storage } from '../../storage';

import { ICON_TYPE, SEARCH_LIMIT, SORT_BY, STORAGE_KEY } from '../constants';
import { Record } from './Record';
import { Block } from './Record/Block';
import { RecordError } from './Record/errors';
import { createBlock, createRecord } from './Record/factory';

const PATH = '/search';
const DEBOUNCE_TIME = 150;
const ICON_WIDTH = 40;
const TEXT_NO_TITLE = 'Untitled';

export class EmptySearchResultsError extends Error {}

export const search = async ({
  query,
  sortBy,
  filterByOnlyTitles,
  savesToStorage,
  workspaceId,
}: {
  query: string;
  sortBy: string;
  filterByOnlyTitles: boolean;
  savesToStorage: boolean;
  workspaceId: string;
}) => {
  if (!workspaceId) throw new Error('spaceId is empty');
  const trimmedQuery = query.trim();

  // このへんのテストは、UT じゃなくてフォーム含めて一気通貫で見ないと意味ない氣がする
  let sortOptions = {};
  switch (sortBy) {
    case SORT_BY.RELEVANCE:
      sortOptions = { field: 'relevance' };
      break;
    case SORT_BY.LAST_EDITED:
      sortOptions = { field: 'lastEdited', direction: 'desc' };
      break;
    case SORT_BY.CREATED:
      sortOptions = { field: 'created', direction: 'desc' };
      break;
    default:
      throw new Error(`Unknown sort option: ${sortBy}`);
  }

  const res = (
    await axios.post<SearchApiResponse>(PATH, {
      type: 'BlocksInSpace',
      query: trimmedQuery,
      spaceId: workspaceId,
      limit: SEARCH_LIMIT,
      filters: {
        isDeletedOnly: false,
        excludeTemplates: false,
        isNavigableOnly: false,
        requireEditPermissions: false,
        ancestors: [],
        createdBy: [],
        editedBy: [],
        lastEditedTime: {},
        createdTime: {},
        ...(filterByOnlyTitles ? { navigableBlockContentOnly: true } : {}),
      },
      sort: sortOptions,
      source: 'quick_find_input_change',
    })
  ).data;

  if (query === '' && res.results.length === 0) {
    throw new EmptySearchResultsError(); // 1 件も記事のない ws でも起こりうる
  }

  const recordMap = res.recordMap;
  const items: Item[] = [];
  for (const item of res.results) {
    let block: Block | undefined = undefined;

    const getDir = (
      paths: Dir[],
      id: string,
      tableType: TableTypeWithoutWorkspace,
    ): Dir[] => {
      let record: Record | undefined;
      try {
        record = createRecord(id, tableType, recordMap);
        if (record.canBeDir)
          paths.push({
            title: record.getTitle() || TEXT_NO_TITLE,
            block: record.record as Response.Block, // Collection は canBeDir == false なので問題ない
          });

        const parent = record.parent;
        if (parent.isWorkspace) return paths;

        return getDir(
          paths,
          parent.id,
          parent.tableType as TableTypeWithoutWorkspace,
        );
      } catch (error) {
        // parent_id が生えてることはまず無い(エラーのほぼ全てはクラス生成前のバリデーションなので)
        // ので、これ以上親は探索しない
        console.error(
          error,
          error instanceof RecordError
            ? error.data
            : {
                id,
                tableType,
                record: JSON.stringify(record),
              },
        );
        console.info({ record, recordMap });
        return paths;
      }
    };

    const id = item.id;

    try {
      block = createBlock(id, recordMap);

      const result: Item = {
        title: block.getTitle() ?? TEXT_NO_TITLE,
        text: item.highlight?.text,
        block: block.record,
        dirs: block.parent.isWorkspace
          ? []
          : getDir(
              [],
              block.parent.id,
              block.parent.tableType as TableTypeWithoutWorkspace,
            ).reverse(),
        url:
          `${NOTION_BASE_URL}/${id.replaceAll('-', '')}` +
          (item.highlightBlockId
            ? `#${item.highlightBlockId.replaceAll('-', '')}`
            : ''),
        icon: {
          type: ICON_TYPE.IMAGE,
          value: chrome.runtime.getURL('./images/page.svg'),
        },
      };

      const icon = block.getIcon();
      if (icon) {
        if (icon.startsWith('http')) {
          // uploaded by user
          result.icon = {
            type: ICON_TYPE.IMAGE,
            value:
              `${NOTION_BASE_URL}/image/${encodeURIComponent(icon)}?` +
              new URLSearchParams({
                table: 'block',
                id,
                width: String(ICON_WIDTH),
              }),
          };
        } else if (icon.startsWith('/')) {
          // custom svg
          result.icon = {
            type: ICON_TYPE.IMAGE,
            value: `${NOTION_BASE_URL}${icon}`,
          };
        } else {
          // NOTE: 本気でやるなら、ここで絵文字以外のものが来た場合にエラーにする
          // emoji は length 2 なので判定が単純ではない
          result.icon = {
            type: ICON_TYPE.EMOJI,
            value: icon,
          };
        }
      }

      items.push(result);
    } catch (error) {
      console.error(error, {
        item: JSON.stringify(item),
        block: JSON.stringify(block),
      });
      console.info({ item, block, recordMap });
    }
  }

  const searchResult: SearchResult = {
    items,
    total: res.total,
  };

  if (savesToStorage) {
    const data: SearchResultCache = { query, searchResult };
    // set に失敗しても致命的ではない (前回の検索結果が表示されなくなるだけ) なので、エラーハンドリングしない
    storage.set({
      [`${workspaceId}-${STORAGE_KEY.LAST_SEARCHED}`]: data,
    });
  }

  return searchResult;
};

export const debouncedSearch = debounce(search, DEBOUNCE_TIME);
