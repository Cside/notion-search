import React from 'react';
import { SEARCH_LIMIT } from '../constants';

export default function Total({ total }: { total: number | undefined }) {
  const handleClickSettings = async (
    event: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
  ) => {
    chrome.runtime.openOptionsPage();
    event.preventDefault();
  };
  return (
    <div className="footer">
      <div className="summary">
        {typeof total !== 'undefined' && (
          <>
            {total > SEARCH_LIMIT && (
              <>
                <span className="total">{SEARCH_LIMIT}</span> of{' '}
              </>
            )}
            <span className="total">{total}</span> results
          </>
        )}
      </div>
      <div className="settings">
        <a href="#" onClick={handleClickSettings}>
          <img
            className="icon-settings"
            src={chrome.runtime.getURL('./images/settings.svg')}
          />
          <span>Settings</span>
        </a>
      </div>
    </div>
  );
}
