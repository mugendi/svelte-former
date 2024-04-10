/**
 * Copyright (c) 2024 Anthony Mugendi
 * 
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

// Latin-1 Supplement
// upper case ranges
// [À-ÖØ-ß]
// lower case ranges
// [à-öø-ÿ]

export const magicSplit = /^[a-zà-öø-ÿ]+|[A-ZÀ-ÖØ-ß][a-zà-öø-ÿ]+|[a-zà-öø-ÿ]+|[0-9]+|[A-ZÀ-ÖØ-ß]+(?![a-zà-öø-ÿ])/g
export const spaceSplit = /\S+/g

/**
 * A string.matchAll function that will return an array of "string parts" and the indexes at which it split each part
 */
export function getPartsAndIndexes(string, splitRegex) {
  const result = { parts: [], prefixes: [] }
  const matches = string.matchAll(splitRegex)

  let lastWordEndIndex = 0
  for (const match of matches) {
    if (typeof match.index !== "number") continue

    const word = match[0]
    result.parts.push(word)

    const prefix = string.slice(lastWordEndIndex, match.index).trim()
    result.prefixes.push(prefix)

    lastWordEndIndex = match.index + word.length
  }
  const tail = string.slice(lastWordEndIndex).trim()
  if (tail) {
    result.parts.push("")
    result.prefixes.push(tail)
  }

  return result
}

/**
 * A function that splits a string on words and returns an array of words.
 * - It can prefix each word with a given character
 * - It can strip or keep special characters, this affects the logic for adding a prefix as well
 */
export function splitAndPrefix(string, options) {
  const { keepSpecialCharacters = false, keep, prefix = "" } = options || {}
  const normalString = string.trim().normalize("NFC")
  const hasSpaces = normalString.includes(" ")
  const split = hasSpaces ? spaceSplit : magicSplit
  const partsAndIndexes = getPartsAndIndexes(normalString, split)

  return partsAndIndexes.parts
    .map((_part, i) => {
      let foundPrefix = partsAndIndexes.prefixes[i] || ""
      let part = _part

      if (keepSpecialCharacters === false) {
        if (keep) {
          part = part
            .normalize("NFD")
            .replace(new RegExp(`[^a-zA-ZØßø0-9${keep.join("")}]`, "g"), "")
        }
        if (!keep) {
          part = part.normalize("NFD").replace(/[^a-zA-ZØßø0-9]/g, "")
          foundPrefix = ""
        }
      }

      if (keep && foundPrefix) {
        foundPrefix = foundPrefix.replace(
          new RegExp(`[^${keep.join("")}]`, "g"),
          ""
        )
      }

      // the first word doesn't need a prefix, so only return the found prefix
      if (i === 0) {
        // console.log(`foundPrefix → `, foundPrefix)
        return foundPrefix + part
      }

      if (!foundPrefix && !part) return ""

      if (!hasSpaces) {
        // return the found prefix OR fall back to a given prefix
        return (foundPrefix || prefix) + part
      }

      // space based sentence was split on spaces, so only return found prefixes
      if (!foundPrefix && prefix.match(/\s/)) {
        // in this case we have no more found prefix, it was trimmed, but we're looking to add a space
        // so let's return that space
        return " " + part
      }
      return (foundPrefix || prefix) + part
    })
    .filter(Boolean)
}

/**
 * Capitalises a single word
 * @returns the word with the first character in uppercase and the rest in lowercase
 */
export function capitaliseWord(string) {
  const match = string.matchAll(magicSplit).next().value
  const firstLetterIndex = match ? match.index : 0
  return (
    string.slice(0, firstLetterIndex + 1).toUpperCase() +
    string.slice(firstLetterIndex + 1).toLowerCase()
  )
}


/**
 * # 🐪 camelCase
 * converts a string to camelCase
 * - first lowercase then all capitalised
 * - *strips away* special characters by default
 *
 * @example
 *   camelCase('$catDog') === 'catDog'
 * @example
 *   camelCase('$catDog', { keepSpecialCharacters: true }) === '$catDog'
 */
export function camelCase(string, options) {
  return splitAndPrefix(string, options).reduce((result, word, index) => {
    return index === 0 || !(word[0] || "").match(magicSplit)
      ? result + word.toLowerCase()
      : result + capitaliseWord(word)
  }, "")
}

/**
 * # 🐫 PascalCase
 * converts a string to PascalCase (also called UpperCamelCase)
 * - all capitalised
 * - *strips away* special characters by default
 *
 * @example
 *   pascalCase('$catDog') === 'CatDog'
 * @example
 *   pascalCase('$catDog', { keepSpecialCharacters: true }) === '$CatDog'
 */
export function pascalCase(string, options) {
  return splitAndPrefix(string, options).reduce((result, word) => {
    return result + capitaliseWord(word)
  }, "")
}

/**
 * # 🐫 UpperCamelCase
 * converts a string to UpperCamelCase (also called PascalCase)
 * - all capitalised
 * - *strips away* special characters by default
 *
 * @example
 *   upperCamelCase('$catDog') === 'CatDog'
 * @example
 *   upperCamelCase('$catDog', { keepSpecialCharacters: true }) === '$CatDog'
 */
export const upperCamelCase = pascalCase

/**
 * # 🥙 kebab-case
 * converts a string to kebab-case
 * - hyphenated lowercase
 * - *strips away* special characters by default
 *
 * @example
 *   kebabCase('$catDog') === 'cat-dog'
 * @example
 *   kebabCase('$catDog', { keepSpecialCharacters: true }) === '$cat-dog'
 */
export function kebabCase(string, options) {
  return splitAndPrefix(string, { ...options, prefix: "-" })
    .join("")
    .toLowerCase()
}

/**
 * # 🐍 snake_case
 * converts a string to snake_case
 * - underscored lowercase
 * - *strips away* special characters by default
 *
 * @example
 *   snakeCase('$catDog') === 'cat_dog'
 * @example
 *   snakeCase('$catDog', { keepSpecialCharacters: true }) === '$cat_dog'
 */
export function snakeCase(string, options) {
  return splitAndPrefix(string, { ...options, prefix: "_" })
    .join("")
    .toLowerCase()
}

/**
 * # 📣 CONSTANT_CASE
 * converts a string to CONSTANT_CASE
 * - underscored uppercase
 * - *strips away* special characters by default
 *
 * @example
 *   constantCase('$catDog') === 'CAT_DOG'
 * @example
 *   constantCase('$catDog', { keepSpecialCharacters: true }) === '$CAT_DOG'
 */
export function constantCase(string, options) {
  return splitAndPrefix(string, { ...options, prefix: "_" })
    .join("")
    .toUpperCase()
}

/**
 * # 🚂 Train-Case
 * converts strings to Train-Case
 * - hyphenated & capitalised
 * - *strips away* special characters by default
 *
 * @example
 *   trainCase('$catDog') === 'Cat-Dog'
 * @example
 *   trainCase('$catDog', { keepSpecialCharacters: true }) === '$Cat-Dog'
 */
export function trainCase(string, options) {
  return splitAndPrefix(string, { ...options, prefix: "-" })
    .map(word => capitaliseWord(word))
    .join("")
}

/**
 * # 🕊 Ada_Case
 * converts a string to Ada_Case
 * - underscored & capitalised
 * - *strips away* special characters by default
 *
 * @example
 *   adaCase('$catDog') === 'Cat_Dog'
 * @example
 *   adaCase('$catDog', { keepSpecialCharacters: true }) === '$Cat_Dog'
 */
export function adaCase(string, options) {
  return splitAndPrefix(string, { ...options, prefix: "_" })
    .map(part => capitaliseWord(part))
    .join("")
}

/**
 * # 👔 COBOL-CASE
 * converts a string to COBOL-CASE
 * - hyphenated uppercase
 * - *strips away* special characters by default
 *
 * @example
 *   cobolCase('$catDog') === 'CAT-DOG'
 * @example
 *   cobolCase('$catDog', { keepSpecialCharacters: true }) === '$CAT-DOG'
 */
export function cobolCase(string, options) {
  return splitAndPrefix(string, { ...options, prefix: "-" })
    .join("")
    .toUpperCase()
}

/**
 * # 📍 Dot.notation
 * converts a string to dot.notation
 * - adds dots, does not change casing
 * - *strips away* special characters by default
 *
 * @example
 *   dotNotation('$catDog') === 'cat.Dog'
 * @example
 *   dotNotation('$catDog', { keepSpecialCharacters: true }) === '$cat.Dog'
 */
export function dotNotation(string, options) {
  return splitAndPrefix(string, { ...options, prefix: "." }).join("")
}

/**
 * # 📂 Path/case
 * converts a string to path/case
 * - adds slashes, does not change casing
 * - *keeps* special characters by default
 *
 * @example
 *   pathCase('$catDog') === '$cat/Dog'
 * @example
 *   pathCase('$catDog', { keepSpecialCharacters: false }) === 'cat/Dog'
 */
export function pathCase(string, options = { keepSpecialCharacters: true }) {
  return splitAndPrefix(string, options).reduce((result, word, i) => {
    const prefix = i === 0 || word[0] === "/" ? "" : "/"
    return result + prefix + word
  }, "")
}

/**
 * # 🛰 Space case
 * converts a string to space case
 * - adds spaces, does not change casing
 * - *keeps* special characters by default
 *
 * @example
 *   spaceCase('$catDog') === '$cat Dog'
 * @example
 *   spaceCase('$catDog', { keepSpecialCharacters: false }) === 'cat Dog'
 */
export function spaceCase(string, options = { keepSpecialCharacters: true }) {
  return splitAndPrefix(string, { ...options, prefix: " " }).join("")
}

/**
 * # 🏛 Capital Case
 * converts a string to Capital Case
 * - capitalizes words and adds spaces
 * - *keeps* special characters by default
 *
 * @example
 *   capitalCase('$catDog') === '$Cat Dog'
 * @example
 *   capitalCase('$catDog', { keepSpecialCharacters: false }) === 'Cat Dog'
 *
 * ⟪ if you do not want to add spaces, use `pascalCase()` ⟫
 */
export function capitalCase(string, options = { keepSpecialCharacters: true }) {
  return splitAndPrefix(string, { ...options, prefix: " " }).reduce(
    (result, word) => {
      return result + capitaliseWord(word)
    },
    ""
  )
}


export function titleCase(string, options = { keepSpecialCharacters: true }) {
    let arr = splitAndPrefix(string, { ...options, prefix: " " })
    
    return  capitaliseWord(arr[0]) + arr.slice(1).join("").toLowerCase()
  }

/**
 * # 🔡 lower case
 * converts a string to lower case
 * - makes words lowercase and adds spaces
 * - *keeps* special characters by default
 *
 * @example
 *   lowerCase('$catDog') === '$cat dog'
 * @example
 *   lowerCase('$catDog', { keepSpecialCharacters: false }) === 'cat dog'
 *
 * ⟪ if you do not want to add spaces, use the native JS `toLowerCase()` ⟫
 */
export function lowerCase(string, options = { keepSpecialCharacters: true }) {
  return splitAndPrefix(string, { ...options, prefix: " " })
    .join("")
    
}

/**
 * # 🔠 UPPER CASE
 * converts a string to UPPER CASE
 * - makes words upper case and adds spaces
 * - *keeps* special characters by default
 *
 * @example
 *   upperCase('$catDog') === '$CAT DOG'
 * @example
 *   upperCase('$catDog', { keepSpecialCharacters: false }) === 'CAT DOG'
 *
 * ⟪ if you do not want to add spaces, use the native JS `toUpperCase()` ⟫
 */
export function upperCase(string, options = { keepSpecialCharacters: true }) {
  return splitAndPrefix(string, { ...options, prefix: " " })
    .join("")
    .toUpperCase()
}
