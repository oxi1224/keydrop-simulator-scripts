import Puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import chalk from 'chalk';
import * as util from './util.js';
import { nanoid } from 'nanoid';

const stealth = StealthPlugin();
export const prisma = new PrismaClient();
stealth.enabledEvasions.delete('user-agent-override');
Puppeteer.use(stealth);

const goldenNames = ['gold-digger', 'foster', 'shark', 'rubin-rain', 'predator', 'ruby', 'amethyst-light', 'optimal', 'atum', 'wrap', 'solar', 'diamond-sky', 'samurai', 'wind', 'emerald-cut', 'recon', 'topaz', 'bony', 'magent', 'assault'];
const storedCases = (await prisma.case.findMany()).map((c) => c.websiteName);
const caseSections = (await prisma.caseSection.findMany()).map((cs) => cs.id);
const additionalData = new Map();
const availableCases = [];
const caseSectionConnectData = [];
const links = [];

(async () => {
  // Browset setup
  const browser = await Puppeteer.launch({
    headless: false,
    executablePath: '/Program Files/Google/Chrome/Application/chrome.exe',
    timeout: 0,
    userDataDir: './user_data',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-infobars',
      '--ignore-certifcate-errors',
      '--ignore-certifcate-errors-spki-list',
      '--window-size=1920,1080'
    ]
  });
  const page = await browser.newPage();
  await page.setRequestInterception(true);

  page.on('request', (request) => {
    if (request.resourceType() === 'image') {
      request.abort();
    } else {
      request.continue();
    }
  });
  await page.goto('https://key-drop.com/pl/');
  await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => null);
  // return;
  // await page.click('a.w-26', { button: 'left', clickCount: 1, delay: 50 });
  await page.waitForSelector('div > section', { timeout: 5000 }).catch(() => null);
  await page.evaluate(() => (document.cookie = 'currency=PLN'));
  await page.reload({ waitUntil: 'networkidle0', timeout: 5000 }).catch(() => null);
  // return;
  // Reset relations on all CaseSections
  for (const caseSection of caseSections) {
    if (caseSection == 'expired') continue;
    await prisma.caseSection.update({
      where: {
        id: caseSection
      },
      data: {
        cases: {
          set: []
        }
      }
    });
  }

  // Get event cases
  const eventCases = [];
  await page.$$('.case-grid__item').then(async (caseArr) => {
    for (let i = 0; i < caseArr.length; i++) {
      const c = caseArr[i];
      const url = await util.getProperty(c, '.case__link', 'href');
      if (!url) continue;
      const name = await util.getProperty(c, '.case__name', 'textContent');
      const src = await util.getProperty(c, '.case__img', 'src');

      additionalData.set(name, {
        imgName: src.replace('https://key-drop.com/uploads/skins/', 'https://raw.githubusercontent.com/oxi1224/images/main/').replace('jpg', 'webp').replace('png', 'webp'),
        positionInGrid: i
      });
      eventCases.push({
        urlName: url.replace('https://key-drop.com/pl/skins/category/', '')
      });
      availableCases.push(name);
      links.push(url);
    }
  });
  
  caseSectionConnectData.push({ 
    id: 'event',
    cases: eventCases
  });

  await prisma.caseSection.upsert({
    where: {
      id: 'event'
    },
    create: {
      id: 'event',
      name: 'EVENT',
      rowSpan: 2,
      colSpan: 5,
      position: 0,
      ratio: '1.12'
    },
    update: {}
  });

  // Create event and expired CaseSection backups
  await util.createBackup(
    'event',
    {
      id: 'event',
      name: 'EVENT',
      rowSpan: 2,
      colSpan: 5,
      position: 0,
      ratio: '1.12'
    },
    'section'
  );

  await util.createBackup(
    'event',
    {
      id: 'expired',
      name: 'EXPIRED',
      rowSpan: 0,
      colSpan: 0,
      position: 1000,
      ratio: '1'
    },
    'section'
  );

  const sectionIds = await page.$$('div > section').then(async (arr) => {
    const rArr = [];
    for (const section of arr) rArr.push(await section.evaluate((elm) => elm.id));
    return rArr.filter((id) => !['games', 'kings-game'].includes(id) && id);
  });

  // Gather all currently available case links and additional info
  for (const id of sectionIds) {
    const category = await util.getProperty(page, `#${id} > div`, 'textContent');
    const colCount = await page
      .$(`#${id} .grid`)
      .then(async (elm) => {
        return await elm.evaluate((e) => getComputedStyle(e).getPropertyValue('grid-template-columns'));
      })
      .then((str) => str.split(' ').length);

    const rowCount = await page
      .$(`#${id} .grid`)
      .then(async (elm) => {
        return await elm.evaluate((e) => getComputedStyle(e).getPropertyValue('grid-template-rows'));
      })
      .then((str) => str.split(' ').length);

    const classList = await util.getProperty(page, `#${id} .grid div`, 'classList');
    const ratio = Object.values(classList)
      .filter((str) => str.startsWith('aspect-[1/'))[0]
      ?.replace('aspect-[1/', '')
      .replace(']', '');
    const casesToConnect = [];
    const cases = await page.$$(`#${id} > div.grid > ${id === 'holo-cases' ? 'div' : 'div.relative'}`);

    for (let i = 0; i < cases.length; i++) {
      const c = cases[i];
      const url = await util.getProperty(c, 'a', 'href');
      const name = await util.getProperty(c, 'div.text-white.font-normal.uppercase', 'textContent');
      const srcsetRaw = await util.getProperty(c, id === 'holo-cases' ? 'img.min-h-0' : 'a > img', 'srcset');
      const src = srcsetRaw.split('\n')[2].replace('2x', '').trim(); // srcsetRaw.replace('png', 'webp').replace('jpg', 'webp').replace('https://key-drop.com/uploads/skins/', 'https://raw.githubusercontent.com/oxi1224/images/main/');
      availableCases.push(name);
      links.push(url);
      additionalData.set(name, {
        imgName: src,
        positionInGrid: i
      });
      casesToConnect.push({
        urlName: url.replace('https://key-drop.com/pl/skins/category/', '')
      });
    }

    caseSectionConnectData.push({
      id: id,
      cases: casesToConnect
    });

    await prisma.caseSection.upsert({
      where: {
        id: id
      },
      create: {
        id: id,
        name: category,
        rowSpan: rowCount,
        colSpan: colCount,
        ratio: ratio ?? '1',
        position: sectionIds.indexOf(id) + 1,
      },
      update: {
        rowSpan: rowCount,
        colSpan: colCount,
        ratio: ratio ?? '1',
        position: sectionIds.indexOf(id) + 1
      }
    });

    // Create backups of each section
    await util.createBackup(
      id,
      {
        id: id,
        name: category,
        rowSpan: rowCount,
        colSpan: colCount,
        ratio: ratio ?? '1',
        position: sectionIds.indexOf(id) + 1
      },
      'section'
    );
  }

  // Update expired cases
  const expiredCases = [];
  for (const caseName of storedCases) {
    if (availableCases.includes(caseName)) continue;
    const isExpired = (await prisma.case.findFirst({ where: { websiteName: caseName } })).expired;
    if (isExpired) continue;

    expiredCases.push({
      websiteName: caseName
    });

    const updatedCase = await prisma.case.update({
      where: {
        websiteName: caseName
      },
      data: {
        expired: true,
        positionInGrid: 0,
      }
    });

    const data = await fs
      .readFile(`./output/cases-backup/${updatedCase.urlName}.json`)
      .then((d) => JSON.parse(d));

    data.expired = true;
    data.category = 'expired';
    data.positionInGrid = 0;
    await util.createBackup(updatedCase.urlName, data, 'case');
    console.log(`Set ${caseName} to expired`);
  }

  // Connect expired cases
  await prisma.caseSection.update({
    where: {
      name: 'EXPIRED'
    },
    data: { 
      cases: {
        connect: expiredCases
      }
    }
  });

  links.splice(11, 999);
  // links.splice(15, 999);
  // links.splice(16, 999);
  // links.splice(0, 999);
  // Main loop
  for (const link of links) {
    const startTime = new Date().getTime();

    // Page setup
    const page = await browser.newPage();

    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (request.resourceType() === 'image') {
        request.abort();
      } else {
        request.continue();
      }
    });

    page.setDefaultTimeout(0);
    page.goto(link);
    await page.waitForNavigation({ timeout: 5000 }).catch(() => null);
    await page.evaluate(() => (document.cookie = 'currency=PLN'));
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => null);
    if ((page.url()) === 'https://key-drop.com/pl/') continue;
    await page.waitForSelector('ul > li.css-ik2bl7', { timeout: 5000 }).catch(() => null);

    const skins = await page.$$('ul > li.css-ik2bl7');
    const name = (page.url()).replace('https://key-drop.com/pl/skins/category/', '');
    const websiteName = await util.getProperty(
      page,
      'h2.px-6.mx-auto.text-xl.font-semibold.leading-tight.text-center.text-white.uppercase',
      'textContent'
    );
    
    await page.waitForNetworkIdle({ timeout: 5000 }).catch(() => null);
    const price = await page
      .waitForSelector('.ga_openButtonLoser')
      .then((el) => el.evaluate((elm) => elm.textContent))
      .then((str) => util.clean(str, 'price'));

    const bonusData = additionalData.get(websiteName);
    const dropData = [];
    const drops = [];

    await prisma.case.upsert({
      where: {
        websiteName: websiteName
      },
      update: {
        price: price,
        imgName: bonusData.imgName,
        positionInGrid: bonusData.positionInGrid,
        expired: false,
        urlName: name
      },
      create: {
        urlName: name,
        websiteName: websiteName,
        price: price,
        positionInGrid: bonusData.positionInGrid,
        imgName: bonusData.imgName,
        expired: false,
        goldenCase: goldenNames.includes(name)
      }
    });

    await prisma.caseDrop.deleteMany({
      where: {
        parentCase: websiteName
      }
    });

    for (const container of skins) {
      // const stattrack = !!(await c.$('div.text-orange-500.css-6plnry'))

      const skinName = await util
        .getProperty(container, 'div.css-1vba4yg', 'textContent')
        .then((str) => util.clean(str, 'string'));

      const skinWeapon = await util
        .getProperty(container, 'div.text-white.css-6plnry', 'textContent')
        .then((str) => util.clean(str, 'string'));

      const skinPriceRange = await util
        .getProperty(container, 'div.text-gold.css-6plnry', 'textContent')
        .then((str) => util.clean(str, 'string'));

      const skinDisplayChance = await util
        .getProperty(container, 'div.css-1f31obc', 'textContent')
        .then((str) => util.clean(str, 'string'))

      const skinImgSource = await util.getProperty(
        container,
        'img.transform.object-contain.duration-300.ease-in-out.pointer-events-none.col-start-1.row-start-1.mt-6',
        'srcset'
      ).then(str => str.split('\n')[2].replace('2x', '').trim());
      const rarityHandle = await container.$('img.css-96c4l3');
      const skinRarity = await getSkinColor(rarityHandle).then((str) => util.clean(str, 'string'));

      await container
        .$('button.css-5mrvkg')
        .then(async (btn) => await btn.evaluate((b) => b.click()));

      const detailsContainer = await container.$('div.css-15kssi9');
      const rawDetailsArray = await detailsContainer
        .$$('div:not(.text-white)')
        .then(async (arr) => {
          const rArr = [];
          for (const elm of arr) rArr.push(await elm.evaluate((e) => e.textContent));
          return rArr;
        });

      for (let i = 0; i < rawDetailsArray.length; i += 4) {
        const range = rawDetailsArray[i + 2]
          .replace(/\s+/g, '')
          .split('-')
          .map((num) => parseInt(num));

        const price = util.clean(rawDetailsArray[i + 1], 'price');

        const updatedGLobalInvItem = await prisma.globalInventoryItem.upsert({
          where: {
            weaponName_skinName_skinQuality_stattrack: {
              weaponName: skinWeapon,
              skinName: skinName,
              skinQuality: rawDetailsArray[i],
              stattrack: false
            }
          },
          update: {
            skinPrice: price,
            skinImgSource: skinImgSource
          },
          create: {
            id: nanoid(),
            weaponName: skinWeapon,
            skinName: skinName,
            skinQuality: rawDetailsArray[i],
            skinPrice: price,
            skinRarity: skinRarity,
            skinImgSource: skinImgSource,
            stattrack: false
          }
        });

        const caseDropID = nanoid();

        dropData.push({
          caseDropID: caseDropID,
          globalInvID: updatedGLobalInvItem.id,
          skinName: skinName,
          weaponName: skinWeapon,
          skinPriceRange: skinPriceRange,
          skinDisplayChance: skinDisplayChance.replace('Szansa', ''),
          skinImgSource: skinImgSource,
          skinRarity: skinRarity,
          quality: rawDetailsArray[i],
          skinPrice: price,
          oddsRange: range,
          displayOdds: rawDetailsArray[i + 3]
        });

        const caseDrop = await prisma.caseDrop.upsert({
          where: {
            parentCase_weaponName_skinName_skinQuality: {
              parentCase: websiteName,
              weaponName: skinWeapon,
              skinName: skinName,
              skinQuality: rawDetailsArray[i]
            }
          },
          update: {
            skinPrice: price,
            displayOdds: rawDetailsArray[i + 3],
            oddsRange: range,
            priceRange: skinPriceRange,
            displayChance: skinDisplayChance.replace('Szansa', '')
          },
          create: {
            id: caseDropID,
            globalInvItem: {
              connect: {
                id: updatedGLobalInvItem.id
                // weaponName_skinName_skinQuality_stattrack: {
                //   weaponName: skinWeapon,
                //   skinName: skinName,
                //   skinQuality: rawDetailsArray[i],
                //   stattrack: false
                // }
              }
            },
            case: {
              connect: {
                websiteName: websiteName
              }
            },
            displayOdds: rawDetailsArray[i + 3],
            oddsRange: range,
            priceRange: skinPriceRange,
            displayChance: skinDisplayChance.replace('Szansa', '')
          }
        });

        drops.push({
          parentCase_weaponName_skinName_skinQuality: {
            parentCase: caseDrop.parentCase,
            weaponName: caseDrop.weaponName,
            skinName: caseDrop.skinName,
            skinQuality: caseDrop.skinQuality
          }
        });
      }
    }

    console.log(
      `${chalk.bold(`Page ${links.indexOf(link) + 1}/${links.length} done`)} ${chalk.gray(
        `Took ${new Date().getTime() - startTime}ms`
      )}`
    );

    await page.close();
    // await prisma.case.update({
    //   where: {
    //     websiteName: websiteName
    //   },
    //   data: {
    //     drops: {
    //       connect: drops
    //     }
    //   }
    // });
    
    await util.createBackup(
      name,
      {
        urlName: name,
        websiteName: websiteName,
        price: price,
        expired: false,
        drops: dropData,
        category: bonusData.category,
        imgName: bonusData.imgName,
        positionInGrid: bonusData.positionInGrid
      },
      'case'
    );
    await new Promise((r) => setTimeout(r, 10000));
  }

  for (const data of caseSectionConnectData) {
    await prisma.caseSection.update({
      where: {
        id: data.id
      },
      data: {
        cases: {
          connect: data.cases
        }
      }
    });
  }
  
  browser.close();
})();

async function getSkinColor(elementHandle) {
  const classlist = await elementHandle.evaluate((e) => e.classList);
  return Object.values(classlist)
    .filter((style) => /text-.+/.test(style))[0]
    .replace('text-', '');
}
