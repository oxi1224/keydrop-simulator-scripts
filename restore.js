import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import chalk from 'chalk';

const prisma = new PrismaClient();
const files = await fs.readdir('./output/cases-backup');
const chunks = [];
const chunkSize = Math.round(files.length / 5);

for (let i = 0; i < files.length; i += chunkSize) {
  const chunk = files.slice(i, i + chunkSize);
  chunks.push(chunk);
}

const categories = await fs.readdir('./output/sections-backup');

for (const categoryFileName of categories) {
  const data = await fs
    .readFile(`./output/sections-backup/${categoryFileName}`)
    .then((d) => JSON.parse(d));

  await prisma.caseSection.upsert({
    where: {
      name: data.namem,
      id: data.id
    },
    create: {
      id: data.id,
      name: data.name,
      rowSpan: data.rowSpan,
      colSpan: data.colSpan,
      ratio: data.ratio,
      position: data.position
    },
    update: {}
  });
}

for (const fileName of files) {
  const caseStartTime = new Date().getTime();
  const data = await fs.readFile(`./output/cases-backup/${fileName}`).then((d) => JSON.parse(d));
  const drops = [];

  await prisma.case.upsert({
    where: {
      websiteName: data.websiteName
    },
    update: {
      price: data.price,
      imgName: data.imgName,
      urlName: data.urlName,
      expired: data.expired
    },
    create: {
      urlName: data.urlName,
      websiteName: data.websiteName,
      price: data.price,
      expired: data.expired,
      imgName: data.imgName,
      section: {
        connect: {
          name: 'EXPIRED'
        }
      }
    }
  });

  for (const dropData of data.drops) {
    await prisma.globalInventoryItem.upsert({
      where: {
        // id: dropData.id
        weaponName_skinName_skinQuality_stattrack: {
          weaponName: dropData.weaponName,
          skinName: dropData.skinName,
          skinQuality: dropData.quality,
          stattrack: false
        }
      },
      update: {
        stattrack: false,
        skinImgSource: dropData.skinImgSource
      },
      create: {
        id: dropData.globalInvID,
        weaponName: dropData.weaponName,
        skinName: dropData.skinName,
        skinQuality: dropData.quality,
        skinPrice: dropData.skinPrice,
        skinRarity: dropData.skinRarity,
        skinImgSource: dropData.skinImgSource,
        stattrack: false
      }
    });
    const caseDrop = await prisma.caseDrop.upsert({
      where: {
        parentCase_weaponName_skinName_skinQuality: {
          parentCase: data.websiteName,
          weaponName: dropData.weaponName,
          skinName: dropData.skinName,
          skinQuality: dropData.quality
        }
      },
      update: {
        displayOdds: dropData.displayOdds,
        oddsRange: dropData.oddsRange
      },
      create: {
        id: dropData.caseDropID,
        globalInvItem: {
          connect: {
            // id: dropData.id,
            weaponName_skinName_skinQuality_stattrack: {
              weaponName: dropData.weaponName,
              skinName: dropData.skinName,
              skinQuality: dropData.quality,
              stattrack: false
            }
          }
        },
        case: {
          connect: {
            websiteName: data.websiteName
          }
        },
        displayOdds: dropData.displayOdds,
        oddsRange: dropData.oddsRange,
        priceRange: dropData.skinPriceRange,
        displayChance: dropData.skinDisplayChance
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
    // process.stdout.clearLine(0);
    // process.stdout.cursorTo(0);
    // process.stdout.write(`${data.websiteName} | item ${} of ${data.drops.length} \n`);
  }

  await prisma.case.update({
    where: {
      websiteName: data.websiteName
    },
    data: {
      drops: {
        connect: drops
      }
    }
  });

  await prisma.caseSection.update({
    where: {
      name: 'EXPIRED'
    },
    data: {
      cases: {
        connect: {
          websiteName: data.websiteName
        }
      }
    }
  });

  console.log(
    `${chalk.bold(`Successfully restored ${data.websiteName}. ${files.indexOf(fileName) + 1}/${files.length}`)} ${chalk.gray(
      `Took ${new Date().getTime() - caseStartTime}ms`
    )}`
  );
}
