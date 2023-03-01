/* eslint-disable no-control-regex */
import fs from 'fs/promises';

/**
 * @param {import('puppeteer').ElementHandle<any>} parentHandle
 * @param {string} selector
 * @param {string} propertyName
 */
export async function getProperty(parentHandle, selector, propertyName) {
  const res = await parentHandle
    .$(selector)
    .then(async (elm) => await elm?.evaluate((e, propertyName) => e[propertyName], propertyName));
  return res;
}

/**
 * @param {string} input
 * @param {"price"|"imgSource"|"urlName"|"string"} type
 * @returns string|number
 */
export function clean(input, type) {
  if (type === 'price') {
    return parseFloat(
      input
        .replace('PLN', '')
        .replace(',', '.')
        .replace(' ', '')
        .replace(/[^\x00-\x7F]/g, '')
        .trim()
    );
  } else if (type === 'imgSource') {
    return input
      .replace('png', 'webp')
      .replace('jpg', 'webp')
      .replace(/[^\x00-\x7F]/g, '')
      .trim();
  } else if (type === 'urlName') {
    return input
      .replace('https://key-drop.com/pl/skins/category', '')
      .replace(/[^\x00-\x7F]/g, '')
      .trim();
  } else if (type === 'string') {
    return input.replace(/[^\x00-\x7F]/g, '').trim();
  }
}

/**
 * @param {string} name
 * @param {Object} data
 * @param {"section"|"case"} type
 */
export async function createBackup(name, data, type) {
  let path;
  if (type == 'section') path = './output/sections-backup/';
  if (type == 'case') path = './output/cases-backup/';
  await fs.writeFile(path + name + '.json', JSON.stringify(data, null, 2));
}
