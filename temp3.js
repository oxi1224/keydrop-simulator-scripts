import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import chalk from 'chalk';

const prisma = new PrismaClient();
const files = await fs.readdir('./output/cases-backup');

for (const fileName of files) {
  const data = await fs.readFile(`./output/a/${fileName}`).catch(e => null).then((d) => JSON.parse(d));
  if (!data) continue;
  let drops = [];
  console.log(fileName);
  const caseData = await prisma.case.update({
    where: {
      urlName: data.urlName
    },
    data: {
      drops: {
        set: []
      }
    }
  }).catch(() => null);
  if (!caseData) continue;
  for (const drop of data.drops) {
    const dbCaseDrop = await prisma.caseDrop.upsert({
      where: {
        weaponName_skinName_skinQuality: {
          weaponName: drop.weaponName,
          skinName: drop.skinName,
          skinQuality: drop.quality
        }
      },
      update: {},
      create: {
        id: drop.caseDropID,
        displayChance: drop.skinDisplayChance,
        displayOdds: drop.displayOdds,
        priceRange: drop.skinPriceRange,
        oddsRange: drop.oddsRange,
        globalInvItem: {
          connectOrCreate: {
            where: {
              weaponName_skinName_skinQuality_stattrack: {
                weaponName: drop.weaponName,
                skinName: drop.skinName,
                skinQuality: drop.quality,
                stattrack: false
              }
            },
            create: {
              id: drop.globalInvID,
              weaponName: drop.weaponName,
              skinName: drop.skinName,
              skinQuality: drop.quality,
              skinPrice: drop.skinPrice,
              skinRarity: drop.skinRarity,
              skinImgSource: drop.skinImgSource,
              stattrack: false
            }
          }
        }
      }
    });

    const { caseDropID, ...dropData } = drop;
    drops.push({
      caseDropID: dbCaseDrop.id,
      ...dropData
    });
 
    await prisma.case.update({
      where: {
        urlName: data.urlName
      },
      data: {
        drops: {
          connect: {
            id: dbCaseDrop.id
          }
        }
      }
    });
  }

  data.drops = drops;
  await fs.writeFile(`./output/a/${fileName}`, JSON.stringify(data, null, 2));
}
