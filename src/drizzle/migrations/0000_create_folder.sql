create table folder (
    id text primary key,
    parent_id text references folder(id) on delete cascade,
    name text not null,
    created text not null,
    updated text
);
--> statement-breakpoint
create index folder_parent_idx on folder(parent_id);
--> statement-breakpoint
create unique index folder_name_idx on folder(coalesce(parent_id, ''), name collate nocase);
