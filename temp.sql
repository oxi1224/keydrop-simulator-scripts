DELETE FROM "CaseDrop"
WHERE ctid NOT IN (
   SELECT min(ctid)                    -- ctid is NOT NULL by definition
   FROM   "CaseDrop"
   GROUP  BY "CaseDrop"."weaponName", "CaseDrop"."skinName", "CaseDrop"."skinQuality");  -- list columns defining duplicates
