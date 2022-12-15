import escapeRegExp from 'lodash.escaperegexp';
import { debounce } from 'throttle-debounce';
import { axios } from '../../axios';
import { NOTION_HOST } from '../../constants';
import { storage } from '../../storage';

import {
  FILTERS_BY,
  ICON_TYPE,
  MATCH_TAG,
  SORT_BY,
  STORAGE_KEY,
  TABLE_TYPE,
} from '../constants';
import {
  BlockClass,
  createBlock,
  createRecord,
  RecordClass,
  RecordError,
} from './Record';

const PATH = '/search';
const SEARCH_LIMIT = 50;
const DEBOUNCE_TIME = 150;
const ICON_WIDTH = 40;
const REGEXP_REMOVES_TAG = new RegExp(`</?${MATCH_TAG}>`, 'ig');
const TEXT_NO_TITLE = 'Untitled'; // FIXME

// NOTE: 結合テストくらいは書きたい気がする。。
const search = async ({
  query,
  sortBy,
  filtersBy,
  savesToStorage,
  workspaceId,
}: {
  query: string;
  sortBy: string;
  filtersBy: FiltersBy;
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
      throw new Error(`unknown sortBy: ${sortBy}`);
  }
  const filterOptions: { navigableBlockContentOnly?: boolean } = {};
  for (const [key, value] of Object.entries(filtersBy)) {
    switch (key) {
      case FILTERS_BY.ONLY_TITLE:
        if (value) filterOptions.navigableBlockContentOnly = true;
        break;
      default:
        throw new Error(`unknown key: ${key}`);
    }
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
        ...filterOptions,
      },
      sort: sortOptions,
      source: 'quick_find_input_change',
    })
  ).data;

  // TODO: パースエラーを送信したい（ユーザーはこちらの想定してないタイプのobjectを扱う可能性が高いので）
  // TODO: 検証したい異常系
  //  - 空タイトルのページはどうなる？ （考えたくもないが。。。）
  //  - DB だけ ... はありえないよね？
  //  - View Page だけで DB が空 https://www.notion.so/cee680b18c474c9e9b47d246df0db729
  const recordMap = res.recordMap;
  const items: Item[] = [];
  for (const item of res.results) {
    let block: BlockClass | undefined = undefined;
    const getDir = (
      paths: Dir[],
      id: string,
      tableType: TableTypeWithoutWorkspace,
    ): Dir[] => {
      let record: RecordClass | undefined;
      try {
        record = createRecord(id, tableType, recordMap);
        if (record.canBeDir)
          paths.push({
            title: record.getTitle() || TEXT_NO_TITLE,
            record: record.record,
            tableType,
          });

        const parent = record.parent;
        if (parent.isWorkspace) return paths;

        return getDir(
          paths,
          parent.id,
          parent.tableType as TableTypeWithoutWorkspace,
        );
      } catch (error) {
        console.error(
          error,
          error instanceof RecordError
            ? error.data
            : {
                id,
                tableType,
                record,
                recordMap,
              },
        );
        return paths;
      }
    };

    // view でやるとカクつくのでここでやるしかない
    // see commit:f127999eaccfff4c1c91d98f35cbdf18f6dedf63
    const regexpAddsTag = new RegExp(
      `(${trimmedQuery
        .split(/\s+/)
        .map((query) => escapeRegExp(query))
        .join('|')})`,
      'ig',
    );
    const setMatchTag = (str: string) => {
      return trimmedQuery && str.length > 1
        ? str
            .replace(REGEXP_REMOVES_TAG, '')
            .replace(regexpAddsTag, `<${MATCH_TAG}>$1</${MATCH_TAG}>`)
        : str;
    };

    const id = item.id;

    try {
      block = createBlock(id, recordMap);
      const title = block.getTitle();

      const result: Item = {
        title: title === undefined ? TEXT_NO_TITLE : setMatchTag(title),
        text: setMatchTag(item.highlight?.text ?? ''),
        record: block.record,
        tableType: TABLE_TYPE.BLOCK,
        dirs: block.parent.isWorkspace
          ? []
          : getDir(
              [],
              block.parent.id,
              block.parent.tableType as TableTypeWithoutWorkspace,
            ).reverse(),
        url:
          `${NOTION_HOST}/${id.replaceAll('-', '')}` +
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
        const isSvg = icon.endsWith('.svg');
        if (icon.startsWith('http')) {
          result.icon = {
            type: ICON_TYPE.IMAGE,
            value:
              `${NOTION_HOST}/image/${encodeURIComponent(icon)}` +
              '?table=block' +
              `&id=${id}` +
              `&width=${ICON_WIDTH}`,
          };
        } else if (icon.startsWith('/')) {
          // svg
          result.icon = {
            type: ICON_TYPE.IMAGE,
            value: `${NOTION_HOST}${icon}&width=${ICON_WIDTH}`,
            ...(isSvg ? { className: 'svg' } : {}),
          };
        } else {
          // NOTE: 本気でやるなら、ここで絵文字以外のものが来た場合にエラーにする
          // icon は length 2 なので判定が単純ではない
          result.icon = {
            type: ICON_TYPE.EMOJI,
            value: icon,
          };
        }
      }

      items.push(result);
    } catch (error) {
      // TODO: 第 2 引数目以降も Sentry にちゃんと送信されるのかな
      console.error(error, {
        item,
        block,
        recordMap,
      });
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
