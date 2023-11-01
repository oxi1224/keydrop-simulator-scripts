import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import chalk from 'chalk';
import { nanoid } from 'nanoid';

const prisma = new PrismaClient();
const files = await fs.readdir('./output/cases-backup');

for (const file of files) {
  const data = await fs.readFile('./output/cases-backup/' + file).then((d) => JSON.parse(d));
  const newData = {
    urlName: data.urlName,
    websiteName: data.websiteName,
    price: data.price,
    expired: data.expired,
    category: data.category,
    goldenCase: data.goldenCase,
    imgName: data.imgName,
    positionInGrid: data.positionInGrid,
    drops: []
  };
  for (const dropData of data.drops) {
    newData.drops.push({
      // Primary Keys
      caseDropID: dropData.caseDropID,
      globalInvID: dropData.id,
      parentCase: dropData.parentCase,

      // Item Data
      skinName: dropData.skinName,
      weaponName: dropData.weaponName,
      skinPriceRange: dropData.skinPriceRange,
      skinDisplayChance: dropData.skinDisplayChance,
      skinImgSource: dropData.skinImgSource,
      skinRarity: dropData.skinRarity,
      displayChance: dropData.skinDisplayChance,
      priceRange: dropData.skinPriceRange,
      
      // Drop Details
      quality: dropData.dropDetails.quality,
      skinPrice: dropData.dropDetails.price,
      oddsRange: dropData.dropDetails.range,
      displayOdds: dropData.dropDetails.odds,
    });
  }
  await fs.writeFile('./output/cases-backup/' + file, JSON.stringify(newData, null, 2));
}
