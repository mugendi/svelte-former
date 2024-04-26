/**
 * Copyright (c) 2024 Anthony Mugendi
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import { writable } from 'svelte/store';

export const currentControl = writable({});
export const Errors = writable({});
export const Values = writable({});