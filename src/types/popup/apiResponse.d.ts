// NOTE: このファイルに仕様のメモはしない。 するなら constants.ts に

type TableType = valueOf<typeof import('../../popup/constants').TABLE_TYPE>;
type TableTypeWithoutWorkspace = Exclude<
  TableType,
  typeof import('../../popup/constants').TABLE_TYPE.WORKSPACE
>;
type BlockType = valueOf<typeof import('../../popup/constants').BLOCK_TYPE>;

declare namespace Response {
  type Item = {
    id: string;
    highlight?: {
      text?: string;
    };
    highlightBlockId?: string;
  };

  type RecordBase = {
    id: string;
    parent_id: string;
    parent_table: TableType;
    format?: {
      page_icon?: string;
    };
    properties?: {
      title: string[][];
    };
  };

  type Collection = RecordBase & {
    name?: string[][];
    icon?: string;
  };

  type BlockTypeCollectionViewPage =
    typeof import('../../popup/constants').BLOCK_TYPE.COLLECTION_VIEW_PAGE;
  type BlockTypeCollectionView =
    typeof import('../../popup/constants').BLOCK_TYPE.COLLECTION_VIEW;

  type Block = RecordBase & {
    format?: {
      page_icon?: string;
    };
  } & (
      | {
          type: Exclude<
            BlockType,
            BlockTypeCollectionViewPage | BlockTypeCollectionView
          >;
        }
      | {
          type: BlockTypeCollectionViewPage | BlockTypeCollectionView;
          // 無い場合もある（その場合はアイコン取得不可。。。）
          // ex) https://www.notion.so/cside/63e92fc56afe463386ea800f82e37ce8
          collection_id?: string;
        }
    );

  type RecordMap = {
    // API に type: BlocksInSpace と要求してるので、欠落することはない
    block: {
      [id: string]: {
        value: Block;
      };
    };
    collection?: {
      [id: string]: {
        value: Collection;
      };
    };
  };
}

type SearchApiResponse = {
  results: Response.Item[];
  recordMap: Response.RecordMap;
  total: number;
};

type GetWorkspacesApiResponse = {
  [userId: string]: {
    space: {
      [spaceId: string]: {
        value: {
          name: string;
        };
      };
    };
    space_view: {
      [id: string]: {
        value: {
          private_pages: string[];
          space_id: string; // TODO: userId を使う実装になったら不要になる
        };
      };
    };
  };
};
