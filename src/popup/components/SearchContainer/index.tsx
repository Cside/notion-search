import { AxiosError } from 'axios';
import React, { useEffect, useRef, useState } from 'react';
import {
  BooleanParam,
  StringParam,
  useQueryParam,
  withDefault,
} from 'use-query-params';
import { storage } from '../../../storage';
import { alertError } from '../../../utils';
import { SORT_BY, STORAGE_KEY } from '../../constants';
import { debouncedSearch, search } from '../../search';
import { SearchBox } from '../SearchBox';
import { Sort } from '../Sorts';
import { Filter } from './../Filters';
import { Footer } from './../Footer';
import { Items } from './../Items';
import './styles.pcss';

export const SearchContainer = ({
  isPopup,
  workspace,
}: {
  isPopup: boolean;
  workspace: Workspace;
}) => {
  const [query, setQuery] = useQueryParam(
    'query',
    withDefault(StringParam, ''),
  );
  const [sortBy, setSortBy] = useQueryParam(
    'sort_by',
    withDefault(StringParam, SORT_BY.RELEVANCE),
  );
  const [filterByOnlyTitles, setFilterOnlyTitles] = useQueryParam(
    'only_titles',
    withDefault(BooleanParam, false),
  );

  const [usedQuery, setUsedQuery] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResult | undefined>(
    undefined,
  );

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length > 0;
  const isFirstRendering = useRef(true);

  // search
  useEffect(() => {
    (async () => {
      // get cache
      if (isPopup && isFirstRendering.current) {
        isFirstRendering.current = false;

        const store = (await storage.get(
          `${workspace.id}-${STORAGE_KEY.LAST_SEARCHED}`,
        )) as SearchResultCache | undefined; // TODO: εγ¬γΌγ

        if (store) {
          setQuery(store.query);
          setUsedQuery(query);
          setSearchResult(store.searchResult);
          return;
        }
      }

      if (query.trim() === '')
        storage.remove(`${workspace.id}-${STORAGE_KEY.LAST_SEARCHED}`);

      try {
        setSearchResult(
          await (hasQuery ? debouncedSearch : search)({
            query,
            sortBy:
              !hasQuery && sortBy === SORT_BY.RELEVANCE // ad hoc: worthless condition
                ? SORT_BY.CREATED // ε₯γ« last edited γ§γθ―γγ?γ γ
                : sortBy,
            filterByOnlyTitles,
            savesToStorage: isPopup && hasQuery,
            workspaceId: workspace.id,
          }),
        );
        setUsedQuery(query);
      } catch (error) {
        alertError(
          error instanceof AxiosError ? 'Network error' : error + '',
          error,
        );
        throw error;
      }
    })();
  }, [trimmedQuery, sortBy, filterByOnlyTitles]);

  return (
    <div className={`container ${isPopup ? 'is-popup' : ''}`}>
      <main>
        <SearchBox
          query={query}
          setQuery={setQuery}
          workspaceName={workspace.name}
        />
        <Filter
          filterByOnlyTitles={filterByOnlyTitles}
          setFilterOnlyTitles={setFilterOnlyTitles}
        />
        <Sort sortBy={sortBy} setSortBy={setSortBy} />
        {searchResult && (
          <>
            <Items
              items={searchResult.items}
              isPopup={isPopup}
              query={usedQuery}
            />
          </>
        )}
        <Footer
          isPopup={isPopup}
          total={searchResult?.total || 0}
          showsSummary={!!searchResult && usedQuery.trim().length > 0}
        />
      </main>
    </div>
  );
};
