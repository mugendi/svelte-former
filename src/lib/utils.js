/**
 * Copyright (c) 2024 Anthony Mugendi
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */
import pTimeout from './p-timeout';

export let formInputTypes = ['input', 'select', 'textarea', 'richtext', 'autocomplete'];

const magicSplit =
  /^[a-zà-öø-ÿ]+|[A-ZÀ-ÖØ-ß][a-zà-öø-ÿ]+|[a-zà-öø-ÿ]+|[0-9]+|[A-ZÀ-ÖØ-ß]+(?![a-zà-öø-ÿ])/g;

/**
 * Capitalises a single word
 * @returns the word with the first character in uppercase and the rest in lowercase
 */
export function capitaliseWord(string) {
  if (!string) return '';

  const match = string.matchAll(magicSplit).next().value;
  const firstLetterIndex = match ? match.index : 0;
  return (
    string.slice(0, firstLetterIndex + 1).toUpperCase() +
    string.slice(firstLetterIndex + 1).toLowerCase()
  );
}

export function labelText(control) {
  let label;
  if (control.label) {
    label = control.label.text || control.label;
  } else {
    label = capitaliseWord(control.attributes.name);
  }

  return label;
}

export function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function triggerChange(control) {
  let event = new Event('change');
  let element = control.node || control;

  element.dispatchEvent(event);
}

export async function waitForAll(waitFor) {
  // timeout if we wait for too long
  return await pTimeout(_waitForAll(waitFor), {
    milliseconds: 10000,
  });
}

async function _waitForAll(waitFor) {
  waitFor = arrify(waitFor).filter((v) => typeof v == 'string');
  while (waitFor.filter((v) => !window[v]).length > 0) {
    await delay(100);
  }
}

function arrify(v) {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

function delay(time = 1000) {
  return new Promise((resolve) => setTimeout(resolve, time));
}
