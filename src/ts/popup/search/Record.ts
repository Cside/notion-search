// NOTE: このファイルに仕様のメモはしない。 するなら apiResponse.d.ts に

import { BLOCK_TYPE, CAN_BE_DIR, TABLE_TYPE } from '../constants';

export class RecordError extends Error {
  data: object;
  constructor(message: string, data: object) {
    super(message);
    this.name = this.constructor.name;
    this.data = data;
  }
}
class RecordNotFoundError extends RecordError {}
class RecordTypeError extends RecordError {}

const getBlock = (recordMap: RecordMap, id: string): Block | undefined =>
  recordMap.block[id]?.value;

const getCollection = (
  recordMap: RecordMap,
  id: string,
): Collection | undefined => recordMap.collection?.[id]?.value;

export abstract class RecordClass {
  public abstract record: Block | Collection;
  public parent: {
    id: string;
    tableType: TableType;
    isWorkspace: boolean;
  } = { id: '', tableType: TABLE_TYPE.BLOCK, isWorkspace: false }; // meanless
  public canBeDir = true;

  public abstract getTitle(): string | undefined;
  public abstract getIcon(): string | undefined;
  protected setParent() {
    this.parent = {
      id: this.record.parent_id,
      tableType: this.record.parent_table as TableType,
      isWorkspace: this.record.parent_table === TABLE_TYPE.WORKSPACE,
    };
  }
}

export class CollectionClass extends RecordClass {
  public record: Collection;
  constructor({ collection }: { collection: Collection }) {
    super();
    this.record = collection;
    this.setParent();
    this.canBeDir = CAN_BE_DIR.COLLECTION;
  }
  public getTitle() {
    return this.record.name?.map((array) => array[0]).join('');
  }
  public getIcon() {
    return this.record.icon;
  }
}

export class BlockClass extends RecordClass {
  public record: Block;
  constructor({ block }: { block: Block }) {
    super();
    this.record = block;
    this.setParent();

    // 未知でも、とりあえず通す
    if (!Object.hasOwn(CAN_BE_DIR.BLOCK, block.type)) {
      console.warn(`Unknown block type: ${block.type}`, {
        block,
      });
      this.canBeDir = false;
    } else {
      this.canBeDir = CAN_BE_DIR.BLOCK[block.type];
    }
  }
  public getTitle() {
    // item.highlight.title は変な文字列交じることあるので使わない
    // ex) https://www.notion.so/c89a4d6f5d484b62be0e35c2f3ae2d99
    //   title: <gzkNfoUU>Grade</gzkNfoUU> Calculator dev.notion.so/notion/Academic-Mission-Control-f541b37eabc049429a7e37b74bf73594
    // block.properties?.title はキャッシュされるので、しばらく古い結果が出るけど。。。
    return this.record.properties?.title.map((array) => array[0]).join('');
  }
  public getIcon() {
    return this.record.format?.page_icon;
  }
}

// combines collection view page and collection view
export class BlockCollectionViewClass extends BlockClass {
  collection?: CollectionClass;
  constructor({
    block,
    collection,
  }: {
    block: Block;
    collection?: CollectionClass;
  }) {
    super({ block });
    this.collection = collection;
  }
  public getTitle() {
    return super.getTitle() ?? this.collection?.getTitle();
  }
  public getIcon() {
    // collection が icon を持つケースは https://www.notion.so/4897c80a8baa4c4d92617e1f627121bf とか
    // cvp 全部がそうというわけでなく、 format.page_icon があるやつもある
    return super.getIcon() ?? this.collection?.getIcon();
  }
}

export const createRecord = (
  id: string,
  tableType: TableType,
  recordMap: RecordMap,
): RecordClass => {
  switch (tableType) {
    case TABLE_TYPE.WORKSPACE:
      throw new RecordTypeError(`Can't handle a workspace`, {
        id,
        tableType,
        recordMap,
      });

    // only parent
    case TABLE_TYPE.COLLECTION: {
      const collection = getCollection(recordMap, id);
      if (!collection) {
        throw new RecordNotFoundError(
          `Collection (id:${id}) is not found in recordMap.collection`,
          {
            id,
            tableType,
            recordMap,
          },
        );
      }
      return new CollectionClass({ collection });
    }
    case TABLE_TYPE.BLOCK: {
      const block = getBlock(recordMap, id);
      if (!block) {
        throw new RecordNotFoundError(
          `Block (id:${id}) is not found in recordMap.block`,
          {
            id,
            tableType,
            recordMap,
          },
        );
      }
      if (!Object.values(BLOCK_TYPE).includes(block.type)) {
        // コード側では、CVP かそれ以外か、で扱ってるので、問題なく扱える可能性もある。
        // ので、処理は中断しない
        console.warn(`Unknown block type: ${block.type}`, {
          id,
          tableType,
          block,
          recordMap,
        });
      }

      switch (block.type) {
        case BLOCK_TYPE.COLLECTION_VIEW_PAGE:
        case BLOCK_TYPE.COLLECTION_VIEW: {
          let collection: Collection | undefined = undefined;
          if (block.collection_id) {
            collection = getCollection(recordMap, block.collection_id);
            if (!collection) {
              throw new RecordNotFoundError(
                `block.collection_id exists, but collection_id:${block.collection_id} is not found in recordMap.collection`,
                {
                  id,
                  tableType,
                  block,
                  recordMap,
                },
              );
            }
          }
          return new BlockCollectionViewClass({
            block,
            ...(collection
              ? { collection: new CollectionClass({ collection }) }
              : {}),
          });
        }
        default:
          return new BlockClass({ block });
      }
    }
    default:
      throw new RecordTypeError(`Unknown table type: ${tableType}`, {
        id,
        tableType,
        recordMap,
      });
  }
};

export const createBlock = (id: string, recordMap: RecordMap) => {
  const record = createRecord(id, TABLE_TYPE.BLOCK, recordMap);
  if (!(record instanceof BlockClass))
    // 今の実装では起こり得ない。保険
    throw new RecordError('Not a block', {
      id,
      record,
      recordMap,
    });

  return record as BlockClass;
};