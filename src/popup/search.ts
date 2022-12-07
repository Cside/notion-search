import { debounce } from 'throttle-debounce';
import { NOTION_HOST } from '../constants';
import { axios } from '../utils/axios';

import {
  FiltersBy,
  ICON_TYPE,
  MATCH_TAG,
  SortBy,
  STORAGE_KEY,
} from './constants';

const PATH = '/search';
const SEARCH_LIMIT = 50;
const DEBOUNCE_TIME = 150;
const ICON_WIDTH = 40;

type Res = {
  results: {
    id: string;
    highlight?: {
      text: string;
      title?: string;
    };
    highlightBlockId?: string;
    analytics?: object;
  }[];
  recordMap: {
    block: {
      [id: string]: {
        value: {
          properties: {
            title: string[][];
          };
          parent_id?: string;
          format?: {
            page_icon?: string;
          };
        };
      };
    };
  };
  total: number;
};

// TODO: 結合テストくらいは書きたい気がする。。
const search = async ({
  query,
  sortBy,
  filtersBy,
  savesLastSearchResult,
  spaceId,
}: {
  query: string;
  sortBy: string;
  filtersBy: FiltersBy;
  savesLastSearchResult: boolean;
  spaceId: string;
}) => {
  if (!spaceId) throw new Error('spaceId is empty');

  let sortOptions = {};
  switch (sortBy) {
    case SortBy.RELEVANCE:
      sortOptions = { field: 'relevance' };
      break;
    case SortBy.LAST_EDITED:
      sortOptions = { field: 'lastEdited', direction: 'desc' };
      break;
    case SortBy.CREATED:
      sortOptions = { field: 'created', direction: 'desc' };
      break;
    default:
      throw new Error(`unknown sortBy: ${sortBy}`);
  }
  const filterOptions: { navigableBlockContentOnly?: boolean } = {};
  for (const [key, value] of Object.entries(filtersBy)) {
    switch (key) {
      case FiltersBy.TITLE_ONLY:
        if (value) filterOptions.navigableBlockContentOnly = true;
        break;
      default:
        throw new Error(`unknown key: ${key}`);
    }
  }

  const res = (
    await axios.post<Res>(PATH, {
      type: 'BlocksInSpace',
      query,
      spaceId,
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

  const items: Item[] = [];
  for (const data of res.results) {
    try {
      const id = data.id;
      const recordMap = res.recordMap;
      const record = recordMap.block[id].value;
      const result: Item = { title: '', url: '' };
      const regexpRemovesTag = new RegExp(`</?${MATCH_TAG}>`, 'ig');
      const regexpAddsTag = new RegExp(
        `(${query.split(/\s+/).join('|')})`,
        'ig',
      );

      const getParentPath = (paths: string[], parentId: string): string[] => {
        if (!recordMap.block[parentId]) return paths;

        const record = recordMap.block[parentId].value;
        paths.push(record.properties.title.map((array) => array[0]).join(''));
        if (!record.parent_id) return paths;
        return getParentPath(paths, record.parent_id);
      };
      if (record.parent_id) {
        const parentPaths = getParentPath([], record.parent_id);
        if (parentPaths.length >= 1)
          result.parentsPath = parentPaths.reverse().join(' / ');
      }

      const pageIcon = record.format?.page_icon;
      if (pageIcon) {
        result.pageIcon = pageIcon.startsWith('http')
          ? {
              type: ICON_TYPE.IMAGE,
              value:
                `${NOTION_HOST}/image/${encodeURIComponent(pageIcon)}` +
                '?table=block' +
                `&id=${id}` +
                `&width=${ICON_WIDTH}`,
            }
          : {
              type: ICON_TYPE.EMOJI,
              value: pageIcon,
            };
      }

      result.url = `${NOTION_HOST}/${id.replaceAll('-', '')}`;
      result.title = data.highlight?.title
        ? data.highlight.title
        : record.properties.title.map((array) => array[0]).join('');

      if (data.highlight && data.highlightBlockId) {
        result.url += `#${data.highlightBlockId.replaceAll('-', '')}`;
        result.text = data.highlight.text;
      }
      const setStrangeNotionTag = (str: string) =>
        query
          ? str
              .replace(regexpRemovesTag, '')
              .replace(regexpAddsTag, `<${MATCH_TAG}>$1</${MATCH_TAG}>`)
          : str;
      if (result.title) result.title = setStrangeNotionTag(result.title);
      if (result.text) result.text = setStrangeNotionTag(result.text);

      items.push(result);
    } catch (error) {
      console.error(`Cannot parse item. ` + error, data);
      continue;
    }
  }
  const searchResult: SearchResult = {
    items,
    total: res.total,
  };

  if (savesLastSearchResult) {
    const data: SearchResultCache = { query, searchResult };
    try {
      await chrome.storage.local.set({
        [STORAGE_KEY.LAST_SEARCHED]: data,
      });
    } catch (error) {
      throw new Error(`chrome.storage.local.set() failed. error: ${error}`);
    }
  }

  return searchResult;
};

export const debouncedSearch = debounce(search, DEBOUNCE_TIME);
