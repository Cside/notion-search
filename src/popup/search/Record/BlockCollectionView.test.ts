import { BLOCK_TYPE, TABLE_TYPE } from '../../constants';
import { BlockCollectionView } from '../Record/BlockCollectionView';
import { Collection } from '../Record/Collection';

const BLOCK: Response.Block = {
  id: 'block-id',
  parent_id: 'parent-block-id',
  parent_table: TABLE_TYPE.BLOCK,
  type: BLOCK_TYPE.PAGE,
};

const COLLECTION: Response.Collection = {
  id: 'collection-id',
  parent_id: 'parent-collection-id',
  parent_table: TABLE_TYPE.BLOCK,
};

describe('getTitle()', () => {
  test.each([
    {
      name: 'gets a title from a block (a collction is specified, but the block is preferred)',
      input: {
        block: { properties: { title: [['foo']] } },
        collection: new Collection({
          collection: {
            ...COLLECTION,
            name: [['bar']],
          },
        }),
      },
      expected: 'foo',
    },
    {
      name: 'gets a title from a block (a collction is specified, but has no icon)',
      input: {
        block: { properties: { title: [['foo']] } },
        collection: new Collection({
          collection: COLLECTION,
        }),
      },
      expected: 'foo',
    },
    {
      name: 'gets a title from a block (collection is omitted)',
      input: {
        block: { properties: { title: [['foo']] } },
      },
      expected: 'foo',
    },
    {
      name: 'gets a title from a collection',
      input: {
        block: {},
        collection: new Collection({
          collection: {
            ...COLLECTION,
            name: [['bar']],
          },
        }),
      },
      expected: 'bar',
    },
    {
      name: 'no title in a block nor a collection (a collction is specified, but has no icon)',
      input: {
        block: {},
        collection: new Collection({
          collection: COLLECTION,
        }),
      },
      expected: undefined,
    },
    {
      name: 'no title in a block nor a collection (collection is omitted)',
      input: {
        block: {},
      },
      expected: undefined,
    },
  ])('$name', ({ input: { block, collection }, expected }) => {
    expect(
      new BlockCollectionView({
        block: {
          ...BLOCK,
          ...block,
        },
        ...(collection ? { collection: collection } : {}),
      }).getTitle(),
    ).toBe(expected);
  });
});

describe('getIcon()', () => {
  test.each([
    {
      name: 'gets a icon from a block (a collction is specified, but the block is preferred)',
      input: {
        block: { format: { page_icon: 'https://example.com/icon.png' } },
        collection: new Collection({
          collection: {
            ...COLLECTION,
            icon: 'https://example.com/icon2.svg',
          },
        }),
      },
      expected: 'https://example.com/icon.png',
    },
    {
      name: 'gets a icon from a block (a collction is specified, but has no icon)',
      input: {
        block: { format: { page_icon: 'https://example.com/icon.png' } },
        collection: new Collection({
          collection: COLLECTION,
        }),
      },
      expected: 'https://example.com/icon.png',
    },
    {
      name: 'gets a icon from a block (collection is omitted)',
      input: {
        block: { format: { page_icon: 'https://example.com/icon.png' } },
      },
      expected: 'https://example.com/icon.png',
    },
    {
      name: 'gets a icon from a collection',
      input: {
        block: {},
        collection: new Collection({
          collection: {
            ...COLLECTION,
            icon: 'https://example.com/icon2.svg',
          },
        }),
      },
      expected: 'https://example.com/icon2.svg',
    },
    {
      name: 'no icon in a block nor a collection (a collction is specified, but has no icon)',
      input: {
        block: {},
        collection: new Collection({
          collection: COLLECTION,
        }),
      },
      expected: undefined,
    },
    {
      name: 'no icon in a block nor a collection (collection is omitted)',
      input: {
        block: {},
      },
      expected: undefined,
    },
  ])('$name', ({ input: { block, collection }, expected }) => {
    expect(
      new BlockCollectionView({
        block: {
          ...BLOCK,
          ...block,
        },
        ...(collection ? { collection: collection } : {}),
      }).getIcon(),
    ).toBe(expected);
  });
});
