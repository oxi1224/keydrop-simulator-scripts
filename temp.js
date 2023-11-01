import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import chalk from 'chalk';
import { nanoid } from 'nanoid';

const names = ['morcik', 'xgamer'];
const prisma = new PrismaClient();

for (const name of names) {
  const data = await fs.readFile(`./output/${name}.json`).then(str => JSON.parse(str));
  
  await prisma.caseDrop.deleteMany({
    where: {
      parentCase: data.websiteName
    }
  });
  await prisma.case.delete({
    where: {
      urlName: name
    }
  });

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
          name: 'CS:GO PREMIUM'
        }
      }
    }
  });

  const drops = [];

  for (const dropData of data.drops) {
    console.log(dropData.weaponName, dropData.skinName, dropData.dropDetails.quality)
    await prisma.globalInventoryItem.upsert({
      where: {
        // id: dropData.id
        weaponName_skinName_skinQuality_stattrack: {
          weaponName: dropData.weaponName,
          skinName: dropData.skinName,
          skinQuality: dropData.dropDetails.quality,
          stattrack: false
        }
      },
      update: {
        stattrack: false
      },
      create: {
        id: nanoid(),
        weaponName: dropData.weaponName,
        skinName: dropData.skinName,
        skinQuality: dropData.dropDetails.quality,
        skinPrice: dropData.dropDetails.price,
        skinRarity: dropData.skinRarity,
        skinImgSource: dropData.skinImgSource,
        stattrack: false
      }
    });

    const caseDropID = nanoid();

    const caseDrop = await prisma.caseDrop.upsert({
      where: {
        parentCase_weaponName_skinName_skinQuality: {
          parentCase: data.websiteName,
          weaponName: dropData.weaponName,
          skinName: dropData.skinName,
          skinQuality: dropData.dropDetails.quality
        }
      },
      update: {
        displayOdds: dropData.dropDetails.odds,
        oddsRange: dropData.dropDetails.range
      },
      create: {
        id: caseDropID,
        globalInvItem: {
          connect: {
            // id: dropData.id,
            weaponName_skinName_skinQuality_stattrack: {
              weaponName: dropData.weaponName,
              skinName: dropData.skinName,
              skinQuality: dropData.dropDetails.quality,
              stattrack: false
            }
          }
        },
        case: {
          connect: {
            websiteName: data.websiteName
          }
        },
        displayOdds: dropData.dropDetails.odds,
        oddsRange: dropData.dropDetails.range,
        priceRange: dropData.skinPriceRange,
        displayChance: dropData.skinDisplayChance
      }
    });
    const index = data.drops.map(drop => drop.id).indexOf(dropData.id);
    data.drops[index].caseDropID = caseDropID;

    drops.push({
      parentCase_weaponName_skinName_skinQuality: {
        parentCase: caseDrop.parentCase,
        weaponName: caseDrop.weaponName,
        skinName: caseDrop.skinName,
        skinQuality: caseDrop.skinQuality
      }
    });

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
        name: 'CS:GO PREMIUM'
      },
      data: {
        cases: {
          connect: {
            websiteName: data.websiteName
          }
        }
      }
    });
  }

  await fs.writeFile(`./output/cases-backup/${name}.json`, JSON.stringify(data, null, 2));
  await fs.writeFile(`./output/${name}.json`, JSON.stringify(data, null, 2));
}
