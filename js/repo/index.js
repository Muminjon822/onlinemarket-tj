import { CONFIG } from '../config.js';
import { LocalRepo } from './local.js';
import { ApiRepo } from './api.js';

export const repo = CONFIG.backend === 'api' ? new ApiRepo() : new LocalRepo();
