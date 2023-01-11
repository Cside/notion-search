import { AxiosError } from 'axios';
import { NOTION_BASE_URL } from './constants';

export const alertError = (message: string, error: unknown) => {
  if (error instanceof AxiosError && error.response?.status === 401) {
    if (confirm('You must log in to Notion.\nGo to Notion and log in?'))
      window.open(`${NOTION_BASE_URL}/login`);
    return;
  }
  alert(message);
};
