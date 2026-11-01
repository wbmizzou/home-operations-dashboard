-- One-time import of the "Outdoor Projects" Google Sheet (cleaned).
-- Cleaning rules: "DIY or Hire" -> NULL (undecided); seasons split into a list
-- ("Not winter" -> Spring/Summer/Fall); exact dates -> target_date, everything
-- else (years, quarters, "After drainage") -> target_note; dependency text goes
-- into notes, with real links only where unambiguous; costs were blank in the sheet.
insert into public.categories (name) values
  ('Structural'),('Drainage'),('Exterior'),('HVAC'),('Lawn'),('Landscaping'),('Outbuilding'),('Patio Renovation')
on conflict do nothing;

with src (title, category, priority, seasons, diy_hire, owner, status, target_date, target_note, next_action, notes, recurrence_months) as (values
 ('Fix crawlspace supports','Structural',1,'{Anytime}','Hire','Joint','Complete',null,'2026','Review structural quote and scope','Protects the structure; confirm whether engineer input is needed.',null),
 ('Fix carport gutter flooding','Drainage',1,'{Fall,Winter,Spring}','Hire','Will','Scheduled','2026-11-02',null,'Get drainage/gutter company quotes','Likely route the carport downspout safely into the yard or drainage system.',null),
 ('Fix front downspout by rose bush','Drainage',1,'{Anytime}','Hire','Joint','Scheduled','2026-11-02',null,'Measure extension and discharge location','Move water farther from the foundation without damaging the rose bush.',null),
 ('Route backyard rainwater with stone drain','Drainage',2,'{Fall,Winter}','Hire','Joint','Getting Quotes',null,'2026–2027','Get landscape drainage proposals','Depends on: coordinate with carport drainage. Prevent washout; consider a dry creek bed, swale, or stone-lined drain.',null),
 ('Seal cracks at base of brick','Exterior',2,'{Spring,Fall}',null,'Joint','Complete',null,'2027','Have cracks assessed before sealing','Depends on: complete drainage review first. Do not simply seal active or structural cracks without confirming cause.',null),
 ('Clean and service HVAC systems','HVAC',2,'{Spring}','Hire','Will','Recurring',null,'Annual','Schedule annual tune-up','Include coils, condensate lines, airflow, and both systems.',12),
 ('Aerate and establish lawn','Lawn',2,'{Fall}',null,'Joint','Wishlist',null,'After drainage','Identify grass type and lawn plan','Depends on: complete heavy drainage work first. Exact Atlanta timing depends on whether the lawn is cool- or warm-season grass.',null),
 ('Replace all pine straw','Landscaping',3,'{Spring,Fall}',null,'Joint','Wishlist',null,'After drainage','Measure bed square footage','Depends on: finish drainage, pruning, and bed cleanup. Install after disruptive work so it is not immediately disturbed.',null),
 ('Sand and paint gray back deck','Exterior',3,'{Spring,Fall}',null,'Will','Not Started',null,'2027','Inspect boards and choose coating','Depends on: complete repairs; choose dry-weather window. Clean, sand, prime as needed, and use an exterior deck product.',null),
 ('Rebuild shed and roof','Outbuilding',2,'{Spring,Fall}',null,'Joint','Researching',null,'Future','Assess repair versus rebuild','Depends on: confirm scope and drainage around shed. Separate roof-only repair from full rebuild if that helps budgeting.',null),
 ('Buy patio couch','Patio Renovation',3,'{Anytime}','Purchase','Joint','Complete',null,'After deck','Measure patio and set budget','Delay until deck and drainage work are finished.',null),
 ('Build firepit area','Outbuilding',4,'{Anytime}',null,'Joint','Wishlist',null,'2027',null,null,null),
 ('Zoysia Grass in Backyard','Lawn',3,'{Spring,Summer,Fall}','Hire','Will','Wishlist',null,'2027',null,'Season in sheet: not winter.',null),
 ('Paint outside of house',null,4,'{}','Hire',null,'Not Started',null,'2027',null,null,null),
 ('Redo carport closet',null,3,'{}',null,null,'Not Started',null,'Q4',null,null,null),
 ('Yard maintenance',null,3,'{}',null,null,'Complete',null,'Q3',null,null,null),
 ('Living room rug & chair',null,1,'{}','Purchase',null,'Complete',null,'Aug 2026',null,null,null),
 ('Bathroom vanities',null,3,'{}','Purchase',null,'Complete',null,'Aug 2026',null,null,null),
 ('Kitchen light fixtures',null,3,'{}','Purchase',null,'Complete',null,'Aug 2026',null,null,null),
 ('Downstairs TV',null,3,'{}','Purchase',null,'Complete',null,'Aug 2026',null,null,null),
 ('Patio TV',null,3,'{}','Purchase',null,'Complete',null,'Aug 2026',null,null,null),
 ('Replace garage door knob','Exterior',2,'{}',null,null,'Not Started',null,null,null,null,null)
)
insert into public.projects (title, category_id, priority, seasons, diy_hire, owner, status, target_date, target_note, next_action, notes, recurrence_months)
select s.title, c.id, s.priority, s.seasons::text[], s.diy_hire, s.owner, s.status, s.target_date::date, s.target_note, s.next_action, s.notes, s.recurrence_months
from src s left join public.categories c on lower(c.name) = lower(s.category);

-- Unambiguous dependency links
update public.projects set blocked_by = (select id from public.projects where title = 'Sand and paint gray back deck')
  where title = 'Buy patio couch';
update public.projects set blocked_by = (select id from public.projects where title = 'Route backyard rainwater with stone drain')
  where title = 'Aerate and establish lawn';
