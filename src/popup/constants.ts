// TODO: ファイル分割
// ========================================
// search options
// ========================================
export const SEARCH_LIMIT = 50;
export const MATCH_TAG = 'gzkNfoUU';

export const SORT_BY = {
  RELEVANCE: 'relevance',
  LAST_EDITED: 'last-edited',
  CREATED: 'created',
} as const;

// ========================================
// API response
// ========================================

/*
  table type | block type
  -----------|----------------------
  collection |
  block -----┬- page
             ├- collection_view_page
             ├- collection_view
             └- ...
*/

export const TABLE_TYPE = {
  WORKSPACE: 'space',
  BLOCK: 'block',
  COLLECTION: 'collection', // parent のみ
} as const;

// NOTE: ここに追加したら、テストも追加。あと popup.pcss のクラスにも一応追加
export const BLOCK_TYPE = {
  PAGE: 'page',
  COLLECTION_VIEW_PAGE: 'collection_view_page',
  COLLECTION_VIEW: 'collection_view',
  COLUMN_LIST: 'column_list',
  COLUMN: 'column',
} as const;

// default is true
export const CAN_BE_DIR = {
  COLLECTION: false,
  BLOCK: {
    [BLOCK_TYPE.PAGE]: true,
    [BLOCK_TYPE.COLLECTION_VIEW_PAGE]: true,
    [BLOCK_TYPE.COLLECTION_VIEW]: true,
    [BLOCK_TYPE.COLUMN_LIST]: false,
    [BLOCK_TYPE.COLUMN]: false,
  },
} as const satisfies {
  COLLECTION: boolean;
  BLOCK: {
    [key in valueOf<typeof BLOCK_TYPE>]: boolean;
  };
};

// ========================================
// Others
// ========================================

export const STORAGE_KEY = {
  LAST_SEARCHED: 'LAST_SEARCHED',
} as const;

export const ICON_TYPE = {
  IMAGE: 'image',
  EMOJI: 'emoji',
} as const;
