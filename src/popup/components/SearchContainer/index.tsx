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
import { debouncedSearch, EmptySearchResultsError, search } from '../../search';
import { EmptySearchResultsCallout } from '../Callout/EmptySearchResults';
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
  const [hasEmptySearchResultsError, setHasEmptySearchResultsError] =
    useState(false);

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
        )) as SearchResultCache | undefined; // TODO: 型ガード

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
        const searchResult = await (hasQuery ? debouncedSearch : search)({
          query,
          sortBy:
            !hasQuery && sortBy === SORT_BY.RELEVANCE // ad hoc: worthless condition
              ? SORT_BY.CREATED // 別に last edited でも良いのだが
              : sortBy,
          filterByOnlyTitles,
          savesToStorage: isPopup && hasQuery,
          workspaceId: workspace.id,
        });
        setSearchResult(searchResult);
        setUsedQuery(query);
        if (searchResult.total > 0) setHasEmptySearchResultsError(false);
      } catch (error) {
        if (error instanceof EmptySearchResultsError) {
          setHasEmptySearchResultsError(true);
        } else {
          alertError(
            error instanceof AxiosError ? 'Network error' : error + '',
            error,
          );
          throw error;
        }
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
        {hasEmptySearchResultsError && (
          <EmptySearchResultsCallout workspace={workspace} />
        )}
        <Filter
          filterByOnlyTitles={filterByOnlyTitles}
          setFilterOnlyTitles={setFilterOnlyTitles}
        />
        <Sort sortBy={sortBy} setSortBy={setSortBy} />
        <Items
          items={searchResult?.items || []}
          isPopup={isPopup}
          query={usedQuery}
        />
        <Footer
          isPopup={isPopup}
          total={searchResult?.total || 0}
          showsSummary={!!searchResult && usedQuery.trim().length > 0}
        />
      </main>
    </div>
  );
};
