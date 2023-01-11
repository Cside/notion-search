import axios from 'axios';
import { setupCache } from 'axios-cache-interceptor';
import { NOTION_BASE_URL } from './constants';

const API_BASE_URL = `${NOTION_BASE_URL}/api/v3`;
const CACHE_TIME = 1 * 60 * 1_000;
const TIMEOUT = 10_000;

const AxiosInstance = setupCache(
  axios.create({
    baseURL: API_BASE_URL,
    timeout: TIMEOUT,
  }),
  {
    ttl: CACHE_TIME,
    methods: ['get', 'post'],
  },
);

export { AxiosInstance as axios };
