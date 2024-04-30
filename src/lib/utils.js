/**
 * Copyright (c) 2024 Anthony Mugendi
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

export let formInputTypes = ['input', 'select', 'textarea', 'richtext'];

const magicSplit =
  /^[a-zà-öø-ÿ]+|[A-ZÀ-ÖØ-ß][a-zà-öø-ÿ]+|[a-zà-öø-ÿ]+|[0-9]+|[A-ZÀ-ÖØ-ß]+(?![a-zà-öø-ÿ])/g;

/**
 * Capitalises a single word
 * @returns the word with the first character in uppercase and the rest in lowercase
 */
export function capitaliseWord(string) {
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
