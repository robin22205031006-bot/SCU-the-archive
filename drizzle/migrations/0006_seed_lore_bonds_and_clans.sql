insert into entities(kind,name,description) select 'bloodline',n,d from (values
 ('Dragonic','Dragon bloodline carried by Freya, Gabriel and their son Arthur.'),
 ('Elf Clan','Elven lineage of the Nature Guardian Nytheris.'),
 ('Beast Clan','Beast lineage recorded for Aariz Maddox.')) v(n,d)
 where not exists (select 1 from entities e where e.name=v.n);
with m(c,g) as (values
 ('Tedmond Duskmoor','Duskmoor'),('Silas Duskmoor','Duskmoor'),('Rowan Colloway','Duskmoor'),('Ramiz Duskmoor','Duskmoor'),
 ('Ramiz Al-Ahd','Al-Ahd'),('Valeria','Al-Ahd'),('Anna Al-Ahd','Al-Ahd'),('Issabela Al-Ahd','Al-Ahd'),('Rahim Al-Ahd','Al-Ahd'),
 ('Altan El-Mansur','El-Mansur'),('David','El-Mansur'),('Zayn Hayes','El-Mansur'),('Weston Hale','El-Mansur'),
 ('Mashiho Kurohana','Kurohana'),('Kensho Arashi','Kurohana'),('Yoshiko Arashi','Kurohana'),('Kazumi Kurahana','Kurohana'),
 ('Mashiho Kurohana','Kara'),('Kensho Arashi','Kara'),('Yoshiko Arashi','Kara'),('Kazumi Kurahana','Kara'),
 ('Damian Brown','Aldercrest'),('Eldrich Aldercrest','Aldercrest'),('Soa Aldercrest','Aldercrest'),('Steven Aldercrest','Aldercrest'),
 ('Norman','Demon clan'),('Nur','Demon clan'),('Elizabeth Pristine','Demon clan'),('Khalid','Demon clan'),
 ('Silas Eldercrest','Eldercrest'),
 ('Arthur','Dragonic'),('Freya','Dragonic'),('Gabriel','Dragonic'),('Elizabeth Pristine','Dragonic'),
 ('Nytheris','Elf Clan'),('Aariz Maddox','Beast Clan'),
 ('Marcello Corvani','ECAP'),('Marcello Corvani','Corvani''s Redline Team'),('Samuel Sterling','ECAP'),('Samuel Sterling','DEW'))
insert into entity_memberships(character_id,group_id,status)
select a.id,b.id,'member' from m join entities a on a.name=m.c and a.kind='character' join entities b on b.name=m.g and b.kind<>'character'
where not exists (select 1 from entity_memberships x where x.character_id=a.id and x.group_id=b.id);
with r(s,t,rel,l) as (values
 ('Freya','Arthur','parent',null),('Gabriel','Arthur','parent',null),
 ('Altan El-Mansur','David','parent',null),('Altan El-Mansur','Zayn Hayes','parent',null),('Zayn Hayes','David','sibling','Elder and younger sons of Altan'),
 ('Ramiz Al-Ahd','Anna Al-Ahd','parent',null),('Ramiz Al-Ahd','Issabela Al-Ahd','parent',null),('Anna Al-Ahd','Issabela Al-Ahd','sibling',null),
 ('Tedmond Duskmoor','Silas Duskmoor','parent',null),('Kensho Arashi','Yoshiko Arashi','parent',null),('Kensho Arashi','Kazumi Kurahana','parent',null),
 ('Khalid','Elizabeth Pristine','parent',null),('Freya','Elizabeth Pristine','parent',null),
 ('Zaan','Ethan','ancestor','Maternal line'),('Khalid','Ethan','ancestor','Paternal line'),('Zaan','Elizah','ancestor','Maternal line'),('Khalid','Elizah','ancestor','Paternal line'),
 ('Silas Duskmoor','Rowan Colloway','mentor','Silas taught Rowan, his student and blood; Rowan later defeated him'),
 ('Arthur','Rowan Colloway','rival','Arthur beat Rowan in a catastrophic battle and tried to recruit him; Rowan refused'),
 ('Arthur','Silas Duskmoor','rival','Arthur killed a sick, weakened Silas'),
 ('Marcello Corvani','Orion','mentor','Corvani recruited Orion and mentored him at ECAP'))
insert into entity_relations(source_id,target_id,rel,label)
select a.id,b.id,r.rel,r.l from r join entities a on a.name=r.s and a.kind='character' join entities b on b.name=r.t and b.kind='character'
on conflict do nothing;