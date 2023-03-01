import data from './output/broad-copy.json' assert { type: 'json' };
import fs from 'fs/promises';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const files = await fs.readdir('./output/cases-backup/');

for (const fileName of files) {
  const fileData = await fs
    .readFile(`./output/cases-backup/${fileName}`)
    .then((d) => JSON.parse(d));
  const caseData = await prisma.case.findFirst({
    where: {
      urlName: fileName.replace('.json', '')
    },
    include: {
      section: true
    }
  });
  fileData.category = caseData.category;
  await fs.writeFile(`./output/cases-backup/${fileName}`, JSON.stringify(fileData, null, 2));
}
